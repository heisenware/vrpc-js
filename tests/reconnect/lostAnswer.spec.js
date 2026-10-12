'use strict'

/* global describe, it, beforeEach, afterEach */
const { assert } = require('chai')
const { VrpcAdapter, VrpcAgent, VrpcClient } = require('../../index')
const RoutingBroker = require('../subscriptions/routingBroker')

// A promise is answered twice: `__p__<id>` at once, its result once it
// settles. A result that can no longer arrive - the agent went offline or
// connected anew, this client lost its connection - must reject the call,
// not leave it pending for ever (vrpc-js#75).

const DOMAIN = 'test.lost'
const TIMEOUT = 1500
const quiet = { debug () {}, info () {}, warn () {}, error () {} }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const until = async (predicate, ms = 3000) => {
  const end = Date.now() + ms
  while (!predicate()) {
    if (Date.now() > end) throw new Error('condition not met in time')
    await sleep(10)
  }
}

// promises the agent holds until a test settles them
let held = []

class Waiter {
  hold () {
    return new Promise(resolve => held.push(resolve))
  }

  later (ms) {
    return new Promise(resolve => setTimeout(() => resolve('done'), ms))
  }
}

VrpcAdapter.register(Waiter)

// how a call ended, and when: { settled, at, value, err }
const watch = promise => {
  const outcome = { settled: false }
  promise.then(
    value => Object.assign(outcome, { settled: true, at: Date.now(), value }),
    err => Object.assign(outcome, { settled: true, at: Date.now(), err })
  )
  return outcome
}

describe('a promise whose result can no longer arrive (#75)', function () {
  this.timeout(10000)
  let broker
  let agent
  let client
  let proxy

  // answers that went to this client: { i, r, e }
  const answers = () =>
    broker.published
      .filter(({ topic }) => topic === client._vrpcConnectionId)
      .map(({ payload }) => JSON.parse(payload))
  const promised = () => answers().filter(({ r }) => /^__p__/.test(r)).length

  // the client holds the call's `__p__` answer and waits for the result
  const waitingForResult = async (count = 1) => {
    await until(() => promised() === count)
    await sleep(50)
  }

  beforeEach(async () => {
    held = []
    broker = await new RoutingBroker().start()
    agent = new VrpcAgent({ domain: DOMAIN, agent: 'a1', broker: broker.url, log: quiet })
    await agent.serve()
    client = new VrpcClient({ domain: DOMAIN, broker: broker.url, timeout: TIMEOUT, log: quiet })
    client.on('error', () => {})
    await client.connect()
    proxy = await client.create({ agent: 'a1', className: 'Waiter', instance: 'w1' })
  })

  afterEach(async () => {
    // nothing listens for an answer any more
    assert.deepEqual(client._eventEmitter.eventNames(), [])
    await client.end()
    await agent.end()
    await broker.stop()
    await VrpcAdapter.delete('w1')
  })

  it('rejects at once when this client loses its connection', async () => {
    const call = watch(proxy.hold())
    await waitingForResult()
    const cutAt = Date.now()
    broker.cut(client._mqttClientId)
    await until(() => call.settled, TIMEOUT)
    assert.match(call.err.message, /^Function call "w1::hold\(\)" on agent "a1" lost its answer: this client lost its connection$/)
    assert.isBelow(call.at - cutAt, 500)
  })

  it('rejects a call still waiting for its first answer when this client loses its connection', async () => {
    // a request the agent ignores (it names no sender): no answer comes
    broker.rewrite = topic => {
      if (topic.endsWith('/hold')) return {}
    }
    const call = watch(proxy.hold())
    await until(() => broker.published.some(({ topic }) => topic.endsWith('/w1/hold')))
    const cutAt = Date.now()
    broker.cut(client._mqttClientId)
    await until(() => call.settled, TIMEOUT)
    assert.match(call.err.message, /lost its answer: this client lost its connection$/)
    assert.isBelow(call.at - cutAt, 500)
  })

  it('rejects when the agent goes offline', async () => {
    const call = watch(proxy.hold())
    await waitingForResult()
    broker.cut(agent._mqttClientId)
    await until(() => call.settled, TIMEOUT)
    assert.match(call.err.message, /^Function call "w1::hold\(\)" on agent "a1" lost its answer: the agent went offline$/)
  })

  it('rejects when the agent announces itself from a new connection', async () => {
    const call = watch(proxy.hold())
    await waitingForResult()
    // a takeover nobody saw the will of: an `online` without an `offline`
    broker.inject(
      `${DOMAIN}/a1/__agentInfo__`,
      JSON.stringify({ status: 'online', hostname: 'h', version: 'x', v: 4 }),
      { retain: true }
    )
    await until(() => call.settled, TIMEOUT)
    assert.match(call.err.message, /lost its answer: the agent connected anew$/)
  })

  it('ignores a result that arrives after the rejection', async () => {
    const call = watch(proxy.hold())
    await waitingForResult()
    broker.inject(
      `${DOMAIN}/a1/__agentInfo__`,
      JSON.stringify({ status: 'online', hostname: 'h', version: 'x', v: 4 })
    )
    await until(() => call.settled, TIMEOUT)
    held[0]('late')
    await sleep(200)
    assert.match(call.err.message, /the agent connected anew$/)
  })

  it('is not disturbed by a retained announcement a subscription brings', async () => {
    const call = watch(proxy.hold())
    await waitingForResult()
    // subscribing again delivers the retained agent info, flagged retained
    await client._mqttSubscribe(`${DOMAIN}/a1/__agentInfo__`)
    await sleep(200)
    assert.isFalse(call.settled)
    held[0]('result')
    await until(() => call.settled, TIMEOUT)
    assert.strictEqual(call.value, 'result')
  })

  it('waits for a long-running function as long as both sides stay connected', async () => {
    const call = watch(proxy.later(TIMEOUT * 2))
    await until(() => call.settled, TIMEOUT * 3)
    assert.strictEqual(call.value, 'done')
  })

  it('rejects calls still waiting when the client ends', async () => {
    const call = watch(proxy.hold())
    await waitingForResult()
    await client.end()
    await until(() => call.settled, TIMEOUT)
    assert.match(call.err.message, /lost its answer: the client ended$/)
    // afterEach ends it again
    client = new VrpcClient({ domain: DOMAIN, broker: broker.url, log: quiet })
  })

  describe('callAll over an agent pattern', () => {
    // a second agent, scripted: it answers `__p__` and never the result
    const scriptA2 = () => {
      broker.inject(
        `${DOMAIN}/a2/__agentInfo__`,
        JSON.stringify({ status: 'online', hostname: 'h', version: 'x', v: 4 }),
        { retain: true }
      )
      broker.inject(
        `${DOMAIN}/a2/Waiter/__classInfoConcise__`,
        JSON.stringify({
          className: 'Waiter',
          instances: ['w2'],
          memberFunctions: ['hold', 'later'],
          staticFunctions: ['__createShared__', '__callAll__'],
          v: 4
        }),
        { retain: true }
      )
    }

    it('turns the agent that went offline into err entries, the others answer', async () => {
      scriptA2()
      await until(() => client.getAvailableAgents().includes('a2'))
      const call = watch(client.callAll({ agent: 'a*', className: 'Waiter', functionName: 'hold' }))
      await until(() => held.length === 1 && broker.publishedOn(`${DOMAIN}/a2/Waiter/__static__/__callAll__`).length === 1)
      const [request] = broker.publishedOn(`${DOMAIN}/a2/Waiter/__static__/__callAll__`)
      const { i, s } = JSON.parse(request.payload)
      broker.inject(s, JSON.stringify({ i, r: '__p____callAll__-a2', v: 4 }))
      await waitingForResult(2)
      broker.inject(
        `${DOMAIN}/a2/__agentInfo__`,
        JSON.stringify({ status: 'offline', hostname: 'h', version: 'x', v: 4 }),
        { retain: true }
      )
      await sleep(100)
      assert.isFalse(call.settled, 'a1 has not answered yet')
      held[0]('a1 answer')
      await until(() => call.settled, TIMEOUT)
      const entries = call.value
      assert.deepEqual(entries.filter(x => x.agent === 'a1'), [{ agent: 'a1', id: 'w1', val: 'a1 answer' }])
      // an agent offline lists no instances: one entry for the agent
      const a2 = entries.filter(x => x.agent === 'a2')
      assert.strictEqual(a2.length, 1)
      assert.notProperty(a2[0], 'id')
      assert.match(a2[0].err.message, /^Function call "Waiter::hold\(\)" on agent "a2" lost its answer: the agent went offline$/)
    })
  })
})
