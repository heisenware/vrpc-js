'use strict'

/* global describe, context, before, after, afterEach, it */
const { VrpcAgent, VrpcClient, VrpcAdapter } = require('../../index')
const assert = require('assert')
const sinon = require('sinon')
const EventEmitter = require('events')

class Foo {
  ping () {
    return 'pong'
  }
}

class Bar extends EventEmitter {
  constructor () {
    super()
    this._value = 0
  }

  increment () {
    this._value += 1
    this.emit('value', this._value)
    return this._value
  }
}

VrpcAdapter.register(Foo)
VrpcAdapter.register(Bar)

describe('vrpc-agent', () => {
  /*******************************
   * construction and connection *
   *******************************/
  describe('construction and connection', () => {
    it('should not construct using bad parameters', async () => {
      assert.throws(
        () =>
          new VrpcAgent({ broker: 'mqtt://doesNotWork:1883', domain: null }),
        {
          message: 'The domain must be specified'
        }
      )
      assert.throws(
        () =>
          new VrpcAgent({
            broker: 'mqtt://doesNotWork:1883',
            domain: '*'
          }),
        {
          message:
            'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
        }
      )
      assert.throws(
        () =>
          new VrpcAgent({
            broker: 'mqtt://doesNotWork:1883',
            domain: 'a/b'
          }),
        {
          message:
            'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
        }
      )
    })
    it('should not connect when constructed using bad broker', async () => {
      const offlineSpy = sinon.spy()
      const reconnectSpy = sinon.spy()
      const agent = new VrpcAgent({
        broker: 'mqtt://doesNotWork:1883',
        domain: 'test.vrpc',
        agent: 'agent1'
      })
      agent.on('offline', offlineSpy)
      agent.on('reconnect', reconnectSpy)
      agent.on('reconnect', () => agent.end())
      await agent.serve()
      assert(offlineSpy.calledOnce)
      assert(reconnectSpy.calledOnce)
    })
    it('should not connect when access is denied as of wrong credentials', async () => {
      const errorSpy = sinon.spy()
      const reconnectSpy = sinon.spy()
      const agent = new VrpcAgent({
        broker: 'mqtt://broker:1883',
        domain: 'test.vrpc',
        agent: 'agent1',
        username: 'does',
        password: 'not exist'
      })
      agent.on('error', errorSpy)
      agent.on('reconnect', reconnectSpy)
      agent.on('reconnect', () => agent.end())
      await agent.serve()
      assert.strictEqual(
        errorSpy.args[0][0].message,
        'Connection refused: Not authorized'
      )
      assert(reconnectSpy.calledOnce)
    })
    context('when constructed using good parameters and broker', () => {
      let agent
      it('should connect', async () => {
        const errorSpy = sinon.spy()
        const reconnectSpy = sinon.spy()
        const connectSpy = sinon.spy()
        agent = new VrpcAgent({
          broker: 'mqtt://broker:1883',
          domain: 'test.vrpc',
          agent: 'agent1',
          username: 'Erwin',
          password: '12345'
        })
        agent.on('error', errorSpy)
        agent.on('reconnect', reconnectSpy)
        agent.on('connect', connectSpy)
        await agent.serve()
        assert(errorSpy.notCalled)
        assert(reconnectSpy.notCalled)
        assert(connectSpy.calledOnce)
      })
      it('should end', async () => {
        await agent.end()
      })
      it('should connect with custom clientId', async () => {
        const errorSpy = sinon.spy()
        const reconnectSpy = sinon.spy()
        const connectSpy = sinon.spy()
        agent = new VrpcAgent({
          broker: 'mqtt://broker:1883',
          domain: 'test.vrpc',
          agent: 'agent1',
          username: 'Erwin',
          password: '12345',
          mqttClientId: 'myMqttClientId'
        })
        agent.on('error', errorSpy)
        agent.on('reconnect', reconnectSpy)
        agent.on('connect', connectSpy)
        await agent.serve()
        assert(errorSpy.notCalled)
        assert(reconnectSpy.notCalled)
        assert(connectSpy.calledOnce)
        assert.equal(agent._client.options.clientId, 'myMqttClientId')
      })
      it('should end as well', async () => {
        await agent.end()
      })
    })

    context('when dealing with failed subscribe calls', () => {
      const mockSubscribeFunction = (topic, options, callback) => {
        const topicArray = Array.isArray(topic) ? topic : [topic]
        const resultArray = topicArray.map(x => {
          return {
            topic: x,
            qos:
              options.outputQos === undefined ? options.qos : options.outputQos
          }
        })
        callback(null, resultArray)
      }
      const agent = new VrpcAgent({
        username: 'does',
        password: 'not exist',
        bestEffort: false
      })
      // Install a mock mqtt client object
      agent._client = {
        subscribe: mockSubscribeFunction
      }
      // a refusal now arms a retry timer: none may leak into the next test
      afterEach(() => agent._subscribeRetrier.cancel())
      it('should correctly report error on subscribe with qos=128', () => {
        const errorSpy = sinon.spy()
        agent.on('error', errorSpy)

        agent._mqttSubscribe('foo')
        assert(errorSpy.notCalled) // all fine

        agent._mqttSubscribe(['foo', 'bar'])
        assert(errorSpy.notCalled) // all fine

        // now mock a failed subscription
        agent._mqttSubscribe('foo', { outputQos: 128 })
        assert.strictEqual(errorSpy.args[0][0].code, 'SUBSCRIBE_FAILED')
        assert.strictEqual(
          errorSpy.args[0][0].message,
          'Could not subscribe all 1 topic(s) but got error qos=128 on following 1 topic(s): foo'
        )

        agent.off('error', errorSpy)
      })
      it('should retry a refused subscription until the broker grants it (#1496)', () => {
        const clock = sinon.useFakeTimers()
        const errorSpy = sinon.spy()
        agent.on('error', errorSpy)
        // the broker refuses 'baz' twice, then grants it
        let refusals = 2
        const subscribeSpy = sinon.spy((topic, options, callback) => {
          const topicArray = Array.isArray(topic) ? topic : [topic]
          const qos = refusals > 0 ? 128 : options.qos
          refusals -= 1
          callback(null, topicArray.map(x => ({ topic: x, qos })))
        })
        agent._client = { subscribe: subscribeSpy }
        try {
          agent._mqttSubscribe('baz')
          assert.strictEqual(errorSpy.callCount, 1)
          assert.deepEqual(agent._subscribeRetrier.pending, ['baz'])
          clock.tick(1000)
          assert.strictEqual(subscribeSpy.callCount, 2) // refused again
          assert.strictEqual(errorSpy.callCount, 2)
          clock.tick(2000)
          assert.strictEqual(subscribeSpy.callCount, 3) // granted
          assert.strictEqual(errorSpy.callCount, 2)
          assert.deepEqual(agent._subscribeRetrier.pending, [])
          clock.tick(60000)
          assert.strictEqual(subscribeSpy.callCount, 3) // and stays quiet
        } finally {
          agent.off('error', errorSpy)
          agent._client = { subscribe: mockSubscribeFunction }
          agent._subscribeRetrier.cancel()
          clock.restore()
        }
      })
      it('should correctly report error on subscribe where qos=0 is returned', () => {
        const errorSpy = sinon.spy()
        agent.on('error', errorSpy)

        // and now mock a subscription with reduced qos
        agent._mqttSubscribe('foo', { outputQos: 0 })
        assert.strictEqual(errorSpy.args[0][0].code, 'SUBSCRIBE_REDUCED_QOS')
        assert.strictEqual(
          errorSpy.args[0][0].message,
          'Could not subscribe all 1 topic(s) at desired qos=1 but got reduced qos on following 1 topic(s): [{"topic":"foo","qos":0}]'
        )

        agent.off('error', errorSpy)
      })
      it('should correctly not report error on subscribe with qos=0 if bestEffort=true', () => {
        const bestEffortAgent = new VrpcAgent({
          username: 'does',
          password: 'not exist',
          bestEffort: true // now with "true" here
        })
        // Install a mock mqtt client object
        bestEffortAgent._client = {
          subscribe: mockSubscribeFunction
        }
        const errorSpy = sinon.spy()
        bestEffortAgent.on('error', errorSpy)

        // and now mock a subscription with qos=0 but this is also intended
        bestEffortAgent._mqttSubscribe('foo', { outputQos: 0 })
        assert(errorSpy.notCalled) // all fine
      })
    })
  })
  /***************************
   * serving before announcing *
   ***************************/
  describe('serving before announcing', () => {
    // A request published against an announced instance before its topic
    // is subscribed is lost (QoS 0): the announcement must wait for the
    // broker's answer to every subscription, statics and instances alike.
    it('should subscribe the request topics of every existing instance before it announces itself', () => {
      const agent = new VrpcAgent({
        domain: 'test.vrpc',
        agent: 'agent-order',
        username: 'does',
        password: 'not exist',
        bestEffort: true
      })
      // collected before the connection exists (3.10.1)
      agent.create({ className: 'Foo', instance: 'foo-served-first' })
      const events = []
      const subacks = []
      agent._client = {
        subscribe: (topic, options, callback) => {
          const topics = Array.isArray(topic) ? topic : [topic]
          events.push(`subscribe ${topics.join(',')}`)
          subacks.push(() =>
            callback(
              null,
              topics.map(x => ({ topic: x, qos: options.qos }))
            )
          )
        },
        publish: (topic, message, options, callback) => {
          events.push(`publish ${topic}`)
          if (callback) callback()
        }
      }
      const connectSpy = sinon.spy()
      agent.on('connect', connectSpy)
      try {
        agent._handleConnect()
        // every request topic is asked for, nothing is announced yet
        assert(
          events.includes(
            'subscribe test.vrpc/agent-order/Foo/foo-served-first/+'
          )
        )
        assert(events.every(x => x.startsWith('subscribe')))
        assert(connectSpy.notCalled)
        // the broker answers all but one subscription: still silent
        while (subacks.length > 1) subacks.shift()()
        assert(events.every(x => x.startsWith('subscribe')))
        assert(connectSpy.notCalled)
        // the last answer: agent and class info go out, then 'connect'
        subacks.shift()()
        assert(events.includes('publish test.vrpc/agent-order/__agentInfo__'))
        assert(
          events.includes('publish test.vrpc/agent-order/Foo/__classInfo__')
        )
        assert(connectSpy.calledOnce)
      } finally {
        agent.off('connect', connectSpy)
        VrpcAdapter.delete('foo-served-first')
      }
    })
    it('should let a connection that ended meanwhile announce nothing', () => {
      const agent = new VrpcAgent({
        domain: 'test.vrpc',
        agent: 'agent-order',
        username: 'does',
        password: 'not exist',
        bestEffort: true
      })
      const events = []
      const subacks = []
      agent._client = {
        subscribe: (topic, options, callback) => {
          const topics = Array.isArray(topic) ? topic : [topic]
          subacks.push(() =>
            callback(
              null,
              topics.map(x => ({ topic: x, qos: options.qos }))
            )
          )
        },
        publish: topic => events.push(`publish ${topic}`)
      }
      agent._handleConnect()
      const first = subacks.splice(0)
      // the connection dropped and came back: a second preparation
      agent._handleConnect()
      const second = subacks.splice(0)
      first.forEach(x => x())
      assert.strictEqual(events.length, 0)
      second.forEach(x => x())
      assert(events.includes('publish test.vrpc/agent-order/__agentInfo__'))
    })
  })
  /**************************
   * signalling client gone *
   **************************/
  describe('knowing when a client exited', () => {
    const clientGoneSpy = sinon.spy()
    let agent
    let client1
    let client2
    before(async () => {
      agent = new VrpcAgent({
        broker: 'mqtt://broker:1883',
        domain: 'test.vrpc',
        agent: 'agent2',
        username: 'Erwin',
        password: '12345'
      })
      await agent.serve()
      agent.on('clientGone', clientGoneSpy)
      client1 = new VrpcClient({
        broker: 'mqtt://broker:1883',
        domain: 'test.vrpc',
        username: 'Erwin',
        password: '12345'
      })
      await client1.connect()
      client2 = new VrpcClient({
        broker: 'mqtt://broker:1883',
        domain: 'test.vrpc',
        username: 'Erwin',
        password: '12345'
      })
      await client2.connect()
      await client2.create({
        agent: 'agent2',
        className: 'Foo',
        instance: 'foo'
      })
    })
    after(async () => {
      agent.end()
    })
    it('should not signal when any client is gone', async () => {
      await client1.end()
      assert(clientGoneSpy.notCalled)
    })
    it('should signal when an involved client is gone', async () => {
      await client2.end()
      // end() resolves when the offline message left the socket; give the
      // in-process agent a moment to receive and handle it
      await new Promise(resolve => setTimeout(resolve, 200))
      assert(clientGoneSpy.called)
      // the connection that ended, with the identity it belonged to
      assert(
        clientGoneSpy.calledWith(client2.getConnectionId(), {
          clientId: client2.getClientId()
        })
      )
    })
  })
  /**********************************
   * connections sharing an identity *
   **********************************/
  describe('connections sharing an identity', () => {
    // Two browser tabs of one user: two connections, one identity. Ending
    // one of them must not touch the event listeners of the other.
    const broker = 'mqtt://broker:1883'
    const domain = 'test.vrpc'
    const identity = 'app1:erwin'
    const credentials = { username: 'Erwin', password: '12345' }
    const clientGoneSpy = sinon.spy()
    const valueSpyA = sinon.spy()
    const valueSpyB = sinon.spy()
    let agent
    let tabA
    let tabB
    let barA
    let barB
    before(async () => {
      agent = new VrpcAgent({ broker, domain, agent: 'agent4', ...credentials })
      await agent.serve()
      agent.on('clientGone', clientGoneSpy)
      tabA = new VrpcClient({ broker, domain, identity, ...credentials })
      tabB = new VrpcClient({ broker, domain, identity, ...credentials })
      await tabA.connect()
      await tabB.connect()
      barA = await tabA.create({
        agent: 'agent4',
        className: 'Bar',
        instance: 'sharedBar'
      })
      barB = await tabB.create({
        agent: 'agent4',
        className: 'Bar',
        instance: 'sharedBar'
      })
      await barA.on('value', valueSpyA)
      await barB.on('value', valueSpyB)
    })
    after(async () => {
      await tabB.end()
      agent.end()
    })
    it('should share the client id but not the connection id', () => {
      assert.strictEqual(tabA.getClientId(), tabB.getClientId())
      assert.notStrictEqual(tabA.getConnectionId(), tabB.getConnectionId())
      assert.strictEqual(tabA.getConnectionId().split('/').length, 3)
      assert(tabA.getConnectionId().startsWith('test.vrpc/'))
      assert.notStrictEqual(
        tabA.getConnectionId().split('/')[1],
        tabB.getConnectionId().split('/')[1]
      )
      assert.strictEqual(barA.vrpcClientId, barB.vrpcClientId)
      assert.notStrictEqual(barA.vrpcConnectionId, barB.vrpcConnectionId)
    })
    it('should deliver events to both connections', async () => {
      await barA.increment()
      await new Promise(resolve => setTimeout(resolve, 200))
      assert(valueSpyA.calledWith(1))
      assert(valueSpyB.calledWith(1))
    })
    it('should signal the ended connection together with its identity', async () => {
      await tabA.end()
      await new Promise(resolve => setTimeout(resolve, 500))
      assert(clientGoneSpy.calledOnce)
      assert(
        clientGoneSpy.calledWith(tabA.getConnectionId(), {
          clientId: tabA.getClientId()
        })
      )
    })
    it('should keep the surviving connection subscribed', async () => {
      await barB.increment()
      await new Promise(resolve => setTimeout(resolve, 200))
      assert(valueSpyB.calledWith(2))
      assert.strictEqual(valueSpyA.callCount, 1)
    })
  })
  /***************************
   * local instance creation *
   ***************************/
  describe('creating instances locally', () => {
    const instanceNewSpy = sinon.spy()
    let agent
    let client
    before(async () => {
      agent = new VrpcAgent({
        broker: 'mqtt://broker:1883',
        domain: 'test.vrpc',
        agent: 'agent3',
        username: 'Erwin',
        password: '12345'
      })
      await agent.serve()
      client = new VrpcClient({
        broker: 'mqtt://broker:1883',
        domain: 'test.vrpc',
        username: 'Erwin',
        password: '12345'
      })
      await client.connect()
    })
    after(async () => {
      client.end()
      agent.end()
    })
    it('should be possible to create an instance using the agent', async () => {
      client.on('instanceNew', instanceNewSpy)
      agent.create({
        agent: 'agent3',
        className: 'Foo',
        instance: 'locallyCreatedFoo'
      })
      const proxy = await client.getInstance('locallyCreatedFoo')
      const value = await proxy.ping()
      assert.equal(value, 'pong')
      assert(instanceNewSpy.called)
    })
  })
})
