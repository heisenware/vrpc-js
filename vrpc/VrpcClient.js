/*
__/\\\________/\\\____/\\\\\\\\\______/\\\\\\\\\\\\\_________/\\\\\\\\\_
__\/\\\_______\/\\\__/\\\///////\\\___\/\\\/////////\\\____/\\\////////__
 __\//\\\______/\\\__\/\\\_____\/\\\___\/\\\_______\/\\\__/\\\/___________
  ___\//\\\____/\\\___\/\\\\\\\\\\\/____\/\\\\\\\\\\\\\/__/\\\_____________
   ____\//\\\__/\\\____\/\\\//////\\\____\/\\\/////////___\/\\\_____________
    _____\//\\\/\\\_____\/\\\____\//\\\___\/\\\____________\//\\\____________
     ______\//\\\\\______\/\\\_____\//\\\__\/\\\_____________\///\\\__________
      _______\//\\\_______\/\\\______\//\\\_\/\\\_______________\////\\\\\\\\\_
       ________\///________\///________\///__\///___________________\/////////__


Non-intrusively adapts code and provides access in form of asynchronous remote
procedure calls (RPC).
Author: Dr. Burkhard C. Heisen (https://github.com/heisenware/vrpc)


Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2018 - 2022 Dr. Burkhard C. Heisen <burkhard.heisen@heisenware.com>.

Permission is hereby  granted, free of charge, to any  person obtaining a copy
of this software and associated  documentation files (the "Software"), to deal
in the Software  without restriction, including without  limitation the rights
to  use, copy,  modify, merge,  publish, distribute,  sublicense, and/or  sell
copies  of  the Software,  and  to  permit persons  to  whom  the Software  is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE  IS PROVIDED "AS  IS", WITHOUT WARRANTY  OF ANY KIND,  EXPRESS OR
IMPLIED,  INCLUDING BUT  NOT  LIMITED TO  THE  WARRANTIES OF  MERCHANTABILITY,
FITNESS FOR  A PARTICULAR PURPOSE AND  NONINFRINGEMENT. IN NO EVENT  SHALL THE
AUTHORS  OR COPYRIGHT  HOLDERS  BE  LIABLE FOR  ANY  CLAIM,  DAMAGES OR  OTHER
LIABILITY, WHETHER IN AN ACTION OF  CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE  OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const os = require('os')
const crypto = require('crypto')
const { nanoid } = require('nanoid')
const mqtt = require('mqtt')
const EventEmitter = require('events')

const VRPC_PROTOCOL_VERSION = 3

/**
 * Client capable of creating proxy objects and remotely calling
 * functions as provided through one or more (distributed) agents.
 *
 * @extends EventEmitter
 */
class VrpcClient extends EventEmitter {
  /**
   * Constructs a remote client, able to communicate with any distributed agents
   *
   * NOTE: Each instance creates its own physical connection to the broker.
   *
   * @constructor
   * @param {Object} options
   * @param {String} [options.username] MQTT username
   * @param {String} [options.password] MQTT password (if no token is provided)
   * @param {String} [options.token] Access token
   * @param {String} options.domain Sets the domain
   * @param {String} [options.agent="*"] Sets default agent
   * @param {String} [options.broker="mqtts://vrpc.io:8883"] Broker url in form: `<scheme>://<host>:<port>`
   * @param {Number} [options.timeout=12000] Maximum time in ms to wait for a RPC answer
   * @param {Object} [options.log=console] Log object (must support debug, info, warn, and error level)
   * @param {Boolean} [options.bestEffort=true] If true, message will be sent with best effort, i.e. no caching if offline
   * @param {String} [options.mqttClientId='<generated()>'] Explicitly sets the mqtt client id
   * @param {String} [options.identity] Explicitly sets a vrpc client identity
   * @param {String} [options.keepalive] Sets the MQTT keepalive interval (in seconds)
   * @param {Boolean} [options.requiresSchema=false] If true, any available schema information is shipped
   * @example
   * const client = new VrpcClient({
   *   domain: 'vrpc',
   *   broker: 'mqtt://vrpc.io'
   * })
   */
  constructor ({
    token,
    password,
    username,
    domain,
    agent = '*',
    broker = 'mqtts://vrpc.io:8883',
    timeout = 12 * 1000,
    log = 'console',
    bestEffort = true,
    mqttClientId = null,
    identity = null,
    keepalive = 30,
    requiresSchema = false
  } = {}) {
    super()
    // domain sanity check
    if (!domain) throw new Error('The domain must be specified')
    if (domain.match(/[+/#*]/)) {
      throw new Error(
        'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
      )
    }
    // agent sanity check
    if (agent.match(/[+/#]/)) {
      throw new Error(
        'The agent must NOT contain any of those characters: "+", "/", "#"'
      )
    }
    // identity sanity check
    if (identity && identity.match(/[+/#$]/)) {
      throw new Error(
        'The identity must NOT contain any of those characters: "+", "/", "#", "$"'
      )
    }
    this._token = token
    this._username = username
    this._password = password
    this._agent = agent
    this._domain = domain
    this._broker = broker
    this._timeout = timeout
    this._identity = identity
    this._keepalive = keepalive
    this._qos = this._qos = bestEffort ? 0 : 1
    this._requiresSchema = requiresSchema

    this._instance = nanoid(8)
    this._mqttClientId = mqttClientId || this._createMqttClientId()
    this._vrpcClientId = this._createVrpcClientId()
    this._agents = {}
    this._eventEmitter = new EventEmitter()
    this._invokeId = 0
    this._proxyId = 0
    this._client = null
    this._cachedSubscriptions = {}
    this._proxies = {}
    if (log === 'console') {
      this._log = console
      this._log.debug = () => {}
    } else {
      this._log = log
    }
  }

  /**
   * Provides a unique id for this client instance
   *
   * @returns {String} clientId
   */
  getClientId () {
    return this._vrpcClientId
  }

  /**
   * Actually connects to the MQTT broker.
   *
   * @emits connected
   * @returns {Promise} Resolves once connected within [timeout], rejects otherwise
   * @example
   * try {
   *   await client.connect()
   * } catch (err) {
   *   console.error(`Could not connect because: ${err.message}`)
   * }
   */
  async connect () {
    if (this._client && this._client.connected) return
    let username = this._username
    let password = this._password
    if (this._token) {
      username = username || this._generateUserName()
      password = this._token
    }
    const options = {
      username,
      password,
      clean: true,
      keepalive: this._keepalive,
      clientId: this._mqttClientId,
      rejectUnauthorized: false,
      connectTimeout: this._timeout,
      will: {
        topic: `${this._vrpcClientId}/__clientInfo__`,
        payload: JSON.stringify({ status: 'offline' })
      }
    }
    if (username === undefined) delete options.username
    if (password === undefined) delete options.password
    this._client = mqtt.connect(this._broker, options)

    this._client.on('error', err => {
      this.emit('error', err)
    })

    this._client.stream.on('error', err => {
      this.emit('error', err)
    })

    this.on('error', err => {
      this._log.debug(`Encountered MQTT error: ${err.message}`)
    })

    this._client.on('connect', () => {
      // This will give us an overview of all remotely available classes
      const agent = this._agent === '*' ? '+' : this._agent
      // Agent info
      this._mqttSubscribe(`${this._domain}/${agent}/__agentInfo__`)
      // Class info
      if (this._requiresSchema) {
        this._mqttSubscribe(`${this._domain}/${agent}/+/__classInfo__`)
      } else {
        this._mqttSubscribe(`${this._domain}/${agent}/+/__classInfoConcise__`)
      }
      // RPC responses
      this._mqttSubscribe(this._vrpcClientId)
      this.emit('connect')
    })

    this._client.on('message', (topic, message) => {
      if (message.length === 0) return
      const tokens = topic.split('/')
      const [domain, agent, klass, instance] = tokens
      if (domain !== this._domain) {
        this._log.warn(`Received message from foreign domain: ${domain}`)
        return
      }
      // AgentInfo message
      if (klass === '__agentInfo__') {
        const { status, hostname, version } = JSON.parse(message.toString())
        this._createIfNotExist(agent)
        this._agents[agent].status = status
        this._agents[agent].hostname = hostname
        this._agents[agent].version = version
        if (status === 'offline') {
          this._clearCachedSubscriptions({ lostAgent: agent })
        }
        this.emit('agent', { domain, agent, status, hostname, version })
        // ClassInfo message
      } else if (
        instance === '__classInfo__' ||
        instance === '__classInfoConcise__'
      ) {
        // Json properties: { className, instances, memberFunctions, staticFunctions }
        const json = JSON.parse(message.toString())
        this._createIfNotExist(agent)
        const oldClassInfo = this._agents[agent].classes[klass]
        const newInstances = json.instances || []
        const oldInstances = oldClassInfo ? oldClassInfo.instances : []
        const removed = oldInstances.filter(x => !newInstances.includes(x))
        const added = newInstances.filter(x => !oldInstances.includes(x))
        this._agents[agent].classes[klass] = json
        const { className, instances, memberFunctions, staticFunctions, meta } =
          json
        if (removed.length !== 0) {
          this.emit('instanceGone', removed, { domain, agent, className })
          removed.forEach(lostInstance =>
            this._clearCachedSubscriptions({ lostInstance })
          )
        }
        if (added.length !== 0) {
          this.emit('instanceNew', added, { domain, agent, className })
        }
        this.emit('class', {
          domain,
          agent,
          className,
          instances,
          memberFunctions,
          staticFunctions,
          meta: meta || {}
        })
        // RPC message
      } else {
        const { i, a, e, r } = JSON.parse(message.toString())
        this._eventEmitter.emit(i, { a, e, r })
      }
    })
    return new Promise((resolve, reject) => {
      this._client.once('offline', () => {
        this._client.end()
        reject(new Error(`Connection trial timed out (> ${this._timeout} ms)`))
      })
      this._client.once('connect', resolve)
    })
  }

  /**
   * Creates a new remote instance and provides a proxy to it.
   *
   * Remote instances can be "shared" or "isolated". Shared instances are
   * visible and re-attachable across clients as long as they are not
   * explicitly deleted. Life-cycle changes of shared instances are available
   * under the `class`, `instanceNew`, and `instanceGone` events. A shared
   * instance is created by default (`isIsolated: false`).
   *
   * When the `isIsolated` option is true, the remote instance stays invisible
   * to other clients and the corresponding proxy object is the only way to
   * issue commands.
   *
   * **NOTE** When creating an instance that already exists, the new proxy will
   * simply attach to (and not re-create) it - just like `getInstance()` was
   * called.
   *
   * @param {Object} options
   * @param {String} options.className Name of the class which should be
   * instantiated
   * @param {String} [options.instance] Name of the created instance. If not
   * provided an id will be generated
   * @param {Array} [options.args] Positional arguments for the constructor call
   * @param {String} [options.agent] Agent name. If not provided class default
   * is used
   * @param {bool} [options.cacheProxy=false] If true the proxy object for a
   * given instance is cached and (re-)used in subsequent calls
   * @param {bool} [options.isIsolated=false] If true the created proxy will be
   * visible only to the client who created it
   * @returns {Promise<Proxy>} Object reflecting a proxy to the original object
   * which is handled by the agent
   * @example
   * // create isolated instance
   * const proxy1 = await client.create({
   *   className: 'Foo',
   *   instance: 'myPersonalInstance',
   *   isIsolated: true
   * })
   * // create shared instance
   * const proxy2 = await client.create({
   *   className: 'Foo',
   *   instance: 'aSharedFooInstance'
   * })
   * // create shared instance providing three constructor arguments
   * const proxy3 = await client.create({
   *   className: 'Bar',
   *   instance: 'mySharedBarInstance',
   *   args: [42, "second argument", { some: 'option' }]
   * })
   */
  async create ({
    className,
    instance = nanoid(8),
    args = [],
    agent = this._agent,
    cacheProxy = false,
    isIsolated = false
  } = {}) {
    if (agent === '*') throw new Error('Agent must be specified')
    const json = {
      c: className,
      f: isIsolated ? '__createIsolated__' : '__createShared__',
      a: [instance, ...args],
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcClientId,
      v: VRPC_PROTOCOL_VERSION
    }
    const proxy = await this._getProxy(agent, className, json)
    if (instance && cacheProxy) this._proxies[instance] = proxy
    return proxy
  }

  /**
   * Get a remotely existing instance.
   *
   * Either provide a string only, then VRPC tries to find the instance using
   * client information, or additionally provide an object with explicit meta
   * data.
   *
   * @param {String} instance The instance to be retrieved
   * @param {Object} [options] Explicitly define agent and class
   * @param {String} [options.className] Name of the instance's class
   * @param {String} [options.agent] Agent name. If not provided class default is used as priority hit
   * @param {bool} [options.noWait=false] If true immediately fail if instance could not be found in local cache
   * @returns {Promise<Proxy>} Proxy object reflecting the remotely existing instance
   */
  async getInstance (instance, options = {}) {
    if (this._proxies[instance]) return this._proxies[instance]
    const { agent, className } = await this._getInstanceData(instance, options)
    return this._createProxy(agent, className, instance)
  }

  /**
   * Delete a remotely existing instance
   *
   * Either provide a string only, then VRPC tries to find the instance using
   * client information, or provide an object with explicit meta data.
   *
   * @param {String} instance The instance to be deleted
   * @param {Object} [options] Explicitly define agent and class
   * @param {String} options.className Name of the instance's class
   * @param {String} options.agent Agent name. If not provided class default is used as priority hit
   * @returns {Promise<Boolean>} true if successful, false otherwise
   */
  async delete (instance, options = {}) {
    const { agent, className } = await this._getInstanceData(instance, options)
    const json = {
      c: className,
      f: '__delete__',
      a: [instance],
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcClientId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/__delete__`
    this._mqttPublish(topic, JSON.stringify(json))
    if (this._proxies[instance]) delete this._proxies[instance]
    return this._handleAgentAnswer(json, agent)
  }

  /**
   * Calls a static function on a remote class
   *
   * @param {Object} options
   * @param {String} options.className Name of the static function's class
   * @param {String} options.functionName Name of the static function to be called
   * @param {Array} [options.args] Positional arguments of the static function call
   * @param {String} [options.agent] Agent name. If not provided class default is used
   * @returns {Promise<Any>} Return value of the remotely called function
   */
  async callStatic ({
    className,
    functionName,
    args = [],
    agent = this._agent
  } = {}) {
    const wrapped = this._wrapArguments({
      agent,
      className,
      functionName,
      args
    })
    if (!wrapped) return // Skipping remote call -> handled locally
    const json = {
      c: className,
      f: functionName,
      a: wrapped,
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcClientId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/${functionName}`
    await this._waitUntilClassIsOnline(agent, className)
    this._mqttPublish(topic, JSON.stringify(json))
    return this._handleAgentAnswer(json, agent)
  }

  /**
   * Calls the same function on all instances of a given class and returns an
   * aggregated result. It as well allows for batch event and callback
   * registrations. In this case the instanceId of the emitter is injected as
   * first argument of any event callback.
   *
   * NOTE: When no agent was specified as class default and no agent is
   * specified when calling this function, callAll will act on the requested
   * class across all available agents. The same is true when explicitly using a
   * wildcard (*) as agent value.
   *
   * @param {Object} options
   * @param {String} options.className Name of the static function's class
   * @param {Array} [options.args] Positional arguments of the static function
   * call
   * @param {String} [options.agent] Agent name. If not provided class default
   * is used
   * @returns {Promise<Object[]>} An array of objects `{ id, val, err }`
   * carrying the instance id, the return value and potential errors
   */
  async callAll ({
    className,
    functionName,
    args = [],
    agent = this._agent
  } = {}) {
    const json = {
      c: className,
      f: functionName,
      a: [],
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcClientId,
      v: VRPC_PROTOCOL_VERSION
    }
    if (agent === '*') {
      const result = []
      const agents = this.getAvailableAgents()
      for (const agent of agents) {
        const topic = `${this._domain}/${agent}/${className}/__static__/__callAll__`
        const wrapped = this._wrapArguments({
          agent,
          className,
          functionName,
          args
        })
        if (!wrapped) continue // using cache
        json.a = [functionName, ...wrapped]
        await this._waitUntilClassIsOnline(agent, className)
        this._mqttPublish(topic, JSON.stringify(json))
        const tmp = await this._handleAgentAnswer(json, agent)
        result.push(...tmp)
      }
      return result
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/__callAll__`
    const wrapped = this._wrapArguments({
      agent,
      className,
      functionName,
      args
    })
    if (!wrapped) return // using cache
    json.a = [functionName, ...wrapped]
    await this._waitUntilClassIsOnline(agent, className)
    this._mqttPublish(topic, JSON.stringify(json))
    return this._handleAgentAnswer(json, agent)
  }

  /**
   * Retrieves all information about the currently available components.
   *
   * @returns {Object} SystemInformation
   * ```ts
   * type SystemInformation = {
   *   [agent].status: string, // 'offline' or 'online'
   *   [agent].hostname: string,
   *   [agent].version: string,
   *   [agent].classes[className].instances: string[],
   *   [agent].classes[className].memberFunctions: string[],
   *   [agent].classes[className].staticFunctions: string[],
   *   [agent].classes[className].meta?: MetaData
   * }
   * ```
   */
  getSystemInformation () {
    return this._agents
  }

  /**
   * Retrieves all available agents.
   *
   * @param {Object} [options]
   * @param {Boolean} [options.mustBeOnline=true] Only retrieve currently online agents
   * @returns {Array} Array of agent names.
   */
  getAvailableAgents ({ mustBeOnline = true } = {}) {
    const agents = []
    if (mustBeOnline) {
      // loop agents
      for (const agent in this._agents) {
        const { status } = this._agents[agent]
        if (status === 'online') agents.push(agent)
      }
      return agents
    }
    return Object.keys(this._agents)
  }

  /**
   * Retrieves all available classes on specific agent.
   *
   * @param {Object} [options]
   * @param {String} [options.agent] Agent name. If not provided class default is used.
   * @param {Boolean} [options.mustBeOnline=true] Only retrieve currently online classes
   * @returns {Array} Array of class names.
   */
  getAvailableClasses ({ agent = this._agent, mustBeOnline = true } = {}) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (!this._agents[agent]) return []
    const { classes, status } = this._agents[agent]
    if (mustBeOnline && status !== 'online') return []
    return Object.keys(classes)
  }

  /**
   * Retrieves all (shared) instances on specific class and agent.
   *
   * @param {Object} [options]
   * @param {String} options.className Class name
   * @param {String} [options.agent] Agent name. If not provided class default is used
   * @param {Boolean} [options.mustBeOnline=true] Only retrieve currently online classes
   * @returns {Array} Array of instance names
   */
  getAvailableInstances ({
    className,
    agent = this._agent,
    mustBeOnline = true
  } = {}) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (!this._agents[agent]) return []
    const { classes, status } = this._agents[agent]
    if (mustBeOnline && status !== 'online') return []
    return classes[className] ? classes[className].instances : []
  }

  /**
   * Retrieves all member functions of specific class and agent.
   *
   * @param {Object} [options]
   * @param {String} options.className Class name
   * @param {String} [options.agent] Agent name. If not provided class default is used
   * @param {Boolean} [options.mustBeOnline=true] Only retrieve currently online classes
   * @returns {Array} Array of member function names
   */
  getAvailableMemberFunctions ({
    className,
    agent = this._agent,
    mustBeOnline = true
  } = {}) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (!this._agents[agent]) return []
    const { classes, status } = this._agents[agent]
    if (mustBeOnline && status !== 'online') return []
    return classes[className]
      ? classes[className].memberFunctions.map(x => this._stripSignature(x))
      : []
  }

  /**
   * Retrieves all static functions of specific class and agent.
   *
   * @param {Object} [options]
   * @param {String} options.className Class name
   * @param {String} [options.agent] Agent name. If not provided class default is used
   * @param {Boolean} [options.mustBeOnline=true] Only retrieve currently online classes
   * @returns {Array} Array of static function names
   */
  getAvailableStaticFunctions ({
    className,
    agent = this._agent,
    mustBeOnline = true
  } = {}) {
    if (agent === '*') throw new Error('Agent must be specified')
    if (!this._agents[agent]) return []
    const { classes, status } = this._agents[agent]
    if (mustBeOnline && status !== 'online') return []
    return classes[className]
      ? classes[className].staticFunctions.map(x => this._stripSignature(x))
      : []
  }

  /**
   * Reconnects to the broker by using a different token
   *
   * @param {String} token Access token as generated by: https://app.vrpc.io
   * @param {Object} [options]
   * @param {String} options.agent Agent name. If not provided class default is used
   * @returns {Promise} Promise that resolves once re-connected
   */
  async reconnectWithToken (token, { agent = this._agent } = {}) {
    this._token = token
    this._agent = agent
    this._client.end(() => this.connect())
    return new Promise(resolve => {
      this._client.once('connect', resolve)
    })
  }

  /**
   * Unregisters (= removal of persisted information) an offline agent
   *
   * @param agent The agent to be unregistered
   * @returns {Promise<Boolean>} Resolves to true in case of success, false otherwise
   */
  async unregisterAgent (agent) {
    if (this._agents[agent] && this._agents[agent].status === 'offline') {
      const agentTopic = `${this._domain}/${agent}/__agentInfo__`
      this._mqttPublish(agentTopic, null, { retain: true })
      const classes = this.getAvailableClasses({ agent, mustBeOnline: false })
      for (const className of classes) {
        const classTopic = `${this._domain}/${agent}/${className}/__classInfo__`
        this._mqttPublish(classTopic, null, { retain: true })
      }
      // Synchronize local cache
      delete this._agents[agent]
      return true
    }
    return false
  }

  /**
   * Ends the connection to the broker
   *
   * @returns {Promise} Resolves when ended
   */
  async end () {
    this._mqttPublish(
      `${this._vrpcClientId}/__clientInfo__`,
      JSON.stringify({ status: 'offline', v: VRPC_PROTOCOL_VERSION })
    )
    return new Promise(resolve => this._client.end(false, {}, resolve))
  }

  _generateUserName () {
    return `${this._domain}:client@${os.hostname()}-${os.platform()}-js`
  }

  _createMqttClientId () {
    const clientInfo =
      os.arch() +
      os.homedir() +
      os.hostname() +
      JSON.stringify(os.networkInterfaces()) +
      os.platform() +
      os.release() +
      os.totalmem() +
      os.type()
    // console.log('ClientInfo:', clientInfo)
    const md5 = crypto
      .createHash('md5')
      .update(clientInfo)
      .digest('hex')
      .substring(0, 12)
    return `vc3${this._instance}${md5}` // 3 + 8 + 12 = 23 (max clientId)
  }

  _createVrpcClientId () {
    const identity = this._identity || this._instance
    return `${this._domain}/${os.hostname()}/${identity}`
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
          if (err.message === 'client disconnecting') {
            // This most certainly relates to a bug in MQTT.js (#1284)
            this._log.error(`Failed to publish, because: ${err.message}`)
            this.emit('error', err)
            this._log.info('Forcing reconnect now...')
            this._client.disconnecting = false
            this._client.reconnect()
          }
        }
      }
    )
  }

  _mqttSubscribe (topic, options) {
    this._client.subscribe(
      topic,
      { qos: this._qos, ...options },
      (err, granted) => {
        if (err) {
          this._log.warn(
            `Could not subscribe to topic(s): '${topic}', because: ${err.message}`
          )
          if (err.message === 'client disconnecting') {
            // This most certainly relates to a bug in MQTT.js (#1284)
            this._log.error(`Failed to subscribe, because: ${err.message}`)
            this.emit('error', err)
            this._log.info('Forcing reconnect now...')
            this._client.disconnecting = false
            this._client.reconnect()
          }
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
          }
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
            this._log.debug(`Already subscribed to: ${topic}`)
          }
        }
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

  _createIfNotExist (agent) {
    if (!this._agents[agent]) {
      this._agents[agent] = { classes: {} }
    }
  }

  async _getProxy (agent, className, json) {
    const { f, i } = json
    const topic = `${this._domain}/${agent}/${className}/__static__/${f}`
    await this._waitUntilClassIsOnline(agent, className)
    this._mqttPublish(topic, JSON.stringify(json))
    return new Promise((resolve, reject) => {
      const msg = `Proxy creation for class "${className}" on agent "${agent}" and domain "${this._domain}" timed out (> ${this._timeout} ms)`
      const timer = setTimeout(() => {
        this._eventEmitter.removeAllListeners(i)
        reject(new Error(msg))
      }, this._timeout)
      this._eventEmitter.once(i, ({ e, r }) => {
        clearTimeout(timer)
        if (e) {
          reject(new Error(e))
        } else {
          const proxy = this._createProxy(agent, className, r)
          resolve(proxy)
        }
      })
    })
  }

  async _waitUntilClassIsOnline (agent, className) {
    if (this._hasClassOnline(agent, className)) return
    return new Promise((resolve, reject) => {
      let timer = null
      const checkClass = () => {
        if (this._hasClassOnline(agent, className)) {
          if (timer) clearTimeout(timer)
          this.removeListener('class', checkClass)
          resolve()
        }
      }
      timer = setTimeout(() => {
        this.removeListener('class', checkClass)
        reject(
          new Error(
            `Proxy creation for class "${className}" on agent "${agent}" and domain "${this._domain}" timed out (> ${this._timeout} ms)`
          )
        )
      }, this._timeout)
      this.on('class', checkClass)
    })
  }

  _hasClassOnline (agent, className) {
    return (
      this._agents[agent] &&
      this._agents[agent].status === 'online' &&
      this._agents[agent].classes[className]
    )
  }

  _createProxy (agent, className, instance) {
    const targetTopic = `${this._domain}/${agent}/${className}/${instance}`
    const proxyId = `${this._instance}-${this._proxyId++}`
    const proxy = {
      vrpcClientId: this._vrpcClientId,
      vrpcInstanceId: instance,
      vrpcProxyId: proxyId
    }
    let functions = this._agents[agent].classes[className].memberFunctions
    // Strip off argument signature
    functions = functions.map(name => {
      const pos = name.indexOf('-')
      if (pos > 0) return name.substring(0, pos)
      return name
    })
    // Remove overloads
    const uniqueFuncs = new Set(functions)
    // Build proxy
    uniqueFuncs.forEach(functionName => {
      // as we are messing with Node.js' event system we have to intercept here
      if (functionName === 'removeAllListeners') {
        proxy[functionName] = async eventName => {
          if (!eventName) {
            throw new Error('VRPC does not support removing all listeners')
          }
          const topic = `${this._domain}/${agent}/${className}/${instance}:${eventName}`
          const id = `__e__${topic}`
          if (this._cachedSubscriptions[topic]) {
            this._eventEmitter.removeAllListeners(id)
            this._mqttUnsubscribe(topic)
            delete this._cachedSubscriptions[topic]
          }
          try {
            const json = {
              c: instance,
              f: functionName,
              a: [eventName],
              i: `${this._instance}-${
                this._invokeId++ % Number.MAX_SAFE_INTEGER
              }`,
              s: this._vrpcClientId,
              v: VRPC_PROTOCOL_VERSION
            }
            this._mqttPublish(
              `${targetTopic}/${functionName}`,
              JSON.stringify(json)
            )
            return this._handleAgentAnswer(json, agent)
          } catch (err) {
            throw new Error(
              `Could not remotely call "${functionName}" because: ${err.message}`
            )
          }
        }
        return
      }
      proxy[functionName] = async (...args) => {
        const wrapped = this._wrapArguments({
          agent,
          className,
          instance,
          proxyId,
          functionName,
          args
        })
        if (!wrapped) return true // Skipping remote call -> handled locally
        try {
          const json = {
            c: instance,
            f: functionName,
            a: wrapped,
            i: `${this._instance}-${
              this._invokeId++ % Number.MAX_SAFE_INTEGER
            }`,
            s: this._vrpcClientId,
            v: VRPC_PROTOCOL_VERSION
          }
          this._mqttPublish(
            `${targetTopic}/${functionName}`,
            JSON.stringify(json)
          )
          return this._handleAgentAnswer(json, agent)
        } catch (err) {
          throw new Error(
            `Could not remotely call "${functionName}" because: ${err.message}`
          )
        }
      }
    })
    if (!uniqueFuncs.has('vrpcOn') && !uniqueFuncs.has('vrpcOff')) {
      proxy.vrpcOn = async (functionName, ...args) => {
        if (!uniqueFuncs.has(functionName)) throw new Error('Bad magic')
        const wrapped = this._wrapArguments({
          agent,
          className,
          instance,
          proxyId,
          functionName: 'vrpcOn',
          args: [functionName, ...args]
        })
        if (!wrapped) return // Skipping remote call -> handled locally
        try {
          const json = {
            c: instance,
            f: functionName,
            a: wrapped.slice(1), // first argument was remote function name
            i: `${this._instance}-${
              this._invokeId++ % Number.MAX_SAFE_INTEGER
            }`,
            s: this._vrpcClientId,
            v: VRPC_PROTOCOL_VERSION
          }
          this._mqttPublish(
            `${targetTopic}/${functionName}`,
            JSON.stringify(json)
          )
          return this._handleAgentAnswer(json, agent)
        } catch (err) {
          throw new Error(
            `Could not remotely call "${functionName}" because: ${err.message}`
          )
        }
      }
      proxy.vrpcOff = functionName => {
        const topic = `${this._domain}/${agent}/${className}/${instance}-${functionName}`
        const id = `__e__${topic}`
        this._eventEmitter.removeAllListeners(id)
      }
    }
    return proxy
  }

  async _handleAgentAnswer ({ i, c, f }, agent) {
    return new Promise((resolve, reject) => {
      const msg = `Function call "${c}::${f}()" on agent "${agent}" timed out (> ${this._timeout} ms)`
      const timer = setTimeout(() => {
        this._eventEmitter.removeAllListeners(i)
        reject(new Error(msg))
      }, this._timeout)
      this._eventEmitter.once(i, data => {
        clearTimeout(timer)
        if (data.e) {
          const { message, cause } = VrpcClient._prepareError(data.e)
          reject(new Error(`[vrpc ${agent}-${c}-${f}]: ${message}`, { cause }))
        } else {
          const ret = data.r
          // Handle functions returning a promise
          if (typeof ret === 'string' && ret.substring(0, 5) === '__p__') {
            this._eventEmitter.once(ret, promiseData => {
              if (promiseData.e) {
                const { message, cause } = VrpcClient._prepareError(
                  promiseData.e
                )
                reject(
                  new Error(`[vrpc ${agent}-${c}-${f}]: ${message}`, { cause })
                )
              } else {
                resolve(promiseData.r)
              }
            })
          } else {
            resolve(ret)
          }
        }
      })
    })
  }

  static _prepareError (rpcError) {
    if (typeof rpcError === 'object') {
      return { message: rpcError.message, cause: rpcError.cause }
    }
    return { message: rpcError, cause: undefined }
  }

  async _waitForInstance (instance, options = {}) {
    return new Promise((resolve, reject) => {
      const handler =
        timer =>
        (instances, { agent, className }) => {
          if (instances.includes(instance)) {
            if (options.agent && agent !== options.agent) return
            if (options.className && className !== options.className) return
            clearTimeout(timer)
            this.removeListener('instanceNew', handler)
            resolve({ agent, className, instance })
          }
        }
      const timer = setTimeout(() => {
        this.removeListener('instanceNew', handler(timer))
        const msg = `Could not find instance: ${instance} (> ${this._timeout} ms)`
        reject(new Error(msg))
      }, this._timeout)
      this.on('instanceNew', handler(timer))
    })
  }

  _wrapArguments ({ agent, className, instance, proxyId, functionName, args }) {
    const wrapped = []
    for (const [i, x] of args.entries()) {
      // Check whether provided argument is a function
      if (this._isFunction(x)) {
        const callback = x
        if (
          functionName === 'vrpcOn' ||
          (functionName === 'on' && i === 1 && typeof args[0] === 'string')
        ) {
          // special case of an (remote-)event emitter registration
          // we test three conditions:
          // 1) functionName must be "on"
          // 2) callback is second argument
          // 3) first argument was string
          const event = args[0]
          const id = this._onRemoteEvent({
            agent,
            className,
            instance,
            event,
            callback
          })
          wrapped.push(id)
          continue
        } else if (
          (functionName === 'off' || functionName === 'removeListener') &&
          i === 1 &&
          typeof args[0] === 'string'
        ) {
          const event = args[0]
          const id = this._offRemoteEvent({
            agent,
            className,
            instance,
            event,
            callback
          })
          wrapped.push(id)
          continue
        } else {
          // Regular function callback (can be static or member function)
          const remoteId = proxyId || `${agent}-${className}`
          const id = `__f__${remoteId}-${functionName}-${i}-${
            this._invokeId++ % Number.MAX_SAFE_INTEGER
          }`
          wrapped.push(id)
          this._eventEmitter.once(id, ({ a }) => x.apply(null, a))
          continue
        }
      }
      // special case of an EventEmitter provided as argument
      if (this._isEmitter(x)) {
        const { emitter, event } = x
        const id = this._onRemoteEvent({
          agent,
          className,
          instance,
          event,
          callback: (...args) => emitter.emit(event, ...args)
        })
        wrapped.push(id)
        continue
      }
      // default behavior is to not touch
      wrapped.push(x)
    }
    return wrapped
  }

  _onRemoteEvent ({ agent, className, instance, event, callback }) {
    // the topic on which any remote event will be published to
    const topic = instance
      ? `${this._domain}/${agent}/${className}/${instance}:${event}`
      : `${this._domain}/${agent}/${className}/${event}`
    // prepare a special id for the agent to know that events should be
    // published to the provided topic after the prefix
    const id = `__e__${topic}`
    // call our proxy callback when remote events were received
    const handler = ({ a }) => callback.apply(null, a)
    this._eventEmitter.on(id, handler)
    if (!this._cachedSubscriptions[topic]) {
      // when not yet subscribed to this topic do it now
      this._mqttSubscribe(topic)
      this._cachedSubscriptions[topic] = [{ callback, handler }]
      return id
    }
    // otherwise just add the new callback-handler pair
    this._cachedSubscriptions[topic].push({ callback, handler })
    return id
  }

  _offRemoteEvent ({ agent, className, instance, event, callback }) {
    const topic = instance
      ? `${this._domain}/${agent}/${className}/${instance}:${event}`
      : `${this._domain}/${agent}/${className}/${event}`
    const id = `__e__${topic}`
    if (this._cachedSubscriptions[topic]) {
      const index = this._cachedSubscriptions[topic].findIndex(
        x => x.callback === callback
      )
      if (index === -1) {
        this._log.warn(`Failed removing event listener ${id}`)
        return null
      }
      const [{ handler }] = this._cachedSubscriptions[topic].splice(index, 1)
      this._eventEmitter.removeListener(id, handler)
      if (this._cachedSubscriptions[topic].length === 0) {
        this._mqttUnsubscribe(topic)
        delete this._cachedSubscriptions[topic]
        return id
      }
      return id
    } else {
      this._log.warn(`Can not unsubscribe from non-existing event: ${event}`)
    }
    return id
  }

  _clearCachedSubscriptions ({ lostAgent, lostInstance }) {
    const obsoleteTopics = Object.keys(this._cachedSubscriptions).filter(
      topic => {
        const [, agent, , instanceEvent] = topic.split('/')
        const [instance] = instanceEvent.split(':')
        if (agent === lostAgent || instance === lostInstance) {
          return true
        }
        return false
      }
    )
    obsoleteTopics.forEach(topic => {
      const id = `__e__${topic}`
      this._log.info(`Clearing subscriptions for obsolete topic: ${topic}`)
      const subscriptions = this._cachedSubscriptions[topic]
      subscriptions.forEach(({ handler }) => {
        this._eventEmitter.removeListener(id, handler)
      })
      this._mqttUnsubscribe(topic)
      delete this._cachedSubscriptions[topic]
    })
  }

  _stripSignature (method) {
    const pos = method.indexOf('-')
    if (pos > 0) return method.substring(0, pos)
    return method
  }

  _isFunction (variable) {
    const getType = {}
    const type = getType.toString.call(variable)
    return (
      variable &&
      (type === '[object Function]' || type === '[object AsyncFunction]')
    )
  }

  _isEmitter (variable) {
    return (
      variable &&
      typeof variable === 'object' &&
      variable.hasOwnProperty('emitter') &&
      variable.hasOwnProperty('event') &&
      typeof variable.emitter === 'object' &&
      typeof variable.emitter.emit === 'function'
    )
  }

  async _getInstanceData (instance, options) {
    const instanceData = this._getInstanceFromCache(instance, options)
    if (!instanceData) {
      if (options.noWait) {
        throw new Error(`Could not find instance: ${instance}`)
      }
      return this._waitForInstance(instance, options)
    }
    return instanceData
  }

  _getInstanceFromCache (instance, options = {}) {
    // when no agent is specified, but an explicit class default exists give
    // such instances priority in being found
    if (!options.agent && this._agent !== '*') {
      const { classes, status } = this._agents[this._agent]
      if (!classes || status === 'offline') {
        for (const className in classes) {
          if (options.className && className !== options.className) continue
          const { instances } = classes[className]
          if (!instances) continue
          if (instances.includes(instance)) {
            return { agent, className, instance }
          }
        }
      }
    }
    // loop agents
    for (const agent in this._agents) {
      if (options.agent && agent !== options.agent) continue
      const { classes, status } = this._agents[agent]
      if (!classes || status === 'offline') continue
      for (const className in classes) {
        if (options.className && className !== options.className) continue
        const { instances } = classes[className]
        if (!instances) continue
        if (instances.includes(instance)) {
          return { agent, className, instance }
        }
      }
    }
  }

  _indicateDeprecation (msg) {
    // We need to be defensive here because of the in browser usage
    if (process && process.emitWarning) {
      process.emitWarning(msg, 'DeprecationWarning')
    } else {
      this._log.warn('DEPRECATED ', msg)
    }
  }
}

/**
 * Event 'agent'
 *
 * This event is fired whenever an agent is added or removed, or whenever
 * an agent changes its status (switches between online or offline).
 *
 * @event VrpcClient#agent
 * @param {Object} info
 * @param {String} info.domain - Domain name
 * @param {String} info.agent - Agent name
 * @param {String} info.status - Agent status, can be 'offline' or 'online'
 * @param {String} info.hostname - Name of the host running the agent
 * @param {String} info.version - User-defined version of the agent
 */

/**
 * Event 'class'
 *
 * Emitted whenever a class is added or removed, or when instances
 * or functions of this class have changed.
 *
 * @event VrpcClient#class
 * @param {Object} info
 * @param {String} info.domain - Domain name
 * @param {String} info.agent - Agent name
 * @param {String} info.className - Class name
 * @param {Array.<String>} info.instances - Array of instances
 * @param {Array.<String>} info.memberFunctions - Array of member functions
 * @param {Array.<String>} info.staticFunctions - Array of static functions
 * @param {MetaData} info.meta - Object associating further information to functions
 */

/**
 * Event 'instanceNew'
 *
 * Emitted whenever a new instance was created.
 *
 * @event VrpcClient#instanceNew
 *
 * @param {Array.<String>} addedInstances - An array of newly added instances
 * @param {Object} info
 * @param {String} info.domain - Domain name
 * @param {String} info.agent - Agent name
 * @param {String} info.className - Class name
 */

/**
 * Event 'instanceGone'
 *
 * Emitted whenever a new instance was removed.
 *
 * @event VrpcClient#instanceGone
 *
 * @param {Array.<String>} removedInstances - An array of removed instances
 * @param {Object} info
 * @param {String} info.domain - Domain name
 * @param {String} info.agent - Agent name
 * @param {String} info.className - Class name
 */

/**
 * Event 'connect'
 *
 * Emitted on successful (re)connection (i.e. connack rc=0).
 *
 * @event VrpcClient#connect
 * @type {Object}
 * @property {Boolean} sessionPresent - A session from a previous connection is already present
 */

/**
 * Event 'reconnect'
 *
 * Emitted when a reconnect starts.
 *
 * @event VrpcClient#reconnect
 */

/**
 * Event 'close'
 *
 * Emitted after a disconnection.
 *
 * @event VrpcClient#close
 */

/**
 * Event 'offline'
 *
 * Emitted when the client goes offline.
 *
 * @event VrpcClient#offline
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
 * @event VrpcClient#error
 * @type {Object} Error
 */

/**
 * Event 'end'
 *
 * Emitted when mqtt.Client#end() is called. If a callback was passed to
 * mqtt.Client#end(), this event is emitted once the callback returns.
 *
 * @event VrpcClient#end
 */

module.exports = VrpcClient
