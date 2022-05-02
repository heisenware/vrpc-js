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
        const notifyOnNewSpy = sinon.spy()
        const notifyOnRemovedSpy = sinon.spy()
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
          assert.deepEqual(testClass.getRegistry(), {})
        })
        it("should return false after calling getEntry('test')", () => {
          assert.equal(testClass.hasEntry('test'), false)
        })
        it('should allow to register a callback as reoccurring event', () => {
          testClass.vrpcOn('notifyOnNew', notifyOnNewSpy)
          testClass.vrpcOn('notifyOnRemoved', notifyOnRemovedSpy)
        })
        it('should add a new entry by calling addEntry()', () => {
          const originalEntry = {
            member1: 'first entry',
            member2: 42,
            member3: 3.14,
            member4: [0, 1, 2, 3]
          }
          testClass.addEntry('test1', originalEntry)
          testClass.addEntry('test2', originalEntry)
          assert(testClass.hasEntry('test1'))
          assert(notifyOnNewSpy.calledTwice)
          assert(notifyOnRemovedSpy.notCalled)
          const payload = notifyOnNewSpy.args[0][0]
          assert.equal(payload.member1, 'first entry')
          assert.equal(payload.member2, 42)
          assert.deepEqual(payload.member4, [0, 1, 2, 3])
        })
        it('should remove the entry by calling removeEntry()', () => {
          testClass.removeEntry('test1')
          testClass.removeEntry('test2')
          assert(notifyOnRemovedSpy.calledTwice)
          assert.equal(notifyOnRemovedSpy.args[0][0].member1, 'first entry')
          assert.equal(testClass.hasEntry('test1'), false)
        })
        it('should trigger an exception on further attempts to remove an entry', () => {
          assert.throws(() => testClass.removeEntry('test'), {
            message: 'Can not remove non-existing entry'
          })
        })
        it('should be possible to unregister from whenever events', () => {
          testClass.vrpcOff('notifyOnNew')
          testClass.addEntry('test3', {
            member1: 'a',
            member2: 4,
            member3: 1.0,
            member4: []
          })
          assert(notifyOnNewSpy.calledTwice)
          testClass.removeEntry('test3')
          assert(notifyOnRemovedSpy.calledThrice)
        })
        // FIXME Defaults are not yet working for C++ embedded in JS
        it.skip('should correctly work with defaults', () => {
          assert.equal(testClass.usingDefaults('whatever', false), false)
          assert.equal(testClass.usingDefaults('whatever'), true)
        })
        it('should properly receive callbacks', done => {
          testClass.callMeBack(sleepTime => {
            assert.equal(sleepTime, 100)
            done()
          })
        })
        it('should create a second instance', async () => {
          anotherTestClass = new TestClass({
            testEntry: [
              {
                member1: 'anotherTestClass',
                member2: 2,
                member3: 2.0,
                member4: [0, 1, 2, 3]
              }
            ]
          })
          assert.ok(anotherTestClass)
        })
        it('should be well separated from the first instance', async () => {
          const registry = anotherTestClass.getRegistry()
          assert.equal(registry.testEntry[0].member1, 'anotherTestClass')
          assert.deepEqual(testClass.getRegistry(), {})
        })
        it('should be possible to delete both instances', () => {
          assert.equal(native.delete(testClass), true)
          assert.equal(native.delete(anotherTestClass), true)
        })
        it('should return false whenever the proxy could not be found', () => {
          assert.equal(native.delete(testClass), false)
        })
        it('should throw whenever garbage is handed over', () => {
          assert.throws(() => native.delete('simplyWrong'))
        })
      })
    })
  })

  context('The corresponding VrpcNative instance', () => {
    let testClass1
    let testClass2
    let anotherTestClass1
    let anotherTestClass2
    const native1 = new VrpcNative(addon)
    const native2 = new VrpcNative(addon)
    const TestClass1 = native1.getClass('TestClass')
    const TestClass2 = native2.getClass('TestClass')
    const notifyOnNewSpy1 = sinon.spy()
    const notifyOnRemovedSpy1 = sinon.spy()
    const notifyOnNewSpy2 = sinon.spy()
    const notifyOnRemovedSpy2 = sinon.spy()
    it('should be able to create a TestClass proxies using default constructor', () => {
      testClass1 = new TestClass1()
      testClass2 = new TestClass2()
      assert.ok(testClass1)
      assert.ok(testClass2)
    })
    context('The corresponding TestClass proxies', () => {
      it('should return an empty object after calling getRegistry()', () => {
        assert.deepEqual(testClass1.getRegistry(), {})
        assert.deepEqual(testClass2.getRegistry(), {})
      })
      it("should return false after calling getEntry('test')", () => {
        assert.equal(testClass1.hasEntry('test'), false)
        assert.equal(testClass2.hasEntry('test'), false)
      })
      it('should allow to register an EventEmitter as callback argument', () => {
        testClass1.vrpcOn('notifyOnNew', notifyOnNewSpy1)
        testClass1.vrpcOn('notifyOnRemoved', notifyOnRemovedSpy1)
        testClass2.vrpcOn('notifyOnNew', notifyOnNewSpy2)
        testClass2.vrpcOn('notifyOnRemoved', notifyOnRemovedSpy2)
      })
      it("should add a new entry by calling addEntry('test')", () => {
        const originalEntry = {
          member1: 'first entry',
          member2: 42,
          member3: 3.14,
          member4: [0, 1, 2, 3]
        }
        testClass1.addEntry('test', originalEntry)
        assert(testClass1.hasEntry('test'))
        assert(notifyOnNewSpy1.calledOnce)
        assert(notifyOnRemovedSpy1.notCalled)
        const payload1 = notifyOnNewSpy1.args[0][0]
        assert.equal(payload1.member1, 'first entry')
        assert.equal(payload1.member2, 42)
        assert.deepEqual(payload1.member4, [0, 1, 2, 3])
        // there should not be any cross-talk by cleanly separated instances
        assert.equal(testClass2.hasEntry('test'), false)
        testClass2.addEntry('test', originalEntry)
        assert(testClass2.hasEntry('test'))
        assert(notifyOnNewSpy2.calledOnce)
        assert(notifyOnRemovedSpy2.notCalled)
        const payload2 = notifyOnNewSpy2.args[0][0]
        assert.equal(payload2.member1, 'first entry')
        assert.equal(payload2.member2, 42)
        assert.deepEqual(payload2.member4, [0, 1, 2, 3])
      })
      it("should remove the entry by calling removeEntry('test')", () => {
        testClass1.removeEntry('test')
        assert(notifyOnRemovedSpy1.calledOnce)
        assert.equal(notifyOnRemovedSpy1.args[0][0].member1, 'first entry')
        assert.equal(testClass1.hasEntry('test'), false)

        testClass2.removeEntry('test')
        assert(notifyOnRemovedSpy2.calledOnce)
        assert.equal(notifyOnRemovedSpy2.args[0][0].member1, 'first entry')
        assert.equal(testClass2.hasEntry('test'), false)
      })
      it('should trigger an exception on further attempts to remove an entry', () => {
        assert.throws(() => testClass1.removeEntry('test'), {
          message: 'Can not remove non-existing entry'
        })
        assert.throws(() => testClass2.removeEntry('test'), {
          message: 'Can not remove non-existing entry'
        })
      })
      it('should properly receive callbacks (instance1)', done => {
        testClass1.callMeBack(sleepTime => {
          assert.equal(sleepTime, 100)
          done()
        })
      })
      it('should properly receive callbacks (instance2)', done => {
        testClass2.callMeBack(sleepTime => {
          assert.equal(sleepTime, 100)
          done()
        })
      })
      it('should not throw but only log bad callbacks', done => {
        const orig = console.error
        console.error = (txt) => {
          assert(txt.endsWith('garbage is not defined'))
          done()
        }
        testClass2.callMeBack(() => garbage())
        console.error = orig
      })
      it('should be able to call a static function', () => {
        assert.equal(TestClass1.crazy(), 'who is crazy?')
        assert.equal(TestClass2.crazy(), 'who is crazy?')
        // alternative API
        assert.equal(native1.callStatic('TestClass', 'crazy'), 'who is crazy?')
      })
      it('and overloads thereof', () => {
        assert.equal(TestClass1.crazy('VRPC'), 'VRPC is crazy!')
        assert.equal(TestClass2.crazy('VRPC'), 'VRPC is crazy!')
        // alternative API
        assert.equal(
          native1.callStatic('TestClass', 'crazy', 'VRPC'),
          'VRPC is crazy!'
        )
      })
      it('should create a second instance', async () => {
        anotherTestClass1 = new TestClass1({
          testEntry: [
            {
              member1: 'anotherTestClass1',
              member2: 2,
              member3: 2.0,
              member4: [0, 1, 2, 3]
            }
          ]
        })
        assert.ok(anotherTestClass1)
        anotherTestClass2 = new TestClass2({
          testEntry: [
            {
              member1: 'anotherTestClass2',
              member2: 2,
              member3: 2.0,
              member4: [0, 1, 2, 3]
            }
          ]
        })
        assert.ok(anotherTestClass2)
      })
      it('should be well separated from the first instance', async () => {
        const registry1_1 = anotherTestClass1.getRegistry()
        assert.equal(registry1_1.testEntry[0].member1, 'anotherTestClass1')
        const registry2_1 = testClass1.getRegistry()
        assert.deepEqual(registry2_1, {})

        const registry1_2 = anotherTestClass2.getRegistry()
        assert.equal(registry1_2.testEntry[0].member1, 'anotherTestClass2')
        const registry2_2 = testClass2.getRegistry()
        assert.deepEqual(registry2_2, {})
      })
    })
  })
})
