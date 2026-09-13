const { expect } = require('chai')
const { VrpcAgent, VrpcAdapter, VrpcClient } = require('../../index')

// A constructor that refuses some arguments
class Fragile {
  constructor (ok) {
    if (!ok) throw new Error('needs ok=true')
  }

  hello () {
    return 'hi'
  }
}

describe('Failing remote construction', () => {
  const domain = 'test.vrpc'
  const agentName = `agent-${Date.now()}`
  // VRPC_TEST_BROKER=mqtt://localhost:1883 runs the suite against a local broker
  const broker = process.env.VRPC_TEST_BROKER || 'mqtts://broker.hivemq.com'
  const warnings = []
  let agent
  let client

  before(async () => {
    VrpcAdapter.register(Fragile)
    agent = new VrpcAgent({
      domain,
      agent: agentName,
      broker,
      log: { debug () {}, info () {}, warn: msg => warnings.push(msg), error () {} }
    })
    await agent.serve()
    client = new VrpcClient({ domain, broker })
    await client.connect()
  })

  after(async () => {
    await client.end()
    await agent.end()
  })

  it('should reject create() with the constructor\'s message, shared and isolated', async () => {
    for (const isIsolated of [false, true]) {
      let thrown = null
      try {
        await client.create({
          agent: agentName,
          className: 'Fragile',
          instance: `fragile-${isIsolated}`,
          args: [false],
          isIsolated
        })
      } catch (err) {
        thrown = err
      }
      expect(thrown).to.be.an('error')
      expect(thrown.message).to.include('needs ok=true')
      expect(thrown.message).to.include(`[vrpc ${agentName}-Fragile-`)
    }
  })

  it('should leave nothing behind on the agent', async () => {
    expect(VrpcAdapter.getAvailableInstances('Fragile')).to.deep.equal([])
    const phantom = ids => [...ids].some(id => id === undefined || id === null)
    for (const [, ids] of agent._sharedInstances) expect(phantom(ids)).to.be.false
    for (const [, ids] of agent._isolatedInstances) expect(phantom(ids)).to.be.false
    const topics = Object.keys(agent._client._resubscribeTopics || {})
    expect(topics.some(t => t.includes('/Fragile/undefined/'))).to.be.false
    expect(warnings.filter(x => x.includes('Instantiation of Fragile failed: needs ok=true'))).to.have.length(2)
  })

  it('should still create fine afterwards', async () => {
    const proxy = await client.create({
      agent: agentName,
      className: 'Fragile',
      instance: 'fragile-ok',
      args: [true]
    })
    expect(await proxy.hello()).to.equal('hi')
    expect(VrpcAdapter.getAvailableInstances('Fragile')).to.deep.equal(['fragile-ok'])
  })
})
