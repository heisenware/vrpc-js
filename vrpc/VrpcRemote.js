const os = require('os')
const crypto = require('crypto')
const mqtt = require('mqtt')
const EventEmitter = require('events')

class VrpcRemote {

  constructor ({
    token,
    username,
    password,
    agent = '*',
    domain = '*',
    broker = 'mqtts://vrpc.io:8883',
    timeout = 5 * 1000
  } = {}) {
    this._token = token
    this._username = username
    this._password = password
    this._agent = agent
    this._domain = domain
    this._broker = broker
    this._timeout = timeout
    this._instance = crypto.randomBytes(2).toString('hex')
    this._clientId = this._createClientId(this._instance)
    this._topic = `${domain}/${os.hostname()}/${this._instance}`
    this._domains = {}
    this._eventEmitter = new EventEmitter()
    this._invokeId = 0
    this._client = null
    this._init()
  }

  async create ({
    className,
    instance,
    args = [],
    agent = this._agent,
    domain = this._domain
  } = {}) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (domain === '*') throw new Error('Domain must be specified')
    const data = instance ? { _1: instance } : {}
    const offset = instance ? 2 : 1
    args.forEach((value, index) => {
      data[`_${index + offset}`] = value
    })
    const json = {
      targetId: className,
      method: instance ? '__createNamed__' : '__create__',
      id: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      sender: `${domain}/${os.hostname()}/${this._instance}`,
      data
    }
    await this._ensureConnected()
    return this._getProxy(domain, agent, className, json)
  }

  async getInstance ({
    className,
    instance,
    agent = this._agent,
    domain = this._domain
  }) {
    const json = {
      targetId: className,
      method: '__getNamed__',
      id: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      sender: `${domain}/${os.hostname()}/${this._instance}`,
      data: { _1: instance }
    }
    await this._ensureConnected()
    return this._getProxy(domain, agent, className, json)
  }

  async callStatic ({
    className,
    functionName,
    args = [],
    agent = this._agent,
    domain = this._domain
  } = {}) {
    if (domain === '*') throw new Error('You must specify a domain')
    const json = {
      targetId: className,
      method: functionName,
      id: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      sender: `${domain}/${os.hostname()}/${this._instance}`,
      data: this._packData(functionName, ...args)
    }
    await this._ensureConnected()
    const topic = `${domain}/${agent}/${className}/__static__/${functionName}`
    this._client.publish(topic, JSON.stringify(json))
    return this._handleAgentAnswer(json.id)
  }

  async getAvailabilities () {
    await this._ensureConnected()
    return this._domains
  }

  async getAvailableDomains () {
    await this._ensureConnected()
    return Object.keys(this._domains)
  }

  async getAvailableAgents (domain = this._domain) {
    if (domain === '*') throw new Error('Domain must be specified')
    await this._ensureConnected()
    return this._domains[domain]
      ? Object.keys(this._domains[domain].agents)
      : []
  }

  async getAvailableClasses (agent = this._agent, domain = this._domain) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (domain === '*') throw new Error('Domain must be specified')
    await this._ensureConnected()
    return this._domains[domain]
      ? this._domains[domain].agents[agent]
        ? Object.keys(this._domains[domain].agents[agent].classes)
        : []
      : []
  }

  async getAvailableInstances (className, agent = this._agent, domain = this._domain) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (domain === '*') throw new Error('Domain must be specified')
    await this._ensureConnected()
    return this._domains[domain]
      ? this._domains[domain].agents[agent]
        ? this._domains[domain].agents[agent].classes[className]
          ? this._domains[domain].agents[agent].classes[className].instances
          : []
        : []
      : []
  }

  async getAvailableMemberFunctions (className, agent = this._agent, domain = this._domain) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (domain === '*') throw new Error('Domain must be specified')
    await this._ensureConnected()
    return this._domains[domain]
      ? this._domains[domain].agents[agent]
        ? this._domains[domain].agents[agent].classes[className]
          ? this._domains[domain].agents[agent].classes[className].memberFunctions.map(name => this._stripSignature(name))
          : []
        : []
      : []
  }

  async getAvailableStaticFunctions (className, agent = this._agent, domain = this._domain) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (domain === '*') throw new Error('Domain must be specified')
    await this._ensureConnected()
    return this._domains[domain]
      ? this._domains[domain].agents[agent]
        ? this._domains[domain].agents[agent].classes[className]
          ? this._domains[domain].agents[agent].classes[className].staticFunctions.map(name => this._stripSignature(name))
          : []
        : []
      : []
  }

  async reconnectWithToken (
    token,
    { agent = this._agent, domain = this._domain } = {}
  ) {
    this._token = token
    this._agent = agent
    this._domain = domain
    this._client.end(() => this._init())
    return new Promise(resolve => {
      this._client.once('connect', resolve)
    })
  }

  async end () {
    return new Promise(resolve => this._client.end(resolve))
  }

  _createClientId (instance) {
    const clientInfo = os.arch() + JSON.stringify(os.cpus()) + os.homedir() +
    os.hostname() + JSON.stringify(os.networkInterfaces()) + os.platform() +
    os.release() + os.totalmem() + os.type()
    // console.log('ClientInfo:', clientInfo)
    const md5 = crypto.createHash('md5').update(clientInfo).digest('hex').substr(0, 13)
    return `vrpcp${instance}X${md5}` // 5 + 4 + 1 + 13 = 23 (max clientId)
  }

  _init () {
    let username = this._username
    let password = this._password
    if (this._token) {
      username = '__token__'
      password = this._token
    }
    const options = {
      username,
      password,
      clean: true,
      keepalive: 120,
      clientId: this._clientId,
      rejectUnauthorized: false
    }
    this._client = mqtt.connect(this._broker, options)
    this._client.on('connect', () => {
      // This will give us an overview of all remotely available classes
      const domain = this._domain === '*' ? '+' : this._domain
      const agent = this._agent === '*' ? '+' : this._agent
      this._client.subscribe(`${domain}/${agent}/+/__static__/__info__`)
      // Listen for remote function return values
      this._client.subscribe(`${domain}/${os.hostname()}/${this._instance}`)
    })
    this._client.on('message', (topic, message) => {
      const tokens = topic.split('/')
      const [domain, agent, klass, instance, func] = tokens
      if (func === '__info__' && instance === '__static__') {
        // AgentInfo message
        if (klass === '__agent__') {
          const { status, hostname } = JSON.parse(message.toString())
          this._createIfNotExist(domain, agent)
          this._domains[domain].agents[agent].status = status
          this._domains[domain].agents[agent].hostname = hostname
        } else { // ClassInfo message
          // Json properties: { class, instances, memberFunctions, staticFunctions }
          const json = JSON.parse(message.toString())
          this._createIfNotExist(domain, agent)
          this._domains[domain].agents[agent].classes[klass] = json
        }
      } else { // RPC message
        const { id, data } = JSON.parse(message.toString())
        this._eventEmitter.emit(id, data)
      }
    })
  }

  _createIfNotExist (domain, agent) {
    if (!this._domains[domain]) {
      this._domains[domain] = { agents: {} }
    }
    if (!this._domains[domain].agents[agent]) {
      this._domains[domain].agents[agent] = { classes: {} }
    }
  }

  _ensureConnected () {
    return new Promise((resolve, reject) => {
      if (this._client.connected) {
        resolve()
      } else {
        this._client.once('connect', () => resolve())
      }
    })
  }

  async _getProxy (domain, agent, className, json) {
    const { method } = json
    const topic = `${domain}/${agent}/${className}/__static__/${method}`
    this._client.publish(topic, JSON.stringify(json))
    return new Promise((resolve, reject) => {
      const msg = `Proxy creation timed out (> ${this._timeout} ms)`
      const id = setTimeout(
        () => {
          this._eventEmitter.removeAllListeners(json.id)
          reject(new Error(msg))
        },
        this._timeout
      )
      this._eventEmitter.once(json.id, data => {
        clearTimeout(id)
        if (data.e) {
          reject(new Error(data.e))
        } else {
          const proxy = this._createProxy(domain, agent, className, data)
          resolve(proxy)
        }
      })
    })
  }

  async _createProxy (domain, agent, className, data) {
    const instance = data.r
    const targetTopic = `${domain}/${agent}/${className}/${instance}`
    const proxy = {}
    let functions = this._domains[domain].agents[agent].classes[className].memberFunctions
    // Strip off argument signature
    functions = functions.map(name => {
      const pos = name.indexOf('-')
      if (pos > 0) return name.substring(0, pos)
      return name
    })
    // Remove overloads
    const uniqueFuncs = new Set(functions)
    // Build proxy
    uniqueFuncs.forEach(name => {
      proxy[name] = async (...args) => {
        const json = {
          targetId: instance,
          method: name,
          id: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
          sender: this._topic,
          data: this._packData(name, ...args)
        }
        this._client.publish(`${targetTopic}/${name}`, JSON.stringify(json))
        return this._handleAgentAnswer(json.id)
      }
    })
    return proxy
  }

  _handleAgentAnswer (id) {
    return new Promise((resolve, reject) => {
      const msg = `Function call timed out (> ${this._timeout} ms)`
      const timer = setTimeout(
        () => {
          this._eventEmitter.removeAllListeners(id)
          reject(new Error(msg))
        },
        this._timeout
      )
      this._eventEmitter.once(id, data => {
        clearTimeout(timer)
        if (data.e) {
          reject(new Error(data.e))
        } else {
          const ret = data.r
          // Handle functions returning a promise
          if (typeof ret === 'string' && ret.substr(0, 5) === '__p__') {
            const promise = new Promise((resolve, reject) => {
              this._eventEmitter.once(ret, promiseData => {
                if (promiseData.e) reject(new Error(promiseData.e))
                else resolve(promiseData.r)
              })
            })
            resolve(promise)
          } else {
            resolve(ret)
          }
        }
      })
    })
  }

  _packData (functionName, ...args) {
    const data = {}
    args.forEach((value, index) => {
      // Check whether provided argument is a function
      if (this._isFunction(value)) {
        // Check special case of an event emitter registration
        // We test three conditions:
        // 1) functionName must be "on"
        // 2) callback is second argument
        // 3) first argument was string
        if (functionName === 'on' &&
          index === 1 &&
          typeof args[0] === 'string'
        ) {
          const id = `__f__${functionName}-${index}-${args[0]}`
          data[`_${index + 1}`] = id
          if (this._eventEmitter.eventNames().includes(id)) return
          this._eventEmitter.on(id, data => {
            const args = Object.keys(data).sort()
              .filter(value => value[0] === '_')
              .map(key => data[key])
            value.apply(null, args)
          })
        // Regular function callback
        } else {
          const id = `__f__${functionName}-${index}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`
          data[`_${index + 1}`] = id
          this._eventEmitter.once(id, data => {
            const args = Object.keys(data).sort()
              .filter(value => value[0] === '_')
              .map(key => data[key])
            value.apply(null, args) // This is the actual function call
          })
        }
      } else if (this._isEmitter(value)) {
        const { emitter, event } = value
        const id = `__f__${functionName}-${index}-${event}`
        data[`_${index + 1}`] = id
        if (this._eventEmitter.eventNames().includes(id)) return
        this._eventEmitter.on(id, data => {
          const args = Object.keys(data).sort()
            .filter(value => value[0] === '_')
            .map(key => data[key])
          emitter.emit(event, ...args)
        })
      } else {
        data[`_${index + 1}`] = value
      }
    })
    return data
  }

  _stripSignature (method) {
    const pos = method.indexOf('-')
    if (pos > 0) return method.substring(0, pos)
    return method
  }

  _isFunction (variable) {
    const getType = {}
    const type = getType.toString.call(variable)
    return variable &&
      (type === '[object Function]' || type === '[object AsyncFunction]')
  }

  _isEmitter (variable) {
    return (
      typeof variable === 'object' &&
      variable.hasOwnProperty('emitter') &&
      variable.hasOwnProperty('event') &&
      typeof variable.emitter === 'object' &&
      typeof variable.emitter.emit === 'function'
    )
  }
}

module.exports = VrpcRemote
