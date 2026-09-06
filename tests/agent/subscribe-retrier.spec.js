'use strict'

/* global describe, it, beforeEach, afterEach */
const { assert } = require('chai')
const sinon = require('sinon')
const SubscribeRetrier = require('../../vrpc/SubscribeRetrier')

describe('SubscribeRetrier', () => {
  let clock
  beforeEach(() => {
    clock = sinon.useFakeTimers()
  })
  afterEach(() => {
    clock.restore()
  })

  it('retries refused topics with a growing delay until they are granted', () => {
    const subscribe = sinon.spy()
    const retrier = new SubscribeRetrier({ subscribe, initialDelayMs: 1000, maxDelayMs: 4000 })

    retrier.schedule(['a', 'b'], { qos: 1 })
    assert.deepEqual(retrier.pending, ['a', 'b'])
    assert(subscribe.notCalled)

    clock.tick(999)
    assert(subscribe.notCalled)
    clock.tick(1)
    assert(subscribe.calledOnce)
    assert.deepEqual(subscribe.firstCall.args, [['a', 'b'], { qos: 1 }])
    assert.deepEqual(retrier.pending, [])

    // still refused: the subscribe call reports it by scheduling again
    retrier.schedule(['a', 'b'], { qos: 1 })
    assert.strictEqual(retrier.nextDelayMs, 2000)
    clock.tick(2000)
    assert(subscribe.calledTwice)

    // one granted, one refused
    retrier.granted(['a'])
    retrier.schedule(['b'], { qos: 1 })
    assert.deepEqual(retrier.pending, ['b'])
    assert.strictEqual(retrier.nextDelayMs, 4000)
    clock.tick(4000)
    assert.strictEqual(subscribe.callCount, 3)
    assert.deepEqual(subscribe.thirdCall.args[0], ['b'])

    // everything granted: the backoff starts over
    retrier.granted(['b'])
    assert.deepEqual(retrier.pending, [])
    assert.strictEqual(retrier.nextDelayMs, 1000)
  })

  it('caps the delay and keeps one timer for topics with different options', () => {
    const subscribe = sinon.spy()
    const retrier = new SubscribeRetrier({ subscribe, initialDelayMs: 1000, maxDelayMs: 3000 })
    retrier.schedule(['a'], { qos: 1 })
    retrier.schedule(['b'], { qos: 0 })
    clock.tick(1000)
    assert(subscribe.calledTwice)
    assert.deepEqual(subscribe.firstCall.args, [['a'], { qos: 1 }])
    assert.deepEqual(subscribe.secondCall.args, [['b'], { qos: 0 }])
    for (let i = 0; i < 5; i++) {
      retrier.schedule(['a'], { qos: 1 })
      clock.tick(retrier.nextDelayMs)
    }
    assert.strictEqual(retrier.nextDelayMs, 3000)
  })

  it('cancel drops the pending retries: a reconnect subscribes afresh', () => {
    const subscribe = sinon.spy()
    const retrier = new SubscribeRetrier({ subscribe, initialDelayMs: 1000 })
    retrier.schedule(['a'], { qos: 1 })
    retrier.cancel()
    clock.tick(10000)
    assert(subscribe.notCalled)
    assert.deepEqual(retrier.pending, [])
    assert.strictEqual(retrier.nextDelayMs, 1000)
  })
})
