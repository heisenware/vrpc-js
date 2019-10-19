'use strict'

/* global describe, it */

const { assert } = require('chai')
const EventEmitter = require('events')
const { VrpcLocal } = require('../../../index')
const addon = require('../../../build/Release/vrpc_test')

const emitter = new EventEmitter()
const newEntries = []
const removedEntries = []

// Register callback for new callbacks
emitter.on('new', entry => newEntries.push(entry))
emitter.on('removed', entry => removedEntries.push(entry))

describe('An instance of the VrpcLocal class', () => {
  let vrpc
  it('should be construct-able given a c++ native addon', () => {
    vrpc = new VrpcLocal(addon)
    assert.ok(vrpc)
  })
  describe('The corresponding VrpcLocal instance', () => {
    let testClass
    let anotherTestClass
    it('should be able to create a TestClass proxy using default constructor', () => {
      testClass = vrpc.create('TestClass')
      assert.ok(testClass)
    })
    describe('The corresponding TestClass proxy', () => {
      it('should have all bound functions as own methods', () => {
        assert.isFunction(testClass.getRegistry)
        assert.isFunction(testClass.hasCategory)
        assert.isFunction(testClass.notifyOnNew)
        assert.isFunction(testClass.notifyOnRemoved)
        assert.isFunction(testClass.addEntry)
        assert.isFunction(testClass.removeEntry)
        assert.isFunction(testClass.callMeBack)
        assert.isNotFunction(testClass.crazy)
      })
      it('should return an empty object after calling getRegistry()', () => {
        assert.isEmpty(testClass.getRegistry())
      })
      it('should return false after calling getCategory(\'test\')', () => {
        assert.isFalse(testClass.hasCategory('test'))
      })
      it('should allow to register an EventEmitter as callback argument', () => {
        testClass.notifyOnNew({ emitter, event: 'new' })
        testClass.notifyOnRemoved({ emitter, event: 'removed' })
      })
      it('should add a new entry by calling addEntry(\'test\')', () => {
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
      it('should remove the entry by calling removeEntry(\'test\')', () => {
        const entry = testClass.removeEntry('test')
        assert.equal(entry.member1, 'first entry')
        assert.isFalse(testClass.hasCategory('test'))
        assert.lengthOf(removedEntries, 1)
      })
      it('should trigger and exception on further attempts to remove an entry', () => {
        try {
          testClass.removeEntry('test')
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.message, 'Can not remove non-existing category')
        }
      })
      it('should properly receive callbacks', (done) => {
        testClass.callMeBack(sleepTime => {
          assert.equal(sleepTime, 100)
          done()
        })
      })
      it('should be able to call a static function', () => {
        assert.equal(vrpc.callStatic('TestClass', 'crazy'), 'who is crazy?')
      })
      it('and overloads thereof', () => {
        assert.equal(vrpc.callStatic('TestClass', 'crazy', 'vrpc'), 'vrpc is crazy!')
      })
      it('should create a second instance', async () => {
        anotherTestClass = vrpc.create(
          'TestClass',
          {
            testEntry: [{
              member1: 'anotherTestClass',
              member2: 2,
              member3: 2.0,
              member4: [0, 1, 2, 3]
            }]
          }
        )
        assert.ok(anotherTestClass)
      })
      it('should be well separated from the first instance', async () => {
        const registry = anotherTestClass.getRegistry()
        assert.equal(registry.testEntry[0].member1, 'anotherTestClass')
        const registry2 = testClass.getRegistry()
        assert.deepEqual(registry2, {})
      })
    })
  })
})
