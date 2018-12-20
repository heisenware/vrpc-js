const { promisify } = require('util')
const mqtt = require('mqtt')
const VrpcAdapter = require('./VrpcAdapter')

class VrpcAgent {

  constructor (
    agentId,
    {
      username,
      password,
      topicPrefix = 'vrpc',
      brokerUrl = 'mqtt://test.mosquitto.org',
      log = console
    } = {}
  ) {
    this._username = username
    this._password = password
    this._agentId = agentId
    this._topicPrefix = topicPrefix
    this._brokerUrl = brokerUrl
    this._log = log
    if (this._log.constructor && this._log.constructor.name === 'Console') {
      this._log.debug = () => {}
    }
    this._baseTopic = `${this._topicPrefix}/${this._agentId}`
    VrpcAdapter.onCallback(this._handleVrpcCallback.bind(this))
  }

  async serve () {
    const options = {
      keepalive: 120,
      clean: true,
      connectTimeout: 10 * 1000,
      username: this._username,
      password: this._password
    }
    this._log.info(`Agent ID     : ${this._agentId}`)
    this._log.info(`Broker URL   : ${this._brokerUrl}`)
    this._log.info(`Topic Prefix : ${this._topicPrefix}`)
    this._log.info('Connecting to MQTT server...')
    this._client = mqtt.connect(this._brokerUrl, options)
    this._client.on('connect', this._handleConnect.bind(this))
    this._client.on('reconnect', this._handleReconnect.bind(this))
    this._client.on('error', this._handleError.bind(this))
    this._client.on('message', this._handleMessage.bind(this))
    this._mqttPublish = promisify(this._client.publish.bind(this._client))
    this._mqttSubscribe = promisify(this._client.subscribe.bind(this._client))
    this._mqttUnsubscribe = promisify(this._client.unsubscribe.bind(this._client))
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
    // Publish class information
    const classes = VrpcAdapter.getClassesArray()
    classes.forEach(async klass => {
      const json = {
        class: klass,
        memberFunctions: VrpcAdapter.getMemberFunctionsArray(klass),
        staticFunctions: VrpcAdapter.getStaticFunctionsArray(klass)
      }
      try {
        await this._mqttPublish(
          `${this._baseTopic}/${klass}/__info__`,
          JSON.stringify(json),
          { qos: 1, retain: true }
        )
      } catch (err) {
        this._log.error(
          err,
          `Problem during publishing class info: ${err.message}`
        )
      }
    })
  }

  _generateTopics () {
    const topics = []
    const classes = VrpcAdapter.getClassesArray()
    this._log.info(`Registering classes: ${classes}`)
    classes.forEach(klass => {
      const staticFunctions = VrpcAdapter.getStaticFunctionsArray(klass)
      staticFunctions.forEach(func => {
        topics.push(`${this._baseTopic}/${klass}/${func}`)
      })
    })
    return topics
  }

  async onDisconnect () {
    this._client.end()
    this._client.once('end', () => this._disconnectDone())
    await this.waitUntilState('disconnected')
  }

  async _handleMessage (topic, data) {
    try {
      let json = JSON.parse(data.toString())
      this._log.debug(`Message arrived with topic: ${topic} and payload:`, json)
      const tokens = topic.split('/')
      let targetId
      let method
      // <prefix>/<agent>/<class>/<function>
      if (tokens.length === 4) {
        targetId = tokens[2]
        method = tokens[3]
      // <prefix>/<agent>/<class>/<instance>/<function>
      } else if (tokens.length === 5) {
        targetId = tokens[3]
        method = tokens[4]
      } else {
        this._log.warn(`Received message with invalid topic URI: ${topic}`)
        return
      }
      json.targetId = targetId
      json.method = method
      VrpcAdapter.call(json) // json is mutated and contains return value

      // Special case: object creation -> need to register subscriber
      if (method === '__create__') {
        // TODO handle instantiation errors
        const instanceId = json.data.r
        this._subscribeToMethodsOfNewInstance(targetId, instanceId)
      }
      await this._mqttPublish(json.sender, JSON.stringify(json), { qos: 1 })
    } catch (err) {
      this._log.error(err, `Problem while handling incoming message: ${err.message}`)
    }
  }

  _subscribeToMethodsOfNewInstance (className, instanceId) {
    const memberFunctions = VrpcAdapter.getMemberFunctionsArray(className)
    memberFunctions.forEach(async method => {
      const topic = `${this._baseTopic}/${className}/${instanceId}/${method}`
      await this._mqttSubscribe(topic)
      this._log.debug(`Subscribed to new topic after instantiation: ${topic}`)
    })
  }

  _handleReconnect () {
    this._log.warn(`Reconnecting to ${this._brokerUrl}`)
  }

  _handleError (err) {
    this._log.error(err, `MQTT triggered error: ${err.message}`)
  }
}
module.exports = VrpcAgent
