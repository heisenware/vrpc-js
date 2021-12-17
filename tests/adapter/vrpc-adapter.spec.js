'use strict'
const path = require('path')
const assert = require('assert')
const sinon = require('sinon')
const VrpcAdapter = require('../../vrpc/VrpcAdapter')
const TestClassNoDoc = require('./fixtures/TestClassNoDoc')

const testInstance = new TestClassNoDoc(42)

/* global describe, it */

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
  describe('documentation parsing', () => {
    it('should have parsed meta information', () => {
      const meta = VrpcAdapter._getMetaData('TestClassDoc')
      assert.deepEqual(Object.keys(meta), [
        '__createShared__',
        'getValue',
        'setValue'
      ])
      assert.deepEqual(meta.setValue, {
        description: 'Sets a value',
        params: [
          {
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
  })
})
