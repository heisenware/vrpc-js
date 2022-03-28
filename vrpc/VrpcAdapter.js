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

const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const Ajv = require('ajv')
const caller = require('caller')
const commentParser = require('./comment-parser')
const EventEmitter = require('events')
const { nanoid } = require('nanoid')

/**
 * Generates an adapter layer for existing code and enables further VRPC-based
 * communication.
 */
class VrpcAdapter {
  /**
   * Automatically requires .js files for auto-registration.
   *
   * @param {String} dirPath Relative path to start the auto-registration from
   * @param {Number} [maxLevel] Maximum search depth (default: unlimited)
   */
  static addPluginPath (
    dirPath,
    maxLevel = Number.MAX_SAFE_INTEGER,
    currentLevel = 0
  ) {
    let absDirPath
    let relDirPath
    if (path.isAbsolute(dirPath)) {
      absDirPath = dirPath
      relDirPath = path.relative(__dirname, dirPath)
    } else {
      absDirPath = path.join(caller(), '../', dirPath)
      relDirPath = path.relative(__dirname, absDirPath)
    }
    fs.readdirSync(absDirPath).forEach(node => {
      const absNodePath = path.join(absDirPath, node)
      const type = fs.lstatSync(absNodePath)
      if (type.isDirectory() && maxLevel > currentLevel) {
        VrpcAdapter.addPluginPath(absNodePath, maxLevel, currentLevel + 1)
      }
      if (type.isFile() && absNodePath.slice(-3) === '.js') {
        require('./' + path.join(relDirPath, node))
      }
    })
  }

  /**
   * Registers existing code and makes it (remotely) callable
   *
   * @param {Any} code Existing code to be registered, can be a class
   * or function object or a relative path to a module
   * @param {Object} [options]
   * @param {Boolean} [options.onlyPublic=true] If true, only registers
   * functions that do not begin with an underscore
   * @param {Boolean} [options.withNew=true] If true, class will be constructed
   * using the `new` operator
   * @param {Object} [options.schema=null] If provided is used to validate ctor
   * parameters (only works if registered code reflects a single class)
   * @param {String} options.jsdocPath if provided, parses documentation and
   * provides it as meta information
   *
   * NOTE: This function currently only supports registration of classes (either
   * when provided as object or when exported on the provided module path)
   */
  static register (code, options = {}) {
    if (typeof code === 'string') {
      const absPath = path.resolve(caller(), '../', code)
      const relPath = path.relative(__dirname, absPath)
      const absJsdocPath =
        absPath && absPath.endsWith('.js') ? absPath : `${absPath}.js`
      const Klass = require(relPath)
      this._registerClass(Klass, absJsdocPath, options)
    } else {
      const { jsdocPath } = options
      const sJsdocPath =
        jsdocPath && jsdocPath.endsWith('.js') ? jsdocPath : `${jsdocPath}.js`
      if (jsdocPath) {
        const absJsdocPath = path.resolve(caller(), '../', sJsdocPath)
        this._registerClass(code, absJsdocPath, { ...options, jsdoc: true })
      } else {
        this._registerClass(code, null, options)
      }
    }
  }

  /**
   * Registers an existing instance and make it (remotely) callable
   *
   * @param {Object} obj The instance to be registered
   * @param {Object} options
   * @param {String} options.className Class name of the instance
   * @param {String} options.instance Name of the instance
   * @param {Boolean} [options.onlyPublic=true] If true, only registers
   * functions that do not begin with an underscore
   * @param {String} [options.jsdocPath] if provided, parses documentation and
   * provides it as meta information
   */
  static registerInstance (
    obj,
    { className, instance, jsdocPath, onlyPublic = true } = {}
  ) {
    let memberFunctions = VrpcAdapter._extractMemberFunctions(obj)
    if (onlyPublic) {
      memberFunctions = memberFunctions.filter(f => {
        return !f.startsWith('_')
      })
    }
    let meta = null
    if (jsdocPath) {
      const absJsdocPath = path.resolve(caller(), '../', `${jsdocPath}.js`)
      const content = fs.readFileSync(absJsdocPath).toString('utf8')
      meta = this._parseComments(content)
    }
    if (!VrpcAdapter._functionRegistry.has(className)) {
      VrpcAdapter._functionRegistry.set(className, {
        memberFunctions,
        meta,
        Klass: {},
        withNew: false,
        staticFunctions: [],
        schema: null
      })
    }
    VrpcAdapter._instances.set(instance, {
      className,
      instance: obj,
      isIsolated: false
    })
  }

  /*****************************************************
   * convenience interface if used as plug-able factory *
   ******************************************************/

  /**
   * Creates a new instance
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
  static create ({
    className,
    instance = nanoid(8),
    args = [],
    isIsolated = false
  } = {}) {
    const json = { c: className, a: [instance, ...args] }
    const obj = isIsolated
      ? VrpcAdapter._handleCreateIsolated(json)
      : VrpcAdapter._handleCreateShared(json)
    if (json.e) throw new Error(json.e)
    return obj
  }

  /**
   * Deletes an instance
   *
   * @param {String|Object} instance Instance (name or object itself) to be deleted
   * @returns {Boolean} True in case of success, false otherwise
   */
  static delete (instance) {
    if (typeof instance === 'string') {
      return VrpcAdapter._delete(instance)
    }
    if (typeof instance === 'object') {
      for (const [k, v] of VrpcAdapter._instances) {
        if (v.instance === instance) {
          VrpcAdapter._instances.delete(k)
          return true
        }
      }
      return false
    }
  }

  /**
   * Retrieves an existing instance by name
   *
   * @param {String} instance Name of the instance to be acquired
   * @returns {Object} The real instance (not a proxy!)
   */
  static getInstance (instance) {
    const entry = VrpcAdapter._instances.get(instance)
    if (entry) return entry.instance
    throw new Error(`Could not find instance: ${instance}`)
  }

  /**
   * Retrieves an array of all available classes (names only)
   *
   * @returns {Array.<String>} Array of class names
   */
  static getAvailableClasses () {
    return VrpcAdapter._getClassesArray()
  }

  /**
   * Provides the names of all currently running instances.
   *
   * @param {String} className Name of class to retrieve the instances for
   * @returns {Array.<String>} Array of instance names
   */
  static getAvailableInstances (className) {
    return VrpcAdapter._getInstancesArray(className)
  }

  static call (jsonString) {
    const json = JSON.parse(jsonString)
    VrpcAdapter._call(json)
    return JSON.stringify(json)
  }

  static onCallback (callback) {
    VrpcAdapter._callback = callback
  }

  /**
   * @typedef {Object.<String, Func>} MetaData Associates meta data to any function
   */

  /**
   * @typedef Func
   * @param {String} description Function description
   * @param {Array.<Param>} params Array of parameter details in order of signature
   * @param {Ret} ret Object associating further information to return value
   */

  /**
   * @typedef {Object} Param
   * @param {String} name Parameter name
   * @param {Boolean} optional Whether parameter is optional
   * @param {String} description Parameter description
   * @param {String} [type] Parameter type
   * @param {Any} [default] The default to be injected when not provided
   */

  /**
   * @typedef {Object} Ret
   * @param {String} description Return value description
   * @param {String} [type] Return value type
   */

  static on (eventName, listener) {
    VrpcAdapter._emitter.on(eventName, listener)
  }

  static once (eventName, listener) {
    VrpcAdapter._emitter.once(eventName, listener)
  }

  static off (eventName, listener) {
    VrpcAdapter._emitter.off(eventName, listener)
  }

  static removeAllListeners (eventName) {
    VrpcAdapter._emitter.removeAllListeners(eventName)
  }

  // private:

  static _registerClass (
    Klass,
    absJsdocPath = null,
    { onlyPublic = true, withNew = true, schema = null, jsdoc = true } = {}
  ) {
    // Get all static static functions
    let staticFunctions = VrpcAdapter._extractStaticFunctions(Klass)
    if (onlyPublic) {
      staticFunctions = staticFunctions.filter(f => !f.startsWith('_'))
    }
    // Inject constructor and destructor
    staticFunctions.push('__createIsolated__')
    staticFunctions.push('__createShared__')
    staticFunctions.push('__callAll__')
    staticFunctions.push('__delete__')
    let memberFunctions = VrpcAdapter._extractMemberFunctions(Klass)
    if (onlyPublic) {
      memberFunctions = memberFunctions.filter(f => {
        return !f.startsWith('_')
      })
    }
    let meta = null
    if (jsdoc && absJsdocPath) {
      const content = fs.readFileSync(absJsdocPath).toString('utf8')
      meta = this._parseComments(content)
    }
    VrpcAdapter._functionRegistry.set(Klass.name, {
      Klass,
      withNew,
      staticFunctions,
      memberFunctions,
      schema,
      meta
    })
  }

  static _parseComments (content) {
    const comments = commentParser(content, { assocFunctions: true })
    const meta = {}
    comments.forEach(({ tags, description, functionName }) => {
      if (functionName) {
        if (tags) {
          let params = tags.filter(
            ({ tag }) => tag === 'param' || tag === 'arg' || tag === 'argument'
          )
          if (params.length > 0) {
            params = params.map(({ name, optional, description, type }) => {
              return { name, optional, description, type }
            })
          } else {
            params = []
          }
          let ret = tags.filter(
            ({ tag }) => tag === 'returns' || tag === 'return'
          )
          if (ret.length === 1) {
            const { source, type } = ret[0]
            const description = source
              .split(' ')
              .splice(2)
              .join(' ')
            ret = { description, type }
          } else {
            ret = null
          }
          if (functionName === 'constructor') {
            const modified = [
              {
                name: 'instanceName',
                optional: false,
                description: 'Name of the instance to be created',
                type: 'string'
              },
              ...params
            ]
            meta.__createShared__ = { description, params: modified, ret }
          } else {
            meta[functionName] = { description, params, ret }
          }
        }
      }
    })
    return meta
  }

  static _call (json) {
    this._mustTrackClient = false // reset client tracking flag
    switch (json.f) {
      case '__createIsolated__':
        VrpcAdapter._handleCreateIsolated(json)
        break
      case '__createShared__':
        VrpcAdapter._handleCreateShared(json)
        break
      case '__callAll__':
        VrpcAdapter._handleCallAll(json)
        break
      case '__delete__':
        VrpcAdapter._handleDelete(json)
        break
      default:
        // this call may have the side-effect of taking a listener on board
        VrpcAdapter._handleCall(json)
    }
    // if we took a listener on board we must tell our caller such that
    // things can be cleaned up later.
    return this._mustTrackClient
  }

  static _handleCreateIsolated (json) {
    let instance
    try {
      const className = json.c
      const [instanceId, ...args] = json.a
      instance = VrpcAdapter._create(className, instanceId, ...args)
      VrpcAdapter._instances.set(instanceId, {
        instance,
        className,
        isIsolated: true
      })
      VrpcAdapter._emitter.emit('create', {
        args,
        className,
        isIsolated: true,
        instance: instanceId
      })
      json.r = instanceId
    } catch (err) {
      json.e = err.message
    }
    return instance
  }

  static _handleCreateShared (json) {
    let instance
    try {
      const className = json.c
      const [instanceId, ...args] = json.a
      instance = VrpcAdapter._create(className, instanceId, ...args)
      VrpcAdapter._instances.set(instanceId, {
        instance,
        className,
        isIsolated: false
      })
      json.r = instanceId
      VrpcAdapter._emitter.emit('create', {
        args,
        className,
        isIsolated: false,
        instance: instanceId
      })
    } catch (err) {
      json.e = err.message
    }
    return instance
  }

  static _handleCallAll (json) {
    try {
      const calls = []
      for (const [
        id,
        { className, instance, isIsolated }
      ] of VrpcAdapter._instances) {
        // TODO Think about a configurable behavior w.r.t. isolated instances...
        if (className !== json.c || isIsolated) continue
        let v = true
        let e = null
        try {
          const unwrapped = VrpcAdapter._unwrapArguments(json, id)
          if (unwrapped) {
            const funcName = unwrapped[0]
            v = instance[funcName].apply(instance, unwrapped.slice(1))
            v = VrpcAdapter.sanitizeEventListenerReturnValues(v)
          }
        } catch (err) {
          e = err.message
        }
        if (VrpcAdapter._isPromise(v)) {
          calls.push(
            v
              .then(val => ({ id, val, err: null }))
              .catch(err => ({ id, err, val: null }))
          )
        } else {
          calls.push({ id, val: v, err: e })
        }
      }
      this._handlePromise(json, Promise.all(calls))
    } catch (err) {
      json.e = err.message
    }
  }

  static sanitizeEventListenerReturnValues (ret) {
    return typeof ret === 'object' &&
      ret._events !== undefined &&
      ret._eventsCount !== undefined
      ? true
      : ret
  }

  static _handleDelete (json) {
    try {
      const instance = json.a[0] // first arg is instance to be deleted
      json.r = VrpcAdapter._delete(instance)
      VrpcAdapter._emitter.emit('delete', {
        instance,
        className: json.c
      })
    } catch (err) {
      json.e = err.message
    }
  }

  static _handleCall (json) {
    // special case: removeAllListeners
    if (json.f === 'removeAllListeners') {
      VrpcAdapter._removeAllListeners(json.a[0], json.s, json.c)
      json.r = true
      return
    }
    const unwrapped = VrpcAdapter._unwrapArguments(json)
    if (!unwrapped) {
      // this call must be skipped (event emitter stuff)
      json.r = true
      return
    }
    // Check whether context is a registered class
    const entry = VrpcAdapter._functionRegistry.get(json.c)
    if (entry !== undefined) {
      // entry is class -> function is static
      const { Klass } = entry
      // TODO Think about whether to do live checking (like here) or
      // rather sticking to those functions registered before...
      // TODO This is even more important now as the agent does a wildcard
      // subscription against all functions
      if (VrpcAdapter._isFunction(Klass[json.f])) {
        try {
          const ret = Klass[json.f].apply(null, unwrapped)
          // check if function returns promise
          if (VrpcAdapter._isPromise(ret)) {
            this._handlePromise(json, ret)
          } else json.r = ret
        } catch (err) {
          json.e = err.message
        }
      } else throw new Error(`Could not find function: ${json.f}`)
    } else {
      // is not static
      const entry = VrpcAdapter._instances.get(json.c)
      if (entry === undefined) {
        throw new Error(`Could not find context: ${json.c}`)
      }
      const { instance } = entry
      if (VrpcAdapter._isFunction(instance[json.f])) {
        try {
          let ret = instance[json.f].apply(instance, unwrapped)
          ret = VrpcAdapter.sanitizeEventListenerReturnValues(ret)
          // check if function returns promise
          if (VrpcAdapter._isPromise(ret)) {
            this._handlePromise(json, ret)
          } else json.r = ret
        } catch (err) {
          json.e = err.message
        }
      } else throw new Error(`Could not find function: ${json.f}`)
    }
  }

  static _create (className, instanceId, ...args) {
    const entry = VrpcAdapter._instances.get(instanceId)
    if (entry) return entry.instance
    const { Klass, withNew, schema } = VrpcAdapter._getClassEntry(className)
    if (schema !== null) {
      VrpcAdapter._validate(schema, ...args)
    }
    if (withNew) return new Klass(...args)
    return Klass(...args)
  }

  static _delete (instanceId) {
    const entry = VrpcAdapter._instances.get(instanceId)
    if (entry) {
      // in case the instance was an EventEmitter, free all registered listeners
      if (VrpcAdapter._isFunction(entry.removeAllListeners)) {
        entry.removeAllListeners()
      }
      delete VrpcAdapter._listeners[instanceId]
      VrpcAdapter._instances.delete(instanceId)
      return true
    }
    return false
  }

  static _unregisterClient (clientId) {
    Object.entries(VrpcAdapter._listeners).forEach(([ik, iv]) => {
      Object.entries(iv).forEach(([ek, ev]) => {
        const { clients, listener, event } = ev
        if (clients.has(clientId)) {
          clients.delete(clientId)
          if (clients.size === 0) {
            VrpcAdapter.getInstance(ik).removeListener(event, listener)
            delete VrpcAdapter._listeners[ik][ek]
          }
        }
      })
    })
  }

  static _validate (schema, params) {
    if (!VrpcAdapter._ajv) {
      VrpcAdapter._ajv = new Ajv({ useDefaults: true })
    }
    const valid = VrpcAdapter._ajv.validate(schema, params)
    if (!valid) throw new Error(VrpcAdapter._ajv.errorsText())
  }

  static _unwrapArguments (json, instanceId) {
    const clientId = json.s
    // if we came from a "callAll" we will have an instanceId defined
    // things are different for callAll as we have to dispatch the instanceIds
    const isCallAll = instanceId !== undefined
    const context = isCallAll ? instanceId : json.c
    const args = isCallAll ? json.a.slice(1) : json.a
    const func = isCallAll ? json.a[0] : json.f
    const unwrapped = isCallAll ? [func] : []
    for (const arg of args) {
      if (typeof arg === 'string') {
        if (arg.startsWith('__f__')) {
          // function callback
          unwrapped.push(
            this._generateCallback({
              clientId,
              isCallAll,
              instanceId: context,
              eventId: arg
            })
          )
        } else if (arg.startsWith('__e__')) {
          // event registration
          if (func === 'on' || func === 'addListener') {
            this._mustTrackClient = true
            const listener = VrpcAdapter._registerListener({
              clientId,
              isCallAll,
              instanceId: context,
              eventId: arg,
              event: args[0]
            })
            if (
              VrpcAdapter.getInstance(context)
                .listeners(arg)
                .includes(listener)
            ) {
              return null // skip call as listener is already registered
            }
            unwrapped.push(listener)
            // event un-registration
          } else if (func === 'off' || func === 'removeListener') {
            const listener = VrpcAdapter._unregisterListener({
              clientId,
              instanceId: context,
              eventId: arg
            })
            if (!listener) {
              return null // skip call as others are still interested
            }
            unwrapped.push(listener)
          } else {
            this._mustTrackClient = true
            const listener = VrpcAdapter._registerListener({
              clientId,
              isCallAll,
              instanceId: context,
              eventId: arg,
              event: null
            })
            unwrapped.push(listener)
          }
        } else {
          unwrapped.push(arg)
        }
      } else {
        // regular argument
        unwrapped.push(arg)
      }
    }
    return unwrapped
  }

  static _generateCallback ({ eventId, clientId, instanceId, isCallAll }) {
    return (...innerArgs) => {
      // "callAll" event notifications expect the instanceId as first argument
      const a = isCallAll ? [instanceId, ...innerArgs] : [...innerArgs]
      VrpcAdapter._callback({ a, s: clientId, i: eventId })
    }
  }

  static _registerListener ({
    eventId,
    clientId,
    instanceId,
    event,
    isCallAll
  }) {
    if (!VrpcAdapter._listeners[instanceId]) {
      VrpcAdapter._listeners[instanceId] = {
        [eventId]: {
          event,
          clients: new Set([clientId]),
          listener: VrpcAdapter._generateListener({
            eventId,
            instanceId,
            isCallAll
          })
        }
      }
    } else if (!VrpcAdapter._listeners[instanceId][eventId]) {
      VrpcAdapter._listeners[instanceId][eventId] = {
        event,
        clients: new Set([clientId]),
        listener: VrpcAdapter._generateListener({
          eventId,
          instanceId,
          isCallAll
        })
      }
    } else {
      VrpcAdapter._listeners[instanceId][eventId].clients.add(clientId)
    }
    return VrpcAdapter._listeners[instanceId][eventId].listener
  }

  static _generateListener ({ eventId, instanceId, isCallAll }) {
    return (...innerArgs) => {
      const a = isCallAll ? [instanceId, ...innerArgs] : [...innerArgs]
      VrpcAdapter._callback({ a, i: eventId })
    }
  }

  static _unregisterListener ({ eventId, clientId, instanceId }) {
    if (
      VrpcAdapter._listeners[instanceId] &&
      VrpcAdapter._listeners[instanceId][eventId]
    ) {
      const { listener, clients } = VrpcAdapter._listeners[instanceId][eventId]
      clients.delete(clientId)
      if (clients.size === 0) {
        delete VrpcAdapter._listeners[instanceId][eventId]
        if (Object.keys(VrpcAdapter._listeners[instanceId]).length === 0) {
          delete VrpcAdapter._listeners[instanceId]
        }
        return listener
      }
    }
  }

  static _removeAllListeners (event, clientId, instanceId) {
    const eventIds = VrpcAdapter._listeners[instanceId]
    if (!eventIds) return
    Object.entries(eventIds).forEach(([ek, ev]) => {
      if (ev.event === event && ev.clients.has(clientId)) {
        ev.clients.delete(clientId)
        if (ev.clients.size === 0) {
          VrpcAdapter.getInstance(instanceId).removeListener(
            ev.event,
            ev.listener
          )
          delete VrpcAdapter._listeners[instanceId][ek]
        }
      }
    })
  }

  static _handlePromise (json, promise) {
    try {
      const cid = VrpcAdapter._correlationId++ % Number.MAX_SAFE_INTEGER
      const id = `__p__${json.f}-${cid}`
      json.r = id
      promise
        .then(r => VrpcAdapter._callback({ ...json, r, i: id }))
        .catch(err => VrpcAdapter._callback({ ...json, e: err.message, i: id }))
    } catch (err) {
      json.data.e = err.message
    }
  }

  static _generateId (object) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(object))
      .digest('hex')
  }

  static _getClassEntry (className) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (!entry) {
      throw new Error(`"${className}" is not a registered class`)
    }
    return entry
  }

  static _isFunction (obj) {
    if (obj) {
      const ident = {}.toString.call(obj)
      return ident === '[object Function]' || ident === '[object AsyncFunction]'
    }
    return false
  }

  static _isClass (obj) {
    return (
      !!obj && typeof obj === 'function' && /^\s*class\s+/.test(obj.toString())
    )
  }

  static _isPromise (obj) {
    return (
      !!obj &&
      (typeof obj === 'object' || typeof obj === 'function') &&
      typeof obj.then === 'function'
    )
  }

  static _extractMemberFunctions (klass) {
    let klass_ = klass
    let fs = []
    do {
      if (klass_.prototype) {
        const funcs = Object.getOwnPropertyNames(klass_.prototype).filter(
          x =>
            !VrpcAdapter._blackList.has(x) &&
            this._isFunction(klass_.prototype[x])
        )
        fs = [...fs, ...funcs]
      } else {
        const funcs = Object.getOwnPropertyNames(klass_).filter(
          x => !VrpcAdapter._blackList.has(x) && this._isFunction(klass_[x])
        )
        fs = [...fs, ...funcs]
      }
      klass_ = Object.getPrototypeOf(klass_)
    } while (klass_)
    // Filter out all duplicates
    return Array.from(new Set(fs))
  }

  static _extractStaticFunctions (klass) {
    let klass_ = klass
    let fs = []
    do {
      fs = [
        ...fs,
        ...Object.getOwnPropertyNames(klass_).filter(prop => {
          const desc = Object.getOwnPropertyDescriptor(klass_, prop)
          return !!desc && typeof desc.value === 'function'
        })
      ]
      klass_ = Object.getPrototypeOf(klass_)
    } while (klass_ && klass_.name)
    // Filter out all duplicates
    return Array.from(new Set(fs))
  }

  static _getClassesArray () {
    return Array.from(VrpcAdapter._functionRegistry.keys())
  }

  static _getInstancesArray (className) {
    const instances = []
    VrpcAdapter._instances.forEach((v, k) => {
      if (v.className === className && !v.isIsolated) instances.push(k)
    })
    return instances
  }

  static _getMemberFunctionsArray (className) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (entry) return entry.memberFunctions
    return []
  }

  static _getStaticFunctionsArray (className) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (entry) return entry.staticFunctions
    return []
  }

  static _getMetaData (className) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (entry && entry.meta) return entry.meta
    return {}
  }
}

/**
 * Event 'create'
 *
 * Emitted on creation of shared instance
 *
 * @event VrpcAdapter#create
 * @type {Object}
 * @property {String} className The class name of the create instance
 * @property {String} instance The instance name
 * @property {Array.<Any>} args The constructor arguments
 */

/**
 * Event 'delete'
 *
 * Emitted on deletion of shared instance
 *
 * @event VrpcAdapter#delete
 * @type {Object}
 * @property {String} className The class name of the deleted instance
 * @property {String} instance The instance name
 */

// Initialize static members
VrpcAdapter._functionRegistry = new Map()
VrpcAdapter._instances = new Map()
VrpcAdapter._emitter = new EventEmitter()
VrpcAdapter._correlationId = 0
VrpcAdapter._listeners = {}
VrpcAdapter._blackList = new Set([
  'caller',
  'callee',
  'arguments',
  'apply',
  'bind',
  'call',
  'toString',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'valueOf',
  'toLocaleString',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
])

module.exports = VrpcAdapter
