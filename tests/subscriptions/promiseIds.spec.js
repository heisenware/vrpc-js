'use strict'

const path = require('path')
const { fork } = require('child_process')
const { expect } = require('chai')
const RoutingBroker = require('./routingBroker')
const { VrpcClient } = require('../../index')

/* global describe, it, before, after */

// Two agents answer one client, each with a promise of the same function.
// A client waits for a promise's result under its bare id, whichever agent
// sends it: two agents that counted to the same number gave the same id,
// and the first result settled both calls (#76).

const DOMAIN = 'test.promises'
const quiet = { debug () {}, info () {}, warn () {}, error () {} }

describe('promise ids of two agents (#76)', function () {
  this.timeout(10000)
  let broker
  let client
  const agents = []

  // a fresh process: its promise counter starts at 0, like every other's
  const startAgent = (name, delay) =>
    new Promise((resolve, reject) => {
      const child = fork(path.join(__dirname, 'fixtures/whoAmIAgent.js'), [
        broker.url,
        DOMAIN,
        name,
        String(delay)
      ])
      agents.push(child)
      child.once('message', resolve)
      child.once('error', reject)
    })

  before(async () => {
    broker = await new RoutingBroker().start()
    await Promise.all([startAgent('edge-1', 100), startAgent('edge-2', 300)])
    client = new VrpcClient({ domain: DOMAIN, broker: broker.url, timeout: 3000, log: quiet })
    await client.connect()
  })

  after(async () => {
    await client.end()
    for (const child of agents) child.kill()
    await broker.stop()
  })

  it('differ, and each call gets its own agent\'s result', async () => {
    const ask = agent =>
      client.callStatic({ agent, className: 'Box', functionName: 'whoAmI' })
    const answers = await Promise.all([ask('edge-1'), ask('edge-2')])
    expect(answers).to.deep.equal(['edge-1', 'edge-2'])
    const ids = broker
      .publishedOn(`${DOMAIN}/+/+`)
      .filter(({ topic }) => topic === client._vrpcConnectionId)
      .map(({ payload }) => JSON.parse(payload).r)
      .filter(r => typeof r === 'string' && r.startsWith('__p__'))
    expect(ids).to.have.lengthOf(2)
    expect(ids[0]).to.not.equal(ids[1])
  })
})
