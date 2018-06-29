'use strict'

/* global describe, it */

const { assert } = require('chai')
const EventEmitter = require('events')
const VrpcRemote = require('../../vrpc/VrpcRemote')

const emitter = new EventEmitter()
const newEntries = []
const removedEntries = []

// Register callback for new callbacks
emitter.on('new', entry => newEntries.push(entry))
emitter.on('removed', entry => removedEntries.push(entry))

describe('An instance of the VrpcRemote class', () => {
  let vrpc
  it('should be construct-able given an optional topicPrefix', () => {
    vrpc = new VrpcRemote({ topicPrefix: 'vrpc_test' })
    assert.ok(vrpc)
  })
  describe('The corresponding VrpcRemote instance', () => {
    let testClass
    it('should be able to create a TestClass proxy using its default constructor', async () => {
      testClass = await vrpc.create('js', 'TestClass')
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
        assert.isFunction(testClass.waitForMe)
        assert.isFunction(testClass.callMeBackLater)
        assert.isNotFunction(testClass.crazy)
      })
      it('should return an empty object after calling getRegistry()', async () => {
        assert.isEmpty(await testClass.getRegistry())
      })
      it('should return false after calling getCategory(\'test\')', async () => {
        assert.isFalse(await testClass.hasCategory('test'))
      })
      it('should allow to register an EventEmitter as callback argument', async () => {
        await testClass.notifyOnNew({ emitter, event: 'new' })
        await testClass.notifyOnRemoved({ emitter, event: 'removed' })
      })
      it('should add a new entry by calling addEntry(\'test\')', async () => {
        const originalEntry = {
          member1: 'first entry',
          member2: 42,
          member3: 3.14,
          member4: [0, 1, 2, 3]
        }
        await testClass.addEntry('test', originalEntry)
        assert.isTrue(await testClass.hasCategory('test'))
        assert.lengthOf(newEntries, 1)
        assert.lengthOf(removedEntries, 0)
        assert.equal(newEntries[0].member1, originalEntry.member1)
        assert.equal(newEntries[0].member2, originalEntry.member2)
        assert.closeTo(newEntries[0].member3, originalEntry.member3, 0.00001)
        assert.deepEqual(newEntries[0].member4, originalEntry.member4)
        const registry = await testClass.getRegistry()
        assert.equal(registry.test[0].member1, originalEntry.member1)
      })
      it('should remove the entry by calling removeEntry(\'test\')', async () => {
        const entry = await testClass.removeEntry('test')
        assert.equal(entry.member1, 'first entry')
        assert.isFalse(await testClass.hasCategory('test'))
        assert.lengthOf(removedEntries, 1)
      })
      it('should trigger and exception on further attempts to remove an entry', async () => {
        try {
          await testClass.removeEntry('test')
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.message, 'Can not remove non-existing category')
        }
      })
      it('should properly forward promises', async () => {
        assert.equal(101, await await testClass.waitForMe(101))
      })
      it('should properly receive callbacks', async () => {
        await await testClass.callMeBackLater(sleepTime => {
          assert.equal(sleepTime, 100)
        })
      })
      it('should be able to call a static function', async () => {
        assert.equal(await vrpc.callStatic('js', 'TestClass', 'crazy'), 'who is crazy?')
      })
      it('and overloads thereof', async () => {
        assert.equal(await vrpc.callStatic('js', 'TestClass', 'crazy', 'vrpc'), 'vrpc is crazy!')
      })
    })
  })
})
