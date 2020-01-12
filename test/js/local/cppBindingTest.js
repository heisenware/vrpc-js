'use strict'

const sinon = require('sinon')
const { assert } = require('chai')
const addon = require('../../../build/Release/vrpc_test')

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
        context: 'TestClass',
        method: '__create__',
        data: {} // No data => default ctor
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'data')
      assert.isString(ret.data.r)
      assert.property(ret, 'context')
      assert.property(ret, 'method')
      instanceId = ret.data.r
    })

    it('should be able to call member function given valid instanceId', () => {
      const json = {
        context: instanceId,
        method: 'hasCategory',
        data: { _1: 'test' }
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'data')
      assert.isBoolean(ret.data.r)
      assert.isFalse(ret.data.r)
      assert.property(ret, 'context')
      assert.property(ret, 'method')
    })

    it('should correctly handle call to non-existing function', () => {
      const json = {
        context: instanceId,
        method: 'not_there',
        data: {}
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.data.e, 'Could not find function: not_there')
    })

    it('should correctly handle call to non-existing context', () => {
      const json = {
        context: 'wrong',
        method: 'not_there',
        data: {}
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.data.e, 'Could not find context: wrong')
    })

    it('should properly trigger callbacks', () => {
      const json = {
        context: instanceId,
        method: 'callMeBack',
        data: { _1: 'callback-1' }
      }
      callback = sinon.spy()
      addon.call(JSON.stringify(json))
      assert(callback.calledOnce)
    })
  })

  describe('should properly handle named instances', () => {
    it('should be able to instantiate a TestClass using plain json', () => {
      const json = {
        context: 'TestClass',
        method: '__createNamed__',
        data: { _1: 'test1' } // No data => default ctor
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'data')
      assert.isString(ret.data.r)
      assert.property(ret, 'context')
      assert.property(ret, 'method')
      assert.strictEqual(ret.data.r, 'test1')
    })

    it('should be able to call member function given named instanceId', () => {
      const json = {
        context: 'test1',
        method: 'hasCategory',
        data: { _1: 'test' }
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.property(ret, 'data')
      assert.isBoolean(ret.data.r)
      assert.isFalse(ret.data.r)
      assert.property(ret, 'context')
      assert.property(ret, 'method')
    })

    it('should correctly handle call to non-existing function', () => {
      const json = {
        context: 'test1',
        method: 'not_there',
        data: {}
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.data.e, 'Could not find function: not_there')
    })

    it('should properly trigger callbacks', () => {
      const json = {
        context: 'test1',
        method: 'callMeBack',
        data: { _1: 'callback-1' }
      }
      callback = sinon.spy()
      addon.call(JSON.stringify(json))
      assert(callback.calledOnce)
    })

    it('should properly delete the instance', () => {
      const json = {
        context: 'TestClass',
        method: '__delete__',
        data: { _1: 'test1' }
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.isTrue(ret.data.r)
    })

    it('should not be possible to call functions on a deleted instance', () => {
      const json = {
        context: 'test1',
        method: 'hasCategory',
        data: { _1: 'test' }
      }
      const ret = JSON.parse(addon.call(JSON.stringify(json)))
      assert.equal(ret.data.e, 'Could not find context: test1')
    })
  })
})
