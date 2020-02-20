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
    log = console
  } = {}
  ) {
    this._username = username
    this._password = password
    this._token = token
    this._agent = agent
    this._domain = domain
    this._broker = broker
    this._log = log
    if (this._log.constructor && this._log.constructor.name === 'Console') {
      this._log.debug = () => {}
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
    const options = {
      username,
      password,
      keepalive: 120,
      clean: true,
      connectTimeout: 10 * 1000,
      clientId: `vrpca${md5}`,
      rejectUnauthorized: false,
      will: {
        topic: `${this._baseTopic}/__info__`,
        payload: JSON.stringify({
          status: 'offline',
          hostname: os.hostname()
        }),
        qos: 1,
        retain: true
      }
    }
    this._log.info(`Domain : ${this._domain}`)
    this._log.info(`Agent  : ${this._agent}`)
    this._log.info(`Broker : ${this._broker}`)
    this._log.info('Connecting to MQTT server...')
    this._client = mqtt.connect(this._broker, options)
    this._client.on('connect', this._handleConnect.bind(this))
    this._client.on('reconnect', this._handleReconnect.bind(this))
    this._client.on('error', this._handleError.bind(this))
    this._client.on('message', this._handleMessage.bind(this))
    return this._ensureConnected()
  }

  async _mqttPublish (topic, message, options) {
    return new Promise((resolve) => {
      this._client.publish(topic, message, { qos: 1, ...options }, (err) => {
        if (err) {
          this._log.warn(`Could not publish MQTT message because: ${err.message}`)
        }
        resolve()
      })
    })
  }

  async _mqttSubscribe (topic, options) {
    return new Promise((resolve) => {
      this._client.subscribe(topic, { qos: 1, ...options }, (err, granted) => {
        if (err) {
          this._log.warn(`Could not subscribe to topic: ${topic} because: ${err.message}`)
        } else {
          if (granted.length === 0) {
            this._log.warn(`No permission for subscribing to topic: ${topic}`)
          }
        }
        resolve()
      })
    })
  }

  async _mqttUnsubscribe (topic, options) {
    return new Promise((resolve) => {
      this._client.unsubscribe(topic, options, (err) => {
        if (err) {
          this._log.warn(`Could not unsubscribe from topic: ${topic} because: ${err.message}`)
        }
        resolve()
      })
    })
  }

  _getClasses () {
    return VrpcAdapter.getAvailableClasses()
    // return JSON.parse(VrpcAdapter.getClasses())
  }

  _getInstances (className) {
    return VrpcAdapter.getAvailableInstances(className)
    // return JSON.parse(VrpcAdapter.getInstances(className))
  }

  _getMemberFunctions (className) {
    return VrpcAdapter.getAvailableMemberFunctions(className)
    // return JSON.parse(VrpcAdapter.getMemberFunctions(className))
  }

  _getStaticFunctions (className) {
    return VrpcAdapter.getAvailableStaticFunctions(className)
    // return JSON.parse(VrpcAdapter.getStaticFunctions(className))
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

  async _handleVrpcCallback (jsonString, jsonObject) {
    const { sender } = jsonObject
    try {
      this._log.debug(`Forwarding callback to: ${sender} with payload:`, jsonObject)
      await this._mqttPublish(sender, jsonString)
    } catch (err) {
      this._log.warn(
        err,
        `Problem publishing vrpc callback to ${sender} because of: ${err.message}`
      )
    }
  }

  async _handleConnect () {
    this._log.info('[OK]')
    try {
      const topics = this._generateTopics()
      await this._mqttSubscribe(topics)
    } catch (err) {
      this._log.error(
        err,
        `Problem during initial topic subscription: ${err.message}`
      )
    }
    // Publish agent online
    await this._mqttPublish(
      `${this._baseTopic}/__info__`,
      JSON.stringify({
        status: 'online',
        hostname: os.hostname()
      }),
      { retain: true }
    )
    // Publish class information
    const classes = this._getClasses()
    classes.forEach(async klass => {
      await this._publishClassInfoMessage(klass)
    })
  }

  async _publishClassInfoMessage (klass) {
    const json = {
      className: klass,
      instances: this._getInstances(klass),
      memberFunctions: this._getMemberFunctions(klass),
      staticFunctions: this._getStaticFunctions(klass)
    }
    try {
      await this._mqttPublish(
        `${this._baseTopic}/${klass}/__info__`,
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
    classes.forEach(klass => {
      const staticFunctions = this._getStaticFunctions(klass)
      staticFunctions.forEach(func => {
        topics.push(`${this._baseTopic}/${klass}/__static__/${func}`)
      })
    })
    return topics
  }

  async end ({ unregister = false } = {}) {
    try {
      const agentTopic = `${this._baseTopic}/__info__`
      await this._mqttPublish(
        agentTopic,
        JSON.stringify({
          status: 'offline',
          hostname: os.hostname()
        }),
        { retain: true }
      )
      if (unregister) {
        await this._mqttPublish(agentTopic, null, { retain: true })
        const classes = this._getClasses()
        for (const klass of classes) {
          const infoTopic = `${this._baseTopic}/${klass}/__info__`
          await this._mqttPublish(infoTopic, null, { retain: true })
        }
      }
      return new Promise(resolve => this._client.end(resolve))
    } catch (err) {
      this._log.error(
        err,
        `Problem during disconnecting agent: ${err.message}`
      )
    }
  }

  async _handleMessage (topic, data) {
    try {
      const json = JSON.parse(data.toString())
      this._log.debug(`Message arrived with topic: ${topic} and payload:`, json)
      const tokens = topic.split('/')
      const [,, klass, instance, method] = tokens

      // Special case: clientInfo message
      if (tokens.length === 4 && tokens[3] === '__info__') {
        this._handleClientInfoMessage(topic, json)
        return
      }

      // Anything else must follow RPC protocol
      if (tokens.length !== 5) {
        this._log.warn(`Ignoring message with invalid topic: ${topic}`)
        return
      }

      // Prepare RPC json
      json.context = instance === '__static__' ? klass : instance
      json.method = method

      // Mutates json and adds return value
      VrpcAdapter._call(json)

      // Intersecting life-cycle functions
      switch (method) {
        case '__create__': {
          // TODO handle instantiation errors
          const instanceId = json.data.r
          // TODO await this
          this._subscribeToMethodsOfNewInstance(klass, instanceId)
          await this._registerUnnamedInstance(instanceId, json.sender)
          break
        }
        case '__createNamed__': {
          // TODO handle instantiation errors
          const instanceId = json.data.r
          if (!this._hasNamedInstance(instanceId)) {
            await this._publishClassInfoMessage(klass)
            this._subscribeToMethodsOfNewInstance(klass, instanceId)
          }
          await this._registerNamedInstance(instanceId, json.sender)
          break
        }
        case '__getNamed__': {
          const { data: { _1, e }, sender } = json
          if (!e) await this._registerNamedInstance(_1, sender)
          break
        }
        case '__delete__': {
          const { data: { _1 }, sender } = json
          this._unsubscribeMethodsOfDeletedInstance(klass, instance)
          const wasNamed = await this._unregisterInstance(_1, sender)
          if (wasNamed) { // let other clients know about its death
            await this._publishClassInfoMessage(klass)
          }
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
      await this._mqttPublish(json.sender, jsonString)
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
    }
  }

  async _registerUnnamedInstance (instanceId, clientId) {
    const entry = this._unnamedInstances.get(clientId)
    if (entry) { // already seen
      entry.add(instanceId)
    } else { // new instance
      this._unnamedInstances.set(clientId, new Set([instanceId]))
      if (!this._namedInstances.has(clientId)) {
        await this._mqttSubscribe(`${clientId}/__info__`)
      }
      this._log.info(`Tracking lifetime of client: ${clientId}`)
    }
  }

  async _registerNamedInstance (instanceId, clientId) {
    const entry = this._namedInstances.get(clientId)
    if (entry) { // already seen
      entry.add(instanceId)
    } else { // new instance
      this._namedInstances.set(clientId, new Set([instanceId]))
      if (!this._unnamedInstances.has(clientId)) {
        await this._mqttSubscribe(`${clientId}/__info__`)
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

  async _unregisterInstance (instanceId, clientId) {
    const entryUnnamed = this._unnamedInstances.get(clientId)
    if (!entryUnnamed || !entryUnnamed.has(instanceId)) { // named
      const entryNamed = this._namedInstances.get(clientId)
      if (!entryNamed || !entryNamed.has(instanceId)) {
        this._log.warn(`Failed un-registering not registered instance: ${instanceId} on client: ${clientId}`)
        return false
      }
      entryNamed.delete(instanceId)
      if (entryNamed.length === 0) {
        this._namedInstances.delete(clientId)
        await this._mqttUnsubscribe(`${clientId}/__info__`)
        this._log.debug(`Stopped tracking lifetime of client: ${clientId}`)
      }
      return true
    }
    entryUnnamed.delete(instanceId)
    if (entryUnnamed.length === 0) {
      this._unnamedInstances.delete(clientId)
      await this._mqttUnsubscribe(`${clientId}/__info__`)
      this._log.debug(`Stopped tracking lifetime of client: ${clientId}`)
    }
    return false
  }

  _subscribeToMethodsOfNewInstance (klass, instance) {
    const memberFunctions = this._getMemberFunctions(klass)
    memberFunctions.forEach(async method => {
      const topic = `${this._baseTopic}/${klass}/${instance}/${method}`
      await this._mqttSubscribe(topic)
      this._log.debug(`Subscribed to new topic after instantiation: ${topic}`)
    })
  }

  _unsubscribeMethodsOfDeletedInstance (klass, instance) {
    const memberFunctions = this._getMemberFunctions(klass)
    memberFunctions.forEach(async method => {
      const topic = `${this._baseTopic}/${klass}/${instance}/${method}`
      await this._mqttUnsubscribe(topic)
      this._log.debug(`Unsubscribed from topic after deletion: ${topic}`)
    })
  }

  _handleReconnect () {
    this._log.warn(`Reconnecting to ${this._broker}`)
  }

  _handleError (err) {
    this._log.error(`MQTT triggered error: ${err.message}`)
  }
}
module.exports = VrpcAgent
