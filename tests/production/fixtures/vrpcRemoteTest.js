'use strict'

/* global describe, it */

const { assert } = require('chai')
const EventEmitter = require('events')
const { VrpcClient } = require('../../../index')

const emitter = new EventEmitter()
const newEntries = []
const removedEntries = []

// Register callback for new callbacks
emitter.on('new', entry => newEntries.push(entry))
emitter.on('removed', entry => removedEntries.push(entry))

describe('An instance of the VrpcClient class', () => {
  let vrpc
  it('should be construct-able given an optional domain', async () => {
    vrpc = new VrpcClient({
      domain: 'test.vrpc',
      timeout: 1500
    })
    await vrpc.connect()
    assert.ok(vrpc)
  })
  it('should return available classes and functions', async () => {
    // const availabilities = await vrpc.getAvailabilities()
    // console.log('Availabilities:', JSON.stringify(availabilities, null, 2))
    // console.log('Domains:', await vrpc.getAvailableDomains())
    // console.log('Agents:', await vrpc.getAvailableAgents())
    // console.log('Classes:', await vrpc.getAvailableClasses('js'))
    // console.log('Member Functions:', await vrpc.getAvailableMemberFunctions('TestClass', 'js'))
    // console.log('Static Functions:', await vrpc.getAvailableStaticFunctions('TestClass', 'js'))
  })
  describe('The corresponding VrpcClient instance', () => {
    it('should timeout if non-existing code is tried to be proxied', async () => {
      try {
        await vrpc.create({
          agent: 'js',
          className: 'DoesNotExist',
          instance: 'test'
        })
        assert.fail()
      } catch (err) {
        assert.equal(
          err.message,
          'Proxy creation for class "DoesNotExist" on agent "js" and domain "test.vrpc" timed out (> 1500 ms)'
        )
      }
    })
    let testClass
    it('should be able to create a TestClass proxy using its default constructor', async () => {
      testClass = await vrpc.create({
        agent: 'js',
        className: 'TestClass',
        instance: 'testClass'
      })
      assert.ok(testClass)
      await new Promise(resolve => setTimeout(resolve, 300))
      const available = await vrpc.getAvailableInstances({
        className: 'TestClass',
        agent: 'js'
      })
      assert.ok(available.includes('testClass'))
    })
    describe('The corresponding TestClass proxy', () => {
      it('should have all bound functions as own methods', () => {
        assert.isFunction(testClass.getRegistry)
        assert.isFunction(testClass.hasEntry)
        assert.isFunction(testClass.notifyOnNew)
        assert.isFunction(testClass.notifyOnRemoved)
        assert.isFunction(testClass.addEntry)
        assert.isFunction(testClass.removeEntry)
        assert.isFunction(testClass.waitForMe)
        assert.isFunction(testClass.callMeBackLater)
        assert.isNotFunction(testClass.crazy)
        assert.isNotFunction(testClass.promisedEcho)
      })
      it('should return an empty object after calling getRegistry()', async () => {
        assert.isEmpty(await testClass.getRegistry())
      })
      it("should return false after calling getCategory('test')", async () => {
        assert.isFalse(await testClass.hasEntry('test'))
      })
      it('should allow to register an EventEmitter as callback argument', async () => {
        await testClass.notifyOnNew({ emitter, event: 'new' })
        await testClass.notifyOnRemoved({ emitter, event: 'removed' })
      })
      it("should add a new entry by calling addEntry('test')", async () => {
        const originalEntry = {
          member1: 'first entry',
          member2: 42,
          member3: 3.14,
          member4: [0, 1, 2, 3]
        }
        await testClass.addEntry('test', originalEntry)
        assert.isTrue(await testClass.hasEntry('test'))
        assert.lengthOf(newEntries, 1)
        assert.lengthOf(removedEntries, 0)
        assert.equal(newEntries[0].member1, originalEntry.member1)
        assert.equal(newEntries[0].member2, originalEntry.member2)
        assert.closeTo(newEntries[0].member3, originalEntry.member3, 0.00001)
        assert.deepEqual(newEntries[0].member4, originalEntry.member4)
        const registry = await testClass.getRegistry()
        assert.equal(registry.test[0].member1, originalEntry.member1)
      })
      it("should remove the entry by calling removeEntry('test')", async () => {
        const entry = await testClass.removeEntry('test')
        assert.equal(entry.member1, 'first entry')
        assert.isFalse(await testClass.hasEntry('test'))
        assert.lengthOf(removedEntries, 1)
      })
      it('should trigger an exception on further attempts to remove an entry', async () => {
        try {
          await testClass.removeEntry('test')
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.message, '[vrpc js-testClass-removeEntry]: Can not remove non-existing entry')
        }
      })
      it('should properly forward promises', async () => {
        assert.equal(101, await testClass.waitForMe(101))
      })
      it('should properly receive callbacks', async () => {
        await testClass.callMeBackLater(sleepTime => {
          assert.equal(sleepTime, 100)
        })
      })
      it('should be able to catch an asynchronous exception', async () => {
        try {
          await testClass.willThrowLater()
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.message, '[vrpc js-testClass-willThrowLater]: Some test error')
        }
      })
      it('should be able to call a static function', async () => {
        assert.equal(
          await vrpc.callStatic({
            agent: 'js',
            className: 'TestClass',
            functionName: 'crazy'
          }),
          'who is crazy?'
        )
      })
      it('and overloads thereof', async () => {
        assert.equal(
          await vrpc.callStatic({
            agent: 'js',
            className: 'TestClass',
            functionName: 'crazy',
            args: ['vrpc']
          }),
          'vrpc is crazy!'
        )
      })
      it('and async versions thereof', async () => {
        assert.equal(
          await vrpc.callStatic({
            agent: 'js',
            className: 'TestClass',
            functionName: 'promisedEcho',
            args: ['Hello, echo!']
          }),
          'Hello, echo!'
        )
      })
      it('should timeout non-existing static functions calls ', async () => {
        try {
          await vrpc.callStatic({
            agent: 'js',
            className: 'TestClass',
            functionName: 'doesNotExist',
            args: ['vrpc']
          })
          assert.fail()
        } catch (err) {
          assert.equal(
            err.message,
            'Function call "TestClass::doesNotExist()" on agent "js" timed out (> 1500 ms)'
          )
        }
      })
    })
  })
})

describe('Another instance of the VrpcClient class', () => {
  let vrpc
  it('should be construct-able with pre-defined domain and agent', async () => {
    vrpc = new VrpcClient({
      domain: 'test.vrpc',
      agent: 'js'
    })
    await vrpc.connect()
    assert.isObject(vrpc)
  })
  describe('The corresponding VrpcClient instance', () => {
    let proxy
    it('should be able to create a shared proxy instance', async () => {
      proxy = await vrpc.create({
        className: 'TestClass',
        instance: 'test1',
        args: [{ test: [1, 2, 3] }]
      })
      assert.isObject(proxy)
    })
    describe('The corresponding TestClass proxy', () => {
      let test1
      it('should have all bound functions as own methods', () => {
        assert.isFunction(proxy.getRegistry)
        assert.isFunction(proxy.hasEntry)
        assert.isFunction(proxy.notifyOnNew)
        assert.isFunction(proxy.notifyOnRemoved)
        assert.isFunction(proxy.addEntry)
        assert.isFunction(proxy.removeEntry)
        assert.isFunction(proxy.waitForMe)
        assert.isFunction(proxy.callMeBackLater)
        assert.isNotFunction(proxy.crazy)
        assert.isNotFunction(proxy.promisedEcho)
      })
      it('should return the correct registry as provided during construction', async () => {
        const registry = await proxy.getRegistry()
        assert.deepEqual(registry, { test: [1, 2, 3] })
      })
      it('should not be possible to attach to non-existing instance', async () => {
        try {
          await vrpc.getInstance('bad', { className: 'TestClass' })
          assert.fail()
        } catch (err) {
          assert.equal(err.message, 'Could not find instance: bad (> 6000 ms)')
        }
      })
      it('should not be possible to attach to non-existing instance without timeout', async () => {
        try {
          await vrpc.getInstance('bad', { noWait: true })
          assert.fail()
        } catch (err) {
          assert.equal(err.message, 'Could not find instance: bad')
        }
      })
      it('should be possible to attach to the shared instance', async () => {
        test1 = await vrpc.getInstance('test1', { className: 'TestClass' })
        assert.isObject(test1)
      })
      describe('The attached shared instance', () => {
        it('should have all bound functions as own methods', () => {
          assert.isFunction(test1.getRegistry)
          assert.isFunction(test1.hasEntry)
          assert.isFunction(test1.notifyOnNew)
          assert.isFunction(test1.notifyOnRemoved)
          assert.isFunction(test1.addEntry)
          assert.isFunction(test1.removeEntry)
          assert.isFunction(test1.waitForMe)
          assert.isFunction(test1.callMeBackLater)
          assert.isNotFunction(test1.crazy)
        })
        it('should return the correct registry as provided during construction', async () => {
          assert.deepEqual(await test1.getRegistry(), { test: [1, 2, 3] })
        })
        it('should be delete-able', async () => {
          const deleted = await vrpc.delete('test1', { className: 'TestClass' })
          assert.isTrue(deleted)
          try {
            await vrpc.getInstance('test1', { className: 'TestClass' })
            assert.fail()
          } catch (err) {
            assert.equal(
              err.message,
              'Could not find instance: test1 (> 6000 ms)'
            )
          }
        })
      })
    })
  })
})
