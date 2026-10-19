'use strict'

const EventEmitter = require('events')

// Node before 18.18 / 20.4 and older browsers have no dispose symbols: the
// registry's stand-ins, as the adapters install them
if (typeof Symbol.dispose !== 'symbol') {
  Symbol.dispose = Symbol.for('nodejs.dispose')
}
if (typeof Symbol.asyncDispose !== 'symbol') {
  Symbol.asyncDispose = Symbol.for('nodejs.asyncDispose')
}

/**
 * The agent's book of event registrations (protocol version 4).
 *
 * A *registration* is the one call of an event function on one context (an
 * instance, or a class for static functions) with one set of arguments. A
 * *subscription* is a client's wish to receive its events; it travels as the
 * `__e__<id>` argument in the handler's position, and that id already names
 * the client connection it belongs to.
 *
 * The book keeps three promises, whatever clients repeat, flap or restart:
 * - the event function is called once per context, function and arguments
 *   (handler arguments excluded, the rest compared by value);
 * - every event reaches every subscription once: the class holds one
 *   fan-out listener per handler position, which hands each event to all
 *   subscriptions of the registration;
 * - subscriptions are sets: declaring one again changes nothing, and the
 *   last one out releases the registration, after which its listener is
 *   silent.
 *
 * A registration may greet: its `greet(...handlers)` is called once for
 * every new subscription - the first one included - with handlers that reach
 * that subscription alone, so every subscriber gets what the class greets
 * with (its current state), not only the one whose call registered it.
 *
 * A subscription id names one registration per context: a protocol-4
 * client gives every target, function, arguments and callback its own id,
 * and a request bringing a held id with other function or arguments to the
 * same context is refused - the book never guesses whether that meant
 * "replace" or "add". Clients before protocol 4 derived ids from less (the
 * first string argument, else the function name); their ids may hold
 * several registrations on one context, as they did before.
 *
 * Shared by VrpcAdapter and VrpcBrowserAdapter: both adapters follow the
 * same laws, so they keep them in one place.
 */

// registration states
const PENDING = 0 // the first call is still running (async event function)
const LIVE = 1
const SILENT = 2 // nobody listens, and the class offers no way to release
const GONE = 3 // released, ended, failed or forgotten

// stand for a handler (subscription) and a one-shot callback argument in a
// registration key
const HANDLER = '\u0000vrpc-handler'
const CALLBACK = '\u0000vrpc-callback'

// the window events per second are measured over
const RATE_WINDOW = 5000

// a protocol-4 client is told when its subscription ends
const NOTICE_VERSION = 4

// from protocol 4 on, an id names one registration per context
const ID_VERSION = 4

function isFunction (obj) {
  return typeof obj === 'function'
}

function isPromise (obj) {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  )
}

/**
 * Whether a returned value is a registration: any object that can be
 * disposed (`[Symbol.dispose]()` or `[Symbol.asyncDispose]()`), a
 * DisposableStack included.
 */
function isRegistration (value) {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    (isFunction(value[Symbol.asyncDispose]) || isFunction(value[Symbol.dispose]))
  )
}

// EventEmitter instances answer `on` with themselves - nothing to serialize
function sanitize (ret) {
  return ret &&
    typeof ret === 'object' &&
    ret._events !== undefined &&
    ret._eventsCount !== undefined
    ? true
    : ret
}

function sortKeys (value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object' && value.constructor === Object) {
    const sorted = {}
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeys(value[key])
    return sorted
  }
  return value
}

/**
 * Arguments compared by value: equal JSON once object keys are sorted.
 */
function canonical (args) {
  return JSON.stringify(sortKeys(args))
}

/**
 * Functions whose call with a subscription id withdraws that subscription:
 * Node's `off`/`removeListener` and the `off<Name>` twins of `on<Name>`
 * event functions - and, from clients before protocol 4, the twins of their
 * deprecated prefixes (`unmonitor<Name>`, `unsignal<Name>`,
 * `remove<Name>`). Old engines release this way; the class is never called
 * for it (its one listener belongs to all subscriptions).
 */
function isRemover (func, v) {
  if (func === 'off' || func === 'removeListener' || /^off[A-Z]/.test(func)) {
    return true
  }
  return !(v >= ID_VERSION) && /^(unmonitor|unsignal|remove)[A-Z]/.test(func)
}

/**
 * The event functions a remover undoes: `on` and `addListener` for `off` and
 * `removeListener`, `onValue` for `offValue`, `monitorX` for `unmonitorX`;
 * null when the name tells none (`remove<Name>`).
 */
function twinsOf (func) {
  if (func === 'off' || func === 'removeListener') return ['on', 'addListener']
  if (/^off[A-Z]/.test(func)) return [`on${func.slice(3)}`]
  if (/^un(monitor|signal)[A-Z]/.test(func)) return [func.slice(2)]
  return null
}

/**
 * The function that undoes an event function's call when the class returns
 * no registration (deprecated): `offValue` for `onValue`, `off` for a
 * class's own `on`, `unmonitorX` for `monitorX`; null when none is named.
 */
function releaseTwinOf (func) {
  if (func === 'on') return 'off'
  if (func === 'addListener') return 'removeListener'
  if (/^on[A-Z]/.test(func)) return `off${func.slice(2)}`
  if (/^(monitor|signal)[A-Z]/.test(func)) return `un${func}`
  return null
}

function isEventId (arg) {
  return typeof arg === 'string' && arg.startsWith('__e__')
}

/**
 * Whether a subscription id names a topic of its sender: `__e__<sender>/`
 * followed by exactly one level, not empty and no wildcard - the level a
 * client subscribes below its connection id. Clients since 3.7 derive their
 * ids this way.
 */
function ownsTopic (sender, id) {
  if (typeof sender !== 'string') return false
  const prefix = `__e__${sender}/`
  if (!id.startsWith(prefix)) return false
  return /^[^/+#]+$/.test(id.slice(prefix.length))
}

class Registrations {
  /**
   * @param {Object} hooks
   * @param {Function} hooks.publish Sends a message `{ a, i }` (an event) or
   * `{ i, end }` (an ended notice) to the subscription's topic
   * @param {Function} hooks.emit Emits an adapter event (`releaseFailed`)
   */
  constructor ({ publish, emit }) {
    this._publish = publish
    this._emit = emit
    // contextKey -> Map(key -> registration)
    this._contexts = new Map()
    // subscription id -> Map(contextKey + key -> subscription): one per
    // context, but for clients before protocol 4
    this._held = new Map()
    // client connection id -> Set(subscription id)
    this._byClient = new Map()
  }

  /**
   * Whether a call carries subscription ids (`__e__<id>`) and so is a
   * subscription, or the withdrawal of one, rather than a plain call.
   */
  static carriesEventIds (args) {
    if (!Array.isArray(args)) return false
    for (let i = 0; i < args.length; i++) {
      if (isEventId(args[i])) return true
    }
    return false
  }

  /**
   * Handles a call that carries subscription ids.
   *
   * @param {Object} options
   * @param {Object} options.json The request (sender `s`, version `v`,
   * optional subscriber labels `l: { [id]: label }`)
   * @param {String} options.contextKey Book key of the context
   * @param {String} options.contextName Instance id (or class name)
   * @param {Object} options.target The instance (or class)
   * @param {String} options.func Function name
   * @param {Array} options.args Wire arguments
   * @param {Boolean} options.isCallAll Events carry the instance id first
   * @param {Function} options.speaks Whether the context still speaks
   * @param {Function} options.makeCallback Builds a one-shot `__f__` callback
   * @returns {Object} `{ value, ids }`: the answer (a value, or a promise of
   * it) and the subscription ids the context now holds for this call
   */
  call ({
    json,
    contextKey,
    contextName,
    target,
    func,
    args,
    isCallAll,
    speaks,
    makeCallback
  }) {
    const clientId = json.s
    const ids = []
    const keyArgs = new Array(args.length)
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (isEventId(arg)) {
        ids.push(arg)
        keyArgs[i] = HANDLER
      } else if (typeof arg === 'string' && arg.startsWith('__f__')) {
        keyArgs[i] = CALLBACK
      } else {
        keyArgs[i] = arg
      }
    }
    // events go to the topic an id names: only ever one of the sender's own
    // topics, never one of somebody else
    for (const id of ids) {
      if (!ownsTopic(clientId, id)) {
        throw new Error(
          "A subscription id must name a topic under its sender's connection id"
        )
      }
    }
    if (isRemover(func, json.v)) {
      this._withdrawByRemover(func, keyArgs, ids, clientId, contextKey)
      return { value: true, ids: [] }
    }
    if (!isFunction(target[func])) {
      throw new Error(`Could not find function: ${func}`)
    }
    // a one-shot is no subscription (clients before 3.15 send `once` with
    // an event id): each call gets its own listener, as it always did
    if (func === 'once' || func === 'prependOnceListener') {
      const isSpeaking = speaks || (() => true)
      const unwrapped = args.map((arg, i) => {
        if (keyArgs[i] === CALLBACK) return makeCallback(arg)
        if (keyArgs[i] !== HANDLER) return arg
        return (...innerArgs) => {
          if (!isSpeaking()) return
          this._publish({
            a: isCallAll ? [contextName, ...innerArgs] : innerArgs,
            i: arg,
            receiverVersion: json.v
          })
        }
      })
      return { value: sanitize(target[func].apply(target, unwrapped)), ids: [] }
    }
    const key = `${func}\u0000${canonical(keyArgs)}`
    // protocol 4: an id names one registration per context - another one
    // under the same id is a client's mistake, never a replacement
    if (json.v >= ID_VERSION) {
      for (const id of ids) {
        const other = this._subscriptionsOn(id, contextKey).find(
          sub => sub.reg.key !== key
        )
        if (other) {
          throw new Error(
            `Subscription id already held here by ${other.reg.func} with other arguments: every target, function and arguments needs its own id`
          )
        }
      }
    }
    let regs = this._contexts.get(contextKey)
    if (!regs) {
      regs = new Map()
      this._contexts.set(contextKey, regs)
    }
    let reg = regs.get(key)
    if (reg) {
      const added = this._join(reg, ids, json, isCallAll)
      if (reg.state === SILENT) reg.state = LIVE
      // a pending registration greets everybody once it settled
      this._greet(reg, added)
      return { value: reg.state === PENDING ? reg.promise : reg.r, ids }
    }
    const nodeEmitter =
      (func === 'on' || func === 'addListener') &&
      target[func] === EventEmitter.prototype[func]
    reg = {
      contextKey,
      contextName,
      target,
      func,
      key,
      args: keyArgs.filter(x => x !== HANDLER && x !== CALLBACK),
      event: func === 'on' || func === 'addListener' ? args[0] : null,
      nodeEmitter,
      state: PENDING,
      positions: [],
      r: undefined,
      promise: null,
      registration: null,
      events: 0,
      bucketStart: Date.now(),
      bucketCount: 0,
      rate: null
    }
    const isSpeaking = speaks || (() => true)
    reg.speaks = isSpeaking
    for (let k = 0; k < ids.length; k++) {
      reg.positions.push({
        subs: new Map(),
        fanout: this._fanout(reg, k, contextName, isSpeaking)
      })
    }
    regs.set(key, reg)
    this._join(reg, ids, json, isCallAll)
    let k = 0
    const unwrapped = args.map((arg, i) => {
      if (keyArgs[i] === CALLBACK) return makeCallback(arg)
      if (keyArgs[i] !== HANDLER) return arg
      return reg.positions[k++].fanout
    })
    // a twin that releases (deprecated) is called with the same arguments
    reg.unwrapped = unwrapped
    let ret
    try {
      ret = target[func].apply(target, unwrapped)
    } catch (err) {
      this._fail(reg)
      throw err
    }
    if (isPromise(ret)) {
      reg.promise = Promise.resolve(ret).then(
        value => {
          this._settle(reg, value)
          return reg.r
        },
        err => {
          this._fail(reg)
          throw err
        }
      )
      return { value: reg.promise, ids }
    }
    this._settle(reg, ret)
    return { value: reg.r, ids }
  }

  /**
   * Withdraws subscriptions by id wherever the sender holds them - or, for
   * an entry `{ id, context }`, on that one context (instance) only: a
   * callAll subscription holds one id on every instance of its class, and
   * an end that reached one of them withdraws it there alone.
   *
   * @param {Array.<String|Object>} ids Subscription ids, or `{ id, context }`
   * @param {String} clientId The sender: only its own subscriptions go
   * @returns {Number} How many subscriptions were withdrawn
   */
  unsubscribe (ids, clientId) {
    let count = 0
    for (const entry of Array.isArray(ids) ? ids : [ids]) {
      if (isEventId(entry)) {
        count += this._withdraw(entry, clientId)
      } else if (
        entry &&
        typeof entry === 'object' &&
        isEventId(entry.id) &&
        typeof entry.context === 'string'
      ) {
        count += this._withdraw(entry.id, clientId, entry.context)
      }
    }
    return count
  }

  /**
   * A client connection went: all its subscriptions are withdrawn.
   */
  withdrawClient (clientId) {
    const ids = this._byClient.get(clientId)
    if (!ids) return
    for (const id of Array.from(ids)) this._withdraw(id, clientId)
    this._byClient.delete(clientId)
  }

  /**
   * A client's `removeAllListeners(event)`: withdraws that client's
   * subscriptions of the event on the context (all its `on` subscriptions
   * there without an event). The emitter itself is never touched.
   */
  withdrawEvent (contextKey, event, clientId) {
    const regs = this._contexts.get(contextKey)
    if (!regs) return
    for (const reg of Array.from(regs.values())) {
      if (reg.func !== 'on' && reg.func !== 'addListener') continue
      if (event !== undefined && event !== null && reg.event !== event) continue
      for (const sub of this._subscriptionsOf(reg)) {
        if (sub.clientId === clientId) this._remove(sub)
      }
    }
  }

  /**
   * Lists the registrations of a context.
   *
   * @returns {Array.<Object>} `{ function, args, state, subscriptions:
   * [{ label, callAll }], events, rate }` per registration, rate in events
   * per second (subscription ids are credentials and never listed)
   */
  list (contextKey) {
    const regs = this._contexts.get(contextKey)
    if (!regs) return []
    const now = Date.now()
    return Array.from(regs.values()).map(reg => ({
      function: reg.func,
      args: reg.args,
      state: ['pending', 'live', 'silent', 'gone'][reg.state],
      subscriptions: this._subscriptionsOf(reg).map(sub => ({
        label: sub.label === undefined ? null : sub.label,
        callAll: sub.isCallAll
      })),
      events: reg.events,
      rate: Registrations._rate(reg, now)
    }))
  }

  /**
   * Ends one registration for all its subscriptions: released, and every
   * (protocol 4) subscription is told it ended and by whom.
   *
   * @returns {Boolean} Whether such a registration existed
   */
  end (contextKey, func, args = [], by = null) {
    const regs = this._contexts.get(contextKey)
    if (!regs) return false
    const wanted = canonical(Array.isArray(args) ? args : [args])
    for (const reg of regs.values()) {
      if (reg.func !== func || canonical(reg.args) !== wanted) continue
      this._ended(reg, { reason: 'ended', by })
      return true
    }
    return false
  }

  /**
   * The context (an instance) ended: its registrations are forgotten and
   * their listeners fall silent. Its own dispose releases what they run;
   * an instance without one gets the releases the book knows (legacy).
   * Node's own `on` is always undone: that is in-memory and safe.
   */
  forgetContext (contextKey, { release = true } = {}) {
    const regs = this._contexts.get(contextKey)
    if (!regs) return
    this._contexts.delete(contextKey)
    for (const reg of regs.values()) {
      this._unlink(reg)
      if (release || reg.nodeEmitter) this._release(reg)
    }
  }

  /**
   * Whether a client holds a subscription id on a context.
   */
  holds (contextKey, id, clientId) {
    return this._subscriptionsOn(id, contextKey).some(
      sub => clientId === undefined || sub.clientId === clientId
    )
  }

  // private:

  _fanout (reg, k, contextName, speaks) {
    return (...innerArgs) => {
      if (reg.state >= SILENT || !speaks()) return
      this._count(reg)
      for (const sub of reg.positions[k].subs.values()) {
        // the subscriber's version: whether it can be told of an event
        // that cannot travel (EV-22)
        this._publish({
          a: sub.isCallAll ? [contextName, ...innerArgs] : innerArgs,
          i: sub.id,
          receiverVersion: sub.v
        })
      }
    }
  }

  _count (reg) {
    reg.events++
    const now = Date.now()
    if (now - reg.bucketStart >= RATE_WINDOW) {
      reg.rate = (reg.bucketCount * 1000) / (now - reg.bucketStart)
      reg.bucketStart = now
      reg.bucketCount = 0
    }
    reg.bucketCount++
  }

  static _rate (reg, now) {
    const elapsed = now - reg.bucketStart
    if (elapsed >= RATE_WINDOW || reg.rate === null) {
      return (reg.bucketCount * 1000) / Math.max(elapsed, 1000)
    }
    return reg.rate
  }

  // adds the subscriptions a declaration carries; answers the new ones
  _join (reg, ids, json, isCallAll) {
    const added = []
    const labels = json.l && typeof json.l === 'object' ? json.l : {}
    for (let k = 0; k < ids.length && k < reg.positions.length; k++) {
      const id = ids[k]
      // one callback in two handler positions is one subscription
      if (ids.indexOf(id) !== k) continue
      const position = reg.positions[k]
      let sub = position.subs.get(id)
      if (!sub) {
        sub = {
          id,
          clientId: json.s,
          isCallAll: !!isCallAll,
          reg,
          position,
          contextKey: reg.contextKey
        }
        position.subs.set(id, sub)
        let held = this._held.get(id)
        if (!held) {
          held = new Map()
          this._held.set(id, held)
        }
        held.set(Registrations._holdKey(sub), sub)
        let byClient = this._byClient.get(json.s)
        if (!byClient) {
          byClient = new Set()
          this._byClient.set(json.s, byClient)
        }
        byClient.add(id)
        added.push(sub)
      }
      // the latest declaration speaks for the subscription
      sub.v = typeof json.v === 'number' ? json.v : 0
      if (labels[id] !== undefined) sub.label = labels[id]
    }
    return added
  }

  /**
   * Greets new subscriptions of a live registration that can greet: its
   * `greet` gets one handler per handler position, reaching the new
   * subscription alone (a no-op where it holds no position). A greeting that
   * throws or rejects is reported (`greetFailed`); the subscription stays.
   */
  _greet (reg, subs) {
    const { registration } = reg
    if (reg.state !== LIVE || !registration || !isFunction(registration.greet)) {
      return
    }
    for (const sub of subs) {
      const fail = error =>
        this._emit('greetFailed', {
          context: reg.contextName,
          function: reg.func,
          args: reg.args,
          error
        })
      const handlers = reg.positions.map(position =>
        position === sub.position ? this._direct(reg, sub) : () => {}
      )
      try {
        const result = registration.greet(...handlers)
        if (isPromise(result)) result.then(null, fail)
      } catch (err) {
        fail(err)
      }
    }
  }

  // a handler that reaches one subscription alone, while it is held
  _direct (reg, sub) {
    return (...innerArgs) => {
      if (reg.state >= SILENT || !reg.speaks()) return
      if (sub.position.subs.get(sub.id) !== sub) return
      this._publish({
        a: sub.isCallAll ? [reg.contextName, ...innerArgs] : innerArgs,
        i: sub.id,
        receiverVersion: sub.v
      })
    }
  }

  static _holdKey (sub) {
    return `${sub.contextKey}\u0000${sub.reg.key}`
  }

  // what an id holds on a context: one registration's subscription (more
  // only for clients before protocol 4)
  _subscriptionsOn (id, contextKey) {
    const held = this._held.get(id)
    if (!held) return []
    return Array.from(held.values()).filter(sub => sub.contextKey === contextKey)
  }

  _subscriptionsOf (reg) {
    const subs = []
    for (const position of reg.positions) {
      for (const sub of position.subs.values()) subs.push(sub)
    }
    return subs
  }

  _withdraw (id, clientId, contextKey) {
    const held = this._held.get(id)
    if (!held) return 0
    let count = 0
    for (const sub of Array.from(held.values())) {
      if (contextKey !== undefined && sub.contextKey !== contextKey) continue
      if (sub.clientId !== clientId) continue
      this._remove(sub)
      count++
    }
    return count
  }

  /**
   * A remover call carrying subscription ids (legacy) withdraws what it
   * names: the subscription held on the registration of its twin event
   * function with the remover's own arguments (offValue('x', id) undoes
   * onValue('x', id), not onValue('y', id)), else every one the id holds
   * on that twin function on the context (offValue(id)), or on any
   * function when the remover names none.
   */
  _withdrawByRemover (func, keyArgs, ids, clientId, contextKey) {
    const twins = twinsOf(func)
    const named = new Set(
      (twins || []).map(twin => `${twin}\u0000${canonical(keyArgs)}`)
    )
    for (const id of ids) {
      const held = this._subscriptionsOn(id, contextKey).filter(
        sub =>
          sub.clientId === clientId &&
          (twins === null || twins.includes(sub.reg.func))
      )
      const exact = held.filter(sub => named.has(sub.reg.key))
      for (const sub of exact.length > 0 ? exact : held) this._remove(sub)
    }
  }

  // takes a subscription out; the last one out releases its registration
  _remove (sub) {
    this._forget(sub)
    const { reg } = sub
    for (const position of reg.positions) {
      if (position.subs.size > 0) return
    }
    this._lastOut(reg)
  }

  // drops a subscription from every index (its registration decides apart)
  _forget (sub) {
    sub.position.subs.delete(sub.id)
    const held = this._held.get(sub.id)
    const holdKey = Registrations._holdKey(sub)
    if (held && held.get(holdKey) === sub) {
      held.delete(holdKey)
      if (held.size === 0) {
        this._held.delete(sub.id)
        const byClient = this._byClient.get(sub.clientId)
        if (byClient) {
          byClient.delete(sub.id)
          if (byClient.size === 0) this._byClient.delete(sub.clientId)
        }
      }
    }
  }

  _lastOut (reg) {
    // a pending first call decides once it settled
    if (reg.state !== LIVE) return
    if (Registrations._canRelease(reg)) {
      this._unlink(reg)
      this._release(reg)
    } else {
      // no way to release: kept, silent, and reused by the next subscriber
      reg.state = SILENT
    }
  }

  _settle (reg, value) {
    // an emitter answering with itself (Node's `on`, a chaining wrapper)
    // returns no registration, even when it can be disposed as an instance
    const registration =
      !reg.nodeEmitter && value !== reg.target && isRegistration(value)
    if (reg.state !== PENDING) {
      // forgotten meanwhile (the instance ended): nobody owns it any more
      if (registration) {
        reg.registration = value
        this._release(reg)
      }
      return
    }
    if (registration) {
      reg.registration = value
      // what the call answered before registrations (a node id, a
      // subscription id) rides along as `value`; the object itself never
      // travels
      reg.r = 'value' in value ? sanitize(value.value) : true
      const { ended } = value
      if (isPromise(ended)) {
        ended.then(
          result =>
            this._ended(reg, {
              reason: typeof result === 'string' && result ? result : 'ended',
              by: 'source'
            }),
          err =>
            this._ended(reg, {
              reason: (err && err.message) || String(err),
              by: 'source',
              failed: true
            })
        )
      }
    } else {
      reg.r = sanitize(value)
    }
    reg.state = LIVE
    const subs = this._subscriptionsOf(reg)
    if (subs.length === 0) this._lastOut(reg)
    else this._greet(reg, subs)
  }

  // the first call failed: every subscriber learns it, nothing is kept
  _fail (reg) {
    this._unlink(reg)
  }

  // takes a registration out of the book; its listeners fall silent
  _unlink (reg) {
    reg.state = GONE
    const regs = this._contexts.get(reg.contextKey)
    if (regs && regs.get(reg.key) === reg) {
      regs.delete(reg.key)
      if (regs.size === 0) this._contexts.delete(reg.contextKey)
    }
    for (const sub of this._subscriptionsOf(reg)) this._forget(sub)
  }

  _ended (reg, end) {
    if (reg.state === GONE) return
    const subs = this._subscriptionsOf(reg)
    this._unlink(reg)
    this._release(reg)
    for (const sub of subs) {
      if (!(sub.v >= NOTICE_VERSION)) continue
      this._publish({
        i: sub.id,
        end: { ...end, context: reg.contextName }
      })
    }
  }

  // whether the agent knows how to undo the registration's call
  static _canRelease (reg) {
    const twin = releaseTwinOf(reg.func)
    return (
      !!reg.registration ||
      reg.nodeEmitter ||
      (twin !== null && isFunction(reg.target[twin])) ||
      isFunction(reg.target.removeListener)
    )
  }

  // undoes the call: the registration's dispose, Node's removeListener for
  // Node's own `on`, else (deprecated) the class's twin of the event function
  // with the same arguments, or its removeListener
  _release (reg) {
    const fail = error =>
      this._emit('releaseFailed', {
        context: reg.contextName,
        function: reg.func,
        args: reg.args,
        error
      })
    try {
      const { registration, target } = reg
      if (registration) {
        reg.registration = null
        if (isFunction(registration[Symbol.asyncDispose])) {
          const result = registration[Symbol.asyncDispose]()
          if (isPromise(result)) result.then(null, fail)
        } else {
          registration[Symbol.dispose]()
        }
      } else if (reg.nodeEmitter) {
        for (const { fanout } of reg.positions) {
          target.removeListener(reg.event, fanout)
        }
      } else if (isFunction(target[releaseTwinOf(reg.func)])) {
        const result = target[releaseTwinOf(reg.func)](...reg.unwrapped)
        if (isPromise(result)) result.then(null, fail)
      } else if (isFunction(target.removeListener)) {
        for (const { fanout } of reg.positions) {
          target.removeListener(reg.event, fanout)
        }
      }
    } catch (err) {
      fail(err)
    }
  }
}

Registrations.isRegistration = isRegistration
Registrations.isRemover = isRemover
Registrations.canonical = canonical
Registrations.sanitize = sanitize
Registrations.NOTICE_VERSION = NOTICE_VERSION

module.exports = Registrations
