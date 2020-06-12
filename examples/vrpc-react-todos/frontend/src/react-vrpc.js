import React, { Component, useContext, useState, useEffect } from 'react'
import { VrpcRemote } from 'vrpc'

const vrpcClientContext = React.createContext()
const vrpcBackendContexts = []
const dynamicBackends = new Set()

export function createVrpcProvider ({
  domain = 'public.vrpc',
  broker = 'wss://vrpc.io/mqtt',
  backends = {}
}) {
  for (const key of Object.keys(backends)) {
    // Create context for this backend
    const context = React.createContext()
    context.displayName = key
    vrpcBackendContexts.push(context)
  }
  return function VrpcProvider ({
    children,
    username,
    password,
    token
  }) {
    return (
      <VrpcBackendMaker
        backends={backends}
        broker={broker}
        token={token}
        domain={domain}
        username={username}
        password={password}
      >
        {children}
      </VrpcBackendMaker>
    )
  }
}

class VrpcBackendMaker extends Component {
  constructor () {
    super()
    this.state = {
      initializing: true,
      vrpc: { client: null, loading: true, error: null }
    }
    this.refresh = (key) => this.setState(prevState => {
      const backend = { ...prevState[key][key].backend }
      return { [key]: { [key]: { ...prevState[key][key], backend } } }
    })
  }

  async componentDidMount () {
    const {
      backends,
      broker,
      token,
      domain,
      username,
      password
    } = this.props

    try {
      const client = new VrpcRemote({ broker, token, domain, username, password })

      client.on('error', err => {
        this.setState({ vrpc: { client: null, loading: false, error: err } })
      })

      this.initializeBackendStates(backends, client)

      await client.connect()

      client.on('instanceNew', async (added, { className }) => {
        if (!className) return
        const keys = this.filterBackends(className, backends)
        for (const key of keys) {
          const { agent, instance, args } = backends[key]
          // This backend manages the lifetime of its instance itself
          if (args) continue
          // This backend needs explicitly this instance
          if (instance) {
            try {
              const backend = await client.getInstance(instance, { className, agent, domain })
              this.setBackendState(key, backend, false, null)
            } catch (err) {
              console.error(`Could not attach to backend instance '${instance}', because: ${err.message}`)
              this.setBackendState(key, null, false, err)
            }
            // This backend is interested in a specific set of instances
          } else {
            this.setState(prevState => {
              const { backend, loading, error, refresh } = prevState[key][key]
              if (backend && backend.ids) {
                backend.ids = [...new Set([...backend.ids, ...added])]
              }
              return { [key]: { [key]: { backend, loading, error, refresh } } }
            })
          }
        }
      })

      client.on('instanceGone', async (gone, { className }) => {
        if (!className) return
        const keys = this.filterBackends(className, backends)
        for (const key of keys) {
          const { instance, args } = backends[key]
          // This backend manages the lifetime of its proxy itself
          if (args) continue
          // Available instance is used by this backend
          if (instance && this.state[key][key] && gone.includes(instance)) {
            console.warn(`Lost instance '${instance}' for backend: ${key}`)
            this.setBackendState(key, null, true, null)
            continue
          }
          // Delete all previously cached dynamic backends
          gone.forEach(x => dynamicBackends.delete(x))
          this.setState(prevState => {
            const { backend, loading, error, refresh } = prevState[key][key]
            if (backend && backend.ids) {
              backend.ids = backend.ids.filter(x => !gone.includes(x))
            }
            return { [key]: { [key]: { backend, loading, error, refresh } } }
          })
        }
      })

      client.on('agent', async ({ agent, status }) => {
        for (const [k, v] of Object.entries(backends)) {
          if (v.agent === agent) {
            if (status === 'offline') {
              console.warn(`Lost agent '${agent}' that is required for backend: ${k}`)
              const error = new Error(`Required agent '${agent}' is offline`)
              if (!v.instance && !v.args) {
                const backend = this.state[k][k].backend
                backend.ids = []
                this.setBackendState(k, backend, false, error)
              } else {
                this.setBackendState(k, null, false, error)
              }
            } else if (status === 'online') {
              if (v.args) {
                try {
                  const backend = await client.create({
                    agent: v.agent,
                    className: v.className,
                    instance: v.instance,
                    args: v.args
                  })
                  console.log(`Created instance '${v.instance || '<anonymous>'}' for: backend ${k}`)
                  this.setBackendState(k, backend, false, null)
                } catch (err) {
                  console.warn(`Could not create instance '${v.instance || '<anonymous>'}' for backend '${k}' because: ${err.message}`)
                  this.setBackendState(k, null, false, err)
                }
              } else if (v.instance) {
                this.setBackendState(k, null, false, null)
              } else {
                const backend = this.state[k][k].backend
                this.setBackendState(k, backend, false, null)
              }
            }
          }
        }
      })

      console.log('VRPC client is connected')
      this.setState({ vrpc: { client, loading: false, error: null } })
    } catch (err) {
      console.error(`VRPC client failed to connect because: ${err.message}`)
      this.setState({ vrpc: { client: null, loading: false, error: err } })
    }
  }

  setBackendState (key, backend, loading, error) {
    this.setState({
      [key]: {
        [key]: {
          backend,
          loading,
          error,
          refresh: (backendName = key) => this.refresh(backendName)
        }
      }
    })
  }

  initializeBackendStates (backends, client) {
    const obj = {}
    Object.keys(backends).forEach(key => {
      if (!backends[key].instance && !backends[key].args) {
        const { agent, className: backendClassName } = backends[key]
        const backend = {
          create: async (id, { args, className }) => client.create({
            agent,
            className: className || backendClassName,
            args,
            instance: id
          }),
          delete: async (id) => client.delete(id, { agent }),
          ids: []
        }
        obj[key] = { [key]: { backend, loading: false, error: null } }
      } else {
        obj[key] = { [key]: { backend: null, loading: true, error: null } }
      }
    })
    this.setState({ ...obj, initializing: false })
  }

  filterBackends (className, backends) {
    const ret = []
    for (const [k, v] of Object.entries(backends)) {
      if (typeof v.className === 'string' && v.className === className) ret.push(k)
      if (typeof v.className === 'object' && className.match(v.className)) ret.push(k)
    }
    return ret
  }

  renderProviders (children, index = -1) {
    if (index === -1) {
      return (
        <vrpcClientContext.Provider value={this.state.vrpc}>
          {this.renderProviders(children, index + 1)}
        </vrpcClientContext.Provider>
      )
    }
    if (index < vrpcBackendContexts.length) {
      const Context = vrpcBackendContexts[index]
      const Provider = Context.Provider
      return (
        <Provider value={this.state[Context.displayName]}>
          {this.renderProviders(children, index + 1)}
        </Provider>
      )
    }
    return children
  }

  render () {
    const { children } = this.props
    const { initializing } = this.state
    if (initializing) return null
    return this.renderProviders(children)
  }
}

export function withVrpc (
  backendsOrPassedComponent,
  PassedComponent
) {
  return withBackend(backendsOrPassedComponent, PassedComponent)
}

export function withBackend (
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
    renderConsumers (PassedComponent, backends, props, index = -1) {
      if (index === -1) {
        return (
          <vrpcClientContext.Consumer>
            {globalProps => (
              this.renderConsumers(
                PassedComponent,
                backends,
                { ...props, ...globalProps },
                index + 1
              )
            )}
          </vrpcClientContext.Consumer>
        )
      }
      if (index < backends.length) {
        const Context = vrpcBackendContexts.find(x => x.displayName === backends[index])
        if (!Context) return <PassedComponent {...props} />
        const Consumer = Context.Consumer
        return (
          <Consumer>
            {vrpcProps => (
              this.renderConsumers(
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
      if (!backends) backends = vrpcBackendContexts.map(x => x.displayName)
      return this.renderConsumers(PassedComponent, backends, this.props)
    }
  }
}

export function useClient ({ onError }) {
  const { client, loading, error } = useContext(vrpcClientContext)
  if (onError) client.on('error', onError)
  return { client, loading: loading, error }
}

export function useBackend (name, id) {
  const clientContext = useContext(vrpcClientContext)
  const context = vrpcBackendContexts.find(x => x.displayName === name)
  const backendContext = useContext(context)
  const [backend, setBackend] = useState({
    backend: null,
    loading: true,
    error: null
  })
  useEffect(() => {
    if (!id) return
    if (!backendContext[name].backend.ids.includes(id)) {
      setBackend({
        backend: null,
        loading: false,
        error: new Error(`Requested object with id '${id}' is not available`)
      })
      return
    }
    if (!dynamicBackends.has(id)) {
      console.log('Attaching to backend', id)
      dynamicBackends.add(id)
      clientContext.client.getInstance(id)
        .then((proxy) => {
          setBackend({ backend: proxy, loading: false, error: null })
        })
        .catch((err) => {
          setBackend({ backend: null, loading: false, error: err })
        })
    }
  }, [name, id, backendContext, backend, clientContext.client])
  if (clientContext.loading) {
    return { backend: null, loading: true, error: null }
  }
  if (clientContext.error) {
    return { backend: null, loading: false, error: clientContext.error }
  }
  if (id) return backend
  return backendContext[name]
}
