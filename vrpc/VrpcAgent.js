const os = require('os')
const path = require('path')
const mqtt = require('mqtt')
const { nanoid } = require('nanoid')
const { ArgumentParser } = require('argparse')
const EventEmitter = require('events')
const jsonStringifySafe = require('json-stringify-safe')
const VrpcAdapter = require('./VrpcAdapter')
const SubscribeRetrier = require('./SubscribeRetrier')

const VRPC_PROTOCOL_VERSION = 3

/**
 * Agent capable of making existing code available to remote control by clients.
 *
 * @extends EventEmitter
 */
class VrpcAgent extends EventEmitter {
  /**
   * Constructs an agent by parsing command line arguments
   *
   * @param {Object} defaults Allows to specify defaults for the various command line options
   * @param {String} defaults.domain The domain under which the agent-provided code is reachable
   * @param {String} defaults.agent This agent's name
   * @param {String} defaults.username MQTT username (if no token is used)
   * @param {String} defaults.password MQTT password (if no token is provided)
   * @param {String} defaults.token Access token
   * @param {String} defaults.broker Broker url in form: `<scheme>://<host>:<port>`
   * @param {String} defaults.version The (user-defined) version of this agent
   * @returns {Agent} Agent instance
   *
   * @example const agent = VrpcAgent.fromCommandline()
   */
  static fromCommandline ({
    domain,
    agent,
    token,
    broker,
    username,
    password,
    version
  } = {}) {
    const parser = new ArgumentParser({
      add_help: true,
      description: 'VRPC Node.js Agent'
    })
    parser.add_argument('-a', '--agent', {
      help: 'Agent name',
      default: agent || VrpcAgent._generateAgentName()
    })
    parser.add_argument('-d', '--domain', {
      help: 'Domain name',
      default: domain || 'vrpc'
    })
    parser.add_argument('-t', '--token', {
      help: 'access token',
      default: token
    })
    parser.add_argument('-b', '--broker', {
      help: 'Broker url',
      default: broker || 'mqtts://broker.hivemq.com:8883'
    })
    parser.add_argument('-u', '--username', {
      help: 'Username',
      default: username
    })
    parser.add_argument('-P', '--password', {
      help: 'Password',
      default: password
    })
    parser.add_argument('--bestEffort', {
      help: 'Calls function on best-effort. Improves performance but may fail under unstable network connections.',
      action: 'store_true'
    })
    parser.add_argument('-V', '-v', '--userVersion', {
      help: 'User defined agent version. May be checked on the remote side for compatibility checks.',
      required: false,
      default: version,
      dest: 'version'
    })
    parser.add_argument('--version', {
      help: 'Returns the VRPC version this client was built with.',
      action: 'version',
      version: 'v2.3.2'
    })
    const args = parser.parse_args()
    return new VrpcAgent(args)
  }

  /**
   * Constructs an agent instance
   *
   * @constructor
   * @param {Object} obj
   * @param {String} [obj.username] MQTT username
   * @param {String} [obj.password] MQTT password (if no token is provided)
   * @param {String} [obj.token] Access token
   * @param {String} [obj.domain='vrpc'] The domain under which the agent-provided code is reachable
   * @param {String} [obj.agent='<user>-<pathId>@<hostname>-<platform>-js'] This agent's name
   * @param {String} [obj.broker='mqtts://broker.hivemq.com:8883'] Broker url in form: `<scheme>://<host>:<port>`
   * @param {Object} [obj.log=console] Log object (must support debug, info, warn, and error level)
   * @param {String} [obj.bestEffort=true] If true, message will be sent with best effort, i.e. no caching if offline
   * @param {String} [obj.version=''] The (user-defined) version of this agent
   * @param {String} [obj.mqttClientId='<generated()>'] Explicitly set the mqtt client id.
   * @param {Object} [obj.tls] TLS settings for a secure broker: `{ ca, rejectUnauthorized }`. Without it the broker's certificate is not verified (the historical behaviour); with `ca` the broker must present a chain the given certificates anchor.
   *
   * @example
   * const agent = new Agent({
   *   domain: 'vrpc'
   *   agent: 'myAgent'
   * })
   */
  constructor ({
    username,
    password,
    token,
    domain = 'vrpc',
    agent = VrpcAgent._generateAgentName(),
    broker = 'mqtts://broker.hivemq.com:8883',
    log = 'console',
    bestEffort = true,
    version = '',
    mqttClientId = null,
    tls = null
  } = {}) {
    super()
    this._validateDomain(domain)
    this._validateAgent(agent)
    this._username = username
    this._password = password
    this._token = token
    this._agent = agent
    this._domain = domain
    this._broker = broker
    this._qos = bestEffort ? 0 : 1
    this._version = version
    this._tls = tls
    this._mqttClientId =
      mqttClientId || `va3${VrpcAgent._createHash(this._domain + this._agent)}`
    if (log === 'console') {
      this._log = console
      this._log.debug = () => {}
    } else {
      this._log = log
    }
    this._baseTopic = `${this._domain}/${this._agent}`
    VrpcAdapter.onCallback(this._handleVrpcCallback.bind(this))
    // maps clientId to instanceId
    this._isolatedInstances = new Map()
    this._sharedInstances = new Map()
    // refused subscriptions (SUBACK qos=128) are retried until granted
    this._subscribeRetrier = new SubscribeRetrier({
      subscribe: (topics, options) => this._mqttSubscribe(topics, options),
      log: this._log
    })
    // counts the connections: an announcement belongs to the connection
    // that prepared it (see _handleConnect)
    this._connectGeneration = 0
    // connected, request topics subscribed and info announced
    this._serving = false

    // Handle the internal error event in case the user forgot to implement it
    this.on('error', err => {
      this._log.debug(`Encountered an error: ${err.message}`)
    })
  }

  /**
   * Starts the agent
   *
   * The returned promise will only resolve once the agent is connected to the
   * broker. If the connection can't be established it will try connecting
   * forever. You may want to listen to the 'offline' (initial connect attempt
   * failed) or 'reconnect' (any further fail) event and call `agent.end()` to
   * stop trying to connect and resolve the returned promise.
   *
   * If the connection could not be established because of authorization
   * failure, the 'error' event will be emitted.
   *
   * @return {Promise} Resolves once the agent serves - connected, its
   * request topics subscribed and its info announced - or once it was
   * explicitly ended before that, never rejects
   */
  async serve () {
    let username = this._username
    let password = this._password
    if (this._token) {
      username = `${this._domain}/${this._agent}`
      password = this._token
    } else if (!this._password) {
      username = `${this._domain}/${this._agent}`
      password = this._generateToken()
    }
    this._options = {
      username,
      password,
      keepalive: 30,
      connectTimeout: 10 * 1000,
      // a refused CONNACK is retried like any other failed attempt: an
      // authorization service that is briefly away refuses, too, and an
      // agent must come back when it does (mqtt >= 5 stops otherwise)
      reconnectOnConnackError: true,
      clientId: this._mqttClientId,
      ...VrpcAgent._tlsOptions(this._tls),
      will: {
        topic: `${this._baseTopic}/__agentInfo__`,
        payload: this._createAgentInfoPayload({ status: 'offline' }),
        qos: this._qos,
        retain: true
      }
    }
    this._log.info(`Domain : ${this._domain}`)
    this._log.info(`Agent  : ${this._agent}`)
    this._log.info(`Broker : ${this._broker}`)
    this._log.info('Connecting to MQTT server...')
    this._client = mqtt.connect(this._broker, this._options)
    this._client.on('connect', this._handleConnect.bind(this))
    this._client.on('reconnect', this._handleReconnect.bind(this))
    this._client.on('error', this._handleError.bind(this))
    this._client.on('message', this._handleMessage.bind(this))
    this._client.on('close', this._handleClose.bind(this))
    this._client.on('offline', this._handleOffline.bind(this))
    this._client.on('end', this._handleEnd.bind(this))
    return this._ensureConnected()
  }

  /**
   * Stops the agent
   *
   * @param {Object} [obj]
   * @param {Boolean} [unregister=false] If true, fully un-registers agent from broker
   * @returns {Promise} Resolves when disconnected and ended
   */
  async end ({ unregister = false } = {}) {
    this._subscribeRetrier.cancel()
    try {
      if (!this._client || !this._client.connected) {
        this.emit('end')
        return
      }
      const agentTopic = `${this._baseTopic}/__agentInfo__`
      this._mqttPublish(
        agentTopic,
        this._createAgentInfoPayload({ status: 'offline' }),
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
    } catch (err) {
      this._log.error(err, `Problem during disconnecting agent: ${err.message}`)
    }
  }

  /**
   * Creates a new instance locally
   *
   * NOTE: The instance must previously be registered by the local VrpcAdapter
   *
   * @param {Object} options
   * @param {String} options.className Name of the class which should be
   * instantiated
   * @param {String} [options.instance] Name of the created instance. If not
   * provided an id will be generated
   * @param {Array} [options.args] Positional arguments for the constructor call
   * @param {bool} [options.isIsolated=false] If true the created instance will
   * be visible only to the client who created it
   * @returns {Object} The real instance (not a proxy!)
   */
  create ({ className, instance = nanoid(8), args = [], isIsolated = false }) {
    const obj = VrpcAdapter.create({ className, instance, args, isIsolated })
    // An agent that is not served yet only collects: once the connection
    // stands, the connect handler subscribes every adapter instance and
    // publishes every class info, so a caller may build its full state
    // before going online and "online" then means "complete"
    if (this._client && !this._hasSharedInstance(instance)) {
      this._subscribeToMethodsOfNewInstance(className, instance)
      this._publishClassInfoMessage(className)
      this._publishClassInfoConciseMessage(className)
    }
    return obj
  }

  static _createHash (str, length = 20) {
    // Extended DJB2 hash with two accumulators
    let hash1 = 5381
    let hash2 = 52711 // different seed

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash1 = (hash1 * 33) ^ char
      hash2 = (hash2 * 33) ^ char
    }

    // Combine into longer hex string
    const token =
      (hash1 >>> 0).toString(16).padStart(8, '0') +
      (hash2 >>> 0).toString(16).padStart(8, '0')

    return token.slice(0, length)
  }

  /**
   * The TLS part of the MQTT options: verification off when nothing was
   * given (as it always was), the given anchors otherwise.
   */
  static _tlsOptions (tls) {
    if (!tls) return { rejectUnauthorized: false }
    const options = { rejectUnauthorized: tls.rejectUnauthorized !== false }
    if (tls.ca) options.ca = tls.ca
    return options
  }

  static _generateAgentName () {
    const { username } = os.userInfo()
    const pathId = VrpcAgent._createHash(path.resolve, 4)
    return `${username}-${pathId}@${os.hostname()}-${os.platform()}-js`
  }

  _generateToken () {
    const uid =
      this._domain +
      this._agent +
      os.userInfo().username +
      path.resolve() +
      os.arch() +
      os.homedir() +
      os.hostname() +
      os.platform() +
      os.release() +
      os.totalmem() +
      os.type() +
      JSON.stringify(os.networkInterfaces()) +
      JSON.stringify(os.cpus().map(({ model }) => model))
    return VrpcAgent._createHash(uid)
  }

  _validateDomain (domain) {
    if (!domain) throw new Error('The domain must be specified')
    if (domain.match(/[+/#*]/)) {
      throw new Error(
        'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
      )
    }
  }

  _validateAgent (agent) {
    if (!agent) throw new Error('The agent must be specified')
    if (agent.match(/[+/#*]/)) {
      throw new Error(
        'The agent must NOT contain any of those characters: "+", "/", "#", "*"'
      )
    }
  }

  _createAgentInfoPayload ({ status }) {
    return JSON.stringify({
      status,
      hostname: os.hostname(),
      version: this._version,
      v: VRPC_PROTOCOL_VERSION
    })
  }

  _mqttPublish (topic, message, options) {
    this._client.publish(
      topic,
      message,
      { qos: this._qos, ...options },
      err => {
        if (err) {
          this._log.warn(
            `Could not publish MQTT message because: ${err.message}`
          )
        }
      }
    )
  }

  /**
   * Subscribes topic(s); `onSettled` is called once the broker has
   * answered (granted, refused or failed alike).
   *
   * @private
   */
  _mqttSubscribe (topic, options, onSettled) {
    this._client.subscribe(
      topic,
      { qos: this._qos, ...options },
      (err, granted) => {
        if (err) {
          this._log.warn(
            `Could not subscribe to topic(s) '${topic}', because: ${err.message}`
          )
        } else {
          const topicArray = Array.isArray(topic) ? topic : [topic]
          const erroneousGranted = granted
            .filter(x => x.qos === 128)
            .map(x => x.topic)
          if (erroneousGranted.length > 0) {
            err = new Error(
              `Could not subscribe all ${topicArray.length} topic(s) but got error qos=128 on following ${erroneousGranted.length} topic(s): ${erroneousGranted}`
            )
            err.code = 'SUBSCRIBE_FAILED'
            err.subscribeOptions = options
            this._log.error(err)
            this.emit('error', err)
            this._subscribeRetrier.schedule(erroneousGranted, options)
          }
          this._subscribeRetrier.granted(
            granted.filter(x => x.qos !== 128).map(x => x.topic)
          )
          const reducedQos = granted.filter(x => x.qos < this._qos)
          if (reducedQos.length > 0) {
            err = new Error(
              `Could not subscribe all ${
                topicArray.length
              } topic(s) at desired qos=${
                this._qos
              } but got reduced qos on following ${
                reducedQos.length
              } topic(s): ${JSON.stringify(reducedQos)}`
            )
            err.code = 'SUBSCRIBE_REDUCED_QOS'
            err.subscribeOptions = options
            this._log.warn(err)
            this.emit('error', err)
          }
          if (granted.length === 0) {
            this._log.debug(`Already subscribed to topic '${topic}'`)
          }
        }
        if (onSettled) onSettled()
      }
    )
  }

  _mqttUnsubscribe (topic, options) {
    this._client.unsubscribe(topic, options, err => {
      if (err) {
        this._log.warn(
          `Could not unsubscribe from topic: ${topic} because: ${err.message}`
        )
      }
    })
  }

  _getClasses () {
    return VrpcAdapter._getClassesArray()
  }

  _getInstances (className) {
    return VrpcAdapter._getInstancesArray(className)
  }

  _getMemberFunctions (className) {
    return VrpcAdapter._getMemberFunctionsArray(className)
  }

  _getStaticFunctions (className) {
    return VrpcAdapter._getStaticFunctionsArray(className)
  }

  _getMetaData (className) {
    return VrpcAdapter._getMetaData(className)
  }

  /**
   * Resolves once the agent serves (its own 'connect' event: connected,
   * request topics subscribed, info announced), or once it was ended.
   *
   * @private
   */
  async _ensureConnected () {
    return new Promise(resolve => {
      if (this._serving) {
        resolve()
      } else {
        this.once('connect', resolve)
        // Will be triggered if the user called 'agent.end()'
        this.once('end', resolve)
      }
    })
  }

  _handleVrpcCallback (json) {
    const { s, i, r, e, a } = json
    const topic = i.startsWith('__e__') ? i.slice(5) : s
    try {
      this._log.debug(`Forwarding callback to: ${topic} with payload:`, json)
      this._mqttPublish(
        topic,
        VrpcAgent._stringifySafely({ a, r, e, i, v: VRPC_PROTOCOL_VERSION })
      )
    } catch (err) {
      this._log.warn(
        err,
        `Problem publishing vrpc callback to ${topic} because of: ${err.message}`
      )
    }
  }

  static _stringifySafely (json) {
    let str
    const { c, f } = json
    try {
      str = jsonStringifySafe(json)
    } catch (err) {
      console.error(
        `Failed serialization of return value for: ${c}::${f}, because: ${err.message}`
      )
      json.r = '__vrpc::not-serializable__'
      str = JSON.stringify(json)
    }
    return str
  }

  /**
   * Serve first, announce second. The request topics - the statics and
   * the methods of every instance that exists already - are subscribed
   * before the agent publishes its agent and class info, and the
   * announcement waits until the broker has answered every subscription.
   * A client acts on the announcement at once; a request it publishes
   * before the broker routes the topic is lost (QoS 0) and only times out
   * on the caller's side. That was the fate of the first call into an
   * agent that came online after the client waiting for it. A refused
   * subscription is the retrier's business and delays nothing.
   *
   * @private
   */
  _handleConnect () {
    this._log.info('[OK]')
    // everything is subscribed afresh: pending retries are moot
    this._subscribeRetrier.cancel()
    const generation = ++this._connectGeneration
    const batches = []
    try {
      const statics = this._generateTopics()
      if (statics.length > 0) batches.push(statics)
    } catch (err) {
      this._log.error(
        err,
        `Problem during initial topic subscription: ${err.message}`
      )
    }
    // all pre-existing instances
    for (const [
      instanceId,
      { className }
    ] of VrpcAdapter._instances.entries()) {
      batches.push(this._methodsTopic(className, instanceId))
    }
    let pending = batches.length
    const announce = () => {
      // a connection that ended meanwhile announces nothing: the next
      // one prepares and announces itself
      if (generation !== this._connectGeneration) return
      this._publishAgentInfoMessage()
      for (const className of this._getClasses()) {
        this._publishClassInfoMessage(className)
        this._publishClassInfoConciseMessage(className)
      }
      this._serving = true
      this.emit('connect')
    }
    if (pending === 0) {
      announce()
      return
    }
    for (const topic of batches) {
      this._mqttSubscribe(topic, undefined, () => {
        pending -= 1
        if (pending === 0) announce()
      })
    }
  }

  _publishAgentInfoMessage () {
    this._mqttPublish(
      `${this._baseTopic}/__agentInfo__`,
      this._createAgentInfoPayload({ status: 'online' }),
      { retain: true }
    )
  }

  _publishClassInfoMessage (className) {
    const json = {
      className,
      instances: this._getInstances(className),
      memberFunctions: this._getMemberFunctions(className),
      staticFunctions: this._getStaticFunctions(className),
      meta: this._getMetaData(className),
      v: VRPC_PROTOCOL_VERSION
    }
    try {
      this._mqttPublish(
        `${this._baseTopic}/${className}/__classInfo__`,
        JSON.stringify(json),
        { retain: true }
      )
    } catch (err) {
      this._log.error(err, `Problem during publishing schema: ${err.message}`)
    }
  }

  _publishClassInfoConciseMessage (className) {
    const json = {
      className,
      instances: this._getInstances(className),
      memberFunctions: this._getMemberFunctions(className),
      staticFunctions: this._getStaticFunctions(className),
      v: VRPC_PROTOCOL_VERSION
    }
    try {
      this._mqttPublish(
        `${this._baseTopic}/${className}/__classInfoConcise__`,
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
    if (classes.length > 0) {
      this._log.info(`Registering classes: ${classes.join(', ')}`)
    } else {
      this._log.warn('No classes are registered')
    }
    classes.forEach(className => {
      const staticFunctions = this._getStaticFunctions(className)
      staticFunctions.forEach(func => {
        topics.push(`${this._baseTopic}/${className}/__static__/${func}`)
      })
    })
    return topics
  }

  _handleMessage (topic, data) {
    try {
      const json = JSON.parse(data.toString())
      this._log.debug(`Message arrived with topic: ${topic} and payload:`, json)
      const tokens = topic.split('/')
      const [, , className, instance, method] = tokens

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
      // SECURITY: take as much as possible params from topic structure as this
      // can be authorized by the broker. Content can't be checked...
      json.c = instance === '__static__' ? className : instance
      json.f = method

      // Mutates json and adds return value
      const mustTrack = VrpcAdapter._call(json)

      if (mustTrack) {
        this._mqttSubscribe(`${json.s}/__clientInfo__`)
      }

      // Intersecting life-cycle functions
      switch (method) {
        case '__createIsolated__': {
          if (json.e) {
            // a constructor that threw leaves nothing behind: no instance,
            // no subscription, no lifetime bookkeeping
            this._log.warn(
              `Instantiation of ${className} failed: ${json.e.message}`
            )
            break
          }
          const instanceId = json.r
          // TODO await this
          this._subscribeToMethodsOfNewInstance(className, instanceId)
          this._registerIsolatedInstance(instanceId, json.s)
          break
        }
        case '__createShared__': {
          if (json.e) {
            this._log.warn(
              `Instantiation of ${className} failed: ${json.e.message}`
            )
            break
          }
          const instanceId = json.r
          if (!this._hasSharedInstance(instanceId)) {
            this._subscribeToMethodsOfNewInstance(className, instanceId)
            this._publishClassInfoMessage(className)
            this._publishClassInfoConciseMessage(className)
          }
          this._registerSharedInstance(instanceId, json.s)
          break
        }
        case '__delete__': {
          this._unsubscribeMethodsOfDeletedInstance(className, instance)
          const wasShared = this._unregisterInstance(json.a[0], json.s)
          if (wasShared) {
            this._publishClassInfoMessage(className)
            this._publishClassInfoConciseMessage(className)
          }
          break
        }
      }
      const { a, r, e, i, v } = json
      const res = e ? { a, r, e, i, v } : { a, r, i, v }
      this._mqttPublish(json.s, VrpcAgent._stringifySafely(res))
    } catch (err) {
      this._log.error(
        err,
        `Problem while handling incoming message: ${err.message}`
      )
    }
  }

  _handleClientInfoMessage (topic, json) {
    // A client connection went offline. The topic carries the connection
    // id (unique per VrpcClient instance) - the key of all bookkeeping -
    // so ending one connection never touches others sharing its identity.
    const connectionId = topic.slice(0, -15) // /__clientInfo__ = 15
    if (json.status === 'offline') {
      VrpcAdapter._unregisterClient(connectionId)
      const entry = this._isolatedInstances.get(connectionId)
      if (entry) {
        entry.forEach(instanceId => {
          const json = {
            f: '__delete__',
            a: [instanceId],
            r: null,
            s: VrpcAdapter.LOCAL_SENDER
          }
          VrpcAdapter._call(json)
          if (json.r) {
            this._log.debug(`Auto-deleted isolated instance: ${instanceId}`)
          }
        })
      }
      this._mqttUnsubscribe(`${connectionId}/__clientInfo__`)
      // clientId: the identity-derived id shared by all connections of one
      // identity (undefined for clients < 3.8.0)
      this.emit('clientGone', connectionId, { clientId: json.clientId })
    }
  }

  _registerIsolatedInstance (instanceId, clientId) {
    const entry = this._isolatedInstances.get(clientId)
    if (entry) {
      // already seen
      entry.add(instanceId)
    } else {
      // new instance
      this._isolatedInstances.set(clientId, new Set([instanceId]))
      if (!this._sharedInstances.has(clientId)) {
        this._mqttSubscribe(`${clientId}/__clientInfo__`)
      }
      this._log.info(`Tracking lifetime of client: ${clientId}`)
    }
  }

  _registerSharedInstance (instanceId, clientId) {
    const entry = this._sharedInstances.get(clientId)
    if (entry) {
      // already seen
      entry.add(instanceId)
    } else {
      // new instance
      this._sharedInstances.set(clientId, new Set([instanceId]))
      if (!this._isolatedInstances.has(clientId)) {
        this._mqttSubscribe(`${clientId}/__clientInfo__`)
      }
      this._log.debug(`Tracking lifetime of client: ${clientId}`)
    }
  }

  _hasSharedInstance (instanceId) {
    for (const [, instances] of this._sharedInstances) {
      if (instances.has(instanceId)) return true
    }
    return false
  }

  _unregisterInstance (instanceId, clientId) {
    const entryIsolated = this._isolatedInstances.get(clientId)
    if (entryIsolated && entryIsolated.has(instanceId)) {
      entryIsolated.delete(instanceId)
      if (entryIsolated.size === 0) {
        this._isolatedInstances.delete(clientId)
        this._mqttUnsubscribe(`${clientId}/__clientInfo__`)
        this._log.debug(`Stopped tracking lifetime of client: ${clientId}`)
      }
      return false
    }
    let found = false
    this._sharedInstances.forEach(async v => {
      if (v.has(instanceId)) {
        found = true
        v.delete(instanceId)
        if (v.size === 0) {
          this._sharedInstances.delete(clientId)
          this._mqttUnsubscribe(`${clientId}/__clientInfo__`)
          this._log.debug(`Stopped tracking lifetime of client: ${clientId}`)
        }
      }
    })
    if (!found) {
      this._log.info(
        `Unregistering non-tracked (possibly by agent created) instance: ${instanceId}`
      )
      return true
    }
    return true
  }

  /**
   * The request topics of one instance: every method of it.
   *
   * @private
   */
  _methodsTopic (className, instance) {
    return `${this._baseTopic}/${className}/${instance}/+`
  }

  _subscribeToMethodsOfNewInstance (className, instance) {
    const topic = this._methodsTopic(className, instance)
    this._mqttSubscribe(topic)
    this._log.debug(`Subscribed to new topic after instantiation: ${topic}`)
  }

  _unsubscribeMethodsOfDeletedInstance (className, instance) {
    const topic = this._methodsTopic(className, instance)
    this._mqttUnsubscribe(topic)
    this._log.debug(`Unsubscribed from topic after deletion: ${topic}`)
  }

  _handleReconnect () {
    this._log.warn(`Reconnecting to ${this._broker}`)
    this.emit('reconnect')
  }

  _handleError (err) {
    this.emit('error', err)
  }

  _handleClose () {
    // the next connection prepares and announces itself afresh
    this._serving = false
    this.emit('close')
  }

  _handleOffline () {
    this.emit('offline')
  }

  _handleEnd () {
    this.emit('end')
  }
}

/**
 * Event 'connect'
 *
 * Emitted on successful (re)connection (i.e. connack rc=0).
 *
 * @event VrpcAgent#connect
 * @type {Object}
 * @property {Boolean} sessionPresent - A session from a previous connection is already present
 */

/**
 * Event 'reconnect'
 *
 * Emitted when a reconnect starts.
 *
 * @event VrpcAgent#reconnect
 */

/**
 * Event 'close'
 *
 * Emitted after a disconnection.
 *
 * @event VrpcAgent#close
 */

/**
 * Event 'offline'
 *
 * Emitted when the client goes offline.
 *
 * @event VrpcAgent#offline
 */

/**
 * Event 'error'
 *
 * Emitted when the client cannot connect (i.e. connack rc != 0) or when a
 * parsing error occurs. The following TLS errors will be emitted as an error
 * event:
 *
 * - ECONNREFUSED
 * - ECONNRESET
 * - EADDRINUSE
 * - ENOTFOUND
 *
 * @event VrpcAgent#error
 * @type {Object} Error
 */

/**
 * Event 'end'
 *
 * Emitted when mqtt.Client#end() is called. If a callback was passed to
 * mqtt.Client#end(), this event is emitted once the callback returns.
 *
 * @event VrpcAgent#end
 */

/**
 * Event 'clientGone'
 *
 * Emitted when a tracked VRPC client connection ended. Listeners receive
 * the connection id (unique per VrpcClient instance) and an info object
 * whose `clientId` is the identity-derived id shared by all connections
 * of one identity (undefined for clients < 3.8.0).
 *
 * @event VrpcAgent#clientGone
 * @type {String} connectionId
 * @type {Object} info
 */

module.exports = VrpcAgent
