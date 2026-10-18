'use strict'

const { expect } = require('chai')
const EventEmitter = require('events')
const Adapter = require('../../vrpc/VrpcAdapter')
const BrowserAdapter = require('../../vrpc/VrpcBrowserAdapter')
const commentParser = require('../../vrpc/comment-parser')
const { nosideeffects } = require('../../index')
const { Sensor, Meter, LoudMeter } = require('./fixtures/TestSideEffects')

/* global describe, it, afterEach */

// Whether calling a function changes anything another caller, a device or
// storage could observe is one declared fact in the class info: JSDoc's
// @nosideeffects, or `meta` at registration for code that cannot carry
// it (protocol, section 16.3)

const infoOf = className => ({
  memberFunctions: Adapter._getMemberFunctionsArray(className),
  staticFunctions: Adapter._getStaticFunctionsArray(className),
  meta: Adapter._getMetaData(className)
})

const EMITTER = ['on', 'addListener', 'once', 'off', 'removeListener', 'removeAllListeners']

// the runtime twin of fixtures/Turnstile.ts, whose source is read as text
class Turnstile extends EventEmitter {
  count () { return 0 }
  pass () {}
  first (items) { return items[0] }
  bump () {}
  tally () { return 0 }
  reset () {}
  flush () {}
  static gates () { return [] }
  static sweep () {}
  static total () { return 0 }
}

describe('functions that declare they have no side effects', () => {
  afterEach(() => {
    for (const name of ['Sensor', 'Meter', 'LoudMeter', 'Turnstile', 'Probe']) {
      Adapter._functionRegistry.delete(name)
    }
  })

  describe('declared in JSDoc', () => {
    it('marks a function tagged @nosideeffects, static or member', () => {
      Adapter.register(Sensor, { jsdocPath: './fixtures/TestSideEffects.js' })
      const { meta } = infoOf('Sensor')
      expect(meta.read.nosideeffects).to.equal(true)
      expect(meta.list.nosideeffects).to.equal(true)
      expect(meta.read.description).to.equal('The latest reading')
    })

    it('leaves every other function with side effects: @modifies, untagged, undocumented', () => {
      Adapter.register(Sensor, { jsdocPath: './fixtures/TestSideEffects.js' })
      const info = infoOf('Sensor')
      expect(info.meta.calibrate).to.not.have.property('nosideeffects')
      expect(info.meta.restart).to.not.have.property('nosideeffects')
      expect(info.meta).to.not.have.property('status')
      for (const f of ['calibrate', 'restart', 'status']) {
        expect(nosideeffects(info, f), f).to.equal(false)
      }
      expect(nosideeffects(info, 'read')).to.equal(true)
    })
  })

  describe('declared at registration', () => {
    it('merges `meta` over the documentation, function by function', () => {
      Adapter.register(Sensor, {
        jsdocPath: './fixtures/TestSideEffects.js',
        meta: { status: { nosideeffects: true }, read: { nosideeffects: false } }
      })
      const { meta } = infoOf('Sensor')
      expect(meta.status).to.deep.equal({ nosideeffects: true })
      // withdrawn: only true is published
      expect(meta.read).to.not.have.property('nosideeffects')
      expect(meta.read.description).to.equal('The latest reading')
    })

    it('declares a class without documentation, and only what it publishes', () => {
      Adapter.register(Sensor, {
        meta: { status: { nosideeffects: true }, _secret: { nosideeffects: true } }
      })
      const info = infoOf('Sensor')
      expect(info.meta).to.deep.equal({ status: { nosideeffects: true } })
      expect(nosideeffects(info, 'status')).to.equal(true)
    })

    it('declares a registered instance', () => {
      const probe = new Sensor()
      Adapter.registerInstance(probe, {
        className: 'Probe',
        instance: 'probe1',
        meta: { read: { nosideeffects: true } }
      })
      try {
        expect(nosideeffects(infoOf('Probe'), 'read')).to.equal(true)
        expect(nosideeffects(infoOf('Probe'), 'calibrate')).to.equal(false)
      } finally {
        Adapter._instances.delete('probe1')
      }
    })

    it('publishes no meta data for a class that declares nothing', () => {
      Adapter.register(Sensor)
      expect(infoOf('Sensor').meta).to.deep.equal({})
    })
  })

  describe("Node's EventEmitter functions", () => {
    it('declares those a class publishes as Node made them', () => {
      Adapter.register(Meter)
      const info = infoOf('Meter')
      for (const f of EMITTER) {
        expect(info.memberFunctions, f).to.include(f)
        expect(nosideeffects(info, f), f).to.equal(true)
      }
      expect(nosideeffects(info, 'total')).to.equal(false) // its docs are not read
    })

    it('leaves one the class replaces to the class', () => {
      Adapter.register(LoudMeter)
      const info = infoOf('LoudMeter')
      expect(nosideeffects(info, 'on')).to.equal(false)
      expect(nosideeffects(info, 'once')).to.equal(true)
    })

    it('lets `meta` withdraw a declaration', () => {
      Adapter.register(Meter, { meta: { on: { nosideeffects: false } } })
      const info = infoOf('Meter')
      expect(info.meta).to.not.have.property('on')
      expect(nosideeffects(info, 'on')).to.equal(false)
      expect(nosideeffects(info, 'once')).to.equal(true)
    })
  })

  describe('in the browser', () => {
    afterEach(() => {
      BrowserAdapter._functionRegistry.delete('Meter')
      BrowserAdapter._functionRegistry.delete('__global__')
      delete global.window
    })

    it('declares the EventEmitter functions, and lets `meta` withdraw one', () => {
      BrowserAdapter.registerClass(Meter, {
        meta: { on: { nosideeffects: false }, total: { nosideeffects: true } }
      })
      const info = {
        memberFunctions: BrowserAdapter._getMemberFunctionsArray('Meter'),
        meta: BrowserAdapter._getMetaData('Meter')
      }
      expect(nosideeffects(info, 'on')).to.equal(false)
      expect(nosideeffects(info, 'once')).to.equal(true)
      expect(nosideeffects(info, 'total')).to.equal(true)
    })

    it('declares a global function', () => {
      global.window = {}
      BrowserAdapter.registerFunction(() => 1, 'version', {
        meta: { nosideeffects: true }
      })
      BrowserAdapter.registerFunction(() => {}, 'reload')
      const info = {
        staticFunctions: BrowserAdapter._getStaticFunctionsArray('__global__'),
        meta: BrowserAdapter._getMetaData('__global__')
      }
      expect(nosideeffects(info, 'version')).to.equal(true)
      expect(nosideeffects(info, 'reload')).to.equal(false)
    })
  })

  describe('read from a TypeScript source', () => {
    const register = () =>
      Adapter.register(Turnstile, { jsdocPath: './fixtures/Turnstile.ts' })

    it('keeps what TypeScript declares private or protected inside, documented or not', () => {
      register()
      const { memberFunctions, staticFunctions, meta } = infoOf('Turnstile')
      expect(memberFunctions).to.include.members(['count', 'pass', 'first'])
      for (const f of ['bump', 'tally', 'reset', 'flush']) {
        expect(memberFunctions, f).to.not.include(f)
        expect(meta, f).to.not.have.property(f)
      }
      expect(staticFunctions).to.include('total')
      expect(staticFunctions).to.not.include.members(['gates', 'sweep'])
    })

    it('reads @nosideeffects, also past a type parameter list', () => {
      register()
      const info = infoOf('Turnstile')
      expect(nosideeffects(info, 'count')).to.equal(true)
      expect(nosideeffects(info, 'first')).to.equal(true)
      expect(nosideeffects(info, 'total')).to.equal(true)
      expect(nosideeffects(info, 'pass')).to.equal(false)
      expect(info.meta.first.description).to.equal('The first of a list, typed')
    })

    it('tells the parser static and access from the modifiers', () => {
      const source = require('fs').readFileSync(
        require('path').join(__dirname, 'fixtures/Turnstile.ts'),
        'utf8'
      )
      const blocks = commentParser(source, { assocFunctions: true })
      const of = name => blocks.find(b => b.functionName === name)
      expect(of('gates')).to.include({ isStatic: true, access: 'private' })
      expect(of('sweep')).to.include({ isStatic: true, access: 'private', declaration: true })
      expect(of('reset')).to.include({ isStatic: false, access: 'protected', declaration: true })
      expect(of('count')).to.include({ isStatic: false })
      expect(of('count')).to.not.have.property('access')
      expect(blocks.some(b => b.functionName === 'handler' || b.functionName === 'counts')).to.equal(false)
    })
  })

  describe('read along the class chain', () => {
    // the runtime twins of fixtures/Entity.ts and fixtures/Frame.ts
    class Entity extends EventEmitter {
      describe () { return '' }
      signal () {}
      sameJson () { return true }
      save () {}
    }
    class Frame extends Entity {
      move () {}
      save () {}
    }

    afterEach(() => Adapter._functionRegistry.delete('Frame'))

    it('keeps inside what a base class in another source keeps private', () => {
      Adapter.register(Frame, {
        jsdocPath: ['./fixtures/Frame.ts', './fixtures/Entity.ts']
      })
      const { memberFunctions } = infoOf('Frame')
      expect(memberFunctions).to.include.members(['move', 'save', 'describe'])
      expect(memberFunctions).to.not.include.members(['signal', 'sameJson'])
    })

    it("documents inherited functions by their class, and lets the nearest class's documentation count", () => {
      Adapter.register(Frame, {
        jsdocPath: ['./fixtures/Frame.ts', './fixtures/Entity.ts']
      })
      const info = infoOf('Frame')
      expect(nosideeffects(info, 'describe')).to.equal(true)
      expect(info.meta.describe.description).to.equal('Who the entity is')
      expect(info.meta.save.description).to.equal('Saves the frame with its position')
      expect(info.meta.__createShared__.description).to.equal('Creates a frame')
    })

    it("publishes a base class's private members when only the class's own source is read", () => {
      Adapter.register(Frame, { jsdocPath: './fixtures/Frame.ts' })
      expect(infoOf('Frame').memberFunctions).to.include.members(['signal', 'sameJson'])
    })
  })

  describe('read along the class chain, by the class that defines a function', () => {
    // the runtime twins of fixtures/Machine.ts and fixtures/Stamp.ts
    class Machine {
      reset () {}
      state () { return 'idle' }
      speed () { return 0 }
    }
    class Stamp extends Machine {
      reset () {}
      state () { return 'stamping' }
    }
    const register = () =>
      Adapter.register(Stamp, {
        jsdocPath: ['./fixtures/Stamp.ts', './fixtures/Machine.ts']
      })

    afterEach(() => Adapter._functionRegistry.delete('Stamp'))

    it('publishes what a subclass makes public of a protected member', () => {
      register()
      expect(infoOf('Stamp').memberFunctions).to.include('reset')
    })

    it("documents an undocumented override by its base, without the base's nosideeffects", () => {
      register()
      const info = infoOf('Stamp')
      expect(info.meta.state.description).to.equal('The state')
      expect(nosideeffects(info, 'state')).to.equal(false)
      expect(nosideeffects(info, 'speed')).to.equal(true)
    })
  })

  describe('the helper every consumer asks', () => {
    const info = {
      memberFunctions: ['read', 'calibrate', 'constructor'],
      staticFunctions: ['__createShared__', '__callAll__'],
      meta: {
        read: { nosideeffects: true },
        calibrate: {},
        hidden: { nosideeffects: true },
        __createShared__: { nosideeffects: true }
      }
    }

    it("answers the protocol's own functions by the protocol", () => {
      expect(nosideeffects(info, '__registrations__')).to.equal(true)
      expect(nosideeffects(info, '__unsubscribe__')).to.equal(true)
      for (const f of ['__createShared__', '__createIsolated__', '__delete__', '__end__', '__callAll__', '__callMatching__']) {
        expect(nosideeffects(info, f), f).to.equal(false)
      }
    })

    it('answers every other function by its declaration, listed functions only', () => {
      expect(nosideeffects(info, 'read')).to.equal(true)
      expect(nosideeffects(info, 'calibrate')).to.equal(false)
      expect(nosideeffects(info, 'hidden')).to.equal(false)
      expect(nosideeffects(info, 'constructor')).to.equal(false)
      expect(nosideeffects(info, 'toString')).to.equal(false)
    })

    it('takes overloads of a name together: every one declared, or none counts', () => {
      const cpp = {
        memberFunctions: ['read-number', 'read-string', 'move-number', 'move-'],
        staticFunctions: [],
        meta: {
          'read-number': { nosideeffects: true },
          'read-string': { nosideeffects: true },
          'move-number': { nosideeffects: true },
          'move-': {}
        }
      }
      expect(nosideeffects(cpp, 'read')).to.equal(true)
      expect(nosideeffects(cpp, 'move')).to.equal(false)
      expect(nosideeffects(cpp, 'read-number')).to.equal(false)
    })

    it('answers false without a class info or a name', () => {
      expect(nosideeffects(undefined, 'read')).to.equal(false)
      expect(nosideeffects({ memberFunctions: ['read'] }, 'read')).to.equal(false)
      expect(nosideeffects(info, undefined)).to.equal(false)
    })

    it("answers the protocol's own functions without a class info, too", () => {
      expect(nosideeffects(undefined, '__unsubscribe__')).to.equal(true)
      expect(nosideeffects(undefined, '__registrations__')).to.equal(true)
      expect(nosideeffects(undefined, '__delete__')).to.equal(false)
    })
  })
})
