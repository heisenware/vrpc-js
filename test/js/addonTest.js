'use strict'

const sinon = require('sinon')
const { assert } = require('chai')
const addon = require('../../build/Release/vrpc_test')

/* global describe, it */

let callback

function handleCallback (json) {
  console.log('callback', json)
  if (callback !== undefined) callback(json)
}

describe('The native addon', () => {

  // The proxy instanceId we will test with
  let instanceId

  it('should allow to register a global callback handler', () => {
    assert.isFunction(addon.onCallback)
    addon.onCallback(handleCallback)
  })

  describe('should properly handle illegal arguments to callCpp', () => {
    it('no argument', () => {
      assert.throws(
        () => addon.callCpp(),
        Error,
        'Wrong number of arguments, expecting exactly one'
      )
    })

    it('wrong type', () => {
      assert.throws(
        () => addon.callCpp(15),
        Error,
        'Wrong argument type, expecting string'
      )
    })

    it('correct string type, but empty', () => {
      assert.throws(
        () => addon.callCpp(''),
        Error,
        'Failed converting argument to valid and non-empty string'
      )
    })

    it('correct string type, but not JSON parsable', () => {
      assert.throws(
        () => addon.callCpp('bad;'),
        Error,
        '[json.exception.parse_error.101] parse error at 1: syntax error - invalid literal; last read: \'b\''
      )
    })
  })

  it('should be able to instantiate a TestClass using plain json', () => {
    const json = {
      targetId: 'TestClass',
      function: '__create__',
      data: {} // No data => default ctor
    }
    const ret = JSON.parse(addon.callCpp(JSON.stringify(json)))
    assert.property(ret, 'data')
    assert.isString(ret.data.r)
    assert.property(ret, 'targetId')
    assert.property(ret, 'function')
    instanceId = ret.data.r
  })

  it('should be able to call member function given valid instanceId', () => {
    const json = {
      targetId: instanceId,
      function: 'hasCategory',
      data: { a1: 'test' }
    }
    const ret = JSON.parse(addon.callCpp(JSON.stringify(json)))
    assert.property(ret, 'data')
    assert.isBoolean(ret.data.r)
    assert.isFalse(ret.data.r)
    assert.property(ret, 'targetId')
    assert.property(ret, 'function')
  })

  it('should correctly handle call to non-existing function', () => {
    const json = {
      targetId: instanceId,
      function: 'not_there',
      data: {}
    }
    assert.throws(
      () => addon.callCpp(JSON.stringify(json)),
      Error,
      'Could not find function: not_there'
    )
  })

  it('should correctly handle call to non-existing targetId', () => {
    const json = {
      targetId: 'wrong',
      function: 'not_there',
      data: {}
    }
    assert.throws(
      () => addon.callCpp(JSON.stringify(json)),
      Error,
      'Could not find targetId: wrong'
    )
  })

  it('should properly trigger callbacks', () => {
    const json = {
      targetId: instanceId,
      function: 'callMeBack',
      data: { a1: 'callback-1' }
    }
    callback = sinon.spy()
    addon.callCpp(JSON.stringify(json))
    assert(callback.calledOnce)
  })
})
