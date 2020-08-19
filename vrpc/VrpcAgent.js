const os = require('os')
const mqtt = require('mqtt')
const crypto = require('crypto')
const { ArgumentParser } = require('argparse')
const VrpcAdapter = require('./VrpcAdapter')

class VrpcAgent {

  static fromCommandline () {
    const parser = new ArgumentParser({
      addHelp: true,
      description: 'VRPC NodeJS Agent'
    })
    parser.addArgument(
      ['-a', '--agent'],
      { help: 'Agent name', required: true }
    )
    parser.addArgument(
      ['-d', '--domain'],
      { help: 'Domain name', required: true }
    )
    parser.addArgument(
      ['-t', '--token'],
      { help: 'Agent Token' }
    )
    parser.addArgument(
      ['-b', '--broker'],
      { help: 'Broker url', defaultValue: 'mqtts://vrpc.io:8883' }
    )
    parser.addArgument(
      ['-u', '--username'],
      { help: 'Username' }
    )
    parser.addArgument(
      ['-P', '--password'],
      { help: 'Password' }
    )
    parser.addArgument(
      ['--bestEffort'],
      {
        help: 'Calls function on best-effort. Improves performance but may fail under unstable network connections.',
        action: 'store_true'
      }
    )
    const args = parser.parseArgs()
    return new VrpcAgent(args)
  }

  constructor ({
    domain,
    agent,
    username,
    password,
    token,
    broker = 'mqtts://vrpc.io:8883',
    log = 'console',
    bestEffort = false
  } = {}
  ) {
    this._username = username
    this._password = password
    this._token = token
    this._agent = agent
    this._domain = domain
    this._broker = broker
    this._qos = bestEffort ? 0 : 1
    this._isReconnect = false
    if (log === 'console') {
      this._log = console
      this._log.debug = () => {}
    } else {
      this._log = log
    }
    this._baseTopic = `${this._domain}/${this._agent}`
    VrpcAdapter.onCallback(this._handleVrpcCallback.bind(this))
    // maps clientId to instanceId
    this._unnamedInstances = new Map()
    this._namedInstances = new Map()
  }

  async serve () {
    const md5 = crypto.createHash('md5')
      .update(this._domain + this._agent).digest('hex').substr(0, 18)
    let username = this._username
    let password = this._password
    if (this._token) {
      username = '__token__'
      password = this._token
    }
    this._options = {
      username,
      password,
      keepalive: 30,
      connectTimeout: 10 * 1000,
      clientId: `vrpca${md5}`,
      rejectUnauthorized: false,
      will: {
        topic: `${this._baseTopic}/__agentInfo__`,
        payload: JSON.stringify({
          status: 'offline',
          hostname: os.hostname()
        }),
        qos: this._qos,
        retain: true
      }
    }
    this._log.info(`Domain : ${this._domain}`)
    this._log.info(`Agent  : ${this._agent}`)
    this._log.info(`Broker : ${this._broker}`)
    this._log.info('Connecting to MQTT server...')
    await this._clearPersistedSession()
    this._client = mqtt.connect(
      this._broker,
      { ...this._options, clean: false }
    )
    this._client.on('connect', this._handleConnect.bind(this))
    this._client.on('reconnect', this._handleReconnect.bind(this))
    this._client.on('error', this._handleError.bind(this))
    this._client.on('message', this._handleMessage.bind(this))
    return this._ensureConnected()
  }

  async _clearPersistedSession () {
    // Clear potentially existing persisted sessions
    const clearingClient = mqtt.connect(
      this._broker,
      { ...this._options, clean: true }
    )
    clearingClient.on('error', (err) => {
      this._log.warn('Error', err.message)
    })
    await new Promise(resolve => {
      clearingClient.on('connect', () => {
        clearingClient.end(false, {}, resolve)
      })
    })
  }

  _mqttPublish (topic, message, options) {
    this._client.publish(topic, message, { qos: this._qos, ...options }, (err) => {
      if (err) {
        this._log.warn(`Could not publish MQTT message because: ${err.message}`)
      }
    })
  }

  _mqttSubscribe (topic, options) {
    this._client.subscribe(topic, { qos: this._qos, ...options }, (err, granted) => {
      if (err) {
        this._log.warn(`Could not subscribe to topic: ${topic} because: ${err.message}`)
      } else {
        if (granted.length === 0) {
          this._log.warn(`No permission for subscribing to topic: ${topic}`)
        }
      }
    })
  }

  _mqttUnsubscribe (topic, options) {
    this._client.unsubscribe(topic, options, (err) => {
      if (err) {
        this._log.warn(`Could not unsubscribe from topic: ${topic} because: ${err.message}`)
      }
    })
  }

  _getClasses () {
    return VrpcAdapter.getAvailableClasses()
  }

  _getInstances (className) {
    return VrpcAdapter.getAvailableInstances(className)
  }

  _getMemberFunctions (className) {
    return VrpcAdapter.getAvailableMemberFunctions(className)
  }

  _getStaticFunctions (className) {
    return VrpcAdapter.getAvailableStaticFunctions(className)
  }

  _getMetaData (className) {
    return VrpcAdapter.getAvailableMetaData(className)
  }

  async _ensureConnected () {
    return new Promise((resolve) => {
      if (this._client.connected) {
        resolve()
      } else {
        this._client.once('connect', resolve)
      }
    })
  }

  _handleVrpcCallback (jsonString, jsonObject) {
    const { sender } = jsonObject
    try {
      this._log.debug(`Forwarding callback to: ${sender} with payload:`, jsonObject)
      this._mqttPublish(sender, jsonString)
    } catch (err) {
      this._log.warn(
        err,
        `Problem publishing vrpc callback to ${sender} because of: ${err.message}`
      )
    }
  }

  _handleConnect () {
    this._log.info('[OK]')
    if (this._isReconnect) {
      this._publishAgentInfoMessage()
      return
    }
    try {
      const topics = this._generateTopics()
      this._mqttSubscribe(topics)
    } catch (err) {
      this._log.error(
        err,
        `Problem during initial topic subscription: ${err.message}`
      )
    }
    // Publish agent online
    this._publishAgentInfoMessage()

    // Publish class information
    const classes = this._getClasses()
    classes.forEach(className => {
      this._publishClassInfoMessage(className)
    })
  }

  _publishAgentInfoMessage () {
    this._mqttPublish(
      `${this._baseTopic}/__agentInfo__`,
      JSON.stringify({
        status: 'online',
        hostname: os.hostname()
      }),
      { retain: true }
    )
  }

  _publishClassInfoMessage (className) {
    const json = {
      className: className,
      instances: this._getInstances(className),
      memberFunctions: this._getMemberFunctions(className),
      staticFunctions: this._getStaticFunctions(className),
      meta: this._getMetaData(className)
    }
    try {
      this._mqttPublish(
        `${this._baseTopic}/${className}/__classInfo__`,
        JSON.stringify(json),
        { retain: true }
      )
    } catch (err) {
      this._log.error(
        err,
        `Problem during publishing class info: ${err.message}`
      )
    }
  }

  _generateTopics () {
    const topics = []
    const classes = this._getClasses()
    this._log.info(`Registering classes: ${classes}`)
    classes.forEach(className => {
      const staticFunctions = this._getStaticFunctions(className)
      staticFunctions.forEach(func => {
        topics.push(`${this._baseTopic}/${className}/__static__/${func}`)
      })
    })
    return topics
  }

  async end ({ unregister = false } = {}) {
    try {
      const agentTopic = `${this._baseTopic}/__agentInfo__`
      this._mqttPublish(
        agentTopic,
        JSON.stringify({
          status: 'offline',
          hostname: os.hostname()
        }),
        { retain: true }
      )
      if (unregister) {
        this._mqttPublish(agentTopic, null, { retain: true })
        const classes = this._getClasses()
        for (const className of classes) {
          const infoTopic = `${this._baseTopic}/${className}/__classInfo__`
          this._mqttPublish(infoTopic, null, { retain: true })
        }
      }
      await new Promise(resolve => this._client.end(false, {}, resolve))
      await this._clearPersistedSession()
    } catch (err) {
      this._log.error(
        err,
        `Problem during disconnecting agent: ${err.message}`
      )
    }
  }

  _handleMessage (topic, data) {
    try {
      const json = JSON.parse(data.toString())
      this._log.debug(`Message arrived with topic: ${topic} and payload:`, json)
      const tokens = topic.split('/')
      const [,, className, instance, method] = tokens

      // Special case: clientInfo message
      if (tokens.length === 4 && tokens[3] === '__clientInfo__') {
        this._handleClientInfoMessage(topic, json)
        return
      }

      // Anything else must follow RPC protocol
      if (tokens.length !== 5) {
        this._log.warn(`Ignoring message with invalid topic: ${topic}`)
        return
      }

      // Prepare RPC json
      json.context = instance === '__static__' ? className : instance
      json.method = method

      // Mutates json and adds return value
      VrpcAdapter._call(json)

      // Intersecting life-cycle functions
      let publishClassInfo = false
      switch (method) {
        case '__create__': {
          // TODO handle instantiation errors
          const instanceId = json.data.r
          // TODO await this
          this._subscribeToMethodsOfNewInstance(className, instanceId)
          this._registerUnnamedInstance(instanceId, json.sender)
          break
        }
        case '__createNamed__': {
          // TODO handle instantiation errors
          const instanceId = json.data.r
          if (!this._hasNamedInstance(instanceId)) {
            publishClassInfo = true
            this._subscribeToMethodsOfNewInstance(className, instanceId)
          }
          this._registerNamedInstance(instanceId, json.sender)
          break
        }
        case '__getNamed__': {
          const { data: { _1, e }, sender } = json
          if (!e) this._registerNamedInstance(_1, sender)
          break
        }
        case '__delete__': {
          const { data: { _1 }, sender } = json
          this._unsubscribeMethodsOfDeletedInstance(className, instance)
          const wasNamed = this._unregisterInstance(_1, sender)
          if (wasNamed) publishClassInfo = true
          break
        }
      }
      let jsonString
      try {
        jsonString = JSON.stringify(json)
      } catch (err) {
        this._log.debug(`Failed serialization of return value for: ${json.context}::${json.method}, because: ${err.message}`)
        json.data.r = '__vrpc::not-serializable__'
        jsonString = JSON.stringify(json)
      }
      if (publishClassInfo && method === '__delete__') {
        this._publishClassInfoMessage(className)
      }
      this._mqttPublish(json.sender, jsonString)
      if (publishClassInfo && method === '__createNamed__') {
        this._publishClassInfoMessage(className)
      }
    } catch (err) {
      this._log.error(err, `Problem while handling incoming message: ${err.message}`)
    }
  }

  _handleClientInfoMessage (topic, json) {
    // Client went offline
    const clientId = topic.slice(0, -9)
    if (json.status === 'offline') {
      const entry = this._unnamedInstances.get(clientId)
      if (entry) { // anonymous
        entry.forEach(instanceId => {
          const json = { data: { _1: instanceId }, method: '__delete__' }
          VrpcAdapter._call(json)
          const { data: { r } } = json
          if (r) this._log.debug(`Deleted unnamed instance: ${instanceId}`)
        })
      }
      VrpcAdapter._unregisterEventListeners(clientId)
      this._mqttUnsubscribe(`${clientId}/__clientInfo__`)
    }
  }

  _registerUnnamedInstance (instanceId, clientId) {
    const entry = this._unnamedInstances.get(clientId)
    if (entry) { // already seen
      entry.add(instanceId)
    } else { // new instance
      this._unnamedInstances.set(clientId, new Set([instanceId]))
      if (!this._namedInstances.has(clientId)) {
        this._mqttSubscribe(`${clientId}/__clientInfo__`)
      }
      this._log.info(`Tracking lifetime of client: ${clientId}`)
    }
  }

  _registerNamedInstance (instanceId, clientId) {
    const entry = this._namedInstances.get(clientId)
    if (entry) { // already seen
      entry.add(instanceId)
    } else { // new instance
      this._namedInstances.set(clientId, new Set([instanceId]))
      if (!this._unnamedInstances.has(clientId)) {
        this._mqttSubscribe(`${clientId}/__clientInfo__`)
      }
      this._log.debug(`Tracking lifetime of client: ${clientId}`)
    }
  }

  _hasNamedInstance (instanceId) {
    for (const [, instances] of this._namedInstances) {
      if (instances.has(instanceId)) return true
    }
    return false
  }

  _unregisterInstance (instanceId, clientId) {
    const entryUnnamed = this._unnamedInstances.get(clientId)
    if (entryUnnamed && entryUnnamed.has(instanceId)) {
      entryUnnamed.delete(instanceId)
      if (entryUnnamed.length === 0) {
        this._unnamedInstances.delete(clientId)
        this._mqttUnsubscribe(`${clientId}/__clientInfo__`)
        this._log.debug(`Stopped tracking lifetime of client: ${clientId}`)
      }
      return false
    }
    let found = false
    this._namedInstances.forEach(async (v) => {
      if (v.has(instanceId)) {
        found = true
        v.delete(instanceId)
        if (v.length === 0) {
          this._namedInstances.delete(clientId)
          this._mqttUnsubscribe(`${clientId}/__clientInfo__`)
          this._log.debug(`Stopped tracking lifetime of client: ${clientId}`)
        }
      }
    })
    if (!found) {
      this._log.warn(`Failed un-registering not registered instance: ${instanceId}`)
      return false
    }
    return true
  }

  _subscribeToMethodsOfNewInstance (className, instance) {
    const memberFunctions = this._getMemberFunctions(className)
    memberFunctions.forEach(method => {
      const topic = `${this._baseTopic}/${className}/${instance}/${method}`
      this._mqttSubscribe(topic)
      this._log.debug(`Subscribed to new topic after instantiation: ${topic}`)
    })
  }

  _unsubscribeMethodsOfDeletedInstance (className, instance) {
    const memberFunctions = this._getMemberFunctions(className)
    memberFunctions.forEach(method => {
      const topic = `${this._baseTopic}/${className}/${instance}/${method}`
      this._mqttUnsubscribe(topic)
      this._log.debug(`Unsubscribed from topic after deletion: ${topic}`)
    })
  }

  _handleReconnect () {
    this._isReconnect = true
    this._log.warn(`Reconnecting to ${this._broker}`)
  }

  _handleError (err) {
    this._log.error(`MQTT triggered error: ${err.message}`)
  }
}
module.exports = VrpcAgent
