'use strict'

/* global describe, it */

const { assert } = require('chai')
const EventEmitter = require('events')
const VrpcLocal = require('../../js/VrpcLocal')
const addon = require('../../build/Release/vrpc_test')

const emitter = new EventEmitter()
const newEntries = []
const removedEntries = []

// Register callback for new callbacks
emitter.on('new', entry => newEntries.push(entry))
emitter.on('removed', entry => removedEntries.push(entry))

describe('VrpcLocal', () => {
  let vrpc
  it('should be able to load the native addon', () => {
    vrpc = VrpcLocal(addon)
    assert.ok(vrpc)
  })
  describe('The vrpc instance', () => {
    let testClass
    it('should be able to create a TestClass proxy using default constructor', () => {
      testClass = vrpc.create('TestClass')
      assert.ok(testClass)
    })
    it('the proxy should have all bound functions as own methods', () => {
      assert.isFunction(testClass.getRegistry)
      assert.isFunction(testClass.hasCategory)
      assert.isFunction(testClass.notifyOnNew)
      assert.isFunction(testClass.notifyOnRemoved)
      assert.isFunction(testClass.addEntry)
      assert.isFunction(testClass.removeEntry)
      assert.isFunction(testClass.callMeBack)
      assert.isNotFunction(testClass.crazy)
    })
    it('getRegistry() should return empty object', () => {
      assert.isEmpty(testClass.getRegistry())
    })
    it('hasCategory() should return false for category "test"', () => {
      assert.isFalse(testClass.hasCategory('test'))
    })
    it('An EventEmitter instance should be allowed to be registered as callback', () => {
      testClass.notifyOnNew({ emitter, event: 'new' })
      testClass.notifyOnRemoved({ emitter, event: 'removed' })
    })
    it('addEntry() should add a new entry under category "test"', () => {
      const originalEntry = {
        member1: 'first entry',
        member2: 42,
        member3: 3.14,
        member4: [0, 1, 2, 3]
      }
      testClass.addEntry('test', originalEntry)
      assert.isTrue(testClass.hasCategory('test'))
      assert.lengthOf(newEntries, 1)
      assert.lengthOf(removedEntries, 0)
      assert.equal(newEntries[0].member1, originalEntry.member1)
      assert.equal(newEntries[0].member2, originalEntry.member2)
      assert.closeTo(newEntries[0].member3, originalEntry.member3, 0.00001)
      assert.deepEqual(newEntries[0].member4, originalEntry.member4)
      assert.equal(testClass.getRegistry().test[0].member1, originalEntry.member1)
    })
    it('removeEntry() should remove the entry under category "test"', () => {
      const entry = testClass.removeEntry('test')
      assert.equal(entry.member1, 'first entry')
      assert.isFalse(testClass.hasCategory('test'))
      assert.lengthOf(removedEntries, 1)
    })
    it('Should not be possible to remove another entry under category "test"', () => {
      try {
        testClass.removeEntry('test')
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.message, 'Can not remove non-existing category')
      }
    })
    it('Should be possible to receive callbacks', (done) => {
      testClass.callMeBack(sleepTime => {
        assert.equal(sleepTime, 100)
        done()
      })
    })
    it('Should be possible to call a static function', () => {
      assert.equal(vrpc.callStatic('TestClass', 'crazy'), 'who is crazy?')
    })
    it('And overloads thereof', () => {
      assert.equal(vrpc.callStatic('TestClass', 'crazy', 'vrpc'), 'vrpc is crazy!')
    })
  })
})
