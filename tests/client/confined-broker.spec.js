'use strict'

/* global describe, before, after, it */
const { VrpcClient } = require('../../index')
const assert = require('assert')
const mqtt = require('mqtt')
const sinon = require('sinon')

// The broker of this suite confines its clients as the protocol's broker
// policy says (docs/spec/protocol.md, section 14; fixtures/confined/acl):
// a client reads the agent and class infos and its own connection's topics,
// three and four levels deep - never a fifth level, where requests travel.
const BROKER = 'mqtt://confined-broker:1883'

describe('a client under the broker policy', () => {
  let client
  let subscribe

  before(async () => {
    // every subscription the client asks MQTT for
    subscribe = sinon.spy(mqtt.MqttClient.prototype, 'subscribe')
    client = new VrpcClient({
      broker: BROKER,
      domain: 'test.vrpc',
      username: 'client',
      password: 'client'
    })
    await client.connect()
    // the agent of this suite is 'confined'
    for (let i = 0; i < 50 && !client.getAvailableAgents().includes('confined'); i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  })

  after(async () => {
    subscribe.restore()
    await client.end()
  })

  it('subscribes nothing a request could match (CL-2)', () => {
    // a client's mqtt client id may be any agent's name: a filter below its
    // own connection that reaches five levels reaches that agent's requests
    const filters = subscribe.getCalls()
      .filter(call => call.thisValue === client._client)
      .flatMap(call => [].concat(call.args[0]))
    assert(filters.includes(client.getConnectionId()), filters)
    for (const filter of filters) {
      assert(!filter.includes('#'), `'${filter}' has a multi-level wildcard`)
      assert(filter.split('/').length <= 4, `'${filter}' reaches the request level`)
    }
  })

  it('learns the agent and its classes', () => {
    assert(client.getAvailableAgents().includes('confined'))
    assert(client.getAvailableClasses({ agent: 'confined' }).includes('Foo'))
  })

  it('receives the answer of a call', async () => {
    const value = await client.callStatic({
      agent: 'confined',
      className: 'Foo',
      functionName: 'staticIncrement',
      args: [41]
    })
    assert.strictEqual(value, 42)
  })

  it('receives the result of a promise', async () => {
    const value = await client.callStatic({
      agent: 'confined',
      className: 'Foo',
      functionName: 'staticResolvePromise',
      args: [10]
    })
    assert.strictEqual(value, 'Foo')
  })

  it('receives the events of its subscriptions on an isolated instance', async () => {
    const foo = await client.create({
      agent: 'confined',
      className: 'Foo',
      args: [5],
      isIsolated: true
    })
    const values = []
    await foo.on('value', value => values.push(value))
    assert.strictEqual(await foo.increment(), 6)
    for (let i = 0; i < 50 && values.length === 0; i++) {
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.deepStrictEqual(values, [6])
  })
})
