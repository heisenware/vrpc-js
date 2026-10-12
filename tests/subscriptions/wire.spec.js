'use strict'

const EventEmitter = require('events')
const mqtt = require('mqtt')
const { expect } = require('chai')
const RoutingBroker = require('./routingBroker')
const { VrpcAdapter, VrpcAgent, VrpcClient } = require('../../index')
const VrpcBrowserAdapter = require('../../vrpc/VrpcBrowserAdapter')
const VrpcBrowserAgent = require('../../vrpc/VrpcBrowserAgent')

/* global describe, it, before, after */

// The wire as protocol 4 has it (docs/spec/protocol.md; the rule each test
// checks is named in its title), checked with hand-made requests from a raw
// MQTT client against both agents: what an answer carries, what a request
// can reach, where an agent publishes, how instances come and go.

const DOMAIN = 'test.wire'
const quiet = { debug () {}, info () {}, warn () {}, error () {} }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function until (condition, timeout = 4000) {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('condition not met in time')
    await sleep(10)
  }
}

class Thing extends EventEmitter {
  constructor () {
    super()
    this.on('error', () => {})
  }

  ping () { return 'pong' }

  async later () { return 'done' }

  async fails () { throw new Error('nope') }

  boom () { throw new Error('boom') }

  big () { return 10n }

  _secret () { return 'hidden' }

  onTick (handler) {
    this._tick = handler
    return { [Symbol.dispose]: () => { this._tick = null } }
  }

  tick (value) {
    if (this._tick) this._tick(value)
  }
  // calls a one-shot callback with what it is given, or a BigInt
  reply (callback, value) {
    callback(value === 'big' ? 10n : value)
    return true
  }

  static make () { return 'made' }

  static _hidden () { return 'hidden' }
}

class Other {
  ping () { return 'other' }
}

// answers by its constructor argument: a value, a throw, a rejection
class Pair {
  constructor (mode) { this.mode = mode }

  value () {
    if (this.mode === 'sync') throw new Error('sync')
    if (this.mode === 'async') return Promise.reject(new Error('async'))
    return 1
  }
}

const AGENTS = [
  ['VrpcAgent', VrpcAgent, VrpcAdapter, Klass => VrpcAdapter.register(Klass)],
  [
    'VrpcBrowserAgent',
    VrpcBrowserAgent,
    VrpcBrowserAdapter,
    Klass => VrpcBrowserAdapter.registerClass(Klass)
  ]
]

for (const [name, Agent, Adapter, register] of AGENTS) {
  describe(`the wire of ${name}`, function () {
    this.timeout(10000)
    const AGENT = name === 'VrpcAgent' ? 'node' : 'browser'
    const AGENT_ID = `agent-${AGENT}`
    // the raw client's connection id: its inbox
    const S = `${DOMAIN}/raw-${AGENT}/secret`
    const inbox = []
    let broker
    let agent
    let raw
    let counter = 0
    const unique = prefix => `${prefix}-${AGENT}-${++counter}`

    const subscribeRaw = filter =>
      new Promise((resolve, reject) =>
        raw.subscribe(filter, err => (err ? reject(err) : resolve()))
      )

    // the message carrying a correlation id, or null when none came
    const answerTo = async (i, wait = 1000) => {
      const start = Date.now()
      while (Date.now() - start < wait) {
        const hit = inbox.find(m => m.json && m.json.i === i)
        if (hit) return hit.json
        await sleep(5)
      }
      return null
    }

    // a request as a client sends it, and its answer
    const request = (topic, body = {}, { wait } = {}) => {
      const i = unique('req')
      raw.publish(
        `${DOMAIN}/${AGENT}/${topic}`,
        JSON.stringify({ i, s: S, v: 4, ...body })
      )
      return answerTo(body.i || i, wait)
    }

    const createShared = async (className, instance, args = []) => {
      const answer = await request(`${className}/__static__/__createShared__`, {
        a: [instance, ...args]
      })
      expect(answer.r).to.equal(instance)
      return Adapter.getInstance(instance)
    }

    const agentSubscriptions = () => broker.subscriptionsOf(AGENT_ID)

    before(async () => {
      for (const Klass of [Thing, Other, Pair]) register(Klass)
      broker = await new RoutingBroker().start()
      agent = new Agent({
        domain: DOMAIN,
        agent: AGENT,
        broker: broker.url,
        log: quiet,
        mqttClientId: AGENT_ID
      })
      await agent.serve()
      raw = mqtt.connect(broker.url, { clientId: `raw-${AGENT}`, reconnectPeriod: 0 })
      await new Promise(resolve => raw.on('connect', resolve))
      raw.on('message', (topic, payload) => {
        let json = null
        try {
          json = JSON.parse(payload.toString())
        } catch (err) {}
        inbox.push({ topic, json })
      })
      await subscribeRaw(`${S}/#`)
    })

    after(async () => {
      raw.end(true)
      await agent.end()
      await broker.stop()
    })

    describe('an answer', () => {
      it('carries r, i and v - nothing of the request (MSG-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const answer = await request(`Thing/${id}/ping`, { a: [] })
        expect(answer).to.deep.equal({ r: 'pong', i: answer.i, v: 4 })
      })

      it('carries the agent\'s protocol version, also to an older request (MSG-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const answer = await request(`Thing/${id}/ping`, { a: [], v: 3 })
        expect(answer.v).to.equal(4)
      })

      it('never repeats a result or an error the request brought (MSG-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const answer = await request(`Thing/${id}/ping`, {
          a: [],
          r: 'smuggled',
          e: { message: 'smuggled' },
          u: ['smuggled']
        })
        expect(answer).to.deep.equal({ r: 'pong', i: answer.i, v: 4 })
      })

      it('carries an error as { message } (MSG-7)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const answer = await request(`Thing/${id}/boom`, { a: [] })
        expect(answer).to.deep.equal({ e: { message: 'boom' }, i: answer.i, v: 4 })
      })

      it('of a promise comes twice: its id at once, its value once it settled (CALL-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const first = await request(`Thing/${id}/later`, { a: [] })
        expect(first.r).to.match(/^__p__later-[\w-]{8}-\d+$/)
        expect(await answerTo(first.r)).to.deep.equal({ r: 'done', i: first.r, v: 4 })
      })

      it('of a rejected promise carries its error only (CALL-6, MSG-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const first = await request(`Thing/${id}/fails`, { a: [] })
        expect(await answerTo(first.r)).to.deep.equal({
          e: { message: 'nope' },
          i: first.r,
          v: 4
        })
      })

      it('is an error when JSON cannot carry the result (MSG-8)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const answer = await request(`Thing/${id}/big`, { a: [] })
        expect(answer.e.message).to.match(/cannot be encoded as JSON/)
      })
    })

    describe('what a request reaches', () => {
      it('calls the member functions the class info lists, nothing else (CALL-1)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        for (const f of ['emit', '_secret', 'constructor', 'setMaxListeners', 'nothing']) {
          const answer = await request(`Thing/${id}/${f}`, { a: ['x'] })
          expect(answer.e, f).to.deep.equal({ message: `Could not find function: ${f}` })
        }
      })

      it('cannot fake an event: emit stays inside the agent (CALL-1, SEC-3)', async () => {
        const id = unique('t')
        const real = await createShared('Thing', id)
        const eventId = `__e__${S}/${unique('ev')}`
        const subscribed = await request(`Thing/${id}/on`, { a: ['x', eventId] })
        expect(subscribed.e).to.equal(undefined)
        await request(`Thing/${id}/emit`, { a: ['x', 'fake'] })
        real.emit('x', 'real')
        await until(() => inbox.some(m => m.topic === eventId.slice(5)))
        await sleep(50)
        const events = inbox.filter(m => m.topic === eventId.slice(5))
        expect(events.map(m => m.json.a)).to.deep.equal([['real']])
      })

      it('serves the static functions the class info lists, nothing else (CALL-1, CALL-3)', async () => {
        expect((await request('Thing/__static__/make', { a: [] })).r).to.equal('made')
        // an unlisted static has no topic the agent serves: nothing reaches it
        const before = broker.published.length
        expect(await request('Thing/__static__/_hidden', { a: [] }, { wait: 300 })).to.equal(null)
        expect(broker.published.slice(before).filter(m => m.from === AGENT_ID)).to.deep.equal([])
      })

      it('lists no constructor among the member functions (AG-9)', async () => {
        await subscribeRaw(`${DOMAIN}/${AGENT}/Thing/__classInfo__`)
        await until(() =>
          inbox.some(m => m.topic === `${DOMAIN}/${AGENT}/Thing/__classInfo__`)
        )
        const info = inbox.find(m => m.topic === `${DOMAIN}/${AGENT}/Thing/__classInfo__`)
        expect(info.json.memberFunctions).to.include('ping')
        expect(info.json.memberFunctions).to.not.include('constructor')
        expect(info.json.memberFunctions).to.not.include('emit')
      })

      it('answers an unknown function with an error; an unknown instance is not served (CALL-1, CALL-3)', async () => {
        // no topic of an instance that does not exist is served: the
        // caller's timeout is all there is
        expect(await request('Thing/nobody/ping', { a: [] }, { wait: 300 })).to.equal(null)
        const id = unique('t')
        await createShared('Thing', id)
        const missing = await request(`Thing/${id}/nothing`, { a: [] })
        expect(missing.e.message).to.equal('Could not find function: nothing')
      })

      it('takes a missing argument list for none, refuses one that is no list (MSG-3)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        expect((await request(`Thing/${id}/ping`, { a: undefined })).r).to.equal('pong')
        expect((await request(`Thing/${id}/ping`, { a: 'x' })).e.message).to.match(
          /must be an array/
        )
      })
    })

    describe('where the agent publishes', () => {
      it('ignores a request whose sender is no connection id of its domain (MSG-2, SEC-2)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const senders = [
          `${DOMAIN}/${AGENT}/__agentInfo__`,
          `other.domain/x/${AGENT}`,
          `${DOMAIN}/x`,
          `${DOMAIN}/+/y`,
          `${DOMAIN}//y`,
          42
        ]
        for (const s of senders) {
          const before = broker.published.length
          raw.publish(
            `${DOMAIN}/${AGENT}/Thing/${id}/ping`,
            JSON.stringify({ i: unique('spoof'), s, a: [] })
          )
          await sleep(100)
          const fromAgent = broker.published.slice(before).filter(m => m.from === AGENT_ID)
          expect(fromAgent, String(s)).to.deep.equal([])
        }
      })

      it('refuses a subscription id outside its sender\'s topics (EV-1)', async () => {
        const id = unique('t')
        const real = await createShared('Thing', id)
        const answer = await request(`Thing/${id}/onTick`, {
          a: [`__e__${DOMAIN}/victim/secret/x`]
        })
        expect(answer.e.message).to.match(/under its sender's connection id/)
        real.tick(1)
        await sleep(50)
        expect(broker.publishedOn(`${DOMAIN}/victim/#`)).to.deep.equal([])
      })

      it('ignores a message that is no JSON and serves on (TR-5)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        raw.publish(`${DOMAIN}/${AGENT}/Thing/${id}/ping`, 'no json')
        expect((await request(`Thing/${id}/ping`, { a: [] })).r).to.equal('pong')
      })
    })

    describe('an instance', () => {
      it('is deleted only through its own class (INST-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const answer = await request('Other/__static__/__delete__', { a: [id] })
        expect(answer.e.message).to.equal(`Instance '${id}' is not of class 'Other'`)
        expect((await request(`Thing/${id}/ping`, { a: [] })).r).to.equal('pong')
      })

      it('is named by one topic level of its own (TOP-4, INST-2)', async () => {
        for (const name of ['a/b', 'a+b', 'a#b', '', '__static__', 42]) {
          for (const create of ['__createShared__', '__createIsolated__']) {
            const answer = await request(`Thing/__static__/${create}`, { a: [name] })
            expect(answer.e.message, `${create} ${name}`).to.equal(
              `Invalid instance name: ${JSON.stringify(name)}`
            )
          }
        }
      })

      it('takes its request topic with it when deleted (INST-6)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const topic = `${DOMAIN}/${AGENT}/Thing/${id}/+`
        expect(agentSubscriptions()).to.include(topic)
        expect((await request('Thing/__static__/__delete__', { a: [id] })).r).to.equal(true)
        await until(() => !agentSubscriptions().includes(topic))
      })

      it('changes the class info when a shared one is deleted, never otherwise (AG-7, INST-6)', async () => {
        const infoTopic = `${DOMAIN}/${AGENT}/Thing/__classInfo__`
        let before = broker.publishedOn(infoTopic).length
        const nobody = await request('Thing/__static__/__delete__', { a: [unique('nobody')] })
        expect(nobody.r).to.equal(false)
        await sleep(50)
        expect(broker.publishedOn(infoTopic).length).to.equal(before)
        const id = unique('t')
        await createShared('Thing', id)
        before = broker.publishedOn(infoTopic).length
        await request('Thing/__static__/__delete__', { a: [id] })
        await until(() => broker.publishedOn(infoTopic).length > before)
        const info = JSON.parse(broker.publishedOn(infoTopic).pop().payload)
        expect(info.instances).to.not.include(id)
      })

      it('isolated, goes with its connection - every time the connection goes (AG-11, INST-7)', async () => {
        // a client keeps its connection id across reconnects
        const conn = `${DOMAIN}/${unique('conn')}/secret`
        await subscribeRaw(`${conn}/#`)
        for (const round of [1, 2]) {
          const id = unique(`iso${round}`)
          const created = await request(
            'Thing/__static__/__createIsolated__',
            { a: [id], s: conn }
          )
          expect(created.r).to.equal(id)
          expect(agentSubscriptions()).to.include(`${conn}/__clientInfo__`)
          broker.inject(`${conn}/__clientInfo__`, JSON.stringify({ status: 'offline' }))
          await until(() => !Adapter.getAvailableInstances('Thing').includes(id) &&
            !Adapter._instances.has(id))
          await until(() => !agentSubscriptions().includes(`${conn}/__clientInfo__`))
        }
      })
    })

    describe('what JSON cannot carry', () => {
      const on = topic => inbox.filter(m => m.topic === topic).map(m => m.json)

      it('tells a subscriber of protocol 4 that an event could not travel, and keeps it (EV-22)', async () => {
        const id = unique('t')
        const real = await createShared('Thing', id)
        const v4 = `__e__${S}/${unique('ev')}`
        const v3 = `__e__${S}/${unique('ev')}`
        expect((await request(`Thing/${id}/onTick`, { a: [v4] })).e).to.equal(undefined)
        expect((await request(`Thing/${id}/onTick`, { a: [v3], v: 3 })).e).to.equal(undefined)
        real.tick(10n)
        await until(() => on(v4.slice(5)).length === 1)
        const [notice] = on(v4.slice(5))
        expect(notice).to.have.all.keys('i', 'e', 'v')
        expect(notice.i).to.equal(v4)
        expect(notice.v).to.equal(4)
        expect(notice.e.message).to.include('cannot be encoded as JSON')
        // a subscriber of protocol 3 would call its handler without arguments
        await sleep(50)
        expect(on(v3.slice(5))).to.deep.equal([])
        // both stay, and get the next event
        real.tick(1)
        await until(() => on(v4.slice(5)).length === 2 && on(v3.slice(5)).length === 1)
        expect(on(v4.slice(5))[1].a).to.deep.equal([1])
        expect(on(v3.slice(5))[0].a).to.deep.equal([1])
      })

      it('tells the sender of a one-shot callback it could not encode (CALL-10)', async () => {
        const id = unique('t')
        await createShared('Thing', id)
        const callback = `__f__${unique('cb')}`
        const big = await request(`Thing/${id}/reply`, { a: [callback, 'big'] })
        expect(big.r).to.equal(true)
        await until(() => inbox.some(m => m.topic === S && m.json && m.json.i === callback))
        const notice = inbox.find(m => m.topic === S && m.json.i === callback).json
        expect(notice).to.have.all.keys('i', 'e', 'v')
        expect(notice.e.message).to.include('cannot be encoded as JSON')
        // towards a sender of protocol 3: nothing
        const old = `__f__${unique('cb')}`
        expect((await request(`Thing/${id}/reply`, { a: [old, 'big'], v: 3 })).r).to.equal(true)
        await sleep(100)
        expect(inbox.some(m => m.topic === S && m.json && m.json.i === old)).to.equal(false)
      })
    })

    describe('callAll', () => {
      it('answers one entry per instance: its value or its error (ALL-2)', async () => {
        await createShared('Pair', unique('ok'), ['ok'])
        await createShared('Pair', unique('sync'), ['sync'])
        await createShared('Pair', unique('async'), ['async'])
        const first = await request('Pair/__static__/__callAll__', { a: ['value'] })
        const { r } = await answerTo(first.r)
        const byMode = Object.fromEntries(
          r.map(entry => [Adapter.getInstance(entry.id).mode, entry])
        )
        expect(byMode.ok).to.deep.equal({ id: byMode.ok.id, val: 1 })
        expect(byMode.sync).to.deep.equal({ id: byMode.sync.id, err: { message: 'sync' } })
        expect(byMode.async).to.deep.equal({ id: byMode.async.id, err: { message: 'async' } })
      })

      it('refuses a function the class info does not list (ALL-1)', async () => {
        const answer = await request('Pair/__static__/__callAll__', { a: ['_mode'] })
        expect(answer.e).to.deep.equal({ message: 'Could not find function: _mode' })
      })
    })

    describe('callMatching', () => {
      const ids = answer => answer.r.map(entry => entry.id).sort()

      it('is listed with the reserved functions (ALL-6)', async () => {
        const topic = `${DOMAIN}/${AGENT}/Pair/__classInfo__`
        await subscribeRaw(topic)
        await until(() => inbox.some(m => m.topic === topic))
        const info = inbox.filter(m => m.topic === topic).pop().json
        expect(info.staticFunctions).to.include.members(['__callAll__', '__callMatching__'])
      })

      it('calls the instances a pattern matches, and answers for those only (ALL-4, ALL-5)', async () => {
        const prefix = unique('select')
        for (const name of ['line-1', 'line-2', 'pump-1']) {
          await createShared('Pair', `${prefix}-${name}`, ['ok'])
        }
        const first = await request('Pair/__static__/__callMatching__', {
          a: [`${prefix}-line-*`, 'value']
        })
        const answer = await answerTo(first.r)
        expect(ids(answer)).to.deep.equal([`${prefix}-line-1`, `${prefix}-line-2`])
        expect(answer.r.every(entry => entry.val === 1)).to.equal(true)
        // `*` anywhere, any number of times; nothing else is special
        const inner = await answerTo(
          (await request('Pair/__static__/__callMatching__', { a: [`${prefix}*-*1`, 'value'] })).r
        )
        expect(ids(inner)).to.deep.equal([`${prefix}-line-1`, `${prefix}-pump-1`])
        const literal = await answerTo(
          (await request('Pair/__static__/__callMatching__', { a: [`${prefix}-line-?`, 'value'] })).r
        )
        expect(literal.r).to.deep.equal([])
      })

      it('takes a list of names and patterns (ALL-4)', async () => {
        const prefix = unique('select')
        for (const name of ['a', 'b', 'c']) {
          await createShared('Pair', `${prefix}-${name}`, ['ok'])
        }
        const first = await request('Pair/__static__/__callMatching__', {
          a: [[`${prefix}-a`, `${prefix}-c*`], 'value']
        })
        expect(ids(await answerTo(first.r))).to.deep.equal([`${prefix}-a`, `${prefix}-c`])
      })

      it('refuses what is no selection, and a function the class info does not list (ALL-4)', async () => {
        for (const selection of [[], [''], '', 42, null]) {
          const answer = await request('Pair/__static__/__callMatching__', { a: [selection, 'value'] })
          expect(answer.e.message, JSON.stringify(selection)).to.include('Invalid selection')
        }
        const answer = await request('Pair/__static__/__callMatching__', { a: ['*', '_mode'] })
        expect(answer.e).to.deep.equal({ message: 'Could not find function: _mode' })
      })

      it('creates no instance whose name has a `*` (TOP-4, INST-2)', async () => {
        const answer = await request('Pair/__static__/__createShared__', { a: ['line-*', 'ok'] })
        expect(answer.e.message).to.include('Invalid instance name')
      })
    })

    describe('a refused subscription', () => {
      it('is retried until the broker grants it (TR-7)', async () => {
        const id = unique('retry')
        let refusals = 1
        broker.refuse = (filter, clientId) =>
          clientId === AGENT_ID && filter.includes(`/Thing/${id}/`) && refusals-- > 0
        try {
          await createShared('Thing', id)
          expect(await request(`Thing/${id}/ping`, { a: [] }, { wait: 300 })).to.equal(null)
          await until(() => agentSubscriptions().includes(`${DOMAIN}/${AGENT}/Thing/${id}/+`))
          expect((await request(`Thing/${id}/ping`, { a: [] })).r).to.equal('pong')
        } finally {
          broker.refuse = null
        }
      })
    })

    describe('unregistering', () => {
      it('leaves no retained message of the agent behind (AG-5)', async () => {
        const leaving = new Agent({
          domain: DOMAIN,
          agent: unique('leaving'),
          broker: broker.url,
          log: quiet
        })
        await leaving.serve()
        const prefix = `${DOMAIN}/${leaving._agent}/`
        await until(() => broker.retainedUnder(prefix).length > 0)
        await leaving.end({ unregister: true })
        await until(() => broker.retainedUnder(prefix).length === 0)
      })
    })

    describe('a client', () => {
      const newClient = async () => {
        const client = new VrpcClient({
          domain: DOMAIN,
          broker: broker.url,
          timeout: 3000,
          log: quiet
        })
        await client.connect()
        return client
      }

      it('finds and deletes the isolated instances it created', async () => {
        const client = await newClient()
        try {
          const id = unique('own')
          const proxy = await client.create({
            agent: AGENT,
            className: 'Thing',
            instance: id,
            isIsolated: true
          })
          expect(await proxy.ping()).to.equal('pong')
          const found = await client.getInstance(id, { noWait: true })
          expect(await found.ping()).to.equal('pong')
          expect(await client.delete(id)).to.equal(true)
          expect(Adapter._instances.has(id)).to.equal(false)
        } finally {
          await client.end()
        }
      })

      it('subscribes on when the broker refuses one of its subscriptions, and retries it (TR-7)', async () => {
        let refusals = 1
        broker.refuse = (filter, clientId) =>
          clientId.startsWith('vc3') && filter.endsWith('/__agentInfo__') && refusals-- > 0
        let client
        try {
          client = new VrpcClient({ domain: DOMAIN, broker: broker.url, timeout: 3000, log: quiet })
          const errors = []
          client.on('error', err => errors.push(err))
          await client.connect()
          // the inbox stands: a call goes through once the retry granted
          // the agent info
          const proxy = await client.create({ agent: AGENT, className: 'Thing', instance: unique('c') })
          expect(await proxy.ping()).to.equal('pong')
          expect(errors.map(err => err.code)).to.include('SUBSCRIBE_FAILED')
        } finally {
          broker.refuse = null
          if (client) await client.end()
        }
      })

      it('leaves no retained message behind when it unregisters an offline agent', async () => {
        const name = unique('gone')
        const leaving = new Agent({ domain: DOMAIN, agent: name, broker: broker.url, log: quiet })
        await leaving.serve()
        const client = await newClient()
        try {
          await until(() => client.getAvailableAgents().includes(name))
          await leaving.end()
          await until(() => client._agents[name] && client._agents[name].status === 'offline')
          expect(await client.unregisterAgent(name)).to.equal(true)
          await until(() => broker.retainedUnder(`${DOMAIN}/${name}/`).length === 0)
        } finally {
          await client.end()
        }
      })
    })
  })
}
