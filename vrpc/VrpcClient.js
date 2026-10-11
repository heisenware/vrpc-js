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
Copyright (c) 2018 Dr. Burkhard C. Heisen <burkhard.heisen@heisenware.com>.

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
const { nanoid } = require('nanoid')
const mqtt = require('mqtt')
const EventEmitter = require('events')
const SubscribeRetrier = require('./SubscribeRetrier')
const ReconnectBackoff = require('./ReconnectBackoff')
const NamePattern = require('./namePattern')

const VRPC_PROTOCOL_VERSION = 4

// a function declared `@returns {Registration}` (or a promise of one)
const DECLARED_REGISTRATION = /^(Promise\.?<\s*)?Registration\s*>?$/

// mqtt clients this client ended on purpose: the 'client disconnecting'
// workaround must never revive one of them
const ENDED = new WeakSet()

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
   * @param {String} [options.broker="mqtts://broker.hivemq.com:8883"] Broker url in form: `<scheme>://<host>:<port>`
   * @param {Number} [options.timeout=12000] Maximum time in ms to wait for a RPC answer
   * @param {Object} [options.log=console] Log object (must support debug, info, warn, and error level)
   * @param {Boolean} [options.bestEffort=true] If true, message will be sent with best effort, i.e. no caching if offline
   * @param {String} [options.mqttClientId='<generated()>'] Explicitly sets the mqtt client id
   * @param {String} [options.identity] Explicitly sets a vrpc client identity
   * @param {String} [options.keepalive] Sets the MQTT keepalive interval (in seconds). In browsers the ping runs on a Web Worker timer, so a hidden tab keeps its session
   * @param {Boolean} [options.requiresSchema=false] If true, any available schema information is shipped
   * @example
   * const client = new VrpcClient({
   *   domain: 'vrpc',
   *   broker: 'mqtts://broker.hivemq.com:8883'
   * })
   * @param {Object} [obj.tls] TLS settings for a secure broker: `{ ca, rejectUnauthorized }`. Without it the broker's certificate is not verified (the historical behaviour); with `ca` the broker must present a chain the given certificates anchor.
   */
  constructor ({
    token,
    password,
    username,
    domain,
    agent = '*',
    broker = 'mqtts://broker.hivemq.com:8883',
    timeout = 12 * 1000,
    log = 'console',
    bestEffort = true,
    mqttClientId = null,
    identity = null,
    keepalive = 30,
    requiresSchema = false,
    tls = null
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
    // mqtt client id sanity check: it becomes the second segment of every
    // topic this client receives on, so it must be one plain segment
    if (mqttClientId !== null && mqttClientId !== undefined) {
      if (typeof mqttClientId !== 'string' || mqttClientId.length === 0) {
        throw new Error('The mqttClientId must be a non-empty string')
      }
      if (mqttClientId.match(/[+/#]/)) {
        throw new Error(
          'The mqttClientId must NOT contain any of those characters: "+", "/", "#"'
        )
      }
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
    this._tls = tls
    this._vrpcClientId = this._createVrpcClientId()
    // the part of the connection id nobody else can learn: a broker that
    // confines a client to topics under its own mqtt client id keeps
    // every response, event and presence message of this connection
    // private, and a sender field nobody can read cannot be forged
    this._connectionSecret = nanoid(16)
    this._vrpcConnectionId = this._createVrpcConnectionId()
    this._agents = {}
    this._eventEmitter = new EventEmitter()
    this._invokeId = 0
    this._proxyId = 0
    this._client = null
    this._cachedSubscriptions = {}
    this._proxies = {}
    // `<agent>/<class>/<instance>` -> the isolated instances this connection
    // created (no class info lists them)
    this._ownIsolated = new Map()
    // callback -> Map(subscription identity -> topic), see _subscriptionTopic
    this._subscriptionTopics = new WeakMap()
    this._subscriptionCount = 0
    this._emitterListener = new WeakMap()
    this._pendingSubscriptions = new Map()
    this._pendingUnsubscriptions = new Map()
    // agents this client declares its subscriptions to again once they
    // announce themselves: after this client's own reconnect, and after the
    // agent's loss (the loss heals)
    this._redeclare = new Set()
    // agent -> withdrawals that could not be sent yet ({ sub, context })
    this._pendingWithdrawals = new Map()
    // the client's own inbox is subscribed (answers can arrive)
    this._inboxReady = false
    // labels callbacks carry towards the agent's list of registrations
    this._subscriberLabels = new WeakMap()
    if (log === 'console') {
      this._log = console
      this._log.debug = () => {}
    } else {
      this._log = log
    }
    // refused subscriptions are retried until granted
    this._subscribeRetrier = new SubscribeRetrier({
      subscribe: (topics, options) => this._mqttSubscribe(topics, options).catch(() => {}),
      log: this._log
    })
  }

  /**
   * Provides the identity-derived id of this client
   *
   * Every client constructed with the same domain, host and identity
   * reports the same client id: it names the principal, not the
   * connection. Agents receive it as `clientId` in the presence messages
   * and can group the connections (e.g. browser tabs) of one identity by
   * it. See getConnectionId() for the id that is unique per instance.
   *
   * @returns {String} clientId
   */
  getClientId () {
    return this._vrpcClientId
  }

  /**
   * Provides the unique id of this connection
   *
   * Unique per VrpcClient instance: two clients sharing one identity still
   * have distinct connection ids. Agents key all their bookkeeping by it
   * (response routing, event listeners, isolated instances, presence), so
   * one connection ending never disturbs the others of the same identity.
   *
   * It reads `<domain>/<mqttClientId>/<secret>`: the mqtt client id is
   * what the broker knows this connection by, so a broker can confine the
   * client to its own topics, and the secret is random per connection, so
   * nobody who cannot read those topics can impersonate the connection
   * towards an agent. Treat it as a credential: do not log or share it.
   *
   * @returns {String} connectionId
   */
  getConnectionId () {
    return this._vrpcConnectionId
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

  /**
   * Actually connects to the MQTT broker.
   *
   * A refused connection is retried with a growing wait (doubling up to
   * 30 s, back to the start once connected), and every refusal is emitted
   * as 'error', so a caller can renew its credentials (see
   * updateCredentials).
   *
   * @emits connected
   * @param {Object} [options]
   * @param {Boolean} [options.keepTrying=false] If true, a connection that
   * is not made within [timeout] still rejects the returned promise, but
   * keeps trying until end() and emits 'connect' once it stands, and a
   * further connect({ keepTrying: true }) while it is trying waits for it
   * instead of opening a second connection. If false (the default), nothing
   * changes: the client gives up at the timeout and must be connected again.
   * @returns {Promise} Resolves once connected within [timeout], rejects otherwise
   * @example
   * try {
   *   await client.connect()
   * } catch (err) {
   *   console.error(`Could not connect because: ${err.message}`)
   * }
   */
  async connect ({ keepTrying = false } = {}) {
    if (this._client && this._client.connected) return
    // keepTrying: a connection that is still trying is waited for, never
    // doubled (without it, connect() behaves as it always did)
    if (keepTrying && this._client && !ENDED.has(this._client)) {
      return this._awaitConnect(this._client, { keepTrying })
    }
    const { username, password } = this._credentials()
    const options = {
      username,
      password,
      clean: true,
      keepalive: this._keepalive,
      clientId: this._mqttClientId,
      ...VrpcClient._tlsOptions(this._tls),
      connectTimeout: this._timeout,
      // a refused CONNACK is retried like any other failed attempt (see
      // VrpcAgent): whoever wants a refusal to be final ends the client
      reconnectOnConnackError: true,
      will: {
        topic: `${this._vrpcConnectionId}/__clientInfo__`,
        payload: JSON.stringify({
          status: 'offline',
          clientId: this._vrpcClientId
        })
      }
    }
    if (username === undefined) delete options.username
    if (password === undefined) delete options.password

    this.on('error', err => {
      this._log.debug(`Encountered MQTT error: ${err.message}`)
    })

    this._client = mqtt.connect(this._broker, options)
    this._backoff = new ReconnectBackoff(this._client)

    // Persistent lifecycle handlers
    this._client.on('offline', () => {
      this._log.warn('MQTT client went offline.')
      // Clear the cache to ensure a fresh state upon reconnection
      this._agents = {}
      this._proxies = {}
      // the agents delete this connection's isolated instances once its
      // will is out
      this._ownIsolated.clear()
      this.emit('offline')
    })

    this._client.on('reconnect', () => {
      this._log.info('MQTT client is attempting to reconnect...')
      this.emit('reconnect')
    })

    this._client.on('error', err => {
      this.emit('error', err)
    })

    this._client.stream.on('error', err => {
      this.emit('error', err)
    })

    this._client.on('connect', async () => {
      // the subscriptions this client holds are declared again, to every
      // agent announcing protocol 4, once the inbox stands (an agent that
      // saw this connection go has withdrawn them; one that did not keeps
      // them, declaring again is a no-op there)
      this._inboxReady = false
      for (const sub of Object.values(this._cachedSubscriptions)) {
        this._redeclare.add(sub.agent)
      }
      // forward the good news
      this.emit('connect')
      // everything is subscribed afresh below: pending retries are moot
      this._subscribeRetrier.cancel()
      try {
        // This will give us an overview of all remotely available classes
        const agent = this._agent === '*' ? '+' : this._agent
        // Agent info
        await this._mqttSubscribe(`${this._domain}/${agent}/__agentInfo__`)
        // Class info
        if (this._requiresSchema) {
          await this._mqttSubscribe(`${this._domain}/${agent}/+/__classInfo__`)
        } else {
          await this._mqttSubscribe(
            `${this._domain}/${agent}/+/__classInfoConcise__`
          )
        }
        // Single wildcard catches BOTH RPC responses (length 3) AND events (length 4)
        await this._mqttSubscribe(`${this._vrpcConnectionId}/#`)
        this._inboxReady = true
        for (const agent of Array.from(this._redeclare)) {
          this._redeclareTo(agent)
        }
        for (const agent of Array.from(this._pendingWithdrawals.keys())) {
          this._flushWithdrawals(agent)
        }

        // Re-subscribe to all cached event topics
        this._log.debug('Restoring event subscriptions after reconnect...')
        const promises = []
        for (const topic of Object.keys(this._cachedSubscriptions)) {
          promises.push(this._mqttSubscribe(topic))
        }
        await Promise.allSettled(promises)
      } catch (err) {
        this._log.error(
          `Encountered issue while setting up subscriptions after connect: ${err.message}`
        )
      }
    })

    this._client.on('message', (topic, message) => {
      if (message.length === 0) return
      try {
        const tokens = topic.split('/')
        const [domain, agent, klass, instance] = tokens
        if (domain !== this._domain) {
          this._log.warn(`Received message from foreign domain: ${domain}`)
          return
        }
        // AgentInfo message
        if (klass === '__agentInfo__') {
          const { status, hostname, version, v } = JSON.parse(
            message.toString()
          )
          this._createIfNotExist(agent)
          this._agents[agent].status = status
          this._agents[agent].hostname = hostname
          this._agents[agent].version = version
          // the agent's protocol version (undefined before 3)
          this._agents[agent].v = v
          if (status === 'offline') {
            this._loseAgent(agent, v)
          } else {
            this._redeclareTo(agent)
            this._flushWithdrawals(agent)
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
          const {
            className,
            instances,
            memberFunctions,
            staticFunctions,
            meta
          } = json
          if (removed.length !== 0) {
            this.emit('instanceGone', removed, { domain, agent, className })
            removed.forEach(lostInstance =>
              this._clearCachedSubscriptions({ lostInstance, agent, className })
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
          const { i, a, e, r, u, end } = JSON.parse(message.toString())
          this._eventEmitter.emit(i, { a, e, r, u, end })
        }
      } catch (err) {
        this._log.error(
          `Could not parse MQTT message on topic "${topic}": ${err.message}`
        )
      }
    })

    return this._awaitConnect(this._client, { keepTrying })
  }

  _awaitConnect (client, { keepTrying }) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // This will run only if the 'connect' event isn't fired in time.
        const error = new Error(
          `Connection trial timed out (> ${this._timeout} ms)`
        )
        if (keepTrying) {
          // the client keeps trying in the background, until end()
          client.removeListener('connect', onConnect)
          reject(error)
          return
        }
        // We explicitly end the client to stop it from retrying in the background.
        VrpcClient._endMqtt(client, true, {}, () => reject(error))
      }, this._timeout)

      const onConnect = () => {
        // If we connect successfully, clear the timeout and resolve the promise.
        clearTimeout(timeout)
        resolve()
      }
      client.once('connect', onConnect)
    })
  }

  /**
   * Replaces the credentials the connection logs in with
   *
   * The broker checks credentials when a connection is made: a live
   * connection carries on undisturbed, and the next one - after a network
   * loss, a broker restart - logs in with these. A connection that is
   * being refused right now tries again with them within a second,
   * instead of waiting out its back-off.
   *
   * @param {Object} credentials Only the given fields change
   * @param {String} [credentials.username] MQTT username
   * @param {String} [credentials.password] MQTT password (if no token is used)
   * @param {String} [credentials.token] Access token
   */
  updateCredentials ({ username, password, token } = {}) {
    if (username !== undefined) this._username = username
    if (password !== undefined) this._password = password
    if (token !== undefined) this._token = token
    if (!this._client || ENDED.has(this._client)) return
    const credentials = this._credentials()
    for (const key of ['username', 'password']) {
      if (credentials[key] === undefined) delete this._client.options[key]
      else this._client.options[key] = credentials[key]
    }
    this._backoff.hurry()
  }

  // what the broker sees: a token rides as the password
  _credentials () {
    let username = this._username
    let password = this._password
    if (this._token) {
      username = username || this._generateUserName()
      password = this._token
    }
    return { username, password }
  }

  static _endMqtt (client, force, options, callback) {
    ENDED.add(client)
    client.end(force, options, callback)
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
    if (!this._isConnected()) {
      throw new Error('Client is not connected')
    }
    if (agent === '*') throw new Error('Agent must be specified')
    const json = {
      c: className,
      f: isIsolated ? '__createIsolated__' : '__createShared__',
      a: [instance, ...args],
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    const proxy = await this._getProxy(agent, className, json)
    // no class info lists an isolated instance: its creator remembers it
    if (isIsolated) {
      this._ownIsolated.set(`${agent}/${className}/${instance}`, {
        agent,
        className,
        instance
      })
    }
    if (instance && cacheProxy) {
      this._proxies[`${agent}/${className}/${instance}`] = {
        agent,
        className,
        instance,
        proxy
      }
    }
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
    if (!this._isConnected()) {
      throw new Error('Client is not connected')
    }
    const cached = this._cachedProxy(instance, options)
    if (cached) return cached
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
    if (!this._isConnected()) {
      throw new Error('Client is not connected')
    }
    const { agent, className } = await this._getInstanceData(instance, options)
    const json = {
      c: className,
      f: '__delete__',
      a: [instance],
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/__delete__`
    this._mqttPublish(topic, JSON.stringify(json))
    delete this._proxies[`${agent}/${className}/${instance}`]
    const deleted = await this._handleAgentAnswer(json, agent)
    if (deleted === true) {
      this._ownIsolated.delete(`${agent}/${className}/${instance}`)
    }
    // the answer and the class info that no longer lists the instance
    // travel on different topics, and a broker need not keep their order:
    // what this client deleted is gone for it at once
    if (deleted === true) this._forgetInstance({ agent, className, instance })
    return deleted
  }

  /**
   * Takes an instance off this client's view of its agent, the way a class
   * info without it does: listing, instanceGone, cached subscriptions. A
   * class info that arrives later finds nothing left to remove.
   */
  _forgetInstance ({ agent, className, instance }) {
    const info = this._agents[agent] && this._agents[agent].classes[className]
    if (!info || !Array.isArray(info.instances)) return
    if (!info.instances.includes(instance)) return
    info.instances = info.instances.filter(x => x !== instance)
    const domain = this._domain
    this.emit('instanceGone', [instance], { domain, agent, className })
    this._clearCachedSubscriptions({ lostInstance: instance, agent, className })
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
    if (!this._isConnected()) {
      throw new Error('Client is not connected')
    }
    const wrapped = await this._wrapArguments({
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
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/${functionName}`
    this._declare(json, topic)
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
   * `instances` selects the instances: a name pattern (`line-*`, where `*`
   * matches any run of characters) or a list of names and patterns. The
   * agent calls the selected ones only and answers for those - one request,
   * however many instances. An agent that does not select instances
   * (before protocol 4) gets one call per selected instance instead; a
   * subscription cannot be split like that and is refused there.
   *
   * `agent` may name several agents as well: a pattern (`edge-*`, `*` by
   * default) asks every online agent that offers the class and matches, a
   * list asks each agent listed. They are asked all at once, and every
   * entry names its agent; an agent that fails as a whole answers an error
   * for each of its instances the client knows - or one entry with the
   * error alone when it knows none - and the other agents' answers stand.
   *
   * @param {Object} options
   * @param {String} options.className Name of the class
   * @param {String} options.functionName Name of the member function
   * @param {Array} [options.args] Positional arguments of the call
   * @param {String|Array.<String>} [options.agent] Agent name, pattern or
   * list of names. If not provided class default is used
   * @param {String|Array.<String>} [options.instances] The instances to call:
   * a name pattern, or a list of names and patterns (all if not provided)
   * @returns {Promise<Object[]>} An array of objects `{ id, val }` or
   * `{ id, err }` carrying the instance id and its return value or error,
   * and `agent` when the call addressed several agents
   */
  async callAll ({
    className,
    functionName,
    args = [],
    agent = this._agent,
    instances
  } = {}) {
    if (!this._isConnected()) {
      throw new Error('Client is not connected')
    }
    if (instances !== undefined && !NamePattern.isSelection(instances)) {
      throw new Error(
        `Invalid instances: ${JSON.stringify(instances)} (a name pattern, or a list of names and patterns)`
      )
    }
    // a selection of everything is no selection
    const selection =
      instances === undefined || NamePattern.selectsAll(instances)
        ? undefined
        : instances
    if (Array.isArray(agent) || agent.includes('*')) {
      return this._callAllAgents({
        className,
        functionName,
        args,
        agents: agent,
        selection
      })
    }
    const json = {
      c: className,
      f: functionName,
      a: [],
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    let special = '__callAll__'
    if (selection !== undefined) {
      await this._waitUntilClassIsOnline(agent, className)
      if (!this._selectsInstances(agent, className)) {
        return this._callSelected({
          agent,
          className,
          functionName,
          args,
          selection
        })
      }
      special = '__callMatching__'
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/${special}`
    const wrapped = await this._wrapArguments({
      agent,
      className,
      functionName,
      args,
      isCallAll: true,
      selection
    })
    if (!wrapped) return // using cache
    json.a =
      selection === undefined
        ? [functionName, ...wrapped]
        : [selection, functionName, ...wrapped]
    this._declare(json, topic)
    await this._waitUntilClassIsOnline(agent, className)
    this._mqttPublish(topic, JSON.stringify(json))
    return this._handleAgentAnswer(json, agent)
  }

  /**
   * callAll on several agents: those a list names, or every online agent
   * that offers the class and whose name a pattern matches - all at once,
   * every entry naming its agent
   */
  async _callAllAgents ({ className, functionName, args, agents, selection }) {
    const names = Array.isArray(agents)
      ? agents
      : this.getAvailableAgents().filter(
        name =>
          this._agents[name].classes[className] &&
          NamePattern.matches(agents, name)
      )
    const answers = await Promise.all(
      names.map(name =>
        this.callAll({
          className,
          functionName,
          args,
          agent: name,
          instances: selection
        }).then(
          result => (result || []).map(entry => ({ agent: name, ...entry })),
          err => {
            const error = { message: err.message }
            const known = this.getAvailableInstances({ className, agent: name })
              .filter(id => selection === undefined || NamePattern.selects(selection, id))
            return known.length > 0
              ? known.map(id => ({ agent: name, id, err: error }))
              : [{ agent: name, err: error }]
          }
        )
      )
    )
    return answers.flat()
  }

  // whether an agent selects instances itself: its class info lists
  // __callMatching__ (agents of protocol 4)
  _selectsInstances (agent, className) {
    const info = this._agents[agent] && this._agents[agent].classes[className]
    return (
      !!info &&
      info.staticFunctions.some(
        f => this._stripSignature(f) === '__callMatching__'
      )
    )
  }

  /**
   * A selection towards an agent that does not select instances: one call
   * per selected instance, answered as callAll answers. A subscription is
   * refused: its events, one per instance, would not name their instance.
   */
  async _callSelected ({ agent, className, functionName, args, selection }) {
    if (args.some(x => this._isFunction(x) || this._isEmitter(x))) {
      throw new Error(
        `Agent ${agent} does not select instances for callbacks and events (its class info lists no __callMatching__): update it, or call without instances`
      )
    }
    const selected = this.getAvailableInstances({ className, agent }).filter(
      id => NamePattern.selects(selection, id)
    )
    return Promise.all(
      selected.map(async id => {
        try {
          const proxy = await this.getInstance(id, { agent, className })
          return { id, val: await proxy[functionName](...args) }
        } catch (err) {
          return { id, err: { message: err.message } }
        }
      })
    )
  }

  /**
   * Withdraws subscriptions.
   *
   * A subscription is what an event function call (or `on`) declared with a
   * callback: one per target, function, arguments and callback, named by
   * its subscription id (see getSubscriptions). Withdrawing it stops its events at once, and
   * every agent holding it is told by id - however it was declared (a proxy,
   * callStatic, callAll on one agent or on all of them). The agent releases
   * the registration when the last subscription leaves.
   *
   * With `instance`, only what is held on that instance is withdrawn: a
   * subscription declared there ends, and a callAll subscription - one id
   * on every instance of its class - stops at that instance alone while
   * the others keep delivering. The client remembers such a withdrawal and
   * applies it again after its own reconnect, until the subscription is
   * declared anew (a declaration names what is wanted now).
   *
   * Agents before protocol 4 cannot withdraw by id: an `on` subscription is
   * removed there as before (removeListener), an `on<Name>` one through its
   * `off<Name>` twin when the class has one; anything else ends locally
   * (a callAll subscription withdrawn at one instance stops delivering its
   * events there).
   *
   * @param {String|Array.<String>|Function|Object} target A subscription id
   * (or several), a callback (all its subscriptions), or an
   * `{ emitter, event }` contract (all of its subscriptions)
   * @param {Object} [options]
   * @param {String} [options.instance] Withdraw at this instance only
   * @returns {Promise<Boolean>} true if anything was withdrawn
   */
  async unsubscribe (target, { instance } = {}) {
    const all = Object.values(this._cachedSubscriptions)
    let subs
    if (typeof target === 'string' || Array.isArray(target)) {
      const ids = Array.isArray(target) ? target : [target]
      subs = ids
        .map(id =>
          this._cachedSubscriptions[id.startsWith('__e__') ? id.slice(5) : id]
        )
        .filter(Boolean)
    } else if (this._isFunction(target)) {
      subs = all.filter(sub => sub.callback === target)
    } else if (this._isEmitter(target)) {
      const callback = this._emitterCallback(target, { readOnly: true })
      subs = callback ? all.filter(sub => sub.callback === callback) : []
    } else {
      throw new Error(
        'unsubscribe expects a subscription id, a callback or an { emitter, event } contract'
      )
    }
    // at one instance: a callAll subscription stops there, one declared on
    // that instance ends, any other is not held there
    const atInstance = []
    if (instance !== undefined && instance !== null) {
      atInstance.push(...subs.filter(sub => sub.callAll))
      subs = subs.filter(sub => !sub.callAll && sub.instance === instance)
    }
    if (subs.length === 0 && atInstance.length === 0) return false
    // no event reaches the consumer from here on
    subs.forEach(sub => this._dropSubscription(sub))
    atInstance.forEach(sub => sub.withdrawn.add(instance))
    const byAgent = new Map()
    const entries = (agent, sub, context) => {
      if (!byAgent.has(agent)) byAgent.set(agent, [])
      byAgent.get(agent).push({ sub, context })
    }
    for (const sub of subs) entries(sub.agent, sub)
    for (const sub of atInstance) entries(sub.agent, sub, instance)
    const sends = []
    for (const [agent, agentEntries] of byAgent) {
      sends.push(this._withdrawAt(agent, agentEntries))
    }
    await Promise.allSettled(sends)
    return true
  }

  /**
   * Withdraws subscriptions at their agent: at once when the agent is online
   * and this client connected, else as soon as both are again - an agent
   * that only lost its connection still holds them.
   *
   * @param {String} agent
   * @param {Array.<Object>} entries `{ sub, context }`, context (an
   * instance) for a withdrawal at one instance only
   */
  _withdrawAt (agent, entries) {
    const info = this._agents[agent]
    if (!this._isConnected() || !info || info.status !== 'online') {
      const pending = this._pendingWithdrawals.get(agent) || []
      pending.push(...entries)
      this._pendingWithdrawals.set(agent, pending)
      return Promise.resolve()
    }
    if (info.v >= 4) return this._sendUnsubscribe(agent, entries)
    // an older agent cannot withdraw at one instance: local only
    return Promise.allSettled(
      entries
        .filter(({ context }) => context === undefined)
        .map(({ sub }) => this._sendLegacyRemoval(sub))
    )
  }

  // sends the withdrawals an agent missed, once it and this client are online
  _flushWithdrawals (agent) {
    const pending = this._pendingWithdrawals.get(agent)
    const info = this._agents[agent]
    if (!pending || !this._isConnected() || !info || info.status !== 'online') {
      return
    }
    this._pendingWithdrawals.delete(agent)
    this._withdrawAt(agent, pending)
  }

  /**
   * An agent went offline: a loss, not an end. Its subscriptions are lost
   * until it serves again; an agent of protocol 4 gets them declared again
   * then (the loss heals - one that kept them changes nothing). Towards an
   * older agent a declaration again would register the handler twice: its
   * subscriptions are dropped, as they always were.
   */
  _loseAgent (agent, v) {
    if (!(v >= 4)) {
      this._redeclare.delete(agent)
      this._clearCachedSubscriptions({ lostAgent: agent })
      return
    }
    this._redeclare.add(agent)
    for (const sub of Object.values(this._cachedSubscriptions)) {
      if (sub.agent !== agent || sub.lost) continue
      sub.lost = true
      sub.confirmed = false
      this.emit('lost', sub.id, 'agentOffline', this._subscriptionInfo(sub))
    }
  }

  /**
   * Lists the subscriptions this client holds.
   *
   * @param {Object} [filter]
   * @param {Function|Object} [filter.callback] Only the subscriptions of this
   * callback, or of this `{ emitter, event }` contract
   * @returns {Array.<Object>} `{ id, agent, className, instance,
   * functionName, event, callAll, confirmed, lost }` per subscription;
   * `confirmed` once a protocol-4 agent answered that it holds it, `lost`
   * while its agent is offline (it is declared again once the agent is back)
   */
  getSubscriptions ({ callback } = {}) {
    if (callback && this._isEmitter(callback)) {
      callback = this._emitterCallback(callback, { readOnly: true })
      if (!callback) return []
    }
    return Object.values(this._cachedSubscriptions)
      .filter(sub => !callback || sub.callback === callback)
      .map(sub => ({
        id: sub.id,
        ...this._subscriptionInfo(sub),
        confirmed: sub.confirmed,
        lost: sub.lost
      }))
  }

  /**
   * Gives the subscriptions of a callback a label, which agents list with
   * their registrations (`__registrations__`), e.g. who listens.
   *
   * @param {Function|Object} callback The callback, or an `{ emitter, event }`
   * contract (labelled before or after it subscribes)
   * @param {String} label The label (sent with every declaration)
   */
  setSubscriberLabel (callback, label) {
    if (this._isEmitter(callback)) callback = this._emitterCallback(callback)
    this._subscriberLabels.set(callback, label)
  }

  /**
   * Lists the registrations of an instance (or, without an instance, the
   * static ones of a class): function, arguments, subscriptions with their
   * labels, events and events per second. Needs a protocol-4 agent.
   *
   * @param {Object} options
   * @param {String} options.className Class name
   * @param {String} [options.instance] Instance name
   * @param {String} [options.agent] Agent name. If not provided class default is used
   * @returns {Promise<Array.<Object>>} The registrations
   */
  async getRegistrations ({ className, instance, agent = this._agent } = {}) {
    return this._callProtocol({ className, instance, agent }, '__registrations__', [])
  }

  /**
   * Ends a registration for all its subscriptions; each subscriber learns
   * that it ended and by whom ('ended' event). Needs a protocol-4 agent.
   *
   * @param {Object} options
   * @param {String} options.className Class name
   * @param {String} [options.instance] Instance name (static registration without)
   * @param {String} [options.agent] Agent name. If not provided class default is used
   * @param {String} options.functionName The event function
   * @param {Array} [options.args] Its arguments without the handlers, as listed
   * @param {String} [options.by] Who ends it, told to every subscriber
   * @returns {Promise<Boolean>} Whether such a registration existed
   */
  async endRegistration ({
    className,
    instance,
    agent = this._agent,
    functionName,
    args = [],
    by = null
  } = {}) {
    return this._callProtocol({ className, instance, agent }, '__end__', [
      functionName,
      args,
      by
    ])
  }

  async _callProtocol ({ className, instance, agent }, f, a) {
    if (!this._isConnected()) {
      throw new Error('Client is not connected')
    }
    if (instance && (!agent || agent === '*' || !className)) {
      const data = await this._getInstanceData(instance, { agent, className })
      agent = data.agent
      className = data.className
    }
    if (!agent || agent === '*') throw new Error('Agent must be specified')
    await this._waitUntilClassIsOnline(agent, className)
    if (!(this._agents[agent].v >= 4)) {
      throw new Error(`Agent "${agent}" does not speak protocol 4`)
    }
    const json = {
      c: instance || className,
      f,
      a,
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${agent}/${className}/${instance || '__static__'}/${f}`
    this._mqttPublish(topic, JSON.stringify(json))
    return this._handleAgentAnswer(json, agent)
  }

  // withdraws by id on a protocol-4 agent, wherever it holds them (or, with
  // a context, at that instance only)
  async _sendUnsubscribe (agent, entries) {
    const className = entries[0].sub.className
    const json = {
      c: className,
      f: '__unsubscribe__',
      a: entries.map(({ sub, context }) =>
        context === undefined ? sub.id : { id: sub.id, context }
      ),
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${agent}/${className}/__static__/__unsubscribe__`
    this._mqttPublish(topic, JSON.stringify(json))
    try {
      await this._handleAgentAnswer(json, agent)
    } catch (err) {
      this._log.debug(`Withdrawing subscriptions failed: ${err.message}`)
    }
  }

  // an agent before protocol 4: removeListener, or the class's off twin
  async _sendLegacyRemoval (sub) {
    if (sub.callAll || !sub.instance) return
    let f
    let a
    if (sub.functionName === 'on' || sub.functionName === 'addListener') {
      f = 'removeListener'
      a = [sub.event, sub.id]
    } else {
      const twin = sub.functionName.replace(/^on(?=[A-Z])/, 'off')
      const info =
        this._agents[sub.agent] &&
        this._agents[sub.agent].classes[sub.className]
      const functions = info ? info.memberFunctions.map(this._stripSignature) : []
      if (twin === sub.functionName || !functions.includes(twin)) return
      if (!sub.declaration) return
      f = twin
      a = sub.declaration.a
    }
    const json = {
      c: sub.instance,
      f,
      a,
      i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      s: this._vrpcConnectionId,
      v: VRPC_PROTOCOL_VERSION
    }
    const topic = `${this._domain}/${sub.agent}/${sub.className}/${sub.instance}/${f}`
    this._mqttPublish(topic, JSON.stringify(json))
    try {
      await this._handleAgentAnswer(json, sub.agent)
    } catch (err) {
      this._log.debug(`Removing a subscription failed: ${err.message}`)
    }
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
   * @param {String} token Access token
   * @param {Object} [options]
   * @param {String} options.agent Agent name. If not provided class default is used
   * @returns {Promise} Promise that resolves once re-connected
   */
  async reconnectWithToken (token, { agent = this._agent } = {}) {
    this._token = token
    this._agent = agent
    if (this._client) {
      const client = this._client
      await new Promise(resolve =>
        VrpcClient._endMqtt(client, false, {}, resolve)
      )
    }
    return this.connect()
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
        for (const info of ['__classInfo__', '__classInfoConcise__']) {
          const classTopic = `${this._domain}/${agent}/${className}/${info}`
          this._mqttPublish(classTopic, null, { retain: true })
        }
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
    this._subscribeRetrier.cancel()
    if (!this._client) return
    this._mqttPublish(
      `${this._vrpcConnectionId}/__clientInfo__`,
      JSON.stringify({
        status: 'offline',
        clientId: this._vrpcClientId,
        v: VRPC_PROTOCOL_VERSION
      })
    )
    this._eventEmitter.removeAllListeners()
    this.removeAllListeners()
    // the agents withdraw what this connection held: nothing to declare
    // again, nothing left to withdraw
    this._cachedSubscriptions = {}
    this._redeclare.clear()
    this._pendingWithdrawals.clear()
    const client = this._client
    this._client = null // Prevent race conditions during shutdown
    return new Promise(resolve =>
      VrpcClient._endMqtt(client, false, {}, resolve)
    )
  }

  // Private functions

  static _createHash (str, length = 16) {
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

  _isConnected () {
    return this._client && this._client.connected
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
    const hash = VrpcClient._createHash(clientInfo, 12)
    return `vc3${this._instance}${hash}` // 3 + 8 + 12 = 23 (max clientId)
  }

  _createVrpcClientId () {
    const identity = this._identity || this._instance
    return `${this._domain}/${os.hostname()}/${identity}`
  }

  _createVrpcConnectionId () {
    // Three segments, always: agents (this one, the C++ and the Python
    // ports) recognise a presence message by `__clientInfo__` arriving as
    // the fourth topic token, so the layout is part of the wire format.
    return `${this._domain}/${this._mqttClientId}/${this._connectionSecret}`
  }

  // The 'client disconnecting' workaround below revives a client mqtt.js
  // left half-closed, never one that was ended on purpose (a connect
  // timeout, end(), reconnectWithToken) or has been replaced since
  _isRevivable (client) {
    return client === this._client && !ENDED.has(client)
  }

  _mqttPublish (topic, message, options) {
    const client = this._client
    client.publish(
      topic,
      message,
      { qos: this._qos, ...options },
      err => {
        if (err) {
          this._log.warn(
            `Could not publish MQTT message because: ${err.message}`
          )
          if (
            err.message === 'client disconnecting' &&
            this._isRevivable(client)
          ) {
            // This most certainly relates to a bug in MQTT.js (#1284)
            this._log.error(`Failed to publish, because: ${err.message}`)
            this.emit('error', err)
            this._log.info('Forcing reconnect now...')
            client.disconnecting = false
            client.reconnect()
          }
        }
      }
    )
  }

  async _mqttSubscribe (topic, options) {
    const client = this._client
    return new Promise((resolve, reject) => {
      client.subscribe(
        topic,
        { qos: this._qos, ...options },
        (subscribeError, subs) => {
          const { refused, granted, error } = SubscribeRetrier.outcome(
            subscribeError,
            subs
          )
          if (error) {
            this._log.warn(
              `Could not subscribe to topic(s): '${topic}', because: ${error.message}`
            )
            if (
              error.message === 'client disconnecting' &&
              this._isRevivable(client)
            ) {
              // This most certainly relates to a bug in MQTT.js (#1284)
              const msg = `Failed to subscribe, because: ${error.message}`
              this._log.error(msg)
              this.emit('error', error)
              this._log.info('Forcing reconnect now...')
              client.disconnecting = false
              client.reconnect()
              reject(new Error(msg))
            } else {
              // the connection broke under the subscribe: the next connect
              // subscribes everything afresh
              reject(error)
            }
          } else {
            let err
            const topicArray = Array.isArray(topic) ? topic : [topic]
            const erroneousGranted = refused
            if (erroneousGranted.length > 0) {
              err = new Error(
                `Could not subscribe all ${topicArray.length} topic(s) but got error qos=128 on following ${erroneousGranted.length} topic(s): ${erroneousGranted}`
              )
              err.code = 'SUBSCRIBE_FAILED'
              err.subscribeOptions = options
              this._log.error(err.message)
              this.emit('error', err)
              this._subscribeRetrier.schedule(erroneousGranted, options)
            }
            this._subscribeRetrier.granted(granted.map(x => x.topic))
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
              this._log.warn(err.message)
              this.emit('error', err)
            }
            if (granted.length === 0 && refused.length === 0) {
              this._log.debug(`Already subscribed to: ${topic}`)
            }
            resolve()
          }
        }
      )
    })
  }

  async _mqttUnsubscribe (topic, options) {
    return new Promise((resolve, reject) => {
      this._client.unsubscribe(topic, options, err => {
        if (err) {
          this._log.warn(
            `Could not unsubscribe from topic: ${topic} because: ${err.message}`
          )
        }
        // we resolve in any case to let the upstream logic flow
        resolve()
      })
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
          // the agent answers a throwing constructor with { message, cause }
          const { message, cause } = VrpcClient._prepareError(e)
          reject(
            new Error(`[vrpc ${agent}-${className}-${f}]: ${message}`, { cause })
          )
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
      // the class info and the agent info travel on topics of their own and
      // may come in either order: each of them can complete the picture
      const checkClass = () => {
        if (this._hasClassOnline(agent, className)) {
          if (timer) clearTimeout(timer)
          this.removeListener('class', checkClass)
          this.removeListener('agent', checkClass)
          resolve()
        }
      }
      timer = setTimeout(() => {
        this.removeListener('class', checkClass)
        this.removeListener('agent', checkClass)
        reject(
          new Error(
            `Connection to class "${className}" on agent "${agent}" and domain "${this._domain}" timed out (> ${this._timeout} ms)`
          )
        )
      }, this._timeout)
      this.on('class', checkClass)
      this.on('agent', checkClass)
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
      vrpcConnectionId: this._vrpcConnectionId,
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

          // this client's subscriptions of that event on this instance end;
          // a protocol-4 agent withdraws exactly those, never touching the
          // emitter's other listeners
          Object.values(this._cachedSubscriptions)
            .filter(
              sub =>
                sub.agent === agent &&
                sub.className === className &&
                sub.instance === instance &&
                sub.event === eventName
            )
            .forEach(sub => this._dropSubscription(sub))
          try {
            const json = {
              c: instance,
              f: functionName,
              a: [eventName],
              i: `${this._instance}-${
                this._invokeId++ % Number.MAX_SAFE_INTEGER
              }`,
              s: this._vrpcConnectionId,
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
        const wrapped = await this._wrapArguments({
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
            s: this._vrpcConnectionId,
            v: VRPC_PROTOCOL_VERSION
          }
          this._declare(json, `${targetTopic}/${functionName}`)
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
        const wrapped = await this._wrapArguments({
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
            s: this._vrpcConnectionId,
            v: VRPC_PROTOCOL_VERSION
          }
          this._declare(json, `${targetTopic}/${functionName}`)
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
      // withdraws this client's subscriptions of a function on this instance
      proxy.vrpcOff = async functionName => {
        const ids = Object.values(this._cachedSubscriptions)
          .filter(
            sub =>
              sub.agent === agent &&
              sub.className === className &&
              sub.instance === instance &&
              sub.functionName === functionName
          )
          .map(sub => sub.id)
        if (ids.length === 0) return false
        return this.unsubscribe(ids)
      }
    }
    return proxy
  }

  async _handleAgentAnswer ({ i, c, f, a }, agent) {
    return new Promise((resolve, reject) => {
      const msg = `Function call "${c}::${f}()" on agent "${agent}" timed out (> ${this._timeout} ms)`
      const timer = setTimeout(() => {
        this._eventEmitter.removeAllListeners(i)
        reject(new Error(msg))
      }, this._timeout)
      // a protocol-4 agent that answers a declaring call without an error
      // holds every subscription the call carried
      const confirm = () => {
        const info = this._agents[agent]
        if (info && info.v >= 4) this._confirmSubscriptions(a)
      }
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
                confirm()
                resolve(promiseData.r)
              }
            })
          } else {
            confirm()
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

  /**
   * Whether a function is an event function: declared `@returns
   * {Registration}` (when the class info carries meta data), else named `on`
   * followed by a capital letter. The prefixes `notify`, `monitor` and
   * `signal` still count (deprecated, gone in 4.0).
   */
  _isEventFunction (agent, className, functionName) {
    const info =
      this._agents[agent] &&
      this._agents[agent].classes &&
      this._agents[agent].classes[className]
    const meta = info && info.meta && info.meta[functionName]
    const type = meta && meta.ret && meta.ret.type
    if (typeof type === 'string' && DECLARED_REGISTRATION.test(type.trim())) {
      return true
    }
    if (/^on[A-Z]/.test(functionName)) return true
    return /^(notify|monitor|signal)/.test(functionName)
  }

  async _wrapArguments ({
    agent,
    className,
    instance,
    proxyId,
    functionName,
    args,
    isCallAll = false,
    selection
  }) {
    const wrapped = []

    const isEventFunction = this._isEventFunction(
      agent,
      className,
      functionName
    )
    // continuous removers (legacy): withdraw the callback's subscription
    const isContinuousRemover = /^(off|remove|unmonitor|unsignal)/.test(
      functionName
    )
    const isEmitterRemover =
      (functionName === 'off' || functionName === 'removeListener') &&
      typeof args[0] === 'string'

    for (const [i, x] of args.entries()) {
      const isEmitterContract = this._isEmitter(x)
      if (this._isFunction(x) || isEmitterContract) {
        const removes =
          !isEventFunction &&
          ((isEmitterRemover && i === 1) || isContinuousRemover)
        const callback = isEmitterContract
          ? this._emitterCallback(x, { readOnly: removes })
          : x
        if (
          !removes &&
          (isEmitterContract ||
            functionName === 'vrpcOn' ||
            ((functionName === 'on' || functionName === 'addListener') &&
              i === 1 &&
              typeof args[0] === 'string') ||
            isEventFunction)
        ) {
          const event = typeof args[0] === 'string' ? args[0] : functionName
          // vrpcOn names the event function first
          const isVrpcOn = functionName === 'vrpcOn'
          const id = await this._onRemoteEvent({
            agent,
            className,
            instance,
            event,
            callback,
            functionName: isVrpcOn ? args[0] : functionName,
            args: isVrpcOn ? args.slice(1) : args,
            position: isVrpcOn ? i - 1 : i,
            isCallAll,
            selection
          })
          wrapped.push(id)
          continue
        } else if (removes) {
          const subs = callback
            ? this._offRemoteEvent({
              agent,
              className,
              instance,
              isCallAll,
              selection,
              functionName,
              args,
              position: i,
              callback
            })
            : []
          if (subs.length > 0) {
            const info = this._agents[agent]
            if (info && info.v >= 4) {
              // protocol 4 withdraws by id and never calls the class's
              // remover: handled here
              await this._withdrawAt(agent, subs.map(sub => ({ sub })))
              return null
            }
            // an agent before protocol 4 knows only the remover call, which
            // carries the id (further subscriptions end locally)
            wrapped.push(subs[0].id)
            continue
          }
          if (functionName === 'off' || functionName === 'removeListener') {
            // Nothing of ours to remove - the subscription was already
            // dropped (the instance or its agent went away and the cache
            // was cleared, or the listener was never registered). Sending
            // the call anyway would hand the agent a null listener, which
            // its EventEmitter rejects. Handled locally: nothing to do.
            return null
          }
          // no subscription of this callback: an { emitter, event }
          // contract stays empty, a function is a plain callback after all
          // (removeItem(id, done))
          if (isEmitterContract) {
            wrapped.push(null)
            continue
          }
        }
        // Regular function callback (can be static or member function)
        const remoteId = proxyId || `${agent}-${className}`
        const id = `__f__${remoteId}-${functionName}-${i}-${
          this._invokeId++ % Number.MAX_SAFE_INTEGER
        }`
        wrapped.push(id)
        this._eventEmitter.once(id, ({ a }) => callback.apply(null, a))
        continue
      }
      // default behavior is to not touch
      wrapped.push(x)
    }
    return wrapped
  }

  // the one callback standing for an { emitter, event } contract
  _emitterCallback ({ emitter, event }, { readOnly = false } = {}) {
    let eventMap = this._emitterListener.get(emitter)
    if (eventMap && eventMap.has(event)) return eventMap.get(event)
    if (readOnly) return null
    const callback = (...args) => emitter.emit(event, ...args)
    if (!eventMap) {
      eventMap = new Map()
      this._emitterListener.set(emitter, eventMap)
    }
    eventMap.set(event, callback)
    return callback
  }

  /**
   * What a subscription is to the agent: its function (`addListener` is
   * `on`) and arguments compared by value, the callback's own position
   * named and other callbacks marked. Two subscriptions of one callback
   * differ in it whenever the agent keeps them apart, so their ids differ:
   * an id names one registration per instance.
   */
  _subscriptionKey (functionName, args, position) {
    const func = functionName === 'addListener' ? 'on' : functionName
    const marked = args.map((x, i) => {
      if (i === position) return '\u0000vrpc-self'
      if (this._isFunction(x) || this._isEmitter(x)) return '\u0000vrpc-callback'
      return x
    })
    return `${func}\u0000${VrpcClient._canonical(marked)}`
  }

  // arguments compared by value: equal JSON once object keys are sorted
  static _canonical (value) {
    const sortKeys = x => {
      if (Array.isArray(x)) return x.map(sortKeys)
      if (x && typeof x === 'object' && x.constructor === Object) {
        const sorted = {}
        for (const key of Object.keys(x).sort()) sorted[key] = sortKeys(x[key])
        return sorted
      }
      return x
    }
    return JSON.stringify(sortKeys(value))
  }

  // the event function a remover undoes: off/removeListener -> on,
  // offValue -> onValue, unmonitorX -> monitorX
  static _twinOf (functionName) {
    if (functionName === 'off' || functionName === 'removeListener') return 'on'
    return functionName.replace(/^(off|un)(?=[A-Za-z])/, m =>
      m === 'off' ? 'on' : ''
    )
  }

  // what a subscription is, but its callback: target, the instances a
  // callAll selects, and subscription key
  static _identity ({ agent, className, instance, isCallAll, selection, key }) {
    const target = [agent, className, instance || null, !!isCallAll, key]
    return JSON.stringify(selection === undefined ? target : [...target, selection])
  }

  /**
   * The topic a subscription's events arrive on; its id is `__e__<topic>`.
   * One per identity (target, function, arguments and callback), counted,
   * not hashed: two identities never share one. An identity keeps its
   * topic while its callback lives, so a subscription declared again after
   * a loss has the id an agent may still hold (which then changes
   * nothing); a withdrawn one gets a fresh id when declared anew (see
   * _dropSubscription), so a late withdrawal never meets the new one.
   */
  _subscriptionTopic (callback, identity, { readOnly = false } = {}) {
    let topics = this._subscriptionTopics.get(callback)
    if (!topics) {
      if (readOnly) return null
      topics = new Map()
      this._subscriptionTopics.set(callback, topics)
    }
    let topic = topics.get(identity)
    if (!topic && !readOnly) {
      // routed by the client's single event inbox wildcard
      topic = `${this._vrpcConnectionId}/s${(this._subscriptionCount++).toString(36)}`
      topics.set(identity, topic)
    }
    return topic || null
  }

  /**
   * A subscription: one per target, function, arguments and callback, held
   * once however often it is declared (the agent keeps it as a set member,
   * too).
   */
  async _onRemoteEvent ({
    agent,
    className,
    instance,
    event,
    callback,
    functionName,
    args,
    position,
    isCallAll = false,
    selection
  }) {
    const identity = VrpcClient._identity({
      agent,
      className,
      instance,
      isCallAll,
      selection,
      key: this._subscriptionKey(functionName, args, position)
    })
    const topic = this._subscriptionTopic(callback, identity)
    const id = `__e__${topic}`
    if (this._cachedSubscriptions[topic]) return id
    const sub = {
      id,
      identity,
      agent,
      className,
      instance,
      event,
      functionName,
      callAll: isCallAll,
      // the instances a callAll selects (absent: all)
      selection,
      callback,
      handler: null,
      declaration: null,
      confirmed: false,
      // its agent went offline: declared again once it is back
      lost: false,
      // callAll: the instances it was withdrawn at (unsubscribe's instance)
      withdrawn: new Set()
    }
    // an ended notice carries `end` and never reaches the callback; a
    // callAll event names its instance first
    sub.handler = ({ a, end }) => {
      if (end) {
        this._handleEnded(topic, end)
        return
      }
      if (sub.withdrawn.size > 0 && Array.isArray(a) && sub.withdrawn.has(a[0])) {
        return
      }
      callback.apply(null, a)
    }
    this._eventEmitter.on(id, sub.handler)
    this._cachedSubscriptions[topic] = sub
    return id
  }

  /**
   * The subscriptions a remover call names, withdrawn locally: the one its
   * arguments name (offValue(1, cb) undoes onValue(1, cb)), else all of the
   * callback's subscriptions of that function on the target (offValue(cb)
   * after onValue(1, cb) and onValue(2, cb)), or of any function when the
   * remover names none the client knows.
   */
  _offRemoteEvent ({
    agent,
    className,
    instance,
    isCallAll,
    selection,
    functionName,
    args,
    position,
    callback
  }) {
    const twin = VrpcClient._twinOf(functionName)
    const exact = this._subscriptionTopic(
      callback,
      VrpcClient._identity({
        agent,
        className,
        instance,
        isCallAll,
        selection,
        key: this._subscriptionKey(twin, args, position)
      }),
      { readOnly: true }
    )
    let subs = exact && this._cachedSubscriptions[exact]
      ? [this._cachedSubscriptions[exact]]
      : []
    if (subs.length === 0) {
      const ofCallback = Object.values(this._cachedSubscriptions).filter(
        sub =>
          sub.callback === callback &&
          sub.agent === agent &&
          sub.className === className &&
          sub.instance === instance &&
          sub.callAll === !!isCallAll &&
          JSON.stringify(sub.selection) === JSON.stringify(selection)
      )
      const ofTwin = ofCallback.filter(
        sub =>
          (sub.functionName === 'addListener' ? 'on' : sub.functionName) ===
          twin
      )
      subs = ofTwin.length > 0 ? ofTwin : ofCallback
    }
    subs.forEach(sub => this._dropSubscription(sub))
    return subs
  }

  /**
   * Ends a subscription locally: no event reaches its callback any more. A
   * withdrawn or ended subscription also gives up its id (declared anew, it
   * gets a fresh one); a lost one keeps it (`forget: false`), so declaring
   * it again matches what an agent that went away and came back still
   * holds.
   */
  _dropSubscription (sub, { forget = true } = {}) {
    this._eventEmitter.removeListener(sub.id, sub.handler)
    const topic = sub.id.slice(5)
    if (this._cachedSubscriptions[topic] === sub) {
      delete this._cachedSubscriptions[topic]
    }
    if (forget) {
      const topics = this._subscriptionTopics.get(sub.callback)
      if (topics && topics.get(sub.identity) === topic) {
        topics.delete(sub.identity)
      }
    }
  }

  /**
   * Remembers the call that declared a subscription (to declare it again
   * after a reconnect) and sends the subscriber labels along.
   */
  _declare (json, topic) {
    const labels = {}
    let labelled = false
    for (const arg of json.a) {
      if (typeof arg !== 'string' || !arg.startsWith('__e__')) continue
      const sub = this._cachedSubscriptions[arg.slice(5)]
      if (!sub) continue
      sub.declaration = { topic, c: json.c, f: json.f, a: json.a }
      // a declaration names what is wanted now: earlier withdrawals at
      // single instances are over
      sub.withdrawn.clear()
      const label = this._subscriberLabels.get(sub.callback)
      if (label !== undefined) {
        labels[arg] = label
        labelled = true
      }
    }
    if (labelled) {
      json.l = labels
      for (const id of Object.keys(labels)) {
        const sub = this._cachedSubscriptions[id.slice(5)]
        if (sub && sub.declaration) sub.declaration.l = labels
      }
    }
  }

  // marks the subscriptions among a declaring call's arguments as held
  _confirmSubscriptions (args) {
    if (!Array.isArray(args)) return
    for (const arg of args) {
      const sub =
        typeof arg === 'string' &&
        arg.startsWith('__e__') &&
        this._cachedSubscriptions[arg.slice(5)]
      if (sub) sub.confirmed = true
    }
  }

  // declares every subscription held towards an agent again (protocol 4)
  _redeclareTo (agent) {
    if (!this._inboxReady || !this._redeclare.has(agent)) return
    const info = this._agents[agent]
    if (!info || info.status !== 'online') return
    this._redeclare.delete(agent)
    if (!(info.v >= 4)) return // an older agent learns nothing new
    const declarations = new Map()
    for (const sub of Object.values(this._cachedSubscriptions)) {
      if (sub.agent !== agent || !sub.declaration) continue
      const { topic, a } = sub.declaration
      const key = `${topic}\u0000${JSON.stringify(a)}`
      if (!declarations.has(key)) {
        declarations.set(key, { declaration: sub.declaration, subs: [] })
      }
      declarations.get(key).subs.push(sub)
    }
    for (const { declaration, subs } of declarations.values()) {
      const { topic, c, f, a, l } = declaration
      const json = {
        c,
        f,
        a,
        i: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
        s: this._vrpcConnectionId,
        v: VRPC_PROTOCOL_VERSION
      }
      if (l) json.l = l
      this._mqttPublish(topic, JSON.stringify(json))
      this._handleAgentAnswer(json, agent).then(
        () => {
          const entries = []
          for (const sub of subs) {
            if (this._cachedSubscriptions[sub.id.slice(5)] !== sub) continue
            // a lost subscription is back
            if (sub.lost) {
              sub.lost = false
              this.emit('healed', sub.id, this._subscriptionInfo(sub))
            }
            // what was withdrawn at single instances stays withdrawn there
            for (const context of sub.withdrawn) entries.push({ sub, context })
          }
          if (entries.length > 0) return this._sendUnsubscribe(agent, entries)
        },
        err => {
          for (const sub of subs) {
            if (this._cachedSubscriptions[sub.id.slice(5)] !== sub) continue
            this._dropSubscription(sub, { forget: false })
            this.emit('lost', sub.id, err.message, this._subscriptionInfo(sub))
          }
        }
      )
    }
  }

  _subscriptionInfo (sub) {
    return {
      agent: sub.agent,
      className: sub.className,
      instance: sub.instance,
      functionName: sub.functionName,
      event: sub.event,
      callAll: sub.callAll,
      ...(sub.selection === undefined ? {} : { instances: sub.selection })
    }
  }

  // the agent ended a registration this subscription was part of
  _handleEnded (topic, end) {
    const sub = this._cachedSubscriptions[topic]
    if (!sub) return
    const info = {
      ...this._subscriptionInfo(sub),
      context: end.context,
      failed: !!end.failed
    }
    // a callAll subscription lives on at the other instances
    if (!sub.callAll) this._dropSubscription(sub)
    this.emit('ended', sub.id, end.reason, end.by, info)
  }

  _clearCachedSubscriptions ({ lostAgent, lostInstance, agent, className }) {
    const obsolete = Object.values(this._cachedSubscriptions).filter(sub => {
      if (lostAgent !== undefined) return sub.agent === lostAgent
      // Instance ids are unique per agent only: a twin of the same id on
      // another agent (a deployed app next to its builder) keeps its
      // subscriptions when this one goes
      return (
        sub.instance === lostInstance &&
        sub.agent === agent &&
        sub.className === className
      )
    })
    const reason = lostAgent !== undefined ? 'agentOffline' : 'instanceGone'
    obsolete.forEach(sub => {
      this._log.debug(`Clearing subscription for obsolete topic: ${sub.id}`)
      this._dropSubscription(sub, { forget: false })
      this.emit('lost', sub.id, reason, this._subscriptionInfo(sub))
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
      Object.prototype.hasOwnProperty.call(variable, 'emitter') &&
      Object.prototype.hasOwnProperty.call(variable, 'event') &&
      typeof variable.emitter === 'object' &&
      typeof variable.emitter.emit === 'function'
    )
  }

  async _getInstanceData (instance, options) {
    const own = this._findOwnIsolated(instance, options)
    if (own) return own
    const instanceData = this._getInstanceFromCache(instance, options)
    if (!instanceData) {
      if (options.noWait) {
        throw new Error(`Could not find instance: ${instance}`)
      }
      return this._waitForInstance(instance, options)
    }
    return instanceData
  }

  // an isolated instance this connection created, when it is the one match
  _findOwnIsolated (instance, { agent, className } = {}) {
    const hits = Array.from(this._ownIsolated.values()).filter(
      x =>
        x.instance === instance &&
        (!agent || agent === '*' || x.agent === agent) &&
        (!className || x.className === className)
    )
    return hits.length === 1 ? { agent: hits[0].agent, className: hits[0].className } : null
  }

  _cachedProxy (instance, { agent, className } = {}) {
    // Instance ids are unique per agent only: a cached proxy is served
    // solely when it is the one match for the given agent and class - twins
    // on several agents are resolved through the topology instead
    const hits = Object.values(this._proxies).filter(
      x =>
        x.instance === instance &&
        (!agent || x.agent === agent) &&
        (!className || x.className === className)
    )
    return hits.length === 1 ? hits[0].proxy : null
  }

  _getInstanceFromCache (instance, options = {}) {
    // when no agent is specified, but an explicit class default exists give
    // such instances priority in being found
    if (!options.agent && this._agent !== '*') {
      const { classes, status } = this._agents[this._agent] || {}
      if (classes && status !== 'offline') {
        for (const className in classes) {
          if (options.className && className !== options.className) continue
          const { instances } = classes[className]
          if (!instances) continue
          if (instances.includes(instance)) {
            return { agent: this._agent, className, instance }
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
 * Event 'ended'
 *
 * Emitted when a registration a subscription held ended for a reason the
 * subscriber did not cause: its source ended it, or a member did
 * (`endRegistration`). The subscription is gone; it never reaches the
 * callback. A callAll subscription lives on at its other instances.
 *
 * @event VrpcClient#ended
 *
 * @param {String} id - The subscription id
 * @param {String} reason - Why it ended (an error message when it failed)
 * @param {String|null} by - Who ended it (`'source'`, or what the member said)
 * @param {Object} info - The subscription (agent, className, instance,
 * functionName, event, callAll), `context` (the instance or class) and
 * `failed`
 */

/**
 * Event 'lost'
 *
 * Emitted when a subscription is lost: its agent went offline
 * (`'agentOffline'`), its instance went away (`'instanceGone'`), or a
 * declaration again failed (the error's message). A subscription on an agent
 * of protocol 4 that went offline is declared again once the agent is back
 * ('healed'); every other lost subscription is gone, and declaring it again
 * is the consumer's.
 *
 * @event VrpcClient#lost
 *
 * @param {String} id - The subscription id
 * @param {String} reason - `'agentOffline'`, `'instanceGone'` or an error message
 * @param {Object} info - The subscription (agent, className, instance,
 * functionName, event, callAll)
 */

/**
 * Event 'healed'
 *
 * Emitted when a subscription lost with its agent is back: the agent serves
 * again and holds it.
 *
 * @event VrpcClient#healed
 *
 * @param {String} id - The subscription id
 * @param {Object} info - The subscription (agent, className, instance,
 * functionName, event, callAll)
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
