'use strict'

/* global describe, it, beforeEach, afterEach */
const { assert } = require('chai')
const { VrpcClient, VrpcAgent } = require('../../index')
const VrpcBrowserAgent = require('../../vrpc/VrpcBrowserAgent')
const FakeBroker = require('./fakeBroker')

const quiet = { debug () {}, info () {}, warn () {}, error () {} }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const until = async (predicate, ms, step = 50) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (predicate()) return true
    await sleep(step)
  }
  return predicate()
}

// A connection the broker refuses (a stale credential, an authorization
// service that is away) must neither knock once a second for ever nor
// give up for good; new credentials must reach it without a teardown
describe('reconnect pacing (vrpc-js#74, heisenware-cloud#1738)', function () {
  this.timeout(30000)
  let broker
  let client

  const newClient = (options = {}) => {
    client = new VrpcClient({
      broker: broker.url,
      domain: 'test.vrpc',
      username: 'someone',
      log: quiet,
      ...options
    })
    client.on('error', () => {})
    return client
  }

  afterEach(async () => {
    if (client) await client.end().catch(() => {})
    client = null
    await broker.stop()
  })

  describe('a refused client', () => {
    beforeEach(async () => {
      broker = await new FakeBroker({ accept: p => p.password?.toString() === 'fresh' }).start()
    })

    it('waits longer after every refusal', async () => {
      newClient({ password: 'stale', timeout: 20000 }).connect({ keepTrying: true }).catch(() => {})
      await sleep(8500)
      // fixed 1 s period: 9 attempts; doubling: at 0, 1, 3 and 7 s
      assert.isAtLeast(broker.connects.length, 3, `attempts: ${broker.connects.length}`)
      assert.isAtMost(broker.connects.length, 5, `attempts: ${broker.connects.length}`)
      const gaps = broker.gaps()
      for (let i = 1; i < gaps.length; i++) {
        assert.isAbove(gaps[i], gaps[i - 1] * 1.5, `gaps: ${gaps}`)
      }
    })

    it('tries new credentials at once instead of waiting out the back-off', async () => {
      newClient({ password: 'stale', timeout: 20000 }).connect({ keepTrying: true }).catch(() => {})
      await until(() => broker.connects.length >= 4, 9000)
      // the next attempt would follow 8 s after the 4th refusal
      let connectedAt = null
      client.on('connect', () => { connectedAt = Date.now() })
      const updatedAt = Date.now()
      client.updateCredentials({ password: 'fresh' })
      assert(await until(() => connectedAt, 2500), 'not connected within 2.5 s')
      assert.isBelow(connectedAt - updatedAt, 2000)
      assert.strictEqual(broker.connects.at(-1).password, 'fresh')
    })

    it('starts over at the base period once a connection stands', async () => {
      let refusals = 3
      broker.accept = () => refusals-- <= 0
      let connects = 0
      newClient({ timeout: 20000 })
      client.on('connect', () => connects++)
      client.connect({ keepTrying: true }).catch(() => {})
      assert(await until(() => connects === 1, 12000), 'never connected')
      const before = broker.connects.length
      const droppedAt = Date.now()
      broker.drop()
      assert(await until(() => connects === 2, 3000), 'no quick reconnect')
      assert.strictEqual(broker.connects.length, before + 1)
      assert.isBelow(broker.connects.at(-1).at - droppedAt, 2000)
    })
  })

  describe('connect({ keepTrying })', () => {
    beforeEach(async () => {
      broker = await new FakeBroker({ accept: () => false }).start()
    })

    it('rejects at the timeout and connects once the broker accepts', async () => {
      newClient({ timeout: 2000 })
      let connected = false
      client.on('connect', () => { connected = true })
      try {
        await client.connect({ keepTrying: true })
        assert.fail('connect() resolved')
      } catch (err) {
        assert.strictEqual(err.message, 'Connection trial timed out (> 2000 ms)')
      }
      broker.accept = () => true
      assert(await until(() => connected, 9000), 'gave up after the timeout')
    })

    it('without it, stops trying at the timeout', async () => {
      newClient({ timeout: 2000 })
      try {
        await client.connect()
        assert.fail('connect() resolved')
      } catch (err) {
        assert.strictEqual(err.message, 'Connection trial timed out (> 2000 ms)')
      }
      const attempts = broker.connects.length
      await sleep(3000)
      assert.strictEqual(broker.connects.length, attempts)
    })

    it('waits for a client that is still trying instead of starting a second one', async () => {
      newClient({ timeout: 1500 })
      await client.connect({ keepTrying: true }).catch(() => {})
      broker.accept = () => true
      await client.connect({ keepTrying: true }).catch(() => {})
      await until(() => broker.connects.some(c => c.ok), 9000)
      await sleep(500)
      assert.strictEqual(broker.connects.filter(c => c.ok).length, 1)
    })
  })

  describe('a client given up at the timeout', () => {
    beforeEach(async () => {
      broker = await new FakeBroker({ silent: true }).start()
    })

    it('is not revived by a publish that fails while it ends', async () => {
      newClient({ timeout: 1500 })
      await client.connect().catch(() => {})
      const sockets = broker.sockets
      // what any RPC does: the mqtt client answers 'client disconnecting'
      client._mqttPublish('test.vrpc/a/B/__static__/c', '{}')
      await sleep(2500)
      assert.strictEqual(broker.sockets, sockets, 'the ended client connected again')
    })
  })

  describe('credentials of a live connection', () => {
    beforeEach(async () => {
      broker = await new FakeBroker().start()
    })

    it('change without a reconnect, the next connection uses them', async () => {
      let connects = 0
      newClient({ password: 'old' })
      client.on('connect', () => connects++)
      await client.connect()
      client.updateCredentials({ password: 'new' })
      await sleep(1500)
      assert.strictEqual(broker.connects.length, 1)
      broker.drop()
      assert(await until(() => connects === 2, 3000), 'no reconnect')
      assert.strictEqual(broker.connects.at(-1).password, 'new')
    })

    it('carry a token as the password', async () => {
      newClient({ token: 't1' })
      await client.connect()
      client.updateCredentials({ token: 't2' })
      broker.drop()
      await until(() => broker.connects.length === 2, 3000)
      assert.strictEqual(broker.connects.at(-1).password, 't2')
    })
  })

  for (const [name, Agent] of [
    ['agent', VrpcAgent],
    ['browser agent', VrpcBrowserAgent]
  ]) {
    describe(`a refused ${name}`, () => {
      let agent
      beforeEach(async () => {
        broker = await new FakeBroker({ accept: () => false }).start()
        agent = new Agent({
          broker: broker.url,
          domain: 'test.vrpc',
          agent: 'agent1',
          username: 'does',
          password: 'not exist',
          log: quiet
        })
        agent.on('error', () => {})
      })
      afterEach(async () => {
        await agent.end()
      })

      it('waits longer after every refusal', async () => {
        agent.serve()
        await sleep(8500)
        assert.isAtLeast(broker.connects.length, 3, `attempts: ${broker.connects.length}`)
        assert.isAtMost(broker.connects.length, 5, `attempts: ${broker.connects.length}`)
      })

      it('stops trying when ended', async () => {
        const serving = agent.serve()
        await until(() => broker.connects.length >= 1, 3000)
        await agent.end()
        await serving
        const attempts = broker.connects.length
        await sleep(3000)
        assert.strictEqual(broker.connects.length, attempts)
      })
    })
  }
})
