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
  it('should be construct-able given an optional domain', () => {
    vrpc = new VrpcRemote({
      domain: 'test.vrpc',
      token: process.env.VRPC_TEST_TOKEN,
      timeout: 1000
    })
    assert.ok(vrpc)
  })
  it('should return available classes and functions', async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log('Domains:', await vrpc.getAvailableDomains())
    console.log('Agents:', await vrpc.getAvailableAgents())
    console.log('Classes:', await vrpc.getAvailableClasses('js'))
    console.log('Member Functions:', await vrpc.getAvailableMemberFunctions('TestClass', 'js'))
    console.log('Static Functions:', await vrpc.getAvailableStaticFunctions('TestClass', 'js'))
  })
  describe('The corresponding VrpcRemote instance', () => {
    it('should timeout if non-existing code is tried to be proxied', async () => {
      try {
        await vrpc.create({
          agent: 'js',
          className: 'DoesNotExist',
          instance: 'test'
        })
        assert.fail()
      } catch (err) {
        assert.equal(err.message, 'Proxy creation timed out (> 1000 ms)')
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
      const available = await await vrpc.getAvailableInstances('TestClass', 'js')
      assert.ok(available.includes('testClass'))
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
        assert.isNotFunction(testClass.promisedEcho)
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
      it('should be able to catch an asynchronous exception', async () => {
        try {
          await await testClass.willThrowLater()
          assert.isTrue(false)
        } catch (err) {
          assert.equal(err.message, 'Some test error')
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
          await await vrpc.callStatic({
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
          assert.equal(err.message, 'Function call timed out (> 1000 ms)')
        }
      })
    })
  })
})

describe('Another instance of the VrpcRemote class', () => {
  let vrpc
  it('should be construct-able with pre-defined domain and agent', () => {
    vrpc = new VrpcRemote({
      domain: 'test.vrpc',
      agent: 'js',
      token: process.env.VRPC_TEST_TOKEN
    })
    assert.isObject(vrpc)
  })
  describe('The corresponding VrpcRemote instance', () => {
    let proxy
    it('should be able to create a named proxy instance', async () => {
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
        assert.isFunction(proxy.hasCategory)
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
          await vrpc.getInstance({ className: 'TestClass', instance: 'bad' })
          assert.fail()
        } catch (err) {
          assert.equal(err.message, 'Instance with id: bad does not exist')
        }
      })
      it('should be possible to attach to the named instance', async () => {
        test1 = await vrpc.getInstance({ className: 'TestClass', instance: 'test1' })
        assert.isObject(test1)
      })
      describe('The attached named instance', () => {
        it('should have all bound functions as own methods', () => {
          assert.isFunction(test1.getRegistry)
          assert.isFunction(test1.hasCategory)
          assert.isFunction(test1.notifyOnNew)
          assert.isFunction(test1.notifyOnRemoved)
          assert.isFunction(test1.addEntry)
          assert.isFunction(test1.removeEntry)
          assert.isFunction(test1.waitForMe)
          assert.isFunction(test1.callMeBackLater)
          assert.isNotFunction(test1.crazy)
        })
        it('should return the correct registry as provided during construction', async () => {
          assert.deepEqual((await test1.getRegistry()), { test: [1, 2, 3] })
        })
        it.skip('should be delete-able', async () => {
          assert.equal(await vrpc.deleteInstance('test1'), true)
          try {
            await vrpc.getInstance({ className: 'TestClass', instance: 'test1' })
            assert.fail()
          } catch (err) {
            assert.equal(err.message, 'Instance with id: bad does not exist')
          }
        })
      })
    })
  })
})
