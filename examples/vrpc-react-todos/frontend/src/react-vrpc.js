import React, { Component } from 'react'
import { VrpcRemote } from 'vrpc'

const vrpcGlobalContext = React.createContext()
const vrpcContexts = []

export function createVrpcProvider ({
  domain = 'public.vrpc',
  broker = 'wss://vrpc.io/mqtt',
  backends = {}
}) {
  for (const key of Object.keys(backends)) {
    // Create context for this backend
    const context = React.createContext()
    context.displayName = key
    vrpcContexts.push(context)
  }
  return function VrpcProvider ({
    children,
    username,
    password,
    token,
    unauthorizedErrorCallback
  }) {
    return (
      <VrpcBackendMaker
        backends={backends}
        broker={broker}
        token={token}
        domain={domain}
        username={username}
        password={password}
        unauthorizedErrorCallback={unauthorizedErrorCallback}
      >
        {children}
      </VrpcBackendMaker>
    )
  }
}

class VrpcBackendMaker extends Component {
  constructor () {
    super()
    this.state = { __global__: { vrpcIsLoading: true } }
  }

  async componentDidMount () {
    const {
      backends,
      broker,
      token,
      domain,
      username,
      password,
      unauthorizedErrorCallback
    } = this.props
    const vrpc = new VrpcRemote({ broker, token, domain, username, password })

    vrpc.on('error', err => {
      if (unauthorizedErrorCallback &&
          err &&
          err.message &&
          err.message.toLowerCase().includes('not authorized')
      ) {
        unauthorizedErrorCallback()
      } else {
        throw err
      }
    })

    this._initializeBackendStates(backends)

    await vrpc.connect()

    vrpc.on('instanceNew', async (added, { agent, className }) => {
      if (!className) return
      const keys = this._filterBackends(className, backends)
      for (const key of keys) {
        const { args, instance, events } = backends[key]
        // This backend manages the lifetime of its proxy itself
        if (args || (instance && this.state.__global__.vrpcIsLoading)) continue
        const proxies = []
        for (const instance of added) {
          try {
            const proxy = await vrpc.getInstance(instance, { className, agent })
            proxy._className = className
            try {
              if (events) await this._registerEvents(key, proxy, events)
            } catch (err) {
              console.error(`Failed registering event(s): ${events} on instance: ${instance} because: ${err.message}`)
            }
            proxies.push(proxy)
          } catch (err) {
            console.error(`Failed connecting to instance: ${instance} because: ${err.message}`)
          }
        }
        this.setState(prevState => ({ [key]: { [key]: [...prevState[key][key], ...proxies] } }))
      }
    })

    vrpc.on('instanceGone', async (removed, { agent, className }) => {
      if (!className) return
      const keys = this._filterBackends(className, backends)
      for (const key of keys) {
        const { instance, args } = backends[key]
        // This backend manages the lifetime of its proxy itself
        if (args) continue
        // Available instance is used by this backend
        if (instance && this.state[key][key] && removed.includes(instance)) {
          console.warn(`Lost instance ${instance} for backend: ${key}`)
          this.setState({ [key]: { [key]: undefined } })
          continue
        }
        this.setState(prevState => {
          const proxies = prevState[key][key].filter(x => !removed.includes(x._targetId))
          return { [key]: { [key]: proxies } }
        })
      }
    })
    await this._createRequiredProxies(domain, backends, vrpc)
    this._initializeGlobalState(vrpc)
  }

  async componentWillUnmount () {
    const { backends } = this.props
    for (const [key, value] of Object.entries(backends)) {
      const { events = [] } = value
      if (events.length === 0) break
      const proxies = this.props[key]
      if (Array.isArray(proxies)) {
        for (const proxy of proxies) {
          for (const event of events) {
            await proxy.removeListener(event)
          }
        }
      } else {
        for (const event of events) {
          await proxies.removeListener(event)
        }
      }
    }
  }

  _initializeBackendStates (backends) {
    const obj = {}
    Object.keys(backends).forEach(key => {
      if (!backends[key].instance && !backends[key].args) {
        obj[key] = { [key]: [] }
      } else {
        obj[key] = { [key]: undefined }
      }
    })
    this.setState(obj)
  }

  _initializeGlobalState (vrpc) {
    this.setState({ __global__: { vrpc, vrpcIsLoading: false } })
  }

  async _createRequiredProxies (domain, backends, vrpc) {
    for (const [key, value] of Object.entries(backends)) {
      const { agent, className, instance, args } = value
      if (args) {
        try {
          const proxy = await vrpc.create({ agent, className, instance, args })
          this.setState({ [key]: { [key]: proxy } })
        } catch (err) {
          console.warn(`Could not create backend ${key} because: ${err.message}`)
        }
      } else if (instance) {
        try {
          // NOTE: This uses VRPC's old API by purpose. The new API has a bug
          // here which leads to an override of the explicit domain set here
          const proxy = await vrpc.getInstance({ instance, className, agent, domain })
          this.setState({ [key]: { [key]: proxy } })
        } catch (err) {
          console.error(`Could not attach to backend instance ${instance}, because: ${err.message}`)
        }
      }
    }
  }

  _filterBackends (className, backends) {
    const ret = []
    for (const [k, v] of Object.entries(backends)) {
      if (typeof v.className === 'string' && v.className === className) ret.push(k)
      if (typeof v.className === 'object' && className.match(v.className)) ret.push(k)
    }
    return ret
  }

  async _registerEvents (key, proxy, events) {
    for (const event of events) {
      proxy[event] = null
      await proxy.on(event, async (...args) => {
        const proxies = this.state[key][key].filter(({ _targetId }) => proxy._targetId !== _targetId)
        switch (args.length) {
          case 0:
            proxies.push({ ...proxy, [event]: undefined })
            break
          case 1:
            proxies.push({ ...proxy, [event]: args[0] })
            break
          default:
            proxies.push({ ...proxy, [event]: args })
        }
        this.setState({ [key]: { [key]: proxies } })
      })
    }
  }

  _renderProviders (children, index = -1) {
    if (index === -1) {
      return (
        <vrpcGlobalContext.Provider value={this.state.__global__}>
          {this._renderProviders(children, index + 1)}
        </vrpcGlobalContext.Provider>
      )
    }
    if (index < vrpcContexts.length) {
      const Context = vrpcContexts[index]
      const Provider = Context.Provider
      return (
        <Provider value={this.state[Context.displayName]}>
          {this._renderProviders(children, index + 1)}
        </Provider>
      )
    }
    return children
  }

  render () {
    const { loading } = this.props
    const { vrpcIsLoading } = this.state.__global__
    if (vrpcIsLoading) return loading || false
    const { children } = this.props
    return this._renderProviders(children)
  }
}

export function withVrpc (
  backendsOrPassedComponent,
  PassedComponent
) {
  let backends
  if (typeof backendsOrPassedComponent === 'string') {
    backends = [backendsOrPassedComponent]
  } else if (Array.isArray(backendsOrPassedComponent)) {
    backends = backendsOrPassedComponent
  } else {
    PassedComponent = backendsOrPassedComponent
  }

  return class ComponentWithVrpc extends Component {
    _renderConsumers (PassedComponent, backends, props, index = -1) {
      if (index === -1) {
        return (
          <vrpcGlobalContext.Consumer>
            {globalProps => (
              this._renderConsumers(
                PassedComponent,
                backends,
                { ...props, ...globalProps },
                index + 1
              )
            )}
          </vrpcGlobalContext.Consumer>
        )
      }
      if (index < backends.length) {
        const Context = vrpcContexts.find(x => x.displayName === backends[index])
        if (!Context) return <PassedComponent {...props} />
        const Consumer = Context.Consumer
        return (
          <Consumer>
            {vrpcProps => (
              this._renderConsumers(
                PassedComponent,
                backends,
                { ...props, ...vrpcProps },
                index + 1
              )
            )}
          </Consumer>
        )
      }
      return <PassedComponent {...props} />
    }

    render () {
      if (!backends) backends = vrpcContexts.map(x => x.displayName)
      return this._renderConsumers(PassedComponent, backends, this.props)
    }
  }
}
