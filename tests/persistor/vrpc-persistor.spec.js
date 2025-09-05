const { expect } = require('chai')
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const {
  VrpcAgent,
  VrpcAdapter,
  VrpcPersistor,
  VrpcClient
} = require('../../index')

// A dummy class for testing
class Dummy {
  constructor (arg = 42) {
    this._value = arg
  }

  getValue () {
    return this._value
  }
}

describe('VrpcPersistor', () => {
  let agent
  let testDir
  const domain = 'test.vrpc'
  const agentName = `agent-${Date.now()}` // Use unique agent to avoid test collisions
  const broker = 'mqtt://vrpc.io'
  const sleep = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms))

  before(() => {
    VrpcAdapter.register(Dummy)
  })

  beforeEach(async () => {
    // Create a unique, temporary directory for each test
    testDir = path.join(os.tmpdir(), `vrpc-persistor-test-${Date.now()}`)
    await fs.ensureDir(testDir)
    agent = new VrpcAgent({
      domain,
      agent: agentName,
      broker
    })
    await agent.serve()
  })

  afterEach(async () => {
    // Clean up agent, listeners, and filesystem
    if (agent) await agent.end()
    VrpcAdapter.removeAllListeners('create')
    VrpcAdapter.removeAllListeners('delete')
    await fs.remove(testDir)
  })

  it('should persist a newly created instance with its arguments', async () => {
    new VrpcPersistor({ agentInstance: agent, dir: testDir })
    agent.create({ className: 'Dummy', instance: 'dummy-1', args: [123] })
    await sleep()

    const hash = crypto.createHash('md5').update('dummy-1').digest('hex')
    const expectedFile = path.join(testDir, 'Dummy', hash)

    expect(await fs.pathExists(expectedFile)).to.be.true
    const content = await fs.readJson(expectedFile)
    expect(content).to.deep.equal({
      key: 'dummy-1',
      value: { className: 'Dummy', args: [123] }
    })
  })

  it('should restore a persisted instance correctly', async () => {
    // Phase 1: Create an instance and persist it
    new VrpcPersistor({ agentInstance: agent, dir: testDir })
    agent.create({ className: 'Dummy', instance: 'dummy-2', args: [456] })
    await sleep()

    await agent.end() // Simulate a shutdown

    // Phase 2: Create a new agent and persistor, then restore
    const newAgent = new VrpcAgent({ domain, agent: agentName, broker })
    await newAgent.serve()
    const persistor2 = new VrpcPersistor({
      agentInstance: newAgent,
      dir: testDir
    })
    await persistor2.restore()

    // Phase 3: Verify the instance was restored on the new agent
    const instance = VrpcAdapter.getInstance('dummy-2')
    expect(instance).to.not.be.undefined
    expect(instance).to.be.an.instanceOf(Dummy)
    expect(instance.getValue()).to.equal(456)
    agent = newAgent // assign to agent so it gets cleaned up in afterEach
  })

  it('should delete a persisted instance upon calling delete', async () => {
    new VrpcPersistor({ agentInstance: agent, dir: testDir })
    agent.create({ className: 'Dummy', instance: 'dummy-3' })
    await sleep()

    const hash = crypto.createHash('md5').update('dummy-3').digest('hex')
    const expectedFile = path.join(testDir, 'Dummy', hash)
    expect(await fs.pathExists(expectedFile)).to.be.true

    const client = new VrpcClient({
      domain,
      agent: agentName,
      broker
    })
    await client.connect()
    await sleep()
    await client.delete('dummy-3')
    await sleep()
    await client.end()
    expect(await fs.pathExists(expectedFile)).to.be.false
  })
  it('should handle restoring a large number of instances', async function () {
    // Increase timeout for this more demanding test
    this.timeout(10000)
    const instanceCount = 100

    new VrpcPersistor({ agentInstance: agent, dir: testDir })

    // Phase 1: Create and persist 100 instances
    for (let i = 0; i < instanceCount; i++) {
      agent.create({
        className: 'Dummy',
        instance: `dummy-stress-${i}`,
        args: [i]
      })
    }
    // Give more time for the many async file writes to settle
    await sleep(500)
    await agent.end() // Simulate shutdown

    // Phase 2: Create a new agent and restore all instances
    const newAgent = new VrpcAgent({ domain, agent: agentName, broker })
    await newAgent.serve()
    const persistor2 = new VrpcPersistor({
      agentInstance: newAgent,
      dir: testDir
    })
    await persistor2.restore()

    // Phase 3: Verify all 100 instances were restored correctly
    for (let i = 0; i < instanceCount; i++) {
      const instance = VrpcAdapter.getInstance(`dummy-stress-${i}`)
      expect(instance, `Instance dummy-stress-${i} should exist`).to.not.be
        .undefined
      expect(instance).to.be.an.instanceOf(Dummy)
      expect(instance.getValue()).to.equal(i)
    }
    agent = newAgent // For cleanup in afterEach
  })
})
