'use strict'

/* global describe, context, before, after, it */
const { VrpcAgent, VrpcClient, VrpcAdapter } = require('../../index')
const assert = require('assert')
const sinon = require('sinon')

class Foo {}

VrpcAdapter.register(Foo)

describe('vrpc-agent', () => {
  /*******************************
   * construction and connection *
   *******************************/
  describe('construction and connection', () => {
    it('should not construct using bad parameters', async () => {
      assert.throws(
        () => new VrpcAgent({ broker: 'mqtt://doesNotWork:1883', domain: null }),
        {
          message: 'The domain must be specified'
        }
      )
      assert.throws(
        () => new VrpcAgent({
          broker: 'mqtt://doesNotWork:1883',
          domain: '*'
        }),
        {
          message: 'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
        }
      )
      assert.throws(
        () => new VrpcAgent({
          broker: 'mqtt://doesNotWork:1883',
          domain: 'a/b'
        }),
        {
          message: 'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
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
      assert.strictEqual(errorSpy.args[0][0].message, 'Connection refused: Not authorized')
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
      assert(clientGoneSpy.called)
      assert(clientGoneSpy.calledWith(client2.getClientId()))
    })
  })
})
