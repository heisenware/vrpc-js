const os = require('os')
const { promisify } = require('util')
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
    // maps senderId to anonymous instanceIds
    this._instances = new Map()
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
        topic: `${this._baseTopic}/__agent__/__static__/__info__`,
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
    this._mqttPublish = promisify(this._client.publish.bind(this._client))
    this._mqttSubscribe = promisify(this._client.subscribe.bind(this._client))
    this._mqttUnsubscribe = promisify(this._client.unsubscribe.bind(this._client))
    return this._ensureConnected()
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
      `${this._baseTopic}/__agent__/__static__/__info__`,
      JSON.stringify({
        status: 'online',
        hostname: os.hostname()
      }),
      { qos: 1, retain: true }
    )
    // Publish class information
    const classes = VrpcAdapter.getClassesArray()
    classes.forEach(async klass => {
      await this._publishClassInfoMessage(klass)
    })
  }

  async _publishClassInfoMessage (klass) {
    const json = {
      className: klass,
      instances: VrpcAdapter.getInstancesArray(klass),
      memberFunctions: VrpcAdapter.getMemberFunctionsArray(klass),
      staticFunctions: VrpcAdapter.getStaticFunctionsArray(klass)
    }
    try {
      await this._mqttPublish(
        `${this._baseTopic}/${klass}/__static__/__info__`,
        JSON.stringify(json),
        { qos: 1, retain: true }
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
    const classes = VrpcAdapter.getClassesArray()
    this._log.info(`Registering classes: ${classes}`)
    classes.forEach(klass => {
      const staticFunctions = VrpcAdapter.getStaticFunctionsArray(klass)
      staticFunctions.forEach(func => {
        topics.push(`${this._baseTopic}/${klass}/__static__/${func}`)
      })
    })
    return topics
  }

  async end ({ unregister = false } = {}) {
    try {
      const agentTopic = `${this._baseTopic}/__agent__/__static__/__info__`
      await this._mqttPublish(
        agentTopic,
        JSON.stringify({
          status: 'offline',
          hostname: os.hostname()
        }),
        { qos: 1, retain: true }
      )
      if (unregister) {
        await this._mqttPublish(agentTopic, null, { qos: 1, retain: true })
        const classes = VrpcAdapter.getClassesArray()
        for (const klass of classes) {
          this._log.info(`Un-registering class: ${klass}`)
          const infoTopic = `${this._baseTopic}/${klass}/__static__/__info__`
          await this._mqttPublish(infoTopic, null, { qos: 1, retain: false })
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
      if (tokens.length === 4 && tokens[3] === '__info__') {
        // Proxy notification
        if (json.status === 'offline') {
          const entry = this._instances.get(topic.slice(0, -9))
          entry.forEach(instanceId => {
            const json = { data: { _1: instanceId }, method: '__delete__' }
            VrpcAdapter._call(json)
            const { data: { r } } = json
            if (r) this._log.info(`Deleted anonymous instance: ${r}`)
          })
          await this._mqttUnsubscribe(topic)
          return
        }
      }
      if (tokens.length !== 5) {
        this._log.warn(`Ignoring message with invalid topic: ${topic}`)
        return
      }
      const klass = tokens[2]
      const instance = tokens[3]
      const method = tokens[4]
      json.targetId = instance === '__static__' ? klass : instance
      json.method = method

      // Special case: object deletion
      if (method === '__delete__') {
        this._unsubscribeMethodsOfDeletedInstance(klass, instance)
      }

      VrpcAdapter._call(json) // json is mutated and contains return value

      // Special case: was object creation or deletion
      if (method === '__create__') {
        // TODO handle instantiation errors
        const instanceId = json.data.r
        // TODO await this, too
        this._subscribeToMethodsOfNewInstance(klass, instanceId)
        await this._registerInstance(instanceId, json.sender)
      } else if (method === '__createNamed__') {
        // TODO handle instantiation errors
        const instanceId = json.data.r
        this._subscribeToMethodsOfNewInstance(klass, instanceId)
        // Publish updated classInfo
        await this._publishClassInfoMessage(klass)
      } else if (method === '__delete__') {
        const instanceId = json.data.r
        const wasNamed = await this._unregisterInstance(instanceId, json.sender)
        if (wasNamed) {
          // Instance was a named one, let other know about its death
          await this._publishClassInfoMessage(klass)
        }
      }
      await this._mqttPublish(json.sender, JSON.stringify(json), { qos: 1 })
    } catch (err) {
      this._log.error(err, `Problem while handling incoming message: ${err.message}`)
    }
  }

  async _registerInstance (instanceId, sender) {
    const entry = this._instances.get(sender)
    if (entry) { // already seen
      entry.add(instanceId)
    } else { // new instance
      this._instances.set(sender, new Set([instanceId]))
      await this._mqttSubscribe(`${sender}/__info__`)
      this._log.info(`Tracking lifetime of proxy: ${sender}`)
    }
  }

  async _unregisterInstance (instanceId, sender) {
    const entry = this._instances.get(sender)
    if (!entry || !entry.has(instanceId)) {
      return true
    }
    entry.delete(instanceId)
    if (entry.length === 0) {
      this._instances.delete(sender)
      await this._mqttUnsubscribe(`${sender}/__info__`)
      this._log.info(`Stopped tracking lifetime of proxy: ${sender}`)
    }
    return false
  }

  _subscribeToMethodsOfNewInstance (klass, instance) {
    const memberFunctions = VrpcAdapter.getMemberFunctionsArray(klass)
    memberFunctions.forEach(async method => {
      const topic = `${this._baseTopic}/${klass}/${instance}/${method}`
      await this._mqttSubscribe(topic)
      this._log.debug(`Subscribed to new topic after instantiation: ${topic}`)
    })
  }

  _unsubscribeMethodsOfDeletedInstance (klass, instance) {
    const memberFunctions = VrpcAdapter.getMemberFunctionsArray(klass)
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
    this._log.error(err, `MQTT triggered error: ${err.message}`)
  }
}
module.exports = VrpcAgent
