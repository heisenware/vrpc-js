const { expect } = require('chai')
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const Storage = require('@heisenware/storage')
const {
  VrpcAgent,
  VrpcAdapter,
  VrpcPersistor,
  VrpcClient
} = require('../../index')

// Layout-agnostic view on a persisted directory: storage 1.x constructs
// synchronously (md5-named files), >= 2.x through the async factory
// (readable <key>.json files). The persistor supports both.
const openStorage = async dir =>
  typeof Storage.open === 'function'
    ? Storage.open({ dir, watch: false })
    : new Storage({ dir })

// Writes settle asynchronously: poll the key map instead of sleeping
const waitForKey = async (storage, folder, key, present, timeout = 3000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (storage.keys(folder).includes(key) === present) return true
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return storage.keys(folder).includes(key) === present
}

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
  // VRPC_TEST_BROKER=mqtt://localhost:1883 runs the suite against a local broker
  const broker = process.env.VRPC_TEST_BROKER || 'mqtts://broker.hivemq.com'
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
    // storage >= 2 keeps a per-directory singleton: release it
    if (typeof Storage.dispose === 'function') await Storage.dispose(testDir)
    await fs.remove(testDir)
  })

  it('should persist a newly created instance with its arguments', async () => {
    new VrpcPersistor({ agentInstance: agent, dir: testDir })
    agent.create({ className: 'Dummy', instance: 'dummy-1', args: [123] })
    await sleep()

    const storage = await openStorage(testDir)
    expect(await waitForKey(storage, 'Dummy', 'dummy-1', true)).to.be.true
    expect(await storage.getItem('dummy-1')).to.deep.equal({
      className: 'Dummy',
      args: [123]
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

    const storage = await openStorage(testDir)
    expect(await waitForKey(storage, 'Dummy', 'dummy-3', true)).to.be.true

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
    expect(await waitForKey(storage, 'Dummy', 'dummy-3', false)).to.be.true
  })
  it('should handle restoring a large number of instances', async function () {
    // The budget is dominated by the broker round trip of the agent restart
    // below, not by the persistor: a public broker can take >10 s per connect
    this.timeout(60000)
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
    // Wait until every instance landed on disk (writes settle asynchronously)
    const storage = await openStorage(testDir)
    const allPersisted = () => storage.keys('Dummy').length === instanceCount
    for (let i = 0; i < 100 && !allPersisted(); i++) await sleep(50)
    expect(storage.keys('Dummy').length).to.equal(instanceCount)
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

  it('should not persist isolated instances', async () => {
    new VrpcPersistor({ agentInstance: agent, dir: testDir })
    const client = new VrpcClient({ domain, broker })
    await client.connect()
    await client.create({
      agent: agentName,
      className: 'Dummy',
      instance: 'dummy-isolated',
      args: [1],
      isIsolated: true
    })
    await client.create({
      agent: agentName,
      className: 'Dummy',
      instance: 'dummy-shared',
      args: [2]
    })
    const storage = await openStorage(testDir)
    expect(await waitForKey(storage, 'Dummy', 'dummy-shared', true)).to.be.true
    await sleep()
    expect(storage.keys('Dummy')).to.not.include('dummy-isolated')
    await client.end()
  })

  it('should quarantine a record it cannot restore and keep it on disk', async () => {
    const storage = await openStorage(testDir)
    await storage.setItem('ghost-1', { className: 'Nowhere', args: [7] }, { folder: 'Nowhere' })
    const persistor = new VrpcPersistor({
      agentInstance: agent,
      dir: testDir,
      retries: 2,
      retryDelay: 10
    })
    const summary = await persistor.restore()
    expect(summary.restored).to.deep.equal([])
    expect(summary.quarantined).to.have.length(1)
    expect(summary.quarantined[0]).to.include({ instance: 'ghost-1', className: 'Nowhere', attempts: 3 })
    expect(summary.quarantined[0].error).to.be.a('string')
    const record = await storage.getItem('ghost-1')
    expect(record.args).to.deep.equal([7])
    expect(record.restoreError.attempts).to.equal(3)
    expect(record.restoreError.message).to.equal(summary.quarantined[0].error)
    const status = await persistor.status()
    expect(status.instances).to.have.length(1)
    expect(status.instances[0].restoreError.attempts).to.equal(3)
  })

  it('should give a quarantined record one attempt per start and heal it once its class exists', async () => {
    const storage = await openStorage(testDir)
    await storage.setItem(
      'late-1',
      { className: 'Late', args: [5], restoreError: { message: 'x', at: 'y', since: 'z', attempts: 3 } },
      { folder: 'Late' }
    )
    const persistor = new VrpcPersistor({ agentInstance: agent, dir: testDir, retries: 2, retryDelay: 10 })
    const first = await persistor.restore()
    expect(first.quarantined.map(x => x.instance)).to.deep.equal(['late-1'])
    expect(first.quarantined[0].attempts).to.equal(4)
    expect(first.quarantined[0].since).to.equal('z')

    class Late {
      constructor (value) {
        this.value = value
      }
    }
    VrpcAdapter.register(Late)
    const second = await persistor.restore()
    expect(second.restored).to.deep.equal(['late-1'])
    expect(second.quarantined).to.deep.equal([])
    expect(VrpcAdapter.getInstance('late-1').value).to.equal(5)
    expect(await waitForKey(storage, 'Late', 'late-1', true)).to.be.true
    await sleep()
    expect((await storage.getItem('late-1')).restoreError).to.be.undefined
  })

  it('should retry and forget on request', async () => {
    const storage = await openStorage(testDir)
    await storage.setItem('ghost-2', { className: 'Nowhere', args: [] }, { folder: 'Nowhere' })
    const persistor = new VrpcPersistor({ agentInstance: agent, dir: testDir, retries: 0 })
    await persistor.restore()
    expect(await persistor.retry('ghost-2')).to.be.false
    expect((await storage.getItem('ghost-2')).restoreError.attempts).to.equal(2)
    let thrown = null
    try {
      await persistor.retry('nobody')
    } catch (err) {
      thrown = err
    }
    expect(thrown.message).to.equal('Unknown persisted instance: nobody')
    expect(await persistor.forget('ghost-2')).to.be.true
    expect(storage.keys()).to.not.include('ghost-2')
    expect((await persistor.status()).instances).to.deep.equal([])
  })
})
