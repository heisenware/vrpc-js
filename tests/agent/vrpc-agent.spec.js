'use strict'

/* global describe, context, before, after, it */
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
      assert(clientGoneSpy.calledWith(client2.getClientId()))
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
      assert(tabA.getConnectionId().startsWith(tabA.getClientId()))
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
