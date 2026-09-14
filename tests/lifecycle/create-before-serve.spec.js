const { expect } = require('chai')
const { VrpcAgent, VrpcAdapter, VrpcClient } = require('../../index')

class Early {
  constructor (name) {
    this._name = name
  }

  name () {
    return this._name
  }
}

const waitFor = async (condition, timeout = 5000) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

describe('Creation before serve', () => {
  const domain = 'test.vrpc'
  const agentName = `agent-${Date.now()}`
  // VRPC_TEST_BROKER=mqtt://localhost:1883 runs the suite against a local broker
  const broker = process.env.VRPC_TEST_BROKER || 'mqtts://broker.hivemq.com'
  const silent = { debug () {}, info () {}, warn () {}, error () {} }
  let agent
  let client

  before(() => {
    VrpcAdapter.register(Early)
  })

  after(async () => {
    if (client) await client.end()
    if (agent) await agent.end()
  })

  it('collects instances created on an agent that is not served yet', () => {
    agent = new VrpcAgent({ domain, agent: agentName, broker, log: silent })
    for (const id of ['early-1', 'early-2']) {
      const obj = agent.create({ className: 'Early', instance: id, args: [id] })
      expect(obj.name()).to.equal(id)
    }
    expect(VrpcAdapter.getAvailableInstances('Early')).to.deep.equal([
      'early-1',
      'early-2'
    ])
  })

  it('announces and serves them once online', async () => {
    await agent.serve()
    client = new VrpcClient({ domain, broker, log: silent })
    await client.connect()
    await waitFor(() =>
      client.getAvailableAgents().includes(agentName)
    )
    // the class info that came with the agent lists both already
    await waitFor(
      () =>
        client.getAvailableInstances({ className: 'Early', agent: agentName })
          .length === 2
    )
    const proxy = await client.getInstance('early-2', { agent: agentName })
    expect(await proxy.name()).to.equal('early-2')
  })

  it('announces an instance created after serve right away, as before', async () => {
    agent.create({ className: 'Early', instance: 'early-3', args: ['early-3'] })
    await waitFor(() =>
      client
        .getAvailableInstances({ className: 'Early', agent: agentName })
        .includes('early-3')
    )
    const proxy = await client.getInstance('early-3', { agent: agentName })
    expect(await proxy.name()).to.equal('early-3')
  })
})
