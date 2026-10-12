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

const Ajv = require('ajv')
const EventEmitter = require('events')
const { nanoid } = require('nanoid')
const Registrations = require('./Registrations')
const NamePattern = require('./namePattern')

// A runtime without dispose symbols (older browsers, Node before 18.18 /
// 20.4) gets Node's own stand-ins from the symbol registry, so a class file
// and the adapter meet on one symbol whichever of them installs it first.
if (typeof Symbol.dispose !== 'symbol') {
  Symbol.dispose = Symbol.for('nodejs.dispose')
}
if (typeof Symbol.asyncDispose !== 'symbol') {
  Symbol.asyncDispose = Symbol.for('nodejs.asyncDispose')
}

const VRPC_GLOBAL = '__global__'
const VRPC_WINDOW_NS = 'vrpc'

/**
 * Generates an adapter layer for existing code and enables further VRPC-based
 * communication.
 */
class VrpcAdapter {
  /**
   * Registers an existing class an makes it callable from remote
   *
   * @param {Object} Klass Existing class to be registered
   * @param {Object} [options]
   * @param {Boolean} [options.onlyPublic=true] If true, only registers
   * functions that do not begin with an underscore
   * @param {Boolean} [options.withNew=true] If true, class will be constructed
   * using the `new` operator
   * @param {Object} [options.schema=null] If provided is used to validate ctor
   * parameters (only works if registered code reflects a single class)
   */
  static registerClass (
    Klass,
    { onlyPublic = true, withNew = true, schema = null } = {}
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
    staticFunctions.push('__callMatching__')
    staticFunctions.push('__delete__')
    let memberFunctions = VrpcAdapter._extractMemberFunctions(Klass)
    if (onlyPublic) {
      memberFunctions = memberFunctions.filter(f => {
        return !f.startsWith('_')
      })
    }
    VrpcAdapter._functionRegistry.set(Klass.name, {
      Klass,
      withNew,
      staticFunctions,
      memberFunctions,
      schema,
      meta: {}
    })
  }

  /**
   * Registers an existing function and makes it callable from remote
   *
   * @param {Function} functionObject Existing function to be registered
   * @param {String} functionName Name of the function to be registered
   */
  static registerFunction (functionObject, functionName) {
    if (typeof functionObject !== 'function') {
      throw new Error('Provided argument must be a function object')
    }
    console.log('registering function', functionName)
    // add function to global window object
    if (!window[VRPC_WINDOW_NS]) {
      window[VRPC_WINDOW_NS] = {}
    }
    window[VRPC_WINDOW_NS][functionName] = functionObject
    const registry = VrpcAdapter._functionRegistry.get(VRPC_GLOBAL)
    const staticFunctions = registry
      ? [...registry.staticFunctions, functionName]
      : [functionName]
    VrpcAdapter._functionRegistry.set(VRPC_GLOBAL, {
      staticFunctions,
      memberFunctions: [],
      meta: {},
      Klass: {},
      withNew: false,
      schema: null
    })
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
   */
  static registerInstance (
    obj,
    { className, instance, onlyPublic = true } = {}
  ) {
    let memberFunctions = VrpcAdapter._extractMemberFunctions(obj)
    if (onlyPublic) {
      memberFunctions = memberFunctions.filter(f => {
        return !f.startsWith('_')
      })
    }
    if (!VrpcAdapter._functionRegistry.has(className)) {
      VrpcAdapter._functionRegistry.set(className, {
        memberFunctions,
        meta: {},
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
   * Deletes an instance: its name is free at once, the adapter takes back
   * every listener it attached, and the object releases what it runs
   * through its `[Symbol.asyncDispose]` or `[Symbol.dispose]` method, which
   * runs in the background here (a remote delete answers once it settled).
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
        if (v.instance === instance) return VrpcAdapter._delete(k)
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

  /**
   * Handles one request in place: the answer lands on `json` as `r` or `e`.
   * Every request is answered - a malformed one, an unknown context or
   * function with an error - so no caller waits for its timeout.
   *
   * @returns {Boolean} Whether the call took subscriptions of its sender,
   * whose presence the agent then watches
   */
  static _call (json) {
    VrpcAdapter._mustTrackClient = false // reset client tracking flag
    // the answer is what the call yields, never what the request brought
    delete json.r
    delete json.e
    try {
      // a request without arguments has none
      if (json.a === undefined) json.a = []
      if (!Array.isArray(json.a)) {
        throw new Error('The arguments of a request must be an array')
      }
      VrpcAdapter._dispatch(json)
    } catch (err) {
      json.e = VrpcAdapter._error(err)
    }
    // if we took a listener on board we must tell our caller such that
    // things can be cleaned up later.
    return VrpcAdapter._mustTrackClient
  }

  static _dispatch (json) {
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
      case '__callMatching__':
        VrpcAdapter._handleCallMatching(json)
        break
      case '__delete__':
        VrpcAdapter._handleDelete(json)
        break
      case '__unsubscribe__':
        VrpcAdapter._handleUnsubscribe(json)
        break
      case '__registrations__':
        VrpcAdapter._handleRegistrations(json)
        break
      case '__end__':
        VrpcAdapter._handleEnd(json)
        break
      default:
        // this call may have the side-effect of taking a listener on board
        VrpcAdapter._handleCall(json)
    }
  }

  // an error as it travels: `{ message, cause? }`, whatever was thrown
  static _error (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      const e = { message: String(err.message) }
      if (err.cause !== undefined) e.cause = err.cause
      return e
    }
    return { message: String(err) }
  }

  /**
   * Whether a request may call a function: only what the class info lists
   * is reachable - a member function of the instance's class, a static
   * function of the class, or a registered global function. Anything else
   * an object happens to have (an EventEmitter's `emit`, a private helper)
   * stays inside the agent.
   */
  static _isPublished (className, func, isStatic) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (!entry) return false
    const published = isStatic ? entry.staticFunctions : entry.memberFunctions
    return published.includes(func)
  }

  /**
   * Refuses a request on an isolated instance that belongs to another
   * connection. An isolated instance created over the wire remembers the
   * connection that created it (the request's sender) and answers that
   * connection alone; one the agent created itself has no owner and is
   * open. The agent's own housekeeping passes as VrpcAdapter.LOCAL_SENDER,
   * which no wire message can carry.
   */
  static _assertOwner (entry, json, instanceId) {
    if (!entry || !entry.isIsolated || entry.owner === undefined) return
    if (json.s === VrpcAdapter.LOCAL_SENDER || json.s === entry.owner) return
    throw new Error(
      `Instance '${instanceId}' is isolated to another connection`
    )
  }

  /**
   * An instance name is one topic level of its own: a non-empty string
   * without `/`, `+`, `#` or `*` (which would read as a pattern), and never
   * `__static__`, which stands for the class in a request topic.
   */
  static _assertInstanceName (name) {
    if (
      typeof name !== 'string' ||
      name.length === 0 ||
      /[/+#*]/.test(name) ||
      name === '__static__'
    ) {
      throw new Error(`Invalid instance name: ${JSON.stringify(name)}`)
    }
  }

  static _handleCreateIsolated (json) {
    let instance
    try {
      const className = json.c
      const [instanceId, ...args] = json.a
      VrpcAdapter._assertInstanceName(instanceId)
      const existing = VrpcAdapter._instances.get(instanceId)
      if (existing) {
        // an id is never re-homed: a shared instance stays shared, an
        // isolated one keeps its owner
        if (!existing.isIsolated) {
          throw new Error(`Instance '${instanceId}' exists as a shared instance`)
        }
        VrpcAdapter._assertOwner(existing, json, instanceId)
        json.r = instanceId
        return existing.instance
      }
      instance = VrpcAdapter._create(className, instanceId, ...args)
      VrpcAdapter._instances.set(instanceId, {
        instance,
        className,
        isIsolated: true,
        // undefined for instances the agent creates itself (open)
        owner: typeof json.s === 'string' ? json.s : undefined
      })
      VrpcAdapter._emitter.emit('create', {
        args,
        className,
        isIsolated: true,
        instance: instanceId
      })
      json.r = instanceId
    } catch (err) {
      json.e = VrpcAdapter._error(err)
    }
    return instance
  }

  static _handleCreateShared (json) {
    let instance
    try {
      const className = json.c
      const [instanceId, ...args] = json.a
      VrpcAdapter._assertInstanceName(instanceId)
      const existing = VrpcAdapter._instances.get(instanceId)
      if (existing && existing.isIsolated) {
        throw new Error(`Instance '${instanceId}' exists as an isolated instance`)
      }
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
      json.e = VrpcAdapter._error(err)
    }
    return instance
  }

  // `a` = [function, ...arguments]: every shared instance of the class (ALL-1)
  static _handleCallAll (json) {
    const [func, ...args] = json.a
    VrpcAdapter._callAll(json, func, args, () => true)
  }

  // `a` = [selection, function, ...arguments]: the shared instances whose
  // name the selection matches, a pattern or a list of them (ALL-4, ALL-5)
  static _handleCallMatching (json) {
    const [selection, func, ...args] = json.a
    if (!NamePattern.isSelection(selection)) {
      json.e = {
        message: `Invalid selection: ${JSON.stringify(selection)} (a pattern or a list of them)`
      }
      return
    }
    VrpcAdapter._callAll(json, func, args, id =>
      NamePattern.selects(selection, id)
    )
  }

  // calls a function on the shared instances of a class `chosen` takes, and
  // answers one entry per instance (ALL-2)
  static _callAll (json, func, args, chosen) {
    try {
      const calls = []
      const subscribes = Registrations.carriesEventIds(args)
      // a remover carrying ids never reaches the class (see Registrations)
      const withdraws = subscribes && Registrations.isRemover(func, json.v)
      if (!withdraws && !VrpcAdapter._isPublished(json.c, func, false)) {
        throw new Error(`Could not find function: ${func}`)
      }
      // what the instance's callbacks unwrap from: the function and its
      // arguments, as a __callAll__ request carries them
      const asCallAll = { ...json, a: [func, ...args] }
      for (const [
        id,
        { className, instance, isIsolated }
      ] of VrpcAdapter._instances) {
        // isolated instances never take part
        if (className !== json.c || isIsolated || !chosen(id)) continue
        // one answer per instance: `{ id, val }`, or `{ id, err }` with the
        // error as it travels
        try {
          let val
          if (subscribes) {
            val = VrpcAdapter._subscribe(json, {
              contextKey: id,
              contextName: id,
              target: instance,
              func,
              args,
              isCallAll: true
            }).value
          } else {
            const unwrapped = VrpcAdapter._unwrapArguments(asCallAll, id)
            val = instance[func].apply(instance, unwrapped.slice(1))
            val = VrpcAdapter.sanitizeEventListenerReturnValues(val)
          }
          calls.push(
            VrpcAdapter._isPromise(val)
              ? val.then(
                x => ({ id, val: x }),
                err => ({ id, err: VrpcAdapter._error(err) })
              )
              : { id, val }
          )
        } catch (err) {
          calls.push({ id, err: VrpcAdapter._error(err) })
        }
      }
      VrpcAdapter._handlePromise(
        json,
        Promise.allSettled(calls).then(result =>
          result.filter(x => x.status === 'fulfilled').map(x => x.value)
        )
      )
    } catch (err) {
      json.e = VrpcAdapter._error(err)
    }
  }

  static sanitizeEventListenerReturnValues (ret) {
    return Registrations.sanitize(ret)
  }

  /**
   * The book key of a request's context: an instance id, or the class for
   * static functions (kept apart from an instance of the same name).
   */
  static _contextKey (context, isStatic) {
    return isStatic ? `\u0000${context}` : context
  }

  // a class name addresses the class, as in _handleCall
  static _isStaticContext (context) {
    return VrpcAdapter._functionRegistry.has(context)
  }

  /**
   * A call carrying subscription ids: one registration per context,
   * function and arguments, shared by every subscription (see
   * Registrations).
   */
  static _subscribe (
    json,
    { contextKey, contextName, target, func, args, isCallAll = false }
  ) {
    const result = VrpcAdapter._registrations.call({
      json,
      contextKey,
      contextName,
      target,
      func,
      args,
      isCallAll,
      speaks: VrpcAdapter._speaksFor(contextName),
      makeCallback: eventId =>
        VrpcAdapter._generateCallback({
          clientId: json.s,
          isCallAll,
          instanceId: contextName,
          eventId,
          receiverVersion: json.v
        })
    })
    // a subscriber is tracked: its going withdraws what it holds
    if (result.ids.length > 0) VrpcAdapter._mustTrackClient = true
    return result
  }

  /**
   * `__unsubscribe__ [id, ...]`: withdraws the sender's subscriptions
   * wherever they are held; an entry `{ id, context }` withdraws that id
   * on that instance only (one instance of a callAll subscription).
   * Answers true.
   */
  static _handleUnsubscribe (json) {
    VrpcAdapter._registrations.unsubscribe(json.a || [], json.s)
    json.r = true
  }

  /**
   * `__registrations__`: lists the registrations of an instance or (on the
   * static topic) a class.
   */
  static _handleRegistrations (json) {
    try {
      const isStatic = VrpcAdapter._isStaticContext(json.c)
      if (!isStatic) {
        VrpcAdapter._assertOwner(VrpcAdapter._instances.get(json.c), json, json.c)
      }
      json.r = VrpcAdapter._registrations.list(
        VrpcAdapter._contextKey(json.c, isStatic)
      )
    } catch (err) {
      json.e = VrpcAdapter._error(err)
    }
  }

  /**
   * `__end__ [function, args, by]`: ends one registration for all its
   * subscriptions, which are told who ended it. Answers whether it existed.
   */
  static _handleEnd (json) {
    try {
      const isStatic = VrpcAdapter._isStaticContext(json.c)
      if (!isStatic) {
        VrpcAdapter._assertOwner(VrpcAdapter._instances.get(json.c), json, json.c)
      }
      const [func, args = [], by = null] = json.a || []
      json.r = VrpcAdapter._registrations.end(
        VrpcAdapter._contextKey(json.c, isStatic),
        func,
        args,
        by
      )
    } catch (err) {
      json.e = VrpcAdapter._error(err)
    }
  }

  static _handleDelete (json) {
    try {
      const instance = json.a[0] // first arg is instance to be deleted
      const entry = VrpcAdapter._instances.get(instance)
      // a delete names the instance's own class: the class info of that
      // class is what announces it gone
      if (entry && entry.className !== json.c && json.s !== VrpcAdapter.LOCAL_SENDER) {
        throw new Error(`Instance '${instance}' is not of class '${json.c}'`)
      }
      VrpcAdapter._assertOwner(entry, json, instance)
      VrpcAdapter._emitter.emit('beforeDelete', {
        instance,
        className: json.c
      })
      const { ended, disposed } = VrpcAdapter._end(instance)
      VrpcAdapter._emitter.emit('delete', {
        instance,
        className: json.c
      })
      // a delete answers once the object released what it runs, so that a
      // constructor right after it never meets a resource the old object
      // still holds; the agent's own housekeeping awaits no answer
      if (disposed && json.s !== VrpcAdapter.LOCAL_SENDER) {
        VrpcAdapter._handlePromise(json, disposed.then(() => ended))
      } else json.r = ended
    } catch (err) {
      json.e = VrpcAdapter._error(err)
    }
  }

  static _handleCall (json) {
    // an isolated instance answers its creating connection only
    try {
      VrpcAdapter._assertOwner(VrpcAdapter._instances.get(json.c), json, json.c)
    } catch (err) {
      json.e = VrpcAdapter._error(err)
      return
    }
    // special case: removeAllListeners withdraws the caller's subscriptions
    // of that event - the emitter itself is never touched, it holds other
    // clients' and its own listeners
    if (json.f === 'removeAllListeners') {
      const isStatic = VrpcAdapter._isStaticContext(json.c)
      VrpcAdapter._registrations.withdrawEvent(
        VrpcAdapter._contextKey(json.c, isStatic),
        json.a[0],
        json.s
      )
      json.r = true
      return
    }
    // an unknown context fails before its arguments are unwrapped: a
    // listener registered for a name that does not exist would outlive the
    // failed call and pass for attached once the name is created
    if (
      !VrpcAdapter._functionRegistry.has(json.c) &&
      !VrpcAdapter._instances.has(json.c)
    ) {
      throw new Error(`Could not find context: ${json.c}`)
    }
    // Check whether context is global
    if (json.c === VRPC_GLOBAL) {
      if (!VrpcAdapter._isPublished(VRPC_GLOBAL, json.f, true)) {
        throw new Error(`Could not find function: ${json.f}`)
      }
      try {
        const unwrapped = VrpcAdapter._unwrapArguments(json)
        const ret = window[VRPC_WINDOW_NS][json.f].apply(null, unwrapped)
        // check if function returns promise
        if (VrpcAdapter._isPromise(ret)) {
          VrpcAdapter._handlePromise(json, ret)
        } else json.r = ret
      } catch (err) {
        json.e = VrpcAdapter._error(err)
      }
      return
    }
    // Check whether context is a registered class (function is static)
    const classEntry = VrpcAdapter._functionRegistry.get(json.c)
    const isStatic = classEntry !== undefined
    let target
    let className = json.c
    if (isStatic) {
      target = classEntry.Klass
    } else {
      const entry = VrpcAdapter._instances.get(json.c)
      if (entry === undefined) {
        throw new Error(`Could not find context: ${json.c}`)
      }
      target = entry.instance
      className = entry.className
    }
    const carriesIds = Registrations.carriesEventIds(json.a)
    // only what the class info lists is called; a remover carrying ids never
    // reaches the class (see Registrations)
    if (
      !(carriesIds && Registrations.isRemover(json.f, json.v)) &&
      !VrpcAdapter._isPublished(className, json.f, isStatic)
    ) {
      throw new Error(`Could not find function: ${json.f}`)
    }
    // a call carrying subscription ids subscribes (or withdraws)
    if (carriesIds) {
      try {
        const { value } = VrpcAdapter._subscribe(json, {
          contextKey: VrpcAdapter._contextKey(json.c, isStatic),
          contextName: json.c,
          target,
          func: json.f,
          args: json.a
        })
        if (VrpcAdapter._isPromise(value)) {
          VrpcAdapter._handlePromise(json, value)
        } else json.r = value
      } catch (err) {
        json.e = VrpcAdapter._error(err)
      }
      return
    }
    const unwrapped = VrpcAdapter._unwrapArguments(json)
    // special case: removing a listener the adapter does not hold (the
    // client's subscription outlived a restart of this agent, or it sent
    // no listener at all) - nothing to remove, and the instance's
    // EventEmitter would throw on a listener that is not a function
    if (
      (json.f === 'off' || json.f === 'removeListener') &&
      typeof unwrapped[1] !== 'function'
    ) {
      json.r = true
      return
    }
    // TODO Think about whether to do live checking (like here) or
    // rather sticking to those functions registered before...
    if (!VrpcAdapter._isFunction(target[json.f])) {
      throw new Error(`Could not find function: ${json.f}`)
    }
    try {
      let ret = isStatic
        ? target[json.f].apply(null, unwrapped)
        : target[json.f].apply(target, unwrapped)
      if (!isStatic) ret = VrpcAdapter.sanitizeEventListenerReturnValues(ret)
      // check if function returns promise
      if (VrpcAdapter._isPromise(ret)) {
        VrpcAdapter._handlePromise(json, ret)
      } else json.r = ret
    } catch (err) {
      json.e = VrpcAdapter._error(err)
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
    return VrpcAdapter._end(instanceId).ended
  }

  /**
   * Ends an instance - the one teardown behind every door (a remote delete,
   * the auto-delete of an isolated instance whose client went, an
   * in-process delete): its name is free at once, the adapter forgets its
   * registrations (silent from now on, see Registrations; released by the
   * adapter only for an object without a dispose method, and Node's own
   * `on` always), and the object releases what it runs through the
   * ECMAScript dispose protocol, `[Symbol.asyncDispose]` or else
   * `[Symbol.dispose]`.
   *
   * @returns {Object} `{ ended, disposed }`: whether the name was known, and
   * a promise when an asynchronous dispose is under way (it never rejects)
   */
  static _end (instanceId) {
    const entry = VrpcAdapter._instances.get(instanceId)
    if (!entry) return { ended: false, disposed: null }
    VrpcAdapter._instances.delete(instanceId)
    const { instance } = entry
    VrpcAdapter._registrations.forgetContext(instanceId, {
      release: !(
        VrpcAdapter._isFunction(instance[Symbol.asyncDispose]) ||
        VrpcAdapter._isFunction(instance[Symbol.dispose])
      )
    })
    return { ended: true, disposed: VrpcAdapter._dispose(instanceId, entry) }
  }

  /**
   * Runs the object's dispose method. A dispose that fails or outlasts
   * VrpcAdapter.DISPOSE_TIMEOUT is reported (event 'disposeFailed') and
   * never thrown: the instance is gone either way.
   *
   * @returns {Promise|null} Settles when an asynchronous dispose is done
   */
  static _dispose (instanceId, { instance, className }) {
    const fail = error =>
      VrpcAdapter._emitter.emit('disposeFailed', {
        instance: instanceId,
        className,
        error
      })
    let result
    try {
      if (VrpcAdapter._isFunction(instance[Symbol.asyncDispose])) {
        result = instance[Symbol.asyncDispose]()
      } else if (VrpcAdapter._isFunction(instance[Symbol.dispose])) {
        result = instance[Symbol.dispose]()
      }
    } catch (err) {
      fail(err)
      return null
    }
    if (!VrpcAdapter._isPromise(result)) return null
    let timer
    const bound = new Promise(resolve => {
      timer = setTimeout(() => {
        fail(
          new Error(
            `dispose did not settle within ${VrpcAdapter.DISPOSE_TIMEOUT} ms`
          )
        )
        resolve()
      }, VrpcAdapter.DISPOSE_TIMEOUT)
    })
    const settled = result.then(
      () => {},
      err => fail(err)
    )
    return Promise.race([settled, bound]).then(() => clearTimeout(timer))
  }

  static _unregisterClient (clientId) {
    VrpcAdapter._registrations.withdrawClient(clientId)
  }

  static _validate (schema, params) {
    if (!VrpcAdapter._ajv) {
      VrpcAdapter._ajv = new Ajv({ useDefaults: true })
    }
    const valid = VrpcAdapter._ajv.validate(schema, params)
    if (!valid) throw new Error(VrpcAdapter._ajv.errorsText())
  }

  // the arguments of a plain call: `__f__` ids become one-shot callbacks
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
      if (typeof arg === 'string' && arg.startsWith('__f__')) {
        unwrapped.push(
          VrpcAdapter._generateCallback({
            clientId,
            isCallAll,
            instanceId: context,
            eventId: arg,
            receiverVersion: json.v
          })
        )
      } else {
        unwrapped.push(arg)
      }
    }
    return unwrapped
  }

  /**
   * Whether the object under `instanceId` is still the one the adapter saw
   * when it built a listener or a callback for it: a deleted instance never
   * speaks on the bus again, even when its class kept the listener or its
   * clock kept running. A static context (a class name) has no object and
   * always speaks.
   */
  static _speaksFor (instanceId) {
    const entry = VrpcAdapter._instances.get(instanceId)
    if (!entry) return () => true
    const { instance } = entry
    return () => {
      const live = VrpcAdapter._instances.get(instanceId)
      return live !== undefined && live.instance === instance
    }
  }

  static _generateCallback ({
    eventId,
    clientId,
    instanceId,
    isCallAll,
    receiverVersion
  }) {
    const speaks = VrpcAdapter._speaksFor(instanceId)
    return (...innerArgs) => {
      if (!speaks()) return
      // "callAll" event notifications expect the instanceId as first argument
      const a = isCallAll ? [instanceId, ...innerArgs] : [...innerArgs]
      // the receiver's protocol version: whether it can be told of a
      // callback that cannot travel (CALL-10)
      VrpcAdapter._callback({ a, s: clientId, i: eventId, receiverVersion })
    }
  }

  /**
   * Answers a promise twice: at once with `r: '__p__<f>-<nonce>-<n>'`, and
   * once it settled with a second answer under that id, `{ s, i, r }` or
   * `{ s, i, e }`. A client waits for the second answer under the bare id,
   * whichever agent sends it: the nonce keeps the ids of two agents apart,
   * whose counters may well stand at the same value.
   */
  static _handlePromise (json, promise) {
    const cid = VrpcAdapter._correlationId++ % Number.MAX_SAFE_INTEGER
    const id = `__p__${json.f}-${VrpcAdapter._promiseNonce}-${cid}`
    const { s } = json
    json.r = id
    promise.then(
      r => VrpcAdapter._callback({ s, i: id, r }),
      err => VrpcAdapter._callback({ s, i: id, e: VrpcAdapter._error(err) })
    )
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
    // Node's EventEmitter offers subscribing, withdrawing and once to
    // clients; emit (anyone could fake an event to every subscriber, or emit
    // 'error' and end the agent) and its internals stay inside the class
    const isEmitter =
      klass instanceof EventEmitter ||
      (!!klass.prototype && klass.prototype instanceof EventEmitter)
    const published = (names, level) => {
      if (level === EventEmitter.prototype) {
        return names.filter(x => VrpcAdapter._emitterPublic.has(x))
      }
      return isEmitter ? names.filter(x => x !== 'emit') : names
    }
    do {
      if (klass_.prototype) {
        const funcs = Object.getOwnPropertyNames(klass_.prototype).filter(
          x =>
            !VrpcAdapter._blackList.has(x) &&
            VrpcAdapter._isFunction(klass_.prototype[x])
        )
        fs = [...fs, ...published(funcs, klass_.prototype)]
      } else {
        const funcs = Object.getOwnPropertyNames(klass_).filter(
          x => !VrpcAdapter._blackList.has(x) && VrpcAdapter._isFunction(klass_[x])
        )
        fs = [...fs, ...published(funcs, klass_)]
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
      // EventEmitter's own statics are Node helpers, not the class's API
      if (klass_ !== EventEmitter) {
        fs = [
          ...fs,
          ...Object.getOwnPropertyNames(klass_).filter(prop => {
            const desc = Object.getOwnPropertyDescriptor(klass_, prop)
            return !!desc && typeof desc.value === 'function'
          })
        ]
      }
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
 * @event VrpcAdapter#beforeDelete
 * @event VrpcAdapter#delete
 * @type {Object}
 * @property {String} className The class name of the deleted instance
 * @property {String} instance The instance name
 */

/**
 * Event 'disposeFailed'
 *
 * Emitted when the dispose method of a deleted instance throws, rejects or
 * does not settle within VrpcAdapter.DISPOSE_TIMEOUT. The instance is gone
 * regardless.
 *
 * @event VrpcAdapter#disposeFailed
 * @type {Object}
 * @property {String} className The class name of the deleted instance
 * @property {String} instance The instance name
 * @property {Error} error What went wrong
 */

// Initialize static members
VrpcAdapter._functionRegistry = new Map()
VrpcAdapter._instances = new Map()
VrpcAdapter._emitter = new EventEmitter()
VrpcAdapter._correlationId = 0
// tells this process's promise ids from those of every other agent
VrpcAdapter._promiseNonce = nanoid(8)
// the event registrations of every context and their subscriptions
VrpcAdapter._registrations = new Registrations({
  publish: message => VrpcAdapter._callback(message),
  emit: (event, payload) => VrpcAdapter._emitter.emit(event, payload)
})
// the longest a delete waits for the dispose method of its instance
VrpcAdapter.DISPOSE_TIMEOUT = 10000
// the EventEmitter functions published to clients
VrpcAdapter._emitterPublic = new Set([
  'on',
  'addListener',
  'off',
  'removeListener',
  'once',
  'removeAllListeners'
])
VrpcAdapter._blackList = new Set([
  // a class's constructor is reached through __createShared__ and
  // __createIsolated__, never as a member function
  'constructor',
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

/**
 * The sender the agent uses for its own housekeeping calls (deleting the
 * isolated instances of a departed connection). A Symbol: no message from
 * the wire can carry it, so it can never be claimed remotely.
 */
VrpcAdapter.LOCAL_SENDER = Symbol('vrpc.local-sender')

module.exports = VrpcAdapter
