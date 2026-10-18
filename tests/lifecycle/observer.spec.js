const { expect } = require('chai')
const { VrpcAgent, VrpcAdapter, VrpcClient } = require('../../index')

// A client that only observes (`nosideeffects: true`) sends a request only
// for a function the class info declares free of side effects; anything
// else rejects before it reaches the broker (protocol, section 16.3)
class Gauge {
  constructor () {
    this.offset = 0
  }

  read () {
    return 21.5 + this.offset
  }

  calibrate (offset) {
    Gauge.calibrations += 1
    this.offset = offset
  }

  // an event function nobody declared free of side effects
  onCalibrated (handler) {
    Gauge.subscriptions += 1
  }

  static total () {
    return 1
  }

  static reset () {
    Gauge.resets += 1
  }
}
Gauge.calibrations = 0
Gauge.resets = 0
Gauge.subscriptions = 0

describe('A client that only observes', () => {
  const domain = 'test.vrpc'
  const agentName = `agent-${Date.now()}`
  // VRPC_TEST_BROKER=mqtt://localhost:1883 runs the suite against a local broker
  const broker = process.env.VRPC_TEST_BROKER || 'mqtts://broker.hivemq.com'
  const quiet = { debug () {}, info () {}, warn () {}, error () {} }
  let agent
  let client
  let observer

  before(async () => {
    VrpcAdapter.register(Gauge, {
      meta: { read: { nosideeffects: true }, total: { nosideeffects: true } }
    })
    agent = new VrpcAgent({ domain, agent: agentName, broker, log: quiet })
    await agent.serve()
    client = new VrpcClient({ domain, broker, log: quiet })
    await client.connect()
    await client.create({ agent: agentName, className: 'Gauge', instance: 'gauge1' })
    observer = new VrpcClient({ domain, broker, log: quiet, nosideeffects: true })
    await observer.connect()
    // the class info with its meta data has arrived
    for (let i = 0; i < 50; i++) {
      const info = observer.getSystemInformation()[agentName]
      if (info && info.classes && info.classes.Gauge && info.classes.Gauge.meta.read) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  })

  after(async () => {
    await observer.end()
    await client.end()
    await agent.end()
    VrpcAdapter._functionRegistry.delete('Gauge')
  })

  const refused = async call => {
    try {
      await call()
    } catch (err) {
      return err.message
    }
    return null
  }

  it('calls what the class declares free of side effects', async () => {
    const gauge = await observer.getInstance('gauge1', { agent: agentName })
    expect(await gauge.read()).to.equal(21.5)
    expect(await observer.callStatic({ agent: agentName, className: 'Gauge', functionName: 'total' })).to.equal(1)
  })

  it('refuses every other request before it is sent', async () => {
    const gauge = await observer.getInstance('gauge1', { agent: agentName })
    expect(await refused(() => gauge.calibrate(2))).to.include('Gauge.calibrate on agent')
    expect(await refused(() => observer.callStatic({ agent: agentName, className: 'Gauge', functionName: 'reset' }))).to.include('not declared free of side effects')
    expect(await refused(() => observer.callAll({ agent: agentName, className: 'Gauge', functionName: 'read' }))).to.include('__callAll__')
    expect(await refused(() => observer.create({ agent: agentName, className: 'Gauge', instance: 'gauge2' }))).to.include('__createShared__')
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(Gauge.calibrations).to.equal(0)
    expect(Gauge.resets).to.equal(0)
    expect(VrpcAdapter.getAvailableInstances('Gauge')).to.deep.equal(['gauge1'])
    // the connection stays: the next declared call is answered
    expect(await gauge.read()).to.equal(21.5)
  })

  it('refuses a subscription before it is made: nothing is left to declare again', async () => {
    const gauge = await observer.getInstance('gauge1', { agent: agentName })
    expect(await refused(() => gauge.onCalibrated(() => {}))).to.include('Gauge.onCalibrated on agent')
    expect(await refused(() => gauge.vrpcOn('onCalibrated', () => {}))).to.include('Gauge.onCalibrated on agent')
    expect(observer.getSubscriptions()).to.deep.equal([])
    expect(Gauge.subscriptions).to.equal(0)
  })

  it('leaves what the broker retains alone', async () => {
    expect(await refused(() => observer.unregisterAgent(agentName))).to.include('this client only observes')
  })

  it('lists registrations, a function of the protocol that changes nothing', async () => {
    expect(await observer.getRegistrations({ agent: agentName, className: 'Gauge', instance: 'gauge1' })).to.be.an('array')
  })

  it('leaves every other client as it was', async () => {
    const gauge = await client.getInstance('gauge1', { agent: agentName })
    await gauge.calibrate(1)
    expect(await gauge.read()).to.equal(22.5)
    expect(Gauge.calibrations).to.equal(1)
  })
})
