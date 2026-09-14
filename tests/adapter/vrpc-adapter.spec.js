'use strict'
const path = require('path')
const assert = require('assert')
const sinon = require('sinon')
const VrpcAdapter = require('../../vrpc/VrpcAdapter')
const TestClassNoDoc = require('./fixtures/TestClassNoDoc')

const testInstance = new TestClassNoDoc(42)

/* global describe, it, before */

describe('vrpc-adapter', () => {
  /*********************
   * auto-registration *
   *********************/
  describe('auto-registration of a class using plugin path', () => {
    it('should not auto-register when search level is limited', () => {
      VrpcAdapter.addPluginPath('./fixtures', 0)
      assert.deepStrictEqual(VrpcAdapter.getAvailableClasses(), [])
    })
    it('should auto-register when no search level is provided (infinite depth)', () => {
      VrpcAdapter.addPluginPath('./fixtures')
      assert.deepStrictEqual(VrpcAdapter.getAvailableClasses(), [
        'TestClassNested'
      ])
    })
  })
  /**********************
   * manual-registration *
   ***********************/
  describe('manual registration', () => {
    it('should manually register a class given a class', () => {
      VrpcAdapter.register(TestClassNoDoc)
      assert.deepStrictEqual(VrpcAdapter.getAvailableClasses(), [
        'TestClassNested',
        'TestClassNoDoc'
      ])
    })
    it('should manually register a class given a path', () => {
      VrpcAdapter.register('./fixtures/TestClassDoc')
      assert.deepStrictEqual(VrpcAdapter.getAvailableClasses(), [
        'TestClassNested',
        'TestClassNoDoc',
        'TestClassDoc'
      ])
    })
    it('should manually register a class given a dirname expression', () => {
      VrpcAdapter.register(path.join(__dirname, './fixtures/TestDirname.js'))
      assert.deepStrictEqual(VrpcAdapter.getAvailableClasses(), [
        'TestClassNested',
        'TestClassNoDoc',
        'TestClassDoc',
        'TestDirname'
      ])
    })
    it('should manually register an instance', () => {
      VrpcAdapter.registerInstance(testInstance, {
        className: 'TestClassNoDoc',
        instance: 'noDoc1'
      })
      assert.deepStrictEqual(
        VrpcAdapter.getAvailableInstances('TestClassNoDoc'),
        ['noDoc1']
      )
    })
  })
  /****************************************
   * creation / deletion and availability *
   ****************************************/
  describe('creation/deletion and availability of instances', () => {
    it('should not create an instance of a non-existing class', () => {
      assert.throws(() => VrpcAdapter.create({ className: 'DoesNotExist' }), {
        message: '"DoesNotExist" is not a registered class'
      })
    })
    it('should create instance with minimal parameters', () => {
      const createSpy = sinon.spy()
      VrpcAdapter.once('create', createSpy)
      const instance = VrpcAdapter.create({
        className: 'TestClassNoDoc'
      })
      assert.strictEqual(instance.getValue(), 0)
      assert.strictEqual(
        VrpcAdapter.getAvailableInstances('TestClassNoDoc').length,
        2
      )
      assert(createSpy.calledOnce)
      assert.strictEqual(createSpy.args[0][0].className, 'TestClassNoDoc')
      assert.strictEqual(createSpy.args[0][0].isIsolated, false)
    })
    it('should create instance with specific instance name', () => {
      const instance = VrpcAdapter.create({
        className: 'TestClassDoc',
        instance: 'myInstance1'
      })
      assert.strictEqual(instance.getValue(), 0)
      assert.deepStrictEqual(
        VrpcAdapter.getAvailableInstances('TestClassDoc'),
        ['myInstance1']
      )
    })
    it('should create instance with instance name and arguments', () => {
      const instance = VrpcAdapter.create({
        className: 'TestClassDoc',
        instance: 'myInstance2',
        args: [42]
      })
      assert.strictEqual(instance.getValue(), 42)
      assert.deepStrictEqual(
        VrpcAdapter.getAvailableInstances('TestClassDoc'),
        ['myInstance1', 'myInstance2']
      )
    })
    it('should create instance in isolated mode', () => {
      const createSpy = sinon.spy()
      VrpcAdapter.once('create', createSpy)
      const instance = VrpcAdapter.create({
        className: 'TestClassDoc',
        instance: 'myInstance3',
        args: [-1],
        isIsolated: true
      })
      assert.strictEqual(instance.getValue(), -1)
      assert.deepStrictEqual(
        VrpcAdapter.getAvailableInstances('TestClassDoc'),
        ['myInstance1', 'myInstance2']
      )
      assert.strictEqual([...VrpcAdapter._instances.keys()].length, 5)
      assert(createSpy.calledOnce)
      assert.strictEqual(createSpy.args[0][0].className, 'TestClassDoc')
      assert.strictEqual(createSpy.args[0][0].isIsolated, true)
      assert.strictEqual(createSpy.args[0][0].instance, 'myInstance3')
    })
    it('should not delete a non-existing instance', () => {
      assert.strictEqual(VrpcAdapter.delete('doesNotExist'), false)
      assert.strictEqual([...VrpcAdapter._instances.keys()].length, 5)
    })
  })

  /*************************
   * documentation parsing *
   *************************/
  describe('removing listeners the adapter does not hold', () => {
    // A client whose subscription outlived a restart of this agent (or
    // that never registered the listener) still sends off()/removeListener()
    // - historically with a null listener, which the instance's
    // EventEmitter rejected ("listener must be of type function"). Both
    // are nothing to remove: answered true, never handed to the emitter.
    const EventEmitter = require('events')
    class Emitting extends EventEmitter {
      constructor () {
        super()
        this._value = 0
      }

      increment () {
        this._value += 1
        this.emit('value', this._value)
        return this._value
      }
    }
    before(() => {
      VrpcAdapter.register(Emitting)
      VrpcAdapter.create({ className: 'Emitting', instance: 'emitting1' })
    })
    const callOff = (f, listener) =>
      JSON.parse(
        VrpcAdapter.call(
          JSON.stringify({ c: 'emitting1', f, a: ['value', listener], i: 'i-off', s: 'client-1' })
        )
      )
    it('answers off() with a null listener instead of throwing', () => {
      const json = callOff('off', null)
      assert.strictEqual(json.e, undefined)
      assert.strictEqual(json.r, true)
    })
    it('answers off() for an event id it never registered', () => {
      const json = callOff('off', '__e__client-1/never-registered')
      assert.strictEqual(json.e, undefined)
      assert.strictEqual(json.r, true)
    })
    it('treats removeListener the same', () => {
      const json = callOff('removeListener', null)
      assert.strictEqual(json.e, undefined)
      assert.strictEqual(json.r, true)
    })
    it('still emits to nobody afterwards and keeps working', () => {
      const instance = VrpcAdapter.getInstance('emitting1')
      assert.strictEqual(instance.increment(), 1)
    })
  })

  describe('isolated instances belong to the connection that created them', () => {
    const call = json => JSON.parse(VrpcAdapter.call(JSON.stringify(json)))
    const create = (s, instance = 'iso1') =>
      call({ c: 'TestClassDoc', f: '__createIsolated__', a: [instance, 11], i: 'i', s })
    it('creates for its owner and answers the owner', () => {
      const created = create('conn-A')
      assert.strictEqual(created.e, undefined)
      assert.strictEqual(created.r, 'iso1')
      assert.strictEqual(VrpcAdapter._instances.get('iso1').owner, 'conn-A')
      const answered = call({ c: 'iso1', f: 'getValue', a: [], i: 'i', s: 'conn-A' })
      assert.strictEqual(answered.e, undefined)
      assert.strictEqual(answered.r, 11)
    })
    it('refuses every other connection, a missing sender included', () => {
      for (const s of ['conn-B', undefined, '']) {
        const json = call({ c: 'iso1', f: 'getValue', a: [], i: 'i', s })
        assert.strictEqual(json.r, undefined)
        assert.match(json.e.message, /isolated to another connection/)
      }
      const off = call({ c: 'iso1', f: 'removeAllListeners', a: ['value'], i: 'i', s: 'conn-B' })
      assert.match(off.e.message, /isolated to another connection/)
    })
    it('never re-homes an id: re-creating it as another connection or as shared is refused', () => {
      assert.match(create('conn-B').e.message, /isolated to another connection/)
      const shared = call({ c: 'TestClassDoc', f: '__createShared__', a: ['iso1'], i: 'i', s: 'conn-B' })
      assert.match(shared.e.message, /exists as an isolated instance/)
      // the owner re-creating its own instance gets it back
      assert.strictEqual(create('conn-A').r, 'iso1')
      // and a shared id cannot be claimed as isolated by anyone
      const claim = call({ c: 'TestClassDoc', f: '__createIsolated__', a: ['myInstance1'], i: 'i', s: 'conn-A' })
      assert.match(claim.e.message, /exists as a shared instance/)
      assert.strictEqual(VrpcAdapter._instances.get('myInstance1').isIsolated, false)
    })
    it('lets only the owner or the agent itself delete it', () => {
      const foreign = call({ c: 'TestClassDoc', f: '__delete__', a: ['iso1'], i: 'i', s: 'conn-B' })
      assert.match(foreign.e.message, /isolated to another connection/)
      assert(VrpcAdapter._instances.has('iso1'))
      const local = { c: 'TestClassDoc', f: '__delete__', a: ['iso1'], r: null, s: VrpcAdapter.LOCAL_SENDER }
      VrpcAdapter._call(local)
      assert.strictEqual(local.r, true)
      assert(!VrpcAdapter._instances.has('iso1'))
      create('conn-A', 'iso2')
      const own = call({ c: 'TestClassDoc', f: '__delete__', a: ['iso2'], i: 'i', s: 'conn-A' })
      assert.strictEqual(own.r, true)
    })
    it('keeps instances the agent created itself open to everyone', () => {
      assert.strictEqual(VrpcAdapter._instances.get('myInstance3').owner, undefined)
      const json = call({ c: 'myInstance3', f: 'getValue', a: [], i: 'i', s: 'conn-Z' })
      assert.strictEqual(json.r, -1)
    })
  })

  describe('documentation parsing', () => {
    it('should have parsed meta information', () => {
      const meta = VrpcAdapter._getMetaData('TestClassDoc')
      assert.deepEqual(Object.keys(meta), [
        '__createShared__',
        'getValue',
        'setValue',
        'onChange'
      ])
      assert.deepEqual(meta.__createShared__, {
        description: 'Constructor',
        params: [
          {
            defaultValue: undefined,
            description: 'Name of the instance to be created',
            name: 'instanceName',
            optional: false,
            type: 'string'
          },
          {
            defaultValue: '0',
            description: 'Initial value',
            name: 'value',
            optional: true,
            type: 'Integer'
          }
        ],
        ret: null
      })
      assert.deepEqual(meta.setValue, {
        description: 'Sets a value',
        params: [
          {
            defaultValue: undefined,
            description: 'The new value',
            name: 'value',
            optional: false,
            type: 'Integer'
          }
        ],
        ret: {
          description: 'the updated value',
          type: 'Integer'
        }
      })
    })

    it('should resolve @callback typedefs onto function parameters', () => {
      const meta = VrpcAdapter._getMetaData('TestClassDoc')
      // the typedef block is not a function of its own
      assert.strictEqual(meta.ChangeListener, undefined)
      assert.deepEqual(meta.onChange, {
        description: 'Subscribes to value changes',
        params: [
          {
            defaultValue: undefined,
            description: 'Receives every change',
            name: 'listener',
            optional: false,
            type: 'ChangeListener',
            callback: {
              name: 'ChangeListener',
              description: 'Called on every change of the value',
              params: [
                {
                  defaultValue: undefined,
                  description: 'The new value',
                  name: 'value',
                  optional: false,
                  type: 'Integer'
                },
                {
                  defaultValue: undefined,
                  description: 'The value before',
                  name: 'previous',
                  optional: false,
                  type: 'Integer'
                }
              ]
            }
          }
        ],
        ret: { description: 'true', type: 'Boolean' }
      })
    })
  })
})
