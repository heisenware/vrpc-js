'use strict'
const EventEmitter = require('events')
const { expect } = require('chai')
const sinon = require('sinon')
const VrpcAdapter = require('../../vrpc/VrpcAdapter')
const VrpcBrowserAdapter = require('../../vrpc/VrpcBrowserAdapter')

/* global describe, it, before, after, afterEach */

// A delete ends an instance: the adapter detaches what it attached, a
// deleted object never speaks on the bus again, and the object releases
// its own resources through the dispose protocol (#1705).

const CLIENT = 'test.vrpc/client-host/secret'

// publishes through its own emit, subscribed with on(event, listener)
class Emitting extends EventEmitter {
  constructor (tag) {
    super()
    this._tag = tag
  }

  fire () {
    this.emit('tick', this._tag)
    return true
  }
}

// the SignalSimulator shape: a private emitter behind onTick, and the
// removeListener(event, listener) the adapter calls to drop a listener
class Ticking {
  constructor (tag) {
    this._tag = tag
    this._emitter = new EventEmitter()
  }

  onTick (listener) {
    this._emitter.on('tick', listener)
    return 'subscribed'
  }

  removeListener (event, listener) {
    this._emitter.removeListener('tick', listener)
    return true
  }

  fire () {
    this._emitter.emit('tick', this._tag)
    return true
  }
}

// keeps a wrapped copy of every listener, so nothing can remove one
class Stubborn {
  constructor (tag) {
    this._tag = tag
    this._listeners = []
  }

  onTick (listener) {
    this._listeners.push((...args) => listener(...args))
    return 'subscribed'
  }

  fire () {
    this._listeners.forEach(listener => listener(this._tag))
    return true
  }

  static onBroadcast (listener) {
    Stubborn._broadcast.push(listener)
    return 'subscribed'
  }

  static broadcast (value) {
    Stubborn._broadcast.forEach(listener => listener(value))
    return true
  }
}
Stubborn._broadcast = []

class SyncDisposable {
  constructor () {
    this.disposed = 0
  }

  ping () {
    return 'pong'
  }

  [Symbol.dispose] () {
    this.disposed++
  }
}

class AsyncDisposable {
  constructor () {
    this.disposed = 0
    this.release = null
  }

  ping () {
    return 'pong'
  }

  [Symbol.asyncDispose] () {
    this.disposed++
    return new Promise(resolve => {
      this.release = resolve
    })
  }
}

class BothDisposable {
  constructor () {
    this.calls = []
  }

  ping () {
    return 'pong'
  }

  [Symbol.dispose] () {
    this.calls.push('dispose')
  }

  async [Symbol.asyncDispose] () {
    this.calls.push('asyncDispose')
  }
}

class FailingDisposable {
  async [Symbol.asyncDispose] () {
    throw new Error('socket stuck')
  }
}

class HangingDisposable {
  [Symbol.asyncDispose] () {
    return new Promise(() => {})
  }
}

// an EventEmitter that also releases resources
class DisposableEmitter extends Emitting {
  constructor (tag) {
    super(tag)
    this.disposed = 0
  }

  [Symbol.dispose] () {
    this.disposed++
  }
}

const CLASSES = [
  Emitting,
  Ticking,
  Stubborn,
  SyncDisposable,
  AsyncDisposable,
  BothDisposable,
  FailingDisposable,
  HangingDisposable,
  DisposableEmitter
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
  describe(`instance lifetime on ${adapterName}`, () => {
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
      sinon.restore()
    })

    // the adapters are process-wide singletons: leave them as found for
    // the specs that run after this one (they assert the class list)
    after(() => {
      for (const Klass of CLASSES) {
        for (const id of Adapter.getAvailableInstances(Klass.name)) {
          Adapter._instances.delete(id)
          Adapter._registrations.forgetContext(id, { release: false })
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

    const create = (className, id, ...args) => {
      const json = call({
        c: className,
        f: '__createShared__',
        a: [id, ...args],
        s: CLIENT
      })
      if (json.e) throw new Error(json.e.message)
      return Adapter.getInstance(id)
    }

    // the final answer of a remote delete: immediate, or the resolution of
    // the promise id it answered with
    const remoteDelete = (className, id) => {
      const json = call({ c: className, f: '__delete__', a: [id], s: CLIENT })
      if (json.e) return Promise.reject(new Error(json.e.message))
      if (typeof json.r !== 'string' || !json.r.startsWith('__p__')) {
        return Promise.resolve(json.r)
      }
      return new Promise((resolve, reject) => {
        const settle = message => {
          if (message.i !== json.r) return
          bus.off('message', settle)
          if (message.e) reject(new Error(message.e.message))
          else resolve(message.r)
        }
        bus.on('message', settle)
      })
    }

    const eventsOn = eventId =>
      published.filter(message => message.i === eventId).map(m => m.a[0])

    describe('a remote delete tears the instance down', () => {
      it('detaches every adapter listener from a deleted EventEmitter instance (#1705)', async () => {
        const id = uniqueId('emitting')
        const orphan = create('Emitting', id, 'gen1')
        call({ c: id, f: 'on', a: ['tick', `__e__${CLIENT}/a`], s: CLIENT })
        expect(orphan.listenerCount('tick')).to.equal(1)
        expect(await remoteDelete('Emitting', id)).to.equal(true)
        expect(orphan.listenerCount('tick')).to.equal(0)
      })

      it('detaches every adapter listener from a deleted callback-style instance (#1705)', async () => {
        const id = uniqueId('ticking')
        const orphan = create('Ticking', id, 'gen1')
        call({ c: id, f: 'onTick', a: [`__e__${CLIENT}/b`], s: CLIENT })
        expect(orphan._emitter.listenerCount('tick')).to.equal(1)
        expect(await remoteDelete('Ticking', id)).to.equal(true)
        expect(orphan._emitter.listenerCount('tick')).to.equal(0)
      })

      it('keeps a deleted instance silent on the bus even when its class cannot drop a listener (#1705)', async () => {
        const id = uniqueId('stubborn')
        const eventId = `__e__${CLIENT}/c`
        const orphan = create('Stubborn', id, 'gen1')
        call({ c: id, f: 'onTick', a: [eventId], s: CLIENT })
        orphan.fire()
        expect(eventsOn(eventId)).to.deep.equal(['gen1'])
        await remoteDelete('Stubborn', id)
        published = []
        orphan.fire()
        expect(eventsOn(eventId)).to.deep.equal([])
      })

      it('lets only the live generation publish on the event topic of a re-created name (#1705)', async () => {
        // the engine re-subscribes a re-created instance under the same
        // event id: agent, class, instance, event and callback are the same
        const id = uniqueId('sim')
        const eventId = `__e__${CLIENT}/d`
        const generations = []
        for (const tag of ['gen1', 'gen2', 'gen3']) {
          generations.push(create('Ticking', id, tag))
          call({ c: id, f: 'onTick', a: [eventId], s: CLIENT })
          if (tag !== 'gen3') await remoteDelete('Ticking', id)
        }
        published = []
        generations.forEach(generation => generation.fire())
        expect(eventsOn(eventId)).to.deep.equal(['gen3'])
      })

      it('keeps a static event registration of the class alive (#1705)', async () => {
        const id = uniqueId('stubborn')
        const eventId = `__e__${CLIENT}/e`
        create('Stubborn', id, 'gen1')
        call({ c: 'Stubborn', f: 'onBroadcast', a: [eventId], s: CLIENT })
        await remoteDelete('Stubborn', id)
        Stubborn.broadcast('still here')
        expect(eventsOn(eventId)).to.deep.equal(['still here'])
      })

      it('still shows beforeDelete the live instance', async () => {
        const id = uniqueId('emitting')
        create('Emitting', id, 'gen1')
        let seen
        const hook = ({ instance }) => {
          seen = Adapter.getInstance(instance)
        }
        Adapter.on('beforeDelete', hook)
        try {
          await remoteDelete('Emitting', id)
        } finally {
          Adapter.off('beforeDelete', hook)
        }
        expect(seen).to.be.an.instanceOf(Emitting)
      })

      it('answers false for an unknown name', async () => {
        expect(await remoteDelete('SyncDisposable', uniqueId('ghost'))).to.equal(false)
      })
    })

    describe('a remote delete disposes the instance', () => {
      it('calls Symbol.dispose once (#1705)', async () => {
        const id = uniqueId('sync')
        const obj = create('SyncDisposable', id)
        expect(await remoteDelete('SyncDisposable', id)).to.equal(true)
        expect(obj.disposed).to.equal(1)
      })

      it('awaits Symbol.asyncDispose before it answers (#1705)', async () => {
        const id = uniqueId('async')
        const obj = create('AsyncDisposable', id)
        let answered = false
        const answer = remoteDelete('AsyncDisposable', id).then(r => {
          answered = true
          return r
        })
        await flush()
        expect(obj.disposed).to.equal(1)
        expect(answered).to.equal(false)
        obj.release()
        expect(await answer).to.equal(true)
      })

      it('prefers Symbol.asyncDispose when a class has both (#1705)', async () => {
        const id = uniqueId('both')
        const obj = create('BothDisposable', id)
        await remoteDelete('BothDisposable', id)
        expect(obj.calls).to.deep.equal(['asyncDispose'])
      })

      it('disposes an EventEmitter instance and detaches its listeners (#1705)', async () => {
        const id = uniqueId('disposable-emitter')
        const obj = create('DisposableEmitter', id, 'gen1')
        call({ c: id, f: 'on', a: ['tick', `__e__${CLIENT}/f`], s: CLIENT })
        await remoteDelete('DisposableEmitter', id)
        expect(obj.disposed).to.equal(1)
        expect(obj.listenerCount('tick')).to.equal(0)
      })

      it('frees the name before disposing: no call reaches a disposing instance (#1705)', async () => {
        const id = uniqueId('async')
        const obj = create('AsyncDisposable', id)
        const answer = remoteDelete('AsyncDisposable', id)
        await flush()
        expect(obj.disposed).to.equal(1)
        expect(Adapter.getAvailableInstances('AsyncDisposable')).to.not.include(id)
        // answered, not thrown: no caller waits for its timeout
        expect(call({ c: id, f: 'ping', a: [], s: CLIENT }).e.message).to.match(
          /Could not find context/
        )
        obj.release()
        await answer
      })

      it('answers true and frees the name when dispose fails (#1705)', async () => {
        const id = uniqueId('failing')
        create('FailingDisposable', id)
        expect(await remoteDelete('FailingDisposable', id)).to.equal(true)
        expect(Adapter.getAvailableInstances('FailingDisposable')).to.not.include(id)
      })

      it('answers after at most 10 s when dispose hangs (#1705)', async () => {
        const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        const id = uniqueId('hanging')
        create('HangingDisposable', id)
        let answer
        const answered = remoteDelete('HangingDisposable', id).then(r => {
          answer = r
        })
        await clock.tickAsync(9999)
        expect(answer).to.equal(undefined)
        await clock.tickAsync(1)
        await answered
        expect(answer).to.equal(true)
      })

      it('never offers dispose as a remote method (#1705)', () => {
        const { memberFunctions } = Adapter._functionRegistry.get('BothDisposable')
        expect(memberFunctions).to.include('ping')
        expect(memberFunctions).to.not.include('undefined')
      })
    })

    describe('an in-process delete tears down like a remote one', () => {
      it('detaches listeners and disposes on delete(id) (#1705)', async () => {
        const id = uniqueId('disposable-emitter')
        const obj = create('DisposableEmitter', id, 'gen1')
        call({ c: id, f: 'on', a: ['tick', `__e__${CLIENT}/g`], s: CLIENT })
        expect(Adapter.delete(id)).to.equal(true)
        await flush()
        expect(obj.disposed).to.equal(1)
        expect(obj.listenerCount('tick')).to.equal(0)
      })

      it('detaches listeners and disposes on delete(object) (#1705)', async () => {
        const id = uniqueId('disposable-emitter')
        const obj = create('DisposableEmitter', id, 'gen1')
        call({ c: id, f: 'on', a: ['tick', `__e__${CLIENT}/h`], s: CLIENT })
        expect(Adapter.delete(obj)).to.equal(true)
        await flush()
        expect(obj.disposed).to.equal(1)
        expect(obj.listenerCount('tick')).to.equal(0)
        expect(Adapter.getAvailableInstances('DisposableEmitter')).to.not.include(id)
      })

      it('keeps an instance deleted in-process silent on the bus (#1705)', async () => {
        const id = uniqueId('stubborn')
        const eventId = `__e__${CLIENT}/i`
        const orphan = create('Stubborn', id, 'gen1')
        call({ c: id, f: 'onTick', a: [eventId], s: CLIENT })
        Adapter.delete(id)
        orphan.fire()
        expect(eventsOn(eventId)).to.deep.equal([])
      })
    })

    describe('a create of a name that exists returns it unchanged', () => {
      // what the adapter announces as 'create' while `action` runs
      const announced = action => {
        const seen = []
        const hook = event => seen.push(event)
        Adapter.on('create', hook)
        try {
          action()
        } finally {
          Adapter.off('create', hook)
        }
        return seen
      }

      it('announces a shared instance once, however often it is created remotely', () => {
        const id = uniqueId('emitting')
        let first
        const seen = announced(() => {
          first = create('Emitting', id, 'gen1')
          expect(create('Emitting', id, 'gen2')).to.equal(first)
          expect(create('Emitting', id, 'gen3')).to.equal(first)
        })
        expect(seen).to.deep.equal([
          { args: ['gen1'], className: 'Emitting', isIsolated: false, instance: id }
        ])
        expect(first._tag).to.equal('gen1')
      })

      it('announces a shared instance once, however often it is created in-process', () => {
        const id = uniqueId('emitting')
        let first
        const seen = announced(() => {
          first = Adapter.create({ className: 'Emitting', instance: id, args: ['gen1'] })
          const again = Adapter.create({ className: 'Emitting', instance: id, args: ['gen2'] })
          expect(again).to.equal(first)
        })
        expect(seen.map(event => event.args)).to.deep.equal([['gen1']])
      })

      it('keeps the class of a shared instance created again under another class', () => {
        const id = uniqueId('emitting')
        const first = create('Emitting', id, 'gen1')
        const seen = announced(() => {
          const json = call({ c: 'Ticking', f: '__createShared__', a: [id, 'gen2'], s: CLIENT })
          expect(json.r).to.equal(id)
        })
        expect(seen).to.deep.equal([])
        expect(Adapter._instances.get(id)).to.include({ instance: first, className: 'Emitting' })
      })

      it('announces an isolated instance once, however often its owner creates it', () => {
        const id = uniqueId('emitting')
        const createIsolated = tag =>
          call({ c: 'Emitting', f: '__createIsolated__', a: [id, tag], s: CLIENT })
        const seen = announced(() => {
          expect(createIsolated('gen1').r).to.equal(id)
          expect(createIsolated('gen2').r).to.equal(id)
        })
        expect(seen.map(event => event.args)).to.deep.equal([['gen1']])
        expect(Adapter.getInstance(id)._tag).to.equal('gen1')
        // the cleanup after this suite sees shared instances only
        Adapter.delete(id)
      })
    })

    describe('a client subscribed twice to one event id', () => {
      it('leaves no listener behind when the client goes (#1705)', () => {
        const id = uniqueId('emitting')
        const eventId = `__e__${CLIENT}/k`
        const client = `${CLIENT}-${id}`
        const obj = create('Emitting', id, 'gen1')
        call({ c: id, f: 'on', a: ['tick', eventId], s: client })
        call({ c: id, f: 'on', a: ['tick', eventId], s: client })
        Adapter._unregisterClient(client)
        expect(obj.listenerCount('tick')).to.equal(0)
      })
    })
  })
}

describe('documentation of a dispose method', () => {
  it('documents no other function (#1705)', () => {
    // a JSDoc block above a computed key used to land on the first call in
    // the method's body - here the builder documentation of stop
    const meta = VrpcAdapter._parseComments(`class Clock {
  /**
   * Stops the clock
   *
   * @returns {Boolean} true
   */
  stop () {
    return true
  }

  /**
   * Ends the clock when its instance is deleted
   */
  async [Symbol.asyncDispose] () {
    this.stop()
  }
}`)
    expect(Object.keys(meta)).to.deep.equal(['stop'])
    expect(meta.stop.description).to.equal('Stops the clock')
  })
})
