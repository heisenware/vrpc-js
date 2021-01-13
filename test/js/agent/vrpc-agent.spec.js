'use strict'

/* global describe, context, before, after, it */
const { VrpcAgent } = require('../../../index')
const assert = require('assert')
const sinon = require('sinon')

describe('vrpc-agent', () => {
  /*******************************
   * construction and connection *
   *******************************/
  describe('construction and connection', () => {
    it('should not construct using bad parameters', async () => {
      assert.throws(
        () => new VrpcAgent({ broker: 'mqtt://doesNotWork:1883' }),
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
      assert.throws(
        () => new VrpcAgent({
          broker: 'mqtt://doesNotWork:1883',
          domain: 'test.vrpc'
        }),
        {
          message: 'The agent must be specified'
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
    })
  })
})
