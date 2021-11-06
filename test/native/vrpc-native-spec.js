'use strict'

/* global describe, context, it */

const assert = require('assert').strict
const sinon = require('sinon')
const EventEmitter = require('events')
const { VrpcNative } = require('../../index')
const addon = require('../../build/Release/vrpc_test')

describe('Embedding C++ to Node.js', () => {
  context('An instance of the VrpcNative class', () => {
    let native
    const emitter = new EventEmitter()
    const newEntries = []
    const removedEntries = []
    emitter.on('new', x => newEntries.push(x))
    emitter.on('removed', x => removedEntries.push(x))

    it('should be construct-able given a c++ native addon', () => {
      native = new VrpcNative(addon)
      assert.ok(native)
    })

    it('should list all available classes', () => {
      assert.deepEqual(native.getAvailableClasses(), ['TestClass'])
    })

    it('should not provide class proxy for bad className', () => {
      assert.throws(
        () => {
          native.getClass('DoesNotExist')
        },
        { message: 'Native addon does not provide class: DoesNotExist' }
      )
    })

    context('A proxy to an existing native class', () => {
      let TestClass
      it('should be creatable given a valid className', () => {
        TestClass = native.getClass('TestClass')
        assert.ok(TestClass)
      })
      it('should be able to call a static function', () => {
        assert.equal(TestClass.crazy(), 'who is crazy?')
      })
      it('and overloads thereof', () => {
        assert.equal(TestClass.crazy('VRPC'), 'VRPC is crazy!')
      })
      context('TestClass instances', () => {
        let testClass
        let anotherTestClass
        it('should be constructable from the TestClass proxy', () => {
          testClass = new TestClass()
          assert.ok(testClass)
        })
        it('should have all bound functions as own methods', () => {
          assert.ok(testClass.getRegistry)
          assert.ok(testClass.hasEntry)
          assert.ok(testClass.notifyOnNew)
          assert.ok(testClass.notifyOnRemoved)
          assert.ok(testClass.addEntry)
          assert.ok(testClass.removeEntry)
          assert.ok(testClass.callMeBack)
          assert.ok(testClass.usingDefaults)
          assert.equal(testClass.crazy, undefined)
        })
        it('should return an empty object after calling getRegistry()', () => {
          console.log('registry', testClass.getRegistry())
          assert.deepEqual(testClass.getRegistry(), {})
        })
        it('should return false after calling getEntry(\'test\')', () => {
          assert.equal(testClass.hasEntry('test'), false)
        })
        it('should allow to register an EventEmitter as callback argument', () => {
          //testClass.notifyOnNew({ emitter, event: 'new' })
          //testClass.notifyOnRemoved({ emitter, event: 'removed' })
          testClass.on('notifyOnNew', (...args) => console.log(args))
        })
        it('should add a new entry by calling addEntry(\'test\')', () => {
          const originalEntry = {
            member1: 'first entry',
            member2: 42,
            member3: 3.14,
            member4: [0, 1, 2, 3]
          }
          testClass.addEntry('test', originalEntry)
          assert(testClass.hasEntry('test'))
          // assert.lengthOf(newEntries, 1)
          // assert.lengthOf(removedEntries, 0)
          // assert.equal(newEntries[0].member1, originalEntry.member1)
          // assert.equal(newEntries[0].member2, originalEntry.member2)
          // assert.closeTo(newEntries[0].member3, originalEntry.member3, 0.00001)
          // assert.deepEqual(newEntries[0].member4, originalEntry.member4)
          // assert.equal(testClass.getRegistry().test[0].member1, originalEntry.member1)
        })
        it.skip('should remove the entry by calling removeEntry(\'test\')', () => {
          const entry = testClass.removeEntry('test')
          assert.equal(entry.member1, 'first entry')
          assert.isFalse(testClass.hasEntry('test'))
          assert.lengthOf(removedEntries, 1)
        })
        it.skip('should trigger an exception on further attempts to remove an entry', () => {
          try {
            testClass.removeEntry('test')
            assert.isTrue(false)
          } catch (err) {
            assert.equal(err.message, 'Can not remove non-existing entry')
          }
        })
        // FIXME Defaults are not yet working for C++ embedded in JS
        it.skip('should correctly work with defaults', () => {
          assert.isFalse(testClass.usingDefaults('whatever', false))
          assert.isTrue(testClass.usingDefaults('whatever'))
        })
        it.skip('should properly receive callbacks', (done) => {
          testClass.callMeBack(sleepTime => {
            assert.equal(sleepTime, 100)
            done()
          })
        })
      })
    })
  })
})
