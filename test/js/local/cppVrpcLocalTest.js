'use strict'

/* global describe, it */

const { assert } = require('chai')
const EventEmitter = require('events')
const { VrpcLocal } = require('../../../index')
const addon = require('../../../build/Release/vrpc_test')



describe('Embedding C++ to Node.js', () => {
  context('An instance of the VrpcLocal class', () => {
    let vrpc
    const emitter = new EventEmitter()
    const newEntries = []
    const removedEntries = []
    emitter.on('new', x => newEntries.push(x))
    emitter.on('removed', x => removedEntries.push(x))

    it('should be construct-able given a c++ native addon', () => {
      vrpc = new VrpcLocal(addon)
      assert.ok(vrpc)
    })
    it('should show all available meta data', () => {
      const actual = vrpc.getMetaData('TestClass')
      console.log(JSON.stringify(actual, null, 2))
      const expected = {
        'crazy-string': {
          'description': 'Generates a composed message',
          'params': [
            {
              'default': null,
              'description': 'Provides customized part of the message',
              'name': 'who',
              'optional': false
            }
          ],
          'ret': {
            'description': 'returned message'
          }
        },
        'usingDefaults-stringboolean': {
          'description': 'test to check proper injection of defaults',
          'params': [
            {
              'default': null,
              'description': 'some placeholder string',
              'name': 'dummy',
              'optional': false
            },
            {
              'default': true,
              'description': 'toggles the return value',
              'name': 'didWork',
              'optional': true
            }
          ],
          'ret': {
            'description': 'by default returns true'
          }
        }
      }
      // assert.deepStrictEqual(actual, expected)
    })
    context('The corresponding VrpcLocal instance', () => {
      let testClass
      let anotherTestClass
      it('should be able to create a TestClass proxy using default constructor', () => {
        testClass = vrpc.create('TestClass')
        assert.ok(testClass)
      })
      context('The corresponding TestClass proxy', () => {
        it('should have all bound functions as own methods', () => {
          assert.isFunction(testClass.getRegistry)
          assert.isFunction(testClass.hasEntry)
          assert.isFunction(testClass.notifyOnNew)
          assert.isFunction(testClass.notifyOnRemoved)
          assert.isFunction(testClass.addEntry)
          assert.isFunction(testClass.removeEntry)
          assert.isFunction(testClass.callMeBack)
          assert.isFunction(testClass.usingDefaults)
          assert.isNotFunction(testClass.crazy)
        })
        it('should return an empty object after calling getRegistry()', () => {
          assert.isEmpty(testClass.getRegistry())
        })
        it('should return false after calling getEntry(\'test\')', () => {
          assert.isFalse(testClass.hasEntry('test'))
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
          assert.isTrue(testClass.hasEntry('test'))
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
          assert.isFalse(testClass.hasEntry('test'))
          assert.lengthOf(removedEntries, 1)
        })
        it('should trigger an exception on further attempts to remove an entry', () => {
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
  context('Two instances of the VrpcLocal class', () => {
    let vrpc1
    let vrpc2
    const emitter = new EventEmitter()
    const newEntries = []
    const removedEntries = []
    emitter.on('new', x => newEntries.push(x))
    emitter.on('removed', x => removedEntries.push(x))

    it('should be construct-able given the same c++ native addon', () => {
      vrpc1 = new VrpcLocal(addon)
      vrpc2 = new VrpcLocal(addon)
      assert.ok(vrpc1)
      assert.ok(vrpc2)

    })
    context('The corresponding VrpcLocal instance', () => {
      let testClass1
      let testClass2
      let anotherTestClass1
      let anotherTestClass2
      it('should be able to create a TestClass proxy using default constructor', () => {
        testClass1 = vrpc1.create('TestClass')
        testClass2 = vrpc2.create('TestClass')
        assert.ok(testClass1)
        assert.ok(testClass2)
      })
      context('The corresponding TestClass proxies', () => {
        it('should return an empty object after calling getRegistry()', () => {
          assert.isEmpty(testClass1.getRegistry())
          assert.isEmpty(testClass2.getRegistry())
        })
        it('should return false after calling getEntry(\'test\')', () => {
          assert.isFalse(testClass1.hasEntry('test'))
          assert.isFalse(testClass2.hasEntry('test'))
        })
        it('should allow to register an EventEmitter as callback argument', () => {
          testClass1.notifyOnNew({ emitter, event: 'new' })
          testClass1.notifyOnRemoved({ emitter, event: 'removed' })
          testClass2.notifyOnNew({ emitter, event: 'new' })
          testClass2.notifyOnRemoved({ emitter, event: 'removed' })
        })
        it('should add a new entry by calling addEntry(\'test\')', () => {
          const originalEntry = {
            member1: 'first entry',
            member2: 42,
            member3: 3.14,
            member4: [0, 1, 2, 3]
          }
          testClass1.addEntry('test', originalEntry)
          assert.isTrue(testClass1.hasEntry('test'))
          assert.lengthOf(newEntries, 1)
          assert.lengthOf(removedEntries, 0)
          assert.equal(newEntries[0].member1, originalEntry.member1)
          assert.equal(newEntries[0].member2, originalEntry.member2)
          assert.closeTo(newEntries[0].member3, originalEntry.member3, 0.00001)
          assert.deepEqual(newEntries[0].member4, originalEntry.member4)
          assert.equal(testClass1.getRegistry().test[0].member1, originalEntry.member1)
          // there should not be any cross-talk by cleanly separated instances
          assert.isFalse(testClass2.hasEntry('test'))
          testClass2.addEntry('test', originalEntry)
          assert.isTrue(testClass2.hasEntry('test'))
          assert.lengthOf(newEntries, 2)
          assert.lengthOf(removedEntries, 0)
          assert.equal(newEntries[1].member1, originalEntry.member1)
          assert.equal(newEntries[1].member2, originalEntry.member2)
          assert.closeTo(newEntries[1].member3, originalEntry.member3, 0.00001)
          assert.deepEqual(newEntries[1].member4, originalEntry.member4)
          assert.equal(testClass2.getRegistry().test[0].member1, originalEntry.member1)
        })
        it('should remove the entry by calling removeEntry(\'test\')', () => {
          const entry1 = testClass1.removeEntry('test')
          assert.equal(entry1.member1, 'first entry')
          assert.isFalse(testClass1.hasEntry('test'))
          assert.lengthOf(removedEntries, 1)
          const entry2 = testClass2.removeEntry('test')
          assert.equal(entry2.member1, 'first entry')
          assert.isFalse(testClass2.hasEntry('test'))
          assert.lengthOf(removedEntries, 2)
        })
        it('should trigger an exception on further attempts to remove an entry', () => {
          try {
            testClass1.removeEntry('test')
            assert.isTrue(false)
          } catch (err) {
            assert.equal(err.message, 'Can not remove non-existing entry')
          }
          try {
            testClass2.removeEntry('test')
            assert.isTrue(false)
          } catch (err) {
            assert.equal(err.message, 'Can not remove non-existing entry')
          }
        })
        it('should properly receive callbacks (instance1)', (done) => {
          testClass1.callMeBack(sleepTime => {
            assert.equal(sleepTime, 100)
            done()
          })
        }),
        it('should properly receive callbacks (instance2)', (done) => {
          testClass2.callMeBack(sleepTime => {
            assert.equal(sleepTime, 100)
            done()
          })
        })
        it('should be able to call a static function', () => {
          assert.equal(vrpc1.callStatic('TestClass', 'crazy'), 'who is crazy?')
          assert.equal(vrpc2.callStatic('TestClass', 'crazy'), 'who is crazy?')
        })
        it('and overloads thereof', () => {
          assert.equal(vrpc1.callStatic('TestClass', 'crazy', 'vrpc'), 'vrpc is crazy!')
          assert.equal(vrpc2.callStatic('TestClass', 'crazy', 'vrpc'), 'vrpc is crazy!')
        })
        it('should create a second instance', async () => {
          anotherTestClass1 = vrpc1.create(
            'TestClass',
            {
              testEntry: [{
                member1: 'anotherTestClass1',
                member2: 2,
                member3: 2.0,
                member4: [0, 1, 2, 3]
              }]
            }
          )
          assert.ok(anotherTestClass1)
          anotherTestClass2 = vrpc2.create(
            'TestClass',
            {
              testEntry: [{
                member1: 'anotherTestClass2',
                member2: 2,
                member3: 2.0,
                member4: [0, 1, 2, 3]
              }]
            }
          )
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
})
