const EventEmitter = require('events')
const { expect } = require('chai')
const sinon = require('sinon')
const { VrpcAgent, VrpcAdapter, VrpcClient } = require('../../index')

// A delete ends an instance on the wire too (#1705): a client that follows
// a name through delete and re-create hears the living object only, and an
// isolated instance that goes with its client is disposed.

// the SignalSimulator shape: a private emitter behind onTick
class LifeTicking {
  constructor (tag) {
    this._tag = tag
    this._emitter = new EventEmitter()
  }

  onTick (listener) {
    this._emitter.on('tick', listener)
    return 'subscribed'
  }

  removeListener (event, listener) {
    this._emitter.removeListener('tick', listener)
    return true
  }

  fire () {
    this._emitter.emit('tick', this._tag)
    return true
  }
}

class LifeDisposable {
  constructor () {
    this.disposed = 0
  }

  ping () {
    return 'pong'
  }

  async [Symbol.asyncDispose] () {
    this.disposed++
  }
}

// releases its resources a moment after it is asked to
class LifeSlowDisposable {
  constructor () {
    this.released = false
  }

  async [Symbol.asyncDispose] () {
    await new Promise(resolve => setTimeout(resolve, 300))
    this.released = true
  }
}

const waitFor = async (condition, timeout = 5000) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('Instance lifetime on the wire', function () {
  this.timeout(30000)
  const domain = 'test.vrpc'
  const agentName = `agent-lifetime-${Date.now()}`
  // VRPC_TEST_BROKER=mqtt://localhost:1883 runs the suite against a local broker
  const broker = process.env.VRPC_TEST_BROKER || 'mqtts://broker.hivemq.com'
  const silent = { debug () {}, info () {}, warn () {}, error () {} }
  let agent
  let client

  const listed = className =>
    client.getAvailableInstances({ className, agent: agentName })

  before(async () => {
    VrpcAdapter.register(LifeTicking)
    VrpcAdapter.register(LifeDisposable)
    VrpcAdapter.register(LifeSlowDisposable)
    agent = new VrpcAgent({ domain, agent: agentName, broker, log: silent })
    await agent.serve()
    client = new VrpcClient({ domain, broker, log: silent })
    await client.connect()
    await waitFor(() => client.getAvailableAgents().includes(agentName))
  })

  after(async () => {
    sinon.restore()
    if (client) await client.end()
    if (agent) await agent.end()
  })

  it('lets a client following a re-created name hear the living instance only (#1705)', async () => {
    // subscribed the way the engine does: one emitter + event for every
    // generation, so every generation gets the same event topic
    const id = `sim-${Date.now()}`
    const emitter = new EventEmitter()
    const heard = []
    emitter.on('tick', tag => heard.push(tag))
    const generations = []
    for (const tag of ['gen1', 'gen2', 'gen3']) {
      const proxy = await client.create({
        agent: agentName,
        className: 'LifeTicking',
        instance: id,
        args: [tag]
      })
      await waitFor(() => listed('LifeTicking').includes(id))
      generations.push(VrpcAdapter.getInstance(id))
      await proxy.onTick({ emitter, event: 'tick' })
      if (tag === 'gen3') break
      await client.delete(id, { agent: agentName, className: 'LifeTicking' })
      await waitFor(() => !listed('LifeTicking').includes(id))
    }
    generations.forEach(generation => generation.fire())
    await waitFor(() => heard.includes('gen3'))
    await sleep(500) // room for anything a deleted generation still sends
    expect(heard).to.deep.equal(['gen3'])
  })

  it('answers a remote delete once the instance disposed (#1705)', async () => {
    const id = `slow-${Date.now()}`
    await client.create({ agent: agentName, className: 'LifeSlowDisposable', instance: id })
    const obj = VrpcAdapter.getInstance(id)
    const answer = await client.delete(id, {
      agent: agentName,
      className: 'LifeSlowDisposable'
    })
    expect(answer).to.equal(true)
    expect(obj.released).to.equal(true)
  })

  it('forgets an instance at once when its own delete answers before the class info (#1705)', async () => {
    // the answer and the class info travel on different topics, and a
    // broker need not keep their order: hold the class info back
    const id = `overtaken-${Date.now()}`
    await client.create({ agent: agentName, className: 'LifeTicking', instance: id, args: ['x'] })
    await waitFor(() => listed('LifeTicking').includes(id))
    const mqtt = client._client
    const deliver = mqtt.listeners('message')
    const held = []
    mqtt.removeAllListeners('message')
    mqtt.on('message', (topic, message) => {
      if (/\/LifeTicking\/__classInfo(Concise)?__$/.test(topic)) held.push([topic, message])
      else deliver.forEach(listener => listener(topic, message))
    })
    const gone = []
    const onGone = (instances, { className }) => {
      if (className === 'LifeTicking') gone.push(...instances)
    }
    client.on('instanceGone', onGone)
    try {
      expect(await client.delete(id, { agent: agentName, className: 'LifeTicking' })).to.equal(true)
      expect(listed('LifeTicking')).to.not.include(id)
      expect(gone).to.deep.equal([id])
      let found = null
      try {
        found = await client.getInstance(id, { agent: agentName, className: 'LifeTicking', noWait: true })
      } catch (err) {
        expect(err.message).to.match(/Could not find instance/)
      }
      expect(found).to.equal(null)
    } finally {
      mqtt.removeAllListeners('message')
      deliver.forEach(listener => mqtt.on('message', listener))
      held.forEach(([topic, message]) => mqtt.emit('message', topic, message))
      client.off('instanceGone', onGone)
    }
    // the late class info announces nothing twice
    expect(gone).to.deep.equal([id])
  })

  // an isolated instance of a client that connects, creates and goes
  const isolatedOfAGoneClient = async () => {
    const owner = new VrpcClient({ domain, broker, log: silent })
    await owner.connect()
    await waitFor(() => owner.getAvailableAgents().includes(agentName))
    const id = `isolated-${Date.now()}`
    const proxy = await owner.create({
      agent: agentName,
      className: 'LifeDisposable',
      instance: id,
      isIsolated: true
    })
    expect(await proxy.ping()).to.equal('pong')
    const obj = VrpcAdapter.getInstance(id)
    const unsubscribe = sinon.spy(agent, '_mqttUnsubscribe')
    await owner.end()
    // the listing never shows an isolated instance: wait for the agent's
    // auto-delete itself, which may take a while on a public broker
    await waitFor(() => !VrpcAdapter._instances.has(id), 15000)
    unsubscribe.restore()
    return { id, obj, unsubscribe }
  }

  it('disposes an isolated instance when its client goes (#1705)', async () => {
    const { obj } = await isolatedOfAGoneClient()
    await waitFor(() => obj.disposed === 1, 2000).catch(() => {
      throw new Error('the auto-deleted instance was not disposed')
    })
  })

  it('drops the method subscription of an isolated instance when its client goes (#1705)', async () => {
    const { id, unsubscribe } = await isolatedOfAGoneClient()
    // the same handler unsubscribes the gone client's info topic
    expect(unsubscribe.args.map(([topic]) => topic)).to.include(
      agent._methodsTopic('LifeDisposable', id)
    )
  })
})
