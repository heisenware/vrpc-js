'use strict'

const EventEmitter = require('events')
const { assert } = require('chai')
const TestClass = require('../fixtures/TestClass')
const VrpcFactory = require('../../vrpc/VrpcFactory')

/* global describe, it */

const eventEmitter = new EventEmitter()

function handleCallback (json) {
  const { id, data } = JSON.parse(json)
  eventEmitter.emit(id, data)
}

describe('The nodejs VrpcFactory', () => {
  it('should properly register the TestClass', () => {
    VrpcFactory.register(TestClass)
  })

  // The proxy instanceId we will test with
  let instanceId

  it('should allow to register a global callback handler', () => {
    assert.isFunction(VrpcFactory.onCallback)
    VrpcFactory.onCallback(handleCallback)
  })

  describe.skip('should properly handle illegal arguments to callRemote', () => {
    it('no argument', () => {
      assert.throws(
        () => VrpcFactory.callRemote(),
        Error,
        'Wrong number of arguments, expecting exactly one'
      )
    })

    it('wrong type', () => {
      assert.throws(
        () => VrpcFactory.callRemote(15),
        Error,
        'Wrong argument type, expecting string'
      )
    })

    it('correct string type, but empty', () => {
      assert.throws(
        () => VrpcFactory.callRemote(''),
        Error,
        'Failed converting argument to valid and non-empty string'
      )
    })

    it('correct string type, but not JSON parsable', () => {
      assert.throws(
        () => VrpcFactory.callRemote('bad;'),
        Error,
        '[json.exception.parse_error.101] parse error at 1: syntax error - invalid literal; last read: \'b\''
      )
    })
  })

  it('should be able to instantiate a TestClass using plain json', () => {
    const json = {
      targetId: 'TestClass',
      method: '__create__',
      data: {} // No data => default ctor
    }
    const ret = JSON.parse(VrpcFactory.callRemote(JSON.stringify(json)))
    assert.property(ret, 'data')
    assert.isString(ret.data.r)
    assert.property(ret, 'targetId')
    assert.property(ret, 'method')
    instanceId = ret.data.r
  })

  it('should be able to call member function given valid instanceId', () => {
    const json = {
      targetId: instanceId,
      method: 'hasCategory',
      data: { a1: 'test' }
    }
    const ret = JSON.parse(VrpcFactory.callRemote(JSON.stringify(json)))
    assert.property(ret, 'data')
    assert.isBoolean(ret.data.r)
    assert.isFalse(ret.data.r)
    assert.property(ret, 'targetId')
    assert.property(ret, 'method')
  })

  it('should correctly handle call to non-existing function', () => {
    const json = {
      targetId: instanceId,
      method: 'not_there',
      data: {}
    }
    assert.throws(
      () => VrpcFactory.callRemote(JSON.stringify(json)),
      Error,
      'Could not find function: not_there'
    )
  })

  it('should correctly handle call to non-existing targetId', () => {
    const json = {
      targetId: 'wrong',
      method: 'not_there',
      data: {}
    }
    assert.throws(
      () => VrpcFactory.callRemote(JSON.stringify(json)),
      Error,
      'Could not find targetId: wrong'
    )
  })

  it('should properly work with functions returning a promise', (done) => {
    const json = {
      targetId: instanceId,
      method: 'waitForMe',
      data: { a1: 101 }
    }
    const { data } = JSON.parse(VrpcFactory.callRemote(JSON.stringify(json)))
    if (data.r.substr(0, 5) === '__p__') {
      eventEmitter.once(data.r, promiseData => {
        assert.equal(promiseData.r, 101)
        done()
      })
    }
  })

  it('should properly trigger callbacks', (done) => {
    const callbackId = '__f__callback-1'
    const json = {
      targetId: instanceId,
      method: 'callMeBackLater',
      data: { a1: callbackId }
    }
    let count = 0
    const { data } = JSON.parse(VrpcFactory.callRemote(JSON.stringify(json)))
    const promiseId = data.r
    if (data.r.substr(0, 5) === '__p__') {
      eventEmitter.once(promiseId, data => {
        count++
        assert.equal(count, 2)
        done()
      })
    }
    eventEmitter.once(callbackId, data => {
      assert.equal(data.a1, 100)
      count++
      assert.equal(count, 1)
    })
  })
})
