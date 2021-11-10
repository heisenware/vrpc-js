'use strict'

const sinon = require('sinon')
const { assert } = require('chai')
const addon = require('../../build/Release/vrpc_test')

/* global describe, it */

let callback

function handleCallback (json) {
  if (callback !== undefined) callback(json)
}

describe('The native addon', () => {

  it('should allow to register a global callback handler', () => {
    assert.isFunction(addon.onCallback)
    addon.onCallback(handleCallback)
  })

  describe('should properly handle illegal arguments to call', () => {
    it('no argument', () => {
      assert.throws(
        () => addon.call(),
        Error,
        'Wrong number of arguments, expecting exactly one'
      )
    })

    it('wrong type', () => {
      assert.throws(
        () => addon.call(15),
        Error,
        'Wrong argument type, expecting string'
      )
    })

    it('correct string type, but empty', () => {
      assert.throws(
        () => addon.call(''),
        Error,
        'Failed converting argument to valid and non-empty string'
      )
    })

    it('correct string type, but not JSON parsable', () => {
      assert.throws(
        () => addon.call('bad;'),
        Error,
        '[json.exception.parse_error.101] parse error at line 1, column 1: syntax error while parsing value - invalid literal; last read: \'b\''
      )
    })
  })

  describe('should properly handle creation of anonymous instances', () => {
    // The proxy instanceId we will test with
    let instanceId

    it('should be able to instantiate a TestClass using plain json', () => {
      const json = {
        c: 'TestClass',
        f: '__createIsolated__',
        a: []
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'r')
      assert.isString(ret.r)
      assert.property(ret, 'c')
      assert.property(ret, 'f')
      instanceId = ret.r
    })

    it('should be able to call member function given valid instanceId', () => {
      const json = {
        c: instanceId,
        f: 'hasEntry',
        a: ['test']
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'r')
      assert.isBoolean(ret.r)
      assert.isFalse(ret.r)
      assert.property(ret, 'c')
      assert.property(ret, 'f')
    })

    it('should correctly handle call to non-existing function', () => {
      const json = {
        c: instanceId,
        f: 'not_there',
        a: []
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.e, 'Could not find function: not_there')
    })

    it('should correctly handle call to non-existing context', () => {
      const json = {
        c: 'wrong',
        f: 'not_there',
        a: []
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.e, 'Could not find context: wrong')
    })

    it('should properly trigger callbacks', () => {
      const json = {
        c: instanceId,
        f: 'callMeBack',
        a: ['callback-1']
      }
      callback = sinon.spy()
      addon.call(JSON.stringify(json))
      assert(callback.calledOnce)
    })
  })

  describe('should properly handle named instances', () => {
    it('should be able to instantiate a TestClass using plain json', () => {
      const json = {
        c: 'TestClass',
        f: '__createShared__',
        a: ['test1'] // No data => default ctor
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'r')
      assert.isString(ret.r)
      assert.property(ret, 'c')
      assert.property(ret, 'f')
      assert.strictEqual(ret.r, 'test1')
    })

    it('should be able to call member function given named instanceId', () => {
      const json = {
        c: 'test1',
        f: 'hasEntry',
        a: ['test']
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'r')
      assert.isBoolean(ret.r)
      assert.isFalse(ret.r)
      assert.property(ret, 'c')
      assert.property(ret, 'f')
    })

    it('should correctly handle call to non-existing function', () => {
      const json = {
        c: 'test1',
        f: 'not_there',
        a: []
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.e, 'Could not find function: not_there')
    })

    it('should properly trigger callbacks', () => {
      const json = {
        c: 'test1',
        f: 'callMeBack',
        a: ['callback-1']
      }
      callback = sinon.spy()
      addon.call(JSON.stringify(json))
      assert(callback.calledOnce)
    })

    it('should properly delete the instance', () => {
      const json = {
        c: 'TestClass',
        f: '__delete__',
        a: ['test1']
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.isTrue(ret.r)
    })

    it('should not be possible to call functions on a deleted instance', () => {
      const json = {
        c: 'test1',
        f: 'hasEntry',
        a: ['test']
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.e, 'Could not find context: test1')
    })
  })
})
