'use strict'

const path = require('path')
const EventEmitter = require('events')
const { expect } = require('chai')
const RoutingBroker = require('./routingBroker')
const { VrpcAdapter, VrpcAgent, VrpcClient } = require('../../index')
const {
  Counter,
  Topics,
  Emitting,
  Legacy,
  Channels,
  Meter
} = require('./fixtures/classes')

/* global describe, it, before, after */

// A VrpcClient against a VrpcAgent through an in-process broker
// (heisenware-cloud#1837): subscriptions are sets, withdrawn by id, told
// when they end or are lost, and declared again after a reconnect.

const DOMAIN = 'test.subs'
const quiet = { debug () {}, info () {}, warn () {}, error () {} }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function until (condition, timeout = 4000) {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('condition not met in time')
    await sleep(10)
  }
}

VrpcAdapter.register(Counter, {
  jsdocPath: path.join(__dirname, 'fixtures/classes.js')
})
VrpcAdapter.register(Topics)
VrpcAdapter.register(Emitting)
VrpcAdapter.register(Legacy)
VrpcAdapter.register(Channels)
VrpcAdapter.register(Meter)

let counter = 0
const unique = prefix => `${prefix}-${++counter}`

describe('subscriptions between a client and an agent (#1837)', function () {
  this.timeout(10000)
  let broker
  let agent
  const clients = []

  const newClient = async (options = {}) => {
    const client = new VrpcClient({
      domain: DOMAIN,
      broker: broker.url,
      timeout: 2000,
      log: quiet,
      ...options
    })
    await client.connect()
    clients.push(client)
    return client
  }

  before(async () => {
    broker = await new RoutingBroker().start()
    agent = new VrpcAgent({ domain: DOMAIN, agent: 'a1', broker: broker.url, log: quiet })
    await agent.serve()
  })

  after(async () => {
    for (const client of clients) await client.end()
    await agent.end()
    await broker.stop()
  })

  const create = async (client, className) => {
    const instance = unique(className.toLowerCase())
    const proxy = await client.create({ agent: 'a1', className, instance })
    return { instance, proxy, real: VrpcAdapter.getInstance(instance) }
  }

  describe('a subscription is a set member', () => {
    it('calls the event function once however often a callback is declared', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Counter')
      const seen = []
      const handler = value => seen.push(value)
      for (let n = 0; n < 5; n++) expect(await proxy.onEvent(handler)).to.equal(true)
      expect(real.calls).to.equal(1)
      real.fire(1)
      await until(() => seen.length === 1)
      await sleep(50)
      expect(seen).to.deep.equal([1])
      expect(client.getSubscriptions({ callback: handler })).to.have.length(1)
      expect(client.getSubscriptions({ callback: handler })[0]).to.include({
        functionName: 'onEvent',
        confirmed: true
      })
    })

    it('shares one registration between clients and releases it with the last', async () => {
      const one = await newClient()
      const two = await newClient()
      const { instance, proxy, real } = await create(one, 'Counter')
      const proxyTwo = await two.getInstance(instance, { agent: 'a1' })
      const seenOne = []
      const seenTwo = []
      const handlerOne = value => seenOne.push(value)
      const handlerTwo = value => seenTwo.push(value)
      await proxy.onEvent(handlerOne)
      await proxyTwo.onEvent(handlerTwo)
      expect(real.calls).to.equal(1)
      expect(real.handlers()).to.equal(1)
      real.fire('a')
      await until(() => seenOne.length === 1 && seenTwo.length === 1)
      expect(await one.unsubscribe(handlerOne)).to.equal(true)
      expect(real.releases).to.equal(0)
      real.fire('b')
      await until(() => seenTwo.length === 2)
      expect(seenOne).to.deep.equal(['a'])
      expect(await two.unsubscribe(handlerTwo)).to.equal(true)
      expect(real.releases).to.equal(1)
      expect(real.handlers()).to.equal(0)
    })

    it('withdraws a callAll subscription on every instance by its callback', async () => {
      const client = await newClient()
      const counters = [await create(client, 'Counter'), await create(client, 'Counter')]
      const seen = []
      const handler = (instance, value) => seen.push([instance, value])
      await client.callAll({ agent: 'a1', className: 'Counter', functionName: 'onEvent', args: [handler] })
      await client.callAll({ agent: 'a1', className: 'Counter', functionName: 'onEvent', args: [handler] })
      counters.forEach(({ real }) => expect(real.calls).to.equal(1))
      counters[1].real.fire(5)
      await until(() => seen.length === 1)
      expect(seen).to.deep.equal([[counters[1].instance, 5]])
      expect(await client.unsubscribe(handler)).to.equal(true)
      counters.forEach(({ real }) => expect(real.releases).to.equal(1))
    })

    it('withdraws a callAll subscription at one instance; the rest keep delivering', async () => {
      const client = await newClient()
      const [one, two] = [await create(client, 'Counter'), await create(client, 'Counter')]
      const seen = []
      const handler = (instance, value) => seen.push([instance, value])
      await client.callAll({ agent: 'a1', className: 'Counter', functionName: 'onEvent', args: [handler] })
      expect(await client.unsubscribe(handler, { instance: one.instance })).to.equal(true)
      expect(one.real.releases).to.equal(1)
      expect(two.real.releases).to.equal(0)
      one.real.fire('gone')
      two.real.fire('kept')
      await until(() => seen.length === 1)
      await sleep(50)
      expect(seen).to.deep.equal([[two.instance, 'kept']])
      // the subscription lives on at the other instances
      expect(client.getSubscriptions({ callback: handler })).to.have.length(1)
      // nothing is held at an instance it does not name
      expect(await client.unsubscribe('__e__nobody', { instance: one.instance })).to.equal(false)

      // the withdrawal outlives the client's own reconnect
      const reconnected = new Promise(resolve => client.once('connect', resolve))
      broker.cut(client._mqttClientId)
      await reconnected
      await until(() => two.real.calls === 2 && one.real.releases === 2)
      expect(one.real.handlers()).to.equal(0)
      expect(two.real.handlers()).to.equal(1)

      // a declaration names what is wanted now: that instance again
      await client.callAll({ agent: 'a1', className: 'Counter', functionName: 'onEvent', args: [handler] })
      expect(one.real.handlers()).to.equal(1)
      one.real.fire('back')
      await until(() => seen.length === 2)
      expect(seen[1]).to.deep.equal([one.instance, 'back'])
      expect(await client.unsubscribe(handler)).to.equal(true)
    })

    it('never calls an off twin a client calls; releases through it once the last one left (EV-12, EV-16)', async () => {
      const one = await newClient()
      const two = await newClient()
      const { instance, proxy, real } = await create(one, 'Legacy')
      const proxyTwo = await two.getInstance(instance, { agent: 'a1' })
      const handlerOne = () => {}
      const handlerTwo = () => {}
      await proxy.onTick(handlerOne)
      await proxyTwo.onTick(handlerTwo)
      await proxy.offTick(handlerOne)
      expect(real.offCalls).to.equal(0)
      expect(real.tick(1)).to.equal(1)
      await proxyTwo.offTick(handlerTwo)
      // the last out: released through the class's off twin (deprecated),
      // called by the agent once with the arguments of the registration
      expect(real.offCalls).to.equal(1)
      expect(real.tick(2)).to.equal(0)
    })

    it('subscribes an { emitter, event } contract once and withdraws it with its remover', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Legacy')
      const emitter = new EventEmitter()
      const seen = []
      emitter.on('tick', value => seen.push(value))
      await proxy.onTick({ emitter, event: 'tick' })
      await proxy.onTick({ emitter, event: 'tick' })
      expect(real.calls).to.equal(1)
      real.tick(1)
      await until(() => seen.length === 1)
      await proxy.offTick({ emitter, event: 'tick' })
      expect(real.tick(2)).to.equal(0)
      expect(client.getSubscriptions()).to.deep.equal([])
    })
    it('labels and lists an { emitter, event } contract like a callback', async () => {
      const client = await newClient()
      const { instance, proxy } = await create(client, 'Topics')
      const contract = { emitter: new EventEmitter(), event: 'line' }
      // labelled before it subscribes, the way an engine declares
      client.setSubscriberLabel(contract, 'App line, executor 3')
      expect(client.getSubscriptions({ callback: contract })).to.deep.equal([])
      await proxy.onMessage(contract, 'line/3')
      expect(client.getSubscriptions({ callback: contract })).to.have.length(1)
      expect(client.getSubscriptions({ callback: { emitter: new EventEmitter(), event: 'line' } }))
        .to.deep.equal([])
      const listed = await client.getRegistrations({ agent: 'a1', className: 'Topics', instance })
      expect(listed[0].subscriptions.map(x => x.label)).to.deep.equal(['App line, executor 3'])
    })
  })

  describe('one callback, several subscriptions', () => {
    it('keeps a callback on two arguments of one event function', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Topics')
      const seen = []
      const handler = value => seen.push(value)
      await proxy.onMessage(handler, 'a')
      await proxy.onMessage(handler, 'b')
      expect(real.calls).to.deep.equal(['a', 'b'])
      expect(real.releases).to.deep.equal([])
      real.publish('a', 1)
      real.publish('b', 2)
      await until(() => seen.length === 2)
      expect(seen).to.deep.equal([1, 2])
      expect(client.getSubscriptions({ callback: handler })).to.have.length(2)
      expect(await client.unsubscribe(handler)).to.equal(true)
      await until(() => real.releases.length === 2)
      expect(real.releases.sort()).to.deep.equal(['a', 'b'])
    })

    it('keeps a callback on two event functions with equal arguments', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Channels')
      const seen = []
      const handler = value => seen.push(value)
      await proxy.onValue('x', handler)
      await proxy.onStatus('x', handler)
      expect(real.calls).to.deep.equal(['value:x', 'status:x'])
      expect(real.fire('value:x', 1)).to.equal(1)
      expect(real.fire('status:x', 'up')).to.equal(1)
      await until(() => seen.length === 2)
      expect(seen).to.deep.equal([1, 'up'])
    })

    it('withdraws with an off twin exactly the subscription its arguments name', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Channels')
      const handler = () => {}
      await proxy.onValue('x', handler)
      await proxy.onValue('y', handler)
      await proxy.onStatus('x', handler)
      await proxy.offValue('x', handler)
      expect(real.offCalls).to.equal(0)
      expect(real.fire('value:x', 1)).to.equal(0)
      expect(real.fire('value:y', 1)).to.equal(1)
      expect(real.fire('status:x', 1)).to.equal(1)
      expect(client.getSubscriptions({ callback: handler })).to.have.length(2)
    })

    it('withdraws all of a function with an off twin naming no arguments', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Channels')
      const handler = () => {}
      await proxy.onValue('x', handler)
      await proxy.onValue('y', handler)
      await proxy.onStatus('x', handler)
      await proxy.offValue(handler)
      await until(() => real.fire('value:y', 1) === 0)
      expect(real.fire('value:x', 1)).to.equal(0)
      expect(real.fire('status:x', 1)).to.equal(1)
      expect(real.offCalls).to.equal(0)
      expect(client.getSubscriptions({ callback: handler })).to.have.length(1)
    })

    it('names a subscription by one id, fresh after a withdrawal, kept after a loss', async () => {
      const client = await newClient()
      const { instance, proxy } = await create(client, 'Counter')
      const handler = () => {}
      const idOf = () => client.getSubscriptions({ callback: handler }).map(x => x.id)
      await proxy.onEvent(handler)
      const [first] = idOf()
      await proxy.onEvent(handler)
      expect(idOf()).to.deep.equal([first])
      await client.unsubscribe(handler)
      await proxy.onEvent(handler)
      const [second] = idOf()
      expect(second).to.not.equal(first)
      // a loss: declared again, the subscription keeps its id
      const lost = []
      client.on('lost', id => lost.push(id))
      await client.delete(instance, { agent: 'a1' })
      await until(() => lost.length === 1)
      const again = await client.create({ agent: 'a1', className: 'Counter', instance })
      await again.onEvent(handler)
      expect(idOf()).to.deep.equal([second])
    })

    it('hands a remover\'s callback on as a callback when it names no subscription', async () => {
      const client = await newClient()
      const { proxy } = await create(client, 'Channels')
      const seen = []
      await proxy.removeChannel('x', channel => seen.push(channel))
      await until(() => seen.length === 1)
      expect(seen).to.deep.equal(['x'])
    })

    it('withdraws every subscription of a function through vrpcOff', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Topics')
      const handler = () => {}
      await proxy.onMessage(handler, 'a')
      await proxy.onMessage(handler, 'b')
      await proxy.vrpcOff('onMessage')
      await until(() => real.releases.length === 2)
      expect(client.getSubscriptions({ callback: handler })).to.have.length(0)
    })
  })

  describe('greeting', () => {
    it('hands every new subscriber the current value, the class called once', async () => {
      const one = await newClient()
      const two = await newClient()
      const { instance, proxy, real } = await create(one, 'Meter')
      const proxyTwo = await two.getInstance(instance, { agent: 'a1' })
      const seenOne = []
      const seenTwo = []
      await proxy.onValue(value => seenOne.push(value))
      await until(() => seenOne.length === 1)
      real.set(5)
      await until(() => seenOne.length === 2)
      await proxyTwo.onValue(value => seenTwo.push(value))
      await until(() => seenTwo.length === 1)
      expect(real.calls).to.equal(1)
      expect(seenOne).to.deep.equal([0, 5])
      expect(seenTwo).to.deep.equal([5])
      real.set(6)
      await until(() => seenOne.length === 3 && seenTwo.length === 2)
      expect(seenTwo).to.deep.equal([5, 6])
    })
  })

  describe('EventEmitter classes over the wire', () => {
    it('keeps one listener per event and withdraws only the caller on removeAllListeners', async () => {
      const one = await newClient()
      const two = await newClient()
      const { instance, proxy, real } = await create(one, 'Emitting')
      const proxyTwo = await two.getInstance(instance, { agent: 'a1' })
      const seenOne = []
      const seenTwo = []
      await proxy.on('x', value => seenOne.push(value))
      await proxy.on('x', value => seenOne.push(value))
      await proxyTwo.on('x', value => seenTwo.push(value))
      expect(real.count('x')).to.equal(1)
      await proxy.removeAllListeners('x')
      expect(real.count('x')).to.equal(1)
      expect(real.count('error')).to.equal(1)
      real.fire('x', 9)
      await until(() => seenTwo.length === 1)
      await sleep(50)
      expect(seenOne).to.deep.equal([])
    })

    it('offers no emit to clients', async () => {
      const client = await newClient()
      const { proxy } = await create(client, 'Emitting')
      expect(proxy.emit).to.equal(undefined)
      expect(proxy.on).to.be.a('function')
    })
  })

  describe('every end is told', () => {
    it('tells the consumer when the source ends a registration, never calling back', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Topics')
      const calls = []
      const ended = []
      client.on('ended', (...args) => ended.push(args))
      await proxy.onMessage((...args) => calls.push(args), 'line/1')
      const [{ id }] = client.getSubscriptions()
      real.endTopic('line/1')
      await until(() => ended.length === 1)
      expect(ended[0].slice(0, 3)).to.deep.equal([id, 'ended', 'source'])
      expect(calls).to.deep.equal([])
      expect(client.getSubscriptions()).to.deep.equal([])
      expect(real.releases).to.deep.equal(['line/1'])
    })

    it('tells a failure with its reason', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Topics')
      const ended = []
      client.on('ended', (...args) => ended.push(args))
      await proxy.onMessage(() => {}, 'line/2')
      real.endTopic('line/2', 'broker refused the topic')
      await until(() => ended.length === 1)
      expect(ended[0][1]).to.equal('broker refused the topic')
      expect(ended[0][3]).to.include({ failed: true })
    })

    it('tells every subscriber who ended a registration', async () => {
      const one = await newClient()
      const two = await newClient()
      const { instance, proxy, real } = await create(one, 'Topics')
      const proxyTwo = await two.getInstance(instance, { agent: 'a1' })
      const handlerOne = () => {}
      one.setSubscriberLabel(handlerOne, 'App line, executor 3')
      await proxy.onMessage(handlerOne, 'line/3')
      await proxyTwo.onMessage(() => {}, 'line/3')
      const listed = await two.getRegistrations({ agent: 'a1', className: 'Topics', instance })
      expect(listed).to.have.length(1)
      expect(listed[0]).to.include({ function: 'onMessage', state: 'live' })
      expect(listed[0].args).to.deep.equal(['line/3'])
      expect(listed[0].subscriptions.map(x => x.label)).to.deep.equal(['App line, executor 3', null])
      const ended = []
      one.on('ended', (id, reason, by) => ended.push(by))
      two.on('ended', (id, reason, by) => ended.push(by))
      expect(await two.endRegistration({
        agent: 'a1',
        className: 'Topics',
        instance,
        functionName: 'onMessage',
        args: ['line/3'],
        by: 'Anna'
      })).to.equal(true)
      await until(() => ended.length === 2)
      expect(ended).to.deep.equal(['Anna', 'Anna'])
      expect(real.releases).to.deep.equal(['line/3'])
    })

    it('tells the consumer a subscription is lost when its instance goes', async () => {
      const client = await newClient()
      const { instance, proxy } = await create(client, 'Counter')
      const lost = []
      client.on('lost', (...args) => lost.push(args))
      await proxy.onEvent(() => {})
      const [{ id }] = client.getSubscriptions()
      await client.delete(instance, { agent: 'a1' })
      await until(() => lost.length === 1)
      expect(lost[0].slice(0, 2)).to.deep.equal([id, 'instanceGone'])
    })
  })

  describe('a reconnect', () => {
    it('declares the subscriptions again by itself; the consumer notices nothing', async () => {
      const client = await newClient()
      const { proxy, real } = await create(client, 'Counter')
      const seen = []
      const lost = []
      client.on('lost', (...args) => lost.push(args))
      await proxy.onEvent(value => seen.push(value))
      expect(real.calls).to.equal(1)
      const reconnected = new Promise(resolve => client.once('connect', resolve))
      broker.cut(client._mqttClientId)
      // the will tells the agent the connection went: released
      await until(() => real.releases === 1)
      await reconnected
      await until(() => real.calls === 2)
      real.fire('after')
      await until(() => seen.length === 1)
      expect(seen).to.deep.equal(['after'])
      expect(real.handlers()).to.equal(1)
      expect(lost).to.deep.equal([])
    })
  })

  describe('callAll across agents', () => {
    it('asks only the agents that offer the class, and joins their answers', async () => {
      // an agent of other classes in the same domain (the browser agent has
      // a registry of its own)
      const VrpcBrowserAdapter = require('../../vrpc/VrpcBrowserAdapter')
      const VrpcBrowserAgent = require('../../vrpc/VrpcBrowserAgent')
      class Lamp { on () { return true } }
      VrpcBrowserAdapter.registerClass(Lamp)
      const other = new VrpcBrowserAgent({
        domain: DOMAIN,
        agent: unique('lamps'),
        broker: broker.url,
        log: quiet
      })
      await other.serve()
      const client = await newClient()
      try {
        const { instance } = await create(client, 'Counter')
        await until(() => client.getAvailableAgents().includes(other._agent))
        const started = Date.now()
        const answers = await client.callAll({
          agent: '*',
          className: 'Counter',
          functionName: 'handlers'
        })
        // no waiting for the agent without the class (the timeout is 2 s)
        expect(Date.now() - started).to.be.below(1000)
        // several agents asked: every entry names its agent
        expect(answers.find(x => x.id === instance)).to.deep.equal({ agent: 'a1', id: instance, val: 0 })
      } finally {
        await other.end()
      }
    })
  })

  describe('callAll with a selection (ALL-4, ALL-5)', () => {
    // instances under a fresh prefix: `${prefix}-line-1`, ...
    const createAll = async (client, prefix, names, agent = 'a1') => {
      const real = {}
      for (const name of names) {
        const instance = `${prefix}-${name}`
        await client.create({ agent, className: 'Counter', instance })
        real[name] = VrpcAdapter.getInstance(instance)
      }
      return real
    }
    const sentTo = (from, prefix) =>
      broker.published.slice(from).map(x => x.topic).filter(topic => topic.startsWith(prefix))

    it('calls the selected instances only, in one request', async () => {
      const client = await newClient()
      const prefix = unique('sel')
      await createAll(client, prefix, ['line-1', 'line-2', 'pump-1'])
      const before = broker.published.length
      const answers = await client.callAll({
        agent: 'a1',
        className: 'Counter',
        functionName: 'handlers',
        instances: `${prefix}-line-*`
      })
      expect(answers.map(x => x.id).sort()).to.deep.equal([`${prefix}-line-1`, `${prefix}-line-2`])
      expect(answers.every(x => x.val === 0 && !('agent' in x))).to.equal(true)
      expect(sentTo(before, `${DOMAIN}/a1/Counter/`)).to.deep.equal([
        `${DOMAIN}/a1/Counter/__static__/__callMatching__`
      ])
      // a list of names and patterns; `*` alone is all
      const listed = await client.callAll({
        agent: 'a1',
        className: 'Counter',
        functionName: 'handlers',
        instances: [`${prefix}-pump-1`, `${prefix}-line-2`]
      })
      expect(listed.map(x => x.id).sort()).to.deep.equal([`${prefix}-line-2`, `${prefix}-pump-1`])
      const from = broker.published.length
      await client.callAll({ agent: 'a1', className: 'Counter', functionName: 'handlers', instances: '*' })
      expect(sentTo(from, `${DOMAIN}/a1/Counter/`)).to.deep.equal([`${DOMAIN}/a1/Counter/__static__/__callAll__`])
      // what is no selection never leaves the client
      for (const instances of [[], '', [''], 7]) {
        let error = null
        try {
          await client.callAll({ agent: 'a1', className: 'Counter', functionName: 'handlers', instances })
        } catch (err) {
          error = err
        }
        expect(error && error.message, JSON.stringify(instances)).to.include('Invalid instances')
      }
    })

    it('subscribes the selected instances only, and declares its selections again after a reconnect', async () => {
      const client = await newClient()
      const prefix = unique('sel')
      const real = await createAll(client, prefix, ['line-1', 'line-2', 'pump-1', 'tank-1'])
      const seen = []
      const handler = (instance, value) => seen.push([instance, value])
      const subscribe = instances =>
        client.callAll({ agent: 'a1', className: 'Counter', functionName: 'onEvent', args: [handler], instances })
      await subscribe(`${prefix}-line-*`)
      expect(['line-1', 'line-2', 'pump-1', 'tank-1'].map(n => real[n].handlers())).to.deep.equal([1, 1, 0, 0])
      real['pump-1'].fire('not selected')
      real['line-1'].fire('selected')
      await until(() => seen.length === 1)
      await sleep(50)
      expect(seen).to.deep.equal([[`${prefix}-line-1`, 'selected']])
      // one callback on another selection is another subscription
      await subscribe([`${prefix}-pump-*`])
      const subs = client.getSubscriptions({ callback: handler })
      expect(subs.map(x => x.instances)).to.have.deep.members([`${prefix}-line-*`, [`${prefix}-pump-*`]])
      expect(subs.map(x => x.id)[0]).to.not.equal(subs.map(x => x.id)[1])
      expect(real['pump-1'].handlers()).to.equal(1)

      // after the client's own reconnect, each selection is declared again
      const matching = () => broker.publishedOn(`${DOMAIN}/a1/Counter/__static__/__callMatching__`).length
      const declared = matching()
      const reconnected = new Promise(resolve => client.once('connect', resolve))
      broker.cut(client._mqttClientId)
      await reconnected
      await until(() => matching() >= declared + 2)
      await until(() => real['line-2'].calls === 2 && real['pump-1'].calls === 2)
      expect(['line-1', 'line-2', 'pump-1', 'tank-1'].map(n => real[n].handlers())).to.deep.equal([1, 1, 1, 0])
      real['line-2'].fire('again')
      real['tank-1'].fire('never')
      await until(() => seen.length === 2)
      await sleep(50)
      expect(seen[1]).to.deep.equal([`${prefix}-line-2`, 'again'])

      expect(await client.unsubscribe(handler)).to.equal(true)
      expect(['line-1', 'line-2', 'pump-1'].map(n => real[n].handlers())).to.deep.equal([0, 0, 0])
    })

    it('asks the agents a pattern or a list names, every entry naming its agent', async () => {
      const VrpcBrowserAdapter = require('../../vrpc/VrpcBrowserAdapter')
      const VrpcBrowserAgent = require('../../vrpc/VrpcBrowserAgent')
      const { Counter } = require('./fixtures/classes')
      if (!VrpcBrowserAdapter.getAvailableClasses().includes('Counter')) {
        VrpcBrowserAdapter.registerClass(Counter)
      }
      const edge = unique('edge')
      const other = new VrpcBrowserAgent({ domain: DOMAIN, agent: edge, broker: broker.url, log: quiet })
      await other.serve()
      const client = await newClient()
      try {
        const prefix = unique('fleet')
        await client.create({ agent: 'a1', className: 'Counter', instance: `${prefix}-a` })
        await client.create({ agent: edge, className: 'Counter', instance: `${prefix}-b` })
        const ask = agent =>
          client.callAll({ agent, className: 'Counter', functionName: 'handlers', instances: `${prefix}-*` })
        expect(await ask(['a1', edge])).to.have.deep.members([
          { agent: 'a1', id: `${prefix}-a`, val: 0 },
          { agent: edge, id: `${prefix}-b`, val: 0 }
        ])
        expect(await ask('edge-*')).to.deep.equal([{ agent: edge, id: `${prefix}-b`, val: 0 }])
        // a listed agent that is not there: its error, the others stand
        const withMissing = await ask(['a1', 'nobody'])
        expect(withMissing.find(x => x.agent === 'a1')).to.deep.equal({ agent: 'a1', id: `${prefix}-a`, val: 0 })
        expect(withMissing.find(x => x.agent === 'nobody')).to.have.nested.property('err.message')
      } finally {
        await other.end()
      }
    })

    it('towards an agent that lists no __callMatching__: one call per selected instance, and no subscription', async () => {
      const omit = json => ({
        ...json,
        staticFunctions: json.staticFunctions.filter(f => f !== '__callMatching__')
      })
      broker.rewrite = (topic, json) =>
        topic.startsWith(`${DOMAIN}/a1/Counter/__classInfo`) ? omit(json) : undefined
      const client = await newClient()
      const prefix = unique('older')
      try {
        await createAll(client, prefix, ['line-1', 'line-2', 'pump-1'])
        await until(
          () => !client.getAvailableStaticFunctions({ agent: 'a1', className: 'Counter' }).includes('__callMatching__')
        )
        const before = broker.published.length
        const answers = await client.callAll({
          agent: 'a1',
          className: 'Counter',
          functionName: 'handlers',
          instances: `${prefix}-line-*`
        })
        expect(answers).to.have.deep.members([
          { id: `${prefix}-line-1`, val: 0 },
          { id: `${prefix}-line-2`, val: 0 }
        ])
        const sent = sentTo(before, `${DOMAIN}/a1/Counter/`)
        expect(sent).to.have.members([
          `${DOMAIN}/a1/Counter/${prefix}-line-1/handlers`,
          `${DOMAIN}/a1/Counter/${prefix}-line-2/handlers`
        ])
        let error = null
        try {
          await client.callAll({
            agent: 'a1',
            className: 'Counter',
            functionName: 'onEvent',
            args: [() => {}],
            instances: `${prefix}-line-*`
          })
        } catch (err) {
          error = err
        }
        expect(error && error.message).to.include('__callMatching__')
      } finally {
        broker.rewrite = null
        // the agent publishes its true class info again
        await client.create({ agent: 'a1', className: 'Counter', instance: unique('restore') })
      }
    })
  })

  describe('a loss heals (CL-9, CL-10, CL-11)', () => {
    // an agent of its own: these tests cut its connection
    const servedAgent = async name => {
      const own = new VrpcAgent({
        domain: DOMAIN,
        agent: name,
        broker: broker.url,
        log: quiet,
        mqttClientId: `agent-${name}`
      })
      await own.serve()
      return own
    }

    it('declares a subscription again once its agent is back, the class called once', async () => {
      const name = unique('healing')
      const own = await servedAgent(name)
      const client = await newClient()
      try {
        const instance = unique('counter')
        const proxy = await client.create({ agent: name, className: 'Counter', instance })
        const real = VrpcAdapter.getInstance(instance)
        const seen = []
        const lost = []
        const healed = []
        client.on('lost', (id, reason) => lost.push(reason))
        client.on('healed', id => healed.push(id))
        await proxy.onEvent(value => seen.push(value))
        const [{ id }] = client.getSubscriptions().filter(x => x.agent === name)
        broker.cut(`agent-${name}`)
        await until(() => lost.length === 1)
        expect(lost).to.deep.equal(['agentOffline'])
        expect(client.getSubscriptions().find(x => x.id === id)).to.include({ lost: true, confirmed: false })
        // the agent reconnects by itself and still holds the registration
        await until(() => healed.length === 1, 6000)
        expect(healed).to.deep.equal([id])
        expect(client.getSubscriptions().find(x => x.id === id)).to.include({ lost: false, confirmed: true })
        expect(real.calls).to.equal(1)
        real.fire('back')
        await until(() => seen.length === 1)
        expect(seen).to.deep.equal(['back'])
      } finally {
        await client.end()
        await own.end()
      }
    })

    it('withdraws once its agent is back what it withdrew while the agent was away', async () => {
      const name = unique('away')
      const own = await servedAgent(name)
      const client = await newClient()
      try {
        const instance = unique('counter')
        const proxy = await client.create({ agent: name, className: 'Counter', instance })
        const real = VrpcAdapter.getInstance(instance)
        const handler = () => {}
        await proxy.onEvent(handler)
        const lost = []
        client.on('lost', id => lost.push(id))
        broker.cut(`agent-${name}`)
        await until(() => lost.length === 1)
        // withdrawn while the agent is offline: it still holds the
        // registration and learns of the withdrawal once it is back
        expect(await client.unsubscribe(handler)).to.equal(true)
        expect(real.releases).to.equal(0)
        await until(() => real.releases === 1, 6000)
        expect(real.handlers()).to.equal(0)
      } finally {
        await client.end()
        await own.end()
      }
    })
  })

  describe('a client meeting an agent before protocol 4', () => {
    let old
    before(async () => {
      // the agent announces protocol 3: what an old agent says
      broker.rewrite = (topic, json) =>
        topic === `${DOMAIN}/old1/__agentInfo__` ? { ...json, v: 3 } : undefined
      old = new VrpcAgent({ domain: DOMAIN, agent: 'old1', broker: broker.url, log: quiet })
      await old.serve()
    })
    after(async () => {
      broker.rewrite = null
      await old.end()
    })

    it('withdraws through removeListener, never by id', async () => {
      const client = await newClient()
      const instance = unique('emitting')
      const proxy = await client.create({ agent: 'old1', className: 'Emitting', instance })
      const real = VrpcAdapter.getInstance(instance)
      const handler = () => {}
      await proxy.on('x', handler)
      const before = broker.published.length
      expect(await client.unsubscribe(handler)).to.equal(true)
      const sent = broker.published.slice(before).map(x => x.topic)
      expect(sent.some(topic => topic.endsWith('/__unsubscribe__'))).to.equal(false)
      expect(sent).to.include(`${DOMAIN}/old1/Emitting/${instance}/removeListener`)
      expect(real.count('x')).to.equal(0)
    })

    it('stops a callAll subscription at one instance locally, sending nothing', async () => {
      const client = await newClient()
      const instances = [unique('counter'), unique('counter')]
      for (const instance of instances) {
        await client.create({ agent: 'old1', className: 'Counter', instance })
      }
      const seen = []
      const handler = (instance, value) => seen.push([instance, value])
      await client.callAll({ agent: 'old1', className: 'Counter', functionName: 'onEvent', args: [handler] })
      const before = broker.published.length
      expect(await client.unsubscribe(handler, { instance: instances[0] })).to.equal(true)
      const sent = broker.published.slice(before).map(x => x.topic)
      expect(sent.some(topic => topic.endsWith('/__unsubscribe__'))).to.equal(false)
      VrpcAdapter.getInstance(instances[0]).fire('gone')
      VrpcAdapter.getInstance(instances[1]).fire('kept')
      await until(() => seen.length === 1)
      await sleep(50)
      expect(seen).to.deep.equal([[instances[1], 'kept']])
    })

    it('declares nothing again after a reconnect', async () => {
      const client = await newClient()
      const instance = unique('counter')
      const proxy = await client.create({ agent: 'old1', className: 'Counter', instance })
      await proxy.onEvent(() => {})
      const declarations = () =>
        broker.publishedOn(`${DOMAIN}/old1/Counter/${instance}/onEvent`).length
      expect(declarations()).to.equal(1)
      const reconnected = new Promise(resolve => client.once('connect', resolve))
      broker.cut(client._mqttClientId)
      await reconnected
      await sleep(300)
      expect(declarations()).to.equal(1)
    })
  })
})
