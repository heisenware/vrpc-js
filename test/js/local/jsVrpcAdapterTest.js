'use strict'

const EventEmitter = require('events')
const { assert } = require('chai')
const TestClass = require('../../fixtures/TestClass')
const { VrpcAdapter } = require('../../../index')

/* global describe, it */

const eventEmitter = new EventEmitter()

function handleCallback (json) {
  const { id, data } = JSON.parse(json)
  eventEmitter.emit(id, data)
}

describe('The nodejs VrpcAdapter', () => {
  it('should properly register the TestClass', () => {
    VrpcAdapter.register(TestClass)
  })

  // The proxy instanceId we will test with
  let instanceId

  it('should allow to register a global callback handler', () => {
    assert.isFunction(VrpcAdapter.onCallback)
    VrpcAdapter.onCallback(handleCallback)
  })

  describe.skip('should properly handle illegal arguments to call', () => {
    it('no argument', () => {
      assert.throws(
        () => VrpcAdapter.call(),
        Error,
        'Wrong number of arguments, expecting exactly one'
      )
    })

    it('wrong type', () => {
      assert.throws(
        () => VrpcAdapter.call(15),
        Error,
        'Wrong argument type, expecting string'
      )
    })

    it('correct string type, but empty', () => {
      assert.throws(
        () => VrpcAdapter.call(''),
        Error,
        'Failed converting argument to valid and non-empty string'
      )
    })

    it('correct string type, but not JSON parsable', () => {
      assert.throws(
        () => VrpcAdapter.call('bad;'),
        Error,
        '[json.exception.parse_error.101] parse error at line 1, column 1: syntax error while parsing value - invalid literal; last read: \'b\''
      )
    })
  })

  it('should be able to instantiate a TestClass using plain json', () => {
    const json = {
      context: 'TestClass',
      method: '__create__',
      data: {} // No data => default ctor
    }
    const ret = JSON.parse(VrpcAdapter.call(JSON.stringify(json)))
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
    const ret = JSON.parse(VrpcAdapter.call(JSON.stringify(json)))
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
    assert.throws(
      () => VrpcAdapter.call(JSON.stringify(json)),
      Error,
      'Could not find function: not_there'
    )
  })

  it('should correctly handle call to non-existing context', () => {
    const json = {
      context: 'wrong',
      method: 'not_there',
      data: {}
    }
    assert.throws(
      () => VrpcAdapter.call(JSON.stringify(json)),
      Error,
      'Could not find context: wrong'
    )
  })

  it('should properly work with functions returning a promise', (done) => {
    const json = {
      context: instanceId,
      method: 'waitForMe',
      data: { _1: 101 }
    }
    const { data } = JSON.parse(VrpcAdapter.call(JSON.stringify(json)))
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
      context: instanceId,
      method: 'callMeBackLater',
      data: { _1: callbackId }
    }
    let count = 0
    const { data } = JSON.parse(VrpcAdapter.call(JSON.stringify(json)))
    const promiseId = data.r
    if (data.r.substr(0, 5) === '__p__') {
      eventEmitter.once(promiseId, data => {
        count++
        assert.equal(count, 2)
        done()
      })
    }
    eventEmitter.once(callbackId, data => {
      assert.equal(data._1, 100)
      count++
      assert.equal(count, 1)
    })
  })
})

describe('The nodejs VrpcAdapter', () => {
  it('should properly register a class when provided a path', () => {
    VrpcAdapter.register('../../fixtures/TestClass')
    assert(VrpcAdapter._functionRegistry.has('TestClass'))
  })
  it('should have parsed meta information', () => {
    const meta = VrpcAdapter._getMetaData('TestClass')
    assert.deepEqual(Object.keys(meta), ['__createNamed__', 'notifyOnNew', 'waitForMe'])
    assert.deepEqual(
      meta.waitForMe,
      {
        description: 'Waits the configured amount of time and then returns.',
        params: [
          {
            description: 'Time to wait',
            name: 'ms',
            optional: false,
            type: 'number'
          }
        ],
        ret: {
          description: 'The time this function waited for',
          type: 'number'
        }
      }
    )
  })
})
