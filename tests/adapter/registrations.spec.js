'use strict'
const EventEmitter = require('events')
const { expect } = require('chai')
const VrpcAdapter = require('../../vrpc/VrpcAdapter')
const VrpcBrowserAdapter = require('../../vrpc/VrpcBrowserAdapter')

/* global describe, it, before, after, afterEach */

// Registrations and subscriptions on the agent side (heisenware-cloud#1837):
// one registration per context, function and arguments; subscriptions are
// sets; the last one out releases; every end is told (protocol 4).

const A = 'test.vrpc/client-a/secret-a'
const B = 'test.vrpc/client-b/secret-b'
const C = 'test.vrpc/client-c/secret-c'
const id = (client, n) => `__e__${client}/${n}`

// the contract: a registration that undoes exactly this call
class Gauge {
  constructor () {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(0)
    this.calls = []
    this.releases = 0
  }

  onValue (handler, unit = 'C') {
    this.calls.push(unit)
    this.emitter.on(unit, handler)
    return {
      [Symbol.dispose]: () => {
        this.releases++
        this.emitter.off(unit, handler)
      }
    }
  }

  fire (unit = 'C', value = 1) {
    this.emitter.emit(unit, value)
  }

  handlers (unit = 'C') {
    return this.emitter.listenerCount(unit)
  }
}

// keeps calling every handler it was ever given, released or not
class Deaf {
  constructor () {
    this.handlers = []
    this.releases = 0
  }

  onTick (handler) {
    this.handlers.push(handler)
    return { [Symbol.dispose]: () => this.releases++ }
  }

  fire (value) {
    this.handlers.forEach(handler => handler(value))
  }
}

// legacy: returns nothing, offers removeListener and an off twin
class Ticking {
  constructor () {
    this.emitter = new EventEmitter()
    this.calls = 0
    this.offCalls = 0
    this.removed = []
  }

  onTick (handler) {
    this.calls++
    this.emitter.on('tick', handler)
    return 'subscribed'
  }

  offTick (handler) {
    this.offCalls++
    this.emitter.off('tick', handler)
  }

  removeListener (event, handler) {
    this.removed.push(event)
    this.emitter.removeListener('tick', handler)
    return true
  }

  fire (value) {
    this.emitter.emit('tick', value)
  }
}

// legacy without any way to release
class Stubborn {
  constructor () {
    this.handlers = []
    this.calls = 0
  }

  onTick (handler) {
    this.calls++
    this.handlers.push(handler)
  }

  fire (value) {
    this.handlers.forEach(handler => handler(value))
  }

  static onBroadcast (handler) {
    Stubborn.broadcasts.push(handler)
  }

  static broadcast (value) {
    Stubborn.broadcasts.forEach(handler => handler(value))
  }
}
Stubborn.broadcasts = []

// Node's own on
class Plain extends EventEmitter {
  fire (event, value) {
    this.emit(event, value)
  }
}

// a class's own on: a wrapper returning this - no signal, legacy release
class Wrapping extends EventEmitter {
  constructor () {
    super()
    this.wrapped = 0
  }

  on (event, handler) {
    this.wrapped++
    return super.on(event, handler)
  }

  fire (event, value) {
    this.emit(event, value)
  }
}

// a class's own on returning a registration: its release, not Node's
class Registering extends EventEmitter {
  constructor () {
    super()
    this.disposed = 0
    this.removeCalls = 0
  }

  on (event, handler) {
    super.on(event, handler)
    return {
      [Symbol.dispose]: () => {
        this.disposed++
        super.removeListener(event, handler)
      }
    }
  }

  removeListener (event, handler) {
    this.removeCalls++
    return super.removeListener(event, handler)
  }

  fire (event, value) {
    this.emit(event, value)
  }
}

// an EventEmitter overriding emit: still never published
class Loud extends EventEmitter {
  emit (...args) {
    return super.emit(...args)
  }

  ping () {
    return 'pong'
  }
}

// async event functions: slow, ended by the source, failing
class Source {
  constructor () {
    this.calls = 0
    this.releases = 0
    this.emitter = new EventEmitter()
    this.end = null
    this.gate = null
  }

  async onData (handler, channel) {
    this.calls++
    await new Promise(resolve => {
      this.gate = resolve
    })
    this.emitter.on(channel, handler)
    const ended = new Promise((resolve, reject) => {
      this.end = { resolve, reject }
    })
    return {
      ended,
      [Symbol.asyncDispose]: async () => {
        this.releases++
        this.emitter.off(channel, handler)
      }
    }
  }

  async onFail (handler) {
    this.calls++
    await new Promise(resolve => setImmediate(resolve))
    throw new Error('no such channel')
  }

  onBroken (handler) {
    return {
      [Symbol.dispose]: () => {
        throw new Error('stuck')
      }
    }
  }

  fire (channel, value) {
    this.emitter.emit(channel, value)
  }
}

// a registration carrying what the call answered before the redesign
class Monitoring {
  monitorNode (address, handler) {
    return { value: [`ns=1;s=${address}`], [Symbol.dispose]: () => {} }
  }
}

// an event function that also takes a one-shot callback
class Announcing {
  constructor () {
    this.calls = 0
  }

  onSample (handler, ready) {
    this.calls++
    ready('listening')
    return { [Symbol.dispose]: () => {} }
  }
}

// an instance that disposes itself; its registrations are its business
class SelfDisposing {
  constructor () {
    this.registrationReleases = 0
    this.disposed = 0
  }

  onTick (handler) {
    return { [Symbol.dispose]: () => this.registrationReleases++ }
  }

  [Symbol.dispose] () {
    this.disposed++
  }
}

// an instance without a dispose: the adapter releases its registrations
class Undisposed {
  constructor () {
    this.registrationReleases = 0
  }

  onTick (handler) {
    return { [Symbol.dispose]: () => this.registrationReleases++ }
  }
}

// greets every subscriber with its current reading
class Thermometer {
  constructor () {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(0)
    this.reading = 20
    this.calls = 0
    this.greetings = 0
    this.failGreeting = null
    this.gate = null
  }

  onReading (handler) {
    this.calls++
    return this._register(handler)
  }

  async onLateReading (handler) {
    this.calls++
    await new Promise(resolve => {
      this.gate = resolve
    })
    return this._register(handler)
  }

  _register (handler) {
    this.emitter.on('reading', handler)
    return {
      [Symbol.dispose]: () => this.emitter.off('reading', handler),
      greet: greeting => {
        this.greetings++
        if (this.failGreeting) throw new Error(this.failGreeting)
        greeting(this.reading)
      }
    }
  }

  set (value) {
    this.reading = value
    this.emitter.emit('reading', value)
  }
}

// written before registrations: a removeListener, no off twin
class Removing {
  constructor () {
    this.emitter = new EventEmitter()
    this.removed = []
  }

  onTick (handler) {
    this.emitter.on('tick', handler)
  }

  removeListener (event, handler) {
    this.removed.push(event)
    this.emitter.removeListener('tick', handler)
  }
}

// written before registrations: an off twin, no removeListener
class Twinned {
  constructor () {
    this.emitter = new EventEmitter()
    this.calls = 0
    this.released = []
  }

  onLevel (channel, handler) {
    this.calls++
    this.emitter.on(channel, handler)
  }

  offLevel (channel, handler) {
    this.released.push(channel)
    this.emitter.off(channel, handler)
  }

  fire (channel, value) {
    this.emitter.emit(channel, value)
    return this.emitter.listenerCount(channel)
  }
}

const CLASSES = [
  Removing,
  Twinned,
  Thermometer,
  Gauge,
  Deaf,
  Ticking,
  Stubborn,
  Plain,
  Wrapping,
  Registering,
  Loud,
  Source,
  SelfDisposing,
  Undisposed,
  Announcing,
  Monitoring
]

const ADAPTERS = [
  ['VrpcAdapter', VrpcAdapter, Klass => VrpcAdapter.register(Klass)],
  [
    'VrpcBrowserAdapter',
    VrpcBrowserAdapter,
    Klass => VrpcBrowserAdapter.registerClass(Klass)
  ]
]

let counter = 0
const uniqueId = prefix => `${prefix}-${++counter}`
const flush = () => new Promise(resolve => setImmediate(resolve))

for (const [adapterName, Adapter, register] of ADAPTERS) {
  describe(`registrations on ${adapterName} (#1837)`, () => {
    const bus = new EventEmitter()
    let published = []

    before(() => {
      CLASSES.forEach(register)
      Adapter.onCallback(message => {
        published.push(message)
        bus.emit('message', message)
      })
    })

    afterEach(() => {
      published = []
    })

    after(() => {
      for (const Klass of CLASSES) {
        for (const instance of Adapter.getAvailableInstances(Klass.name)) {
          Adapter._instances.delete(instance)
          Adapter._registrations.forgetContext(instance, { release: false })
        }
        Adapter._registrations.forgetContext(`\u0000${Klass.name}`, {
          release: false
        })
        Adapter._functionRegistry.delete(Klass.name)
      }
    })

    const call = json => {
      Adapter._call(json)
      return json
    }

    const create = (className, prefix = className) => {
      const instance = uniqueId(prefix)
      const json = call({
        c: className,
        f: '__createShared__',
        a: [instance],
        s: A
      })
      if (json.e) throw new Error(json.e.message || json.e)
      return { instance, obj: Adapter.getInstance(instance) }
    }

    // a subscription as a protocol-4 client declares it
    const subscribe = (c, f, a, s = A, v = 4, extra = {}) =>
      call({ c, f, a, s, v, i: 'call', ...extra })

    // the final answer of a call (immediate, or its promise's settlement)
    const answer = json => {
      if (json.e) return Promise.reject(new Error(json.e.message || json.e))
      if (typeof json.r !== 'string' || !json.r.startsWith('__p__')) {
        return Promise.resolve(json.r)
      }
      return new Promise((resolve, reject) => {
        const settle = message => {
          if (message.i !== json.r) return
          bus.off('message', settle)
          if (message.e) reject(new Error(message.e.message || message.e))
          else resolve(message.r)
        }
        bus.on('message', settle)
      })
    }

    const eventsOn = eventId =>
      published.filter(m => m.i === eventId && m.a).map(m => m.a)
    const noticesOn = eventId =>
      published.filter(m => m.i === eventId && m.end).map(m => m.end)

    describe('guarantee 1: one registration per function and arguments (EV-4, EV-5, EV-7)', () => {
      it('calls the event function once, whatever repeats, flaps and reconnects', () => {
        const { instance, obj } = create('Gauge')
        for (let n = 0; n < 10; n++) {
          subscribe(instance, 'onValue', [id(A, 1)], A)
          subscribe(instance, 'onValue', [id(B, 1)], B)
        }
        for (let n = 0; n < 5; n++) {
          // C comes, goes offline and comes back - A and B stay
          subscribe(instance, 'onValue', [id(C, 1)], C)
          Adapter._unregisterClient(C)
        }
        subscribe(instance, 'onValue', [id(C, 1)], C)
        expect(obj.calls).to.deep.equal(['C'])
        expect(obj.handlers()).to.equal(1)
      })

      it('compares arguments by value, object keys in any order', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 2), { x: 1, y: 2 }], A)
        subscribe(instance, 'onValue', [id(B, 2), { y: 2, x: 1 }], B)
        expect(obj.calls).to.have.length(1)
        subscribe(instance, 'onValue', [id(C, 2), 'F'], C)
        expect(obj.calls).to.have.length(2)
      })

      it('answers every subscriber with the first call\'s return value, nothing more', () => {
        const { instance } = create('Ticking')
        const first = subscribe(instance, 'onTick', [id(A, 3)], A)
        const second = subscribe(instance, 'onTick', [id(B, 3)], B)
        expect(first.r).to.equal('subscribed')
        expect(second.r).to.equal('subscribed')
        // the client named the ids itself: the answer does not repeat them
        expect(first).to.not.have.property('u')
        expect(second).to.not.have.property('u')
      })

      it('answers a returned registration as true, never serializing it', () => {
        const { instance } = create('Gauge')
        expect(subscribe(instance, 'onValue', [id(A, 4)]).r).to.equal(true)
      })

      it('answers a registration\'s value instead, to every subscriber', () => {
        const { instance } = create('Monitoring')
        const first = subscribe(instance, 'monitorNode', ['temp', id(A, 4)], A)
        const second = subscribe(instance, 'monitorNode', ['temp', id(B, 4)], B)
        expect(first.r).to.deep.equal(['ns=1;s=temp'])
        expect(second.r).to.deep.equal(['ns=1;s=temp'])
      })

      it('keeps a one-shot callback out of the key and calls it for the first call only', () => {
        const { instance, obj } = create('Announcing')
        subscribe(instance, 'onSample', [id(A, 7), '__f__p-onSample-1-1'], A)
        subscribe(instance, 'onSample', [id(B, 7), '__f__p-onSample-1-2'], B)
        expect(obj.calls).to.equal(1)
        expect(published.filter(m => m.i === '__f__p-onSample-1-1').map(m => m.a)).to.deep.equal([['listening']])
        expect(published.filter(m => m.i === '__f__p-onSample-1-2')).to.deep.equal([])
        // the same callback in two handler positions is one subscription
        const json = subscribe(instance, 'onSample', [id(C, 7), id(C, 7)], C)
        expect(json.e).to.equal(undefined)
        Adapter._unregisterClient(C)
        expect(Adapter._registrations._held.has(id(C, 7))).to.equal(false)
      })

      it('lets a subscription that arrives while the first call runs join it', async () => {
        const { instance, obj } = create('Source')
        const first = subscribe(instance, 'onData', [id(A, 5), 'ch'], A)
        const second = subscribe(instance, 'onData', [id(B, 5), 'ch'], B)
        expect(obj.calls).to.equal(1)
        const answers = Promise.all([answer(first), answer(second)])
        obj.gate()
        expect(await answers).to.deep.equal([true, true])
        obj.fire('ch', 'x')
        expect(eventsOn(id(A, 5))).to.deep.equal([['x']])
        expect(eventsOn(id(B, 5))).to.deep.equal([['x']])
      })

      it('hands a failing first call to every pending subscriber and keeps nothing', async () => {
        const { instance, obj } = create('Source')
        const first = subscribe(instance, 'onFail', [id(A, 6)], A)
        const second = subscribe(instance, 'onFail', [id(B, 6)], B)
        const settled = await Promise.allSettled([answer(first), answer(second)])
        expect(settled.map(x => x.status)).to.deep.equal(['rejected', 'rejected'])
        expect(settled[0].reason.message).to.equal('no such channel')
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
        // the next subscription calls again: nothing was kept
        subscribe(instance, 'onFail', [id(A, 6)], A)
        expect(obj.calls).to.equal(2)
      })
    })

    describe('guarantee 2: every event reaches every subscription once (EV-8)', () => {
      it('fans one handler out to each subscription', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 10)], A)
        subscribe(instance, 'onValue', [id(A, 10)], A)
        subscribe(instance, 'onValue', [id(B, 10)], B)
        obj.fire('C', 42)
        expect(eventsOn(id(A, 10))).to.deep.equal([[42]])
        expect(eventsOn(id(B, 10))).to.deep.equal([[42]])
        expect(published.filter(m => m.a)).to.have.length(2)
      })

      it('prepends the instance id for callAll subscribers only', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 11)], A)
        call({ c: 'Gauge', f: '__callAll__', a: ['onValue', id(B, 11)], s: B, v: 4 })
        obj.fire('C', 7)
        expect(eventsOn(id(A, 11))).to.deep.equal([[7]])
        expect(eventsOn(id(B, 11))).to.deep.include([instance, 7])
      })
    })

    describe('guarantee 3: the last subscription out releases, silence after (EV-9, EV-11, EV-13)', () => {
      it('releases a registration when its last subscription is withdrawn', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 20)], A)
        subscribe(instance, 'onValue', [id(B, 20)], B)
        call({ c: 'Gauge', f: '__unsubscribe__', a: [id(A, 20)], s: A })
        expect(obj.releases).to.equal(0)
        Adapter._unregisterClient(B)
        expect(obj.releases).to.equal(1)
        expect(obj.handlers()).to.equal(0)
      })

      it('keeps a released handler silent even when the class still calls it', () => {
        const { instance, obj } = create('Deaf')
        subscribe(instance, 'onTick', [id(A, 21)], A)
        obj.fire(1)
        call({ c: 'Deaf', f: '__unsubscribe__', a: [id(A, 21)], s: A })
        expect(obj.releases).to.equal(1)
        obj.fire(2)
        expect(eventsOn(id(A, 21))).to.deep.equal([[1]])
      })

      it('withdraws only subscriptions of the sending connection', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 22)], A)
        call({ c: 'Gauge', f: '__unsubscribe__', a: [id(A, 22)], s: B })
        expect(obj.releases).to.equal(0)
        obj.fire('C', 1)
        expect(eventsOn(id(A, 22))).to.deep.equal([[1]])
      })

      it('reports a release that throws and still drops the registration', () => {
        const { instance } = create('Source')
        const failures = []
        const onFailure = x => failures.push(x)
        Adapter.on('releaseFailed', onFailure)
        try {
          subscribe(instance, 'onBroken', [id(A, 23)], A)
          Adapter._unregisterClient(A)
        } finally {
          Adapter.off('releaseFailed', onFailure)
        }
        expect(failures).to.have.length(1)
        expect(failures[0].error.message).to.equal('stuck')
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
      })

      it('releases when the last subscriber leaves while the first call runs', async () => {
        const { instance, obj } = create('Source')
        const first = subscribe(instance, 'onData', [id(A, 24), 'ch'], A)
        Adapter._unregisterClient(A)
        obj.gate()
        await answer(first)
        await flush()
        expect(obj.releases).to.equal(1)
      })
    })

    describe('greeting (EV-10)', () => {
      it('greets every new subscription once, the first one too, reaching it alone', () => {
        const { instance, obj } = create('Thermometer')
        subscribe(instance, 'onReading', [id(A, 90)], A)
        expect(eventsOn(id(A, 90))).to.deep.equal([[20]])
        obj.set(21)
        subscribe(instance, 'onReading', [id(B, 90)], B)
        expect(obj.calls).to.equal(1)
        expect(eventsOn(id(A, 90))).to.deep.equal([[20], [21]])
        expect(eventsOn(id(B, 90))).to.deep.equal([[21]])
        obj.set(22)
        expect(eventsOn(id(B, 90))).to.deep.equal([[21], [22]])
      })

      it('never greets a subscription declared again', () => {
        const { instance, obj } = create('Thermometer')
        subscribe(instance, 'onReading', [id(A, 91)], A)
        subscribe(instance, 'onReading', [id(A, 91)], A)
        expect(obj.greetings).to.equal(1)
        expect(eventsOn(id(A, 91))).to.deep.equal([[20]])
      })

      it('greets whoever joined while the first call ran, once it settled', async () => {
        const { instance, obj } = create('Thermometer')
        const first = subscribe(instance, 'onLateReading', [id(A, 92)], A)
        const second = subscribe(instance, 'onLateReading', [id(B, 92)], B)
        expect(eventsOn(id(A, 92))).to.deep.equal([])
        const settled = Promise.all([answer(first), answer(second)])
        obj.gate()
        await settled
        expect(obj.greetings).to.equal(2)
        expect(eventsOn(id(A, 92))).to.deep.equal([[20]])
        expect(eventsOn(id(B, 92))).to.deep.equal([[20]])
      })

      it('reports a greeting that fails and keeps the subscription', () => {
        const { instance, obj } = create('Thermometer')
        const failed = []
        const onFailed = x => failed.push(x)
        Adapter.on('greetFailed', onFailed)
        try {
          obj.failGreeting = 'cold'
          const json = subscribe(instance, 'onReading', [id(A, 93)], A)
          expect(json.e).to.equal(undefined)
          expect(failed.map(x => x.error.message)).to.deep.equal(['cold'])
          obj.set(23)
          expect(eventsOn(id(A, 93))).to.deep.equal([[23]])
        } finally {
          Adapter.off('greetFailed', onFailed)
        }
      })

      it('names the instance first when it greets a callAll subscriber', () => {
        const { instance } = create('Thermometer')
        call({ c: 'Thermometer', f: '__callAll__', a: ['onReading', id(C, 94)], s: C, v: 4 })
        const mine = eventsOn(id(C, 94)).filter(([name]) => name === instance)
        expect(mine).to.deep.equal([[instance, 20]])
      })
    })

    describe('an id names one registration per instance (EV-6, VER-1)', () => {
      it('refuses a protocol-4 id held here with other arguments, the held one stays', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 30), 'C'], A)
        const json = subscribe(instance, 'onValue', [id(A, 30), 'F'], A)
        expect(json.e.message || json.e).to.match(/already held here by onValue/)
        expect(json.u).to.equal(undefined)
        expect(obj.calls).to.deep.equal(['C'])
        expect(obj.releases).to.equal(0)
        obj.fire('C', 1)
        obj.fire('F', 2)
        expect(eventsOn(id(A, 30))).to.deep.equal([[1]])
      })

      it('keeps both for a client before protocol 4, whose ids say less', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 31), 'C'], A, 3)
        subscribe(instance, 'onValue', [id(A, 31), 'F'], A, 3)
        expect(obj.calls).to.deep.equal(['C', 'F'])
        expect(obj.releases).to.equal(0)
        obj.fire('C', 1)
        obj.fire('F', 2)
        expect(eventsOn(id(A, 31))).to.deep.equal([[1], [2]])
        Adapter._unregisterClient(A)
        expect(obj.releases).to.equal(2)
      })

      it('withdraws for such a client what its remover\'s arguments name, else all', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 32), 'C'], A, 3)
        subscribe(instance, 'onValue', [id(A, 32), 'F'], A, 3)
        subscribe(instance, 'onValue', [id(A, 32), 'K'], A, 3)
        call({ c: instance, f: 'offValue', a: [id(A, 32), 'F'], s: A, v: 3 })
        expect(obj.releases).to.equal(1)
        obj.fire('C', 1)
        obj.fire('F', 2)
        expect(eventsOn(id(A, 32))).to.deep.equal([[1]])
        call({ c: instance, f: 'offValue', a: [id(A, 32)], s: A, v: 3 })
        expect(obj.releases).to.equal(3)
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
      })

      it('withdraws an older client\'s unmonitor twin, never registering it', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 33), 'C'], A, 3)
        const json = call({ c: instance, f: 'unmonitorValue', a: [id(A, 33)], s: A, v: 3 })
        expect(json.r).to.equal(true)
        // unmonitorValue undoes monitorValue: onValue stays
        expect(obj.releases).to.equal(0)
        expect(Adapter._registrations.list(instance)).to.have.length(1)
      })
    })

    describe('guarantee 7: releasing works for callAll subscriptions (EV-14, ALL-3)', () => {
      it('releases every instance with one withdrawal by id', () => {
        const objs = [create('Gauge').obj, create('Gauge').obj]
        call({ c: 'Gauge', f: '__callAll__', a: ['onValue', id(A, 40)], s: A, v: 4 })
        call({ c: 'Gauge', f: '__callAll__', a: ['onValue', id(A, 40)], s: A, v: 4 })
        objs.forEach(obj => expect(obj.calls).to.deep.equal(['C']))
        call({ c: 'Gauge', f: '__unsubscribe__', a: [id(A, 40)], s: A })
        objs.forEach(obj => expect(obj.releases).to.equal(1))
      })

      it('withdraws a callAll subscription at one instance, the others keep delivering', () => {
        const [one, two] = [create('Gauge'), create('Gauge')]
        call({ c: 'Gauge', f: '__callAll__', a: ['onValue', id(A, 42)], s: A, v: 4 })
        const withdrawal = call({
          c: 'Gauge',
          f: '__unsubscribe__',
          a: [{ id: id(A, 42), context: one.instance }],
          s: A
        })
        expect(withdrawal.r).to.equal(true)
        expect(one.obj.releases).to.equal(1)
        expect(two.obj.releases).to.equal(0)
        one.obj.fire('C', 1)
        two.obj.fire('C', 2)
        expect(eventsOn(id(A, 42))).to.deep.equal([[two.instance, 2]])
        // another connection cannot withdraw it there
        call({
          c: 'Gauge',
          f: '__unsubscribe__',
          a: [{ id: id(A, 42), context: two.instance }],
          s: B
        })
        expect(two.obj.releases).to.equal(0)
        // declared again, it holds that instance again
        call({ c: 'Gauge', f: '__callAll__', a: ['onValue', id(A, 42)], s: A, v: 4 })
        expect(one.obj.calls).to.deep.equal(['C', 'C'])
        expect(two.obj.calls).to.deep.equal(['C'])
        call({ c: 'Gauge', f: '__unsubscribe__', a: [id(A, 42)], s: A })
        expect(one.obj.releases).to.equal(2)
        expect(two.obj.releases).to.equal(1)
      })

      it('releases every instance when the callAll subscriber goes offline', () => {
        const client = `${A}-gone`
        const objs = [create('Gauge').obj, create('Gauge').obj]
        call({
          c: 'Gauge',
          f: '__callAll__',
          a: ['onValue', id(client, 41)],
          s: client,
          v: 4
        })
        Adapter._unregisterClient(client)
        objs.forEach(obj => expect(obj.releases).to.equal(1))
      })
    })

    describe('EventEmitter classes (EV-12, EV-15, EV-21)', () => {
      it('releases Node\'s own on through removeListener, one listener for all', () => {
        const { instance, obj } = create('Plain')
        subscribe(instance, 'on', ['x', id(A, 50)], A)
        subscribe(instance, 'on', ['x', id(B, 50)], B)
        expect(obj.listenerCount('x')).to.equal(1)
        call({ c: instance, f: 'off', a: ['x', id(A, 50)], s: A, v: 3 })
        expect(obj.listenerCount('x')).to.equal(1)
        call({ c: instance, f: 'removeListener', a: ['x', id(B, 50)], s: B, v: 3 })
        expect(obj.listenerCount('x')).to.equal(0)
      })

      it('treats a class\'s own on as an event function: its return decides', () => {
        const wrapping = create('Wrapping')
        subscribe(wrapping.instance, 'on', ['x', id(A, 51)], A)
        subscribe(wrapping.instance, 'on', ['x', id(B, 51)], B)
        expect(wrapping.obj.wrapped).to.equal(1)
        Adapter._unregisterClient(A)
        Adapter._unregisterClient(B)
        // legacy release through the class's removeListener
        expect(wrapping.obj.listenerCount('x')).to.equal(0)

        const registering = create('Registering')
        subscribe(registering.instance, 'on', ['x', id(C, 51)], C)
        Adapter._unregisterClient(C)
        expect(registering.obj.disposed).to.equal(1)
        expect(registering.obj.removeCalls).to.equal(0)
        expect(registering.obj.listenerCount('x')).to.equal(0)
      })

      it('withdraws only the caller\'s subscriptions on removeAllListeners', () => {
        const { instance, obj } = create('Plain')
        const internal = () => {}
        obj.on('x', internal)
        subscribe(instance, 'on', ['x', id(A, 52)], A)
        subscribe(instance, 'on', ['x', id(B, 52)], B)
        call({ c: instance, f: 'removeAllListeners', a: ['x'], s: A, v: 3 })
        obj.fire('x', 1)
        expect(eventsOn(id(A, 52))).to.deep.equal([])
        expect(eventsOn(id(B, 52))).to.deep.equal([[1]])
        expect(obj.listeners('x')).to.include(internal)
      })

      it('keeps once a one-shot for clients that send it with an event id', () => {
        const { instance, obj } = create('Plain')
        subscribe(instance, 'once', ['x', id(A, 53)], A, 3)
        obj.fire('x', 1)
        subscribe(instance, 'once', ['x', id(A, 53)], A, 3)
        obj.fire('x', 2)
        obj.fire('x', 3)
        expect(eventsOn(id(A, 53))).to.deep.equal([[1], [2]])
        expect(obj.listenerCount('x')).to.equal(0)
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
      })

      it('publishes on, off and once but never emit or Node\'s internals', () => {
        for (const className of ['Plain', 'Loud']) {
          const { memberFunctions, staticFunctions } =
            Adapter._functionRegistry.get(className)
          for (const name of ['on', 'addListener', 'off', 'removeListener', 'once', 'removeAllListeners']) {
            expect(memberFunctions).to.include(name)
          }
          for (const name of ['emit', 'prependListener', 'setMaxListeners', 'listeners', 'rawListeners', 'listenerCount', 'eventNames']) {
            expect(memberFunctions).to.not.include(name)
          }
          for (const name of ['once', 'on', 'getEventListeners', 'init']) {
            expect(staticFunctions).to.not.include(name)
          }
        }
        expect(Adapter._functionRegistry.get('Loud').memberFunctions).to.include('ping')
      })
    })

    describe('legacy releases (EV-12, EV-16)', () => {
      it('prefers the off twin to the class\'s removeListener', () => {
        const { instance, obj } = create('Ticking')
        subscribe(instance, 'onTick', [id(A, 60)], A)
        Adapter._unregisterClient(A)
        expect(obj.offCalls).to.equal(1)
        expect(obj.removed).to.deep.equal([])
        expect(obj.emitter.listenerCount('tick')).to.equal(0)
      })

      it('calls the class\'s removeListener when it has no twin and returns nothing', () => {
        const { instance, obj } = create('Removing')
        subscribe(instance, 'onTick', [id(A, 66)], A)
        Adapter._unregisterClient(A)
        expect(obj.removed).to.deep.equal([null])
        expect(obj.emitter.listenerCount('tick')).to.equal(0)
      })

      it('releases through the off twin with the registration\'s arguments, once the last one left', () => {
        const { instance, obj } = create('Twinned')
        subscribe(instance, 'onLevel', ['tank', id(A, 64)], A)
        subscribe(instance, 'onLevel', ['tank', id(B, 64)], B)
        call({ c: instance, f: '__unsubscribe__', a: [id(A, 64)], s: A, v: 4 })
        expect(obj.released).to.deep.equal([])
        call({ c: instance, f: '__unsubscribe__', a: [id(B, 64)], s: B, v: 4 })
        expect(obj.released).to.deep.equal(['tank'])
        expect(obj.fire('tank', 1)).to.equal(0)
        subscribe(instance, 'onLevel', ['tank', id(A, 65)], A)
        expect(obj.calls).to.equal(2)
      })

      it('keeps an unreleasable registration silent and reuses it', () => {
        const { instance, obj } = create('Stubborn')
        subscribe(instance, 'onTick', [id(A, 61)], A)
        Adapter._unregisterClient(A)
        obj.fire(1)
        expect(eventsOn(id(A, 61))).to.deep.equal([])
        subscribe(instance, 'onTick', [id(B, 61)], B)
        expect(obj.calls).to.equal(1)
        obj.fire(2)
        expect(eventsOn(id(B, 61))).to.deep.equal([[2]])
      })

      it('withdraws on an off twin carrying a held id, without calling the class', () => {
        const { instance, obj } = create('Ticking')
        subscribe(instance, 'onTick', [id(A, 62)], A, 3)
        subscribe(instance, 'onTick', [id(B, 62)], B, 3)
        call({ c: instance, f: 'offTick', a: [id(A, 62)], s: A, v: 3 })
        expect(obj.offCalls).to.equal(0)
        expect(obj.calls).to.equal(1)
        obj.fire(1)
        expect(eventsOn(id(A, 62))).to.deep.equal([])
        expect(eventsOn(id(B, 62))).to.deep.equal([[1]])
      })

      it('never registers an off twin carrying an id it does not hold', () => {
        const { instance, obj } = create('Ticking')
        const json = call({ c: instance, f: 'offTick', a: [id(A, 63)], s: A, v: 3 })
        expect(json.r).to.equal(true)
        expect(obj.offCalls).to.equal(0)
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
      })
    })

    describe('every end is told, to protocol 4 subscribers only (EV-17, EV-18, EV-20)', () => {
      it('tells v4 subscribers when the source ends a registration, never v3 ones', async () => {
        const { instance, obj } = create('Source')
        const first = subscribe(instance, 'onData', [id(A, 70), 'ch'], A, 4)
        subscribe(instance, 'onData', [id(B, 70), 'ch'], B, 3)
        obj.gate()
        await answer(first)
        obj.end.resolve()
        await flush()
        expect(noticesOn(id(A, 70))).to.deep.equal([
          { reason: 'ended', by: 'source', context: instance }
        ])
        expect(noticesOn(id(B, 70))).to.deep.equal([])
        expect(obj.releases).to.equal(1)
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
      })

      it('tells a failed end with its reason', async () => {
        const { instance, obj } = create('Source')
        const first = subscribe(instance, 'onData', [id(A, 71), 'ch'], A, 4)
        obj.gate()
        await answer(first)
        obj.end.reject(new Error('server dropped the item'))
        await flush()
        expect(noticesOn(id(A, 71))).to.deep.equal([
          { reason: 'server dropped the item', by: 'source', failed: true, context: instance }
        ])
      })

      it('ends a registration for all on __end__ and says who', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 72), 'F'], A, 4)
        subscribe(instance, 'onValue', [id(B, 72), 'F'], B, 3)
        const json = call({ c: instance, f: '__end__', a: ['onValue', ['F'], 'Anna'], s: C })
        expect(json.r).to.equal(true)
        expect(obj.releases).to.equal(1)
        expect(noticesOn(id(A, 72))).to.deep.equal([
          { reason: 'ended', by: 'Anna', context: instance }
        ])
        expect(noticesOn(id(B, 72))).to.deep.equal([])
        expect(call({ c: instance, f: '__end__', a: ['onValue', ['F']], s: C }).r).to.equal(false)
      })
    })

    describe('listing registrations (EV-19)', () => {
      it('lists function, arguments, labelled subscribers and events - never ids', () => {
        const { instance, obj } = create('Gauge')
        subscribe(instance, 'onValue', [id(A, 80), 'K'], A, 4, {
          l: { [id(A, 80)]: 'App line-1, executor 7' }
        })
        subscribe(instance, 'onValue', [id(B, 80), 'K'], B)
        obj.fire('K', 1)
        obj.fire('K', 2)
        const json = call({ c: instance, f: '__registrations__', a: [], s: C })
        expect(json.r).to.have.length(1)
        const [listed] = json.r
        expect(listed).to.include({ function: 'onValue', state: 'live', events: 2 })
        expect(listed.args).to.deep.equal(['K'])
        expect(listed.subscriptions).to.deep.equal([
          { label: 'App line-1, executor 7', callAll: false },
          { label: null, callAll: false }
        ])
        expect(listed.rate).to.be.a('number')
        expect(JSON.stringify(json.r)).to.not.include('__e__')
      })

      it('lists static registrations on the class', () => {
        subscribe('Stubborn', 'onBroadcast', [id(A, 81)], A)
        const json = call({ c: 'Stubborn', f: '__registrations__', a: [], s: C })
        expect(json.r.map(x => x.function)).to.deep.equal(['onBroadcast'])
        Stubborn.broadcast('all')
        expect(eventsOn(id(A, 81))).to.deep.equal([['all']])
      })
    })

    describe('an instance that ends (INST-6)', () => {
      it('leaves its registrations to its own dispose', async () => {
        const { instance, obj } = create('SelfDisposing')
        subscribe(instance, 'onTick', [id(A, 90)], A)
        Adapter.delete(instance)
        await flush()
        expect(obj.disposed).to.equal(1)
        expect(obj.registrationReleases).to.equal(0)
        expect(Adapter._registrations.list(instance)).to.deep.equal([])
      })

      it('releases the registrations of an instance without a dispose (legacy)', () => {
        const { instance, obj } = create('Undisposed')
        subscribe(instance, 'onTick', [id(A, 91)], A)
        Adapter.delete(instance)
        expect(obj.registrationReleases).to.equal(1)
      })
    })
  })
}
