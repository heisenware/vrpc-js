'use strict'

/* global describe, context, before, after, it */
const { VrpcClient } = require('../../index')
const assert = require('assert')
const sinon = require('sinon')
const { should } = require('chai')

describe('vrpc-client', () => {
  /*******************************
   * construction and connection *
   *******************************/
  describe('construction and connection', () => {
    it('should not construct using bad parameters', async () => {
      assert.throws(
        () => new VrpcClient({ broker: 'mqtt://doesNotWork:1883' }),
        {
          message: 'The domain must be specified'
        }
      )
      assert.throws(
        () =>
          new VrpcClient({
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
          new VrpcClient({
            broker: 'mqtt://doesNotWork:1883',
            domain: 'a/b'
          }),
        {
          message:
            'The domain must NOT contain any of those characters: "+", "/", "#", "*"'
        }
      )
    })
    it('should not connect when constructed using bad broker under default timeout', async () => {
      const client = new VrpcClient({
        broker: 'mqtt://doesNotWork:1883',
        domain: 'test.vrpc'
      })
      await assert.rejects(async () => client.connect(), {
        message: 'Connection trial timed out (> 6000 ms)'
      })
    })
    it('should not connect when constructed using bad broker under different timeout', async () => {
      const client = new VrpcClient({
        broker: 'mqtt://doesNotWork:1883',
        domain: 'test.vrpc',
        timeout: 1000
      })
      await assert.rejects(async () => client.connect(), {
        message: 'Connection trial timed out (> 1000 ms)'
      })
    })
    context('when constructed using good parameters and broker', () => {
      let client
      it('should connect', async () => {
        const connectSpy = sinon.spy()
        client = new VrpcClient({
          broker: 'mqtt://broker',
          domain: 'test.vrpc'
        })
        client.once('connect', connectSpy)
        await client.connect()
        assert(connectSpy.calledOnce)
      })
      it('should provide a proper client id', () => {
        const clientId = client.getClientId()
        assert.strictEqual(typeof clientId, 'string')
        assert(clientId.split('/').length, 3)
      })
      it('should end', async () => {
        await client.end()
      })
    })
    context('when constructed custom MQTT clientId', () => {
      let client
      it('should connect', async () => {
        const connectSpy = sinon.spy()
        client = new VrpcClient({
          broker: 'mqtt://broker',
          domain: 'test.vrpc',
          mqttClientId: 'myMqttClientId'
        })
        client.once('connect', connectSpy)
        await client.connect()
        assert(connectSpy.calledOnce)
      })
      it('should use the custom MQTT client id', () => {
        assert.equal(client._client.options.clientId, 'myMqttClientId')
      })
      it('should end', async () => {
        await client.end()
      })
    })
  })
  /*******************************
   * agent and class information *
   *******************************/
  describe('agent and class information', () => {
    let client
    const agentSpy = sinon.spy()
    const classSpy = sinon.spy()
    before(async () => {
      client = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc',
        timeout: 1000
      })
      client.on('agent', agentSpy)
      client.on('class', classSpy)
      await client.connect()
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    after(async () => {
      client.off('agent', agentSpy)
      client.off('class', classSpy)
      await client.end()
    })
    it('should have received agent information after connect', async () => {
      assert(agentSpy.calledThrice)
      assert(
        agentSpy.calledWith({
          domain: 'test.vrpc',
          agent: 'agent1',
          status: 'online',
          hostname: 'agent1',
          version: ''
        })
      )
      assert(
        agentSpy.calledWith({
          domain: 'test.vrpc',
          agent: 'agent2',
          status: 'online',
          hostname: 'agent2',
          version: ''
        })
      )
      assert(
        agentSpy.calledWith({
          domain: 'test.vrpc',
          agent: 'agent3',
          status: 'offline',
          hostname: 'agent3',
          version: 3
        })
      )
    })
    it('should have received class information after connect', async () => {
      assert.strictEqual(classSpy.callCount, 6)
      assert(
        classSpy.calledWith({
          domain: 'test.vrpc',
          agent: 'agent1',
          className: 'Foo',
          instances: [],
          memberFunctions: [
            'constructor',
            'increment',
            'reset',
            'callback',
            'resolvePromise',
            'rejectPromise',
            'onValue',
            'setMaxListeners',
            'getMaxListeners',
            'emit',
            'addListener',
            'on',
            'prependListener',
            'once',
            'prependOnceListener',
            'removeListener',
            'off',
            'removeAllListeners',
            'listeners',
            'rawListeners',
            'listenerCount',
            'eventNames'
          ],
          // FIXME: Think about hiding the VRPC injected __<function>__ already here
          staticFunctions: [
            'staticIncrement',
            'staticResolvePromise',
            'staticRejectPromise',
            'staticCallback',
            'once',
            'on',
            'EventEmitter',
            'init',
            'listenerCount',
            '__createIsolated__',
            '__createShared__',
            '__callAll__',
            '__delete__'
          ],
          meta: {}
        })
      )
    })
    it('should be possible to unregister the offline agent', async () => {
      const ok = await client.unregisterAgent('agent3')
      assert(ok)
      const agents = Object.keys(client.getSystemInformation())
      assert.strictEqual(agents.length, 2)
      assert(agents.includes('agent1'))
      assert(agents.includes('agent2'))
      const tmpClient = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc'
      })
      const tmpAgentSpy = sinon.spy()
      tmpClient.on('agent', tmpAgentSpy)
      await tmpClient.connect()
      await new Promise(resolve => setTimeout(resolve, 500))
      assert(tmpAgentSpy.calledTwice)
      tmpClient.off('agent', tmpAgentSpy)
      await tmpClient.end()
    })
    it('should not be possible to unregister an online agent', async () => {
      const ok = await client.unregisterAgent('agent1')
      assert(!ok)
      const agents = Object.keys(client.getSystemInformation())
      assert.strictEqual(agents.length, 2)
    })
    it('should not be possible to unregister a non-existing agent', async () => {
      const ok = await client.unregisterAgent('doesNotExist')
      assert(!ok)
      const agents = Object.keys(client.getSystemInformation())
      assert.strictEqual(agents.length, 2)
    })
  })
  /*******************************
   * proxy creation and deletion *
   *******************************/
  describe('proxy creation and deletion', () => {
    let client
    before(async () => {
      client = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc',
        timeout: 5000
      })
      await client.connect()
    })
    after(async () => {
      await client.end()
    })
    it('should not create proxy when no agent is specified', async () => {
      await assert.rejects(async () => client.create({ className: 'Foo' }), {
        message: 'Agent must be specified'
      })
    })
    it('should not create proxy when using good class and bad agent', async () => {
      await assert.rejects(
        async () =>
          client.create({
            agent: 'doesNotExist',
            className: 'Foo'
          }),
        {
          message:
            'Proxy creation for class "Foo" on agent "doesNotExist" and domain "test.vrpc" timed out (> 5000 ms)'
        }
      )
    })
    it('should not create proxy when using bad class and good agent', async () => {
      await assert.rejects(
        async () =>
          client.create({
            agent: 'agent1',
            className: 'DoesNotExist',
            args: []
          }),
        {
          message:
            'Proxy creation for class "DoesNotExist" on agent "agent1" and domain "test.vrpc" timed out (> 5000 ms)'
        }
      )
    })
    context('when using good options but no instance', () => {
      let proxy1
      let proxy2
      const classSpy = sinon.spy()
      const instanceNewSpy = sinon.spy()
      before(() => {
        client.on('class', classSpy)
        client.on('instanceNew', instanceNewSpy)
      })
      after(() => {
        client.off('class', classSpy)
        client.off('instanceNew', classSpy)
      })
      it('should create an isolated proxy using constructor defaults', async () => {
        proxy1 = await client.create({
          agent: 'agent1',
          className: 'Foo',
          isIsolated: true
        })
        const value = await proxy1.increment()
        assert.strictEqual(value, 1)
      })
      it('should create another isolated proxy using custom arguments', async () => {
        proxy2 = await client.create({
          agent: 'agent1',
          className: 'Foo',
          args: [41],
          isIsolated: true
        })
        const value = await proxy2.increment()
        assert.strictEqual(value, 42)
      })
      it('should not have emitted "class" or "instanceNew" event', () => {
        assert(classSpy.notCalled)
        assert(instanceNewSpy.notCalled)
      })
      it('should not list any available instances', () => {
        const instances = client.getAvailableInstances({
          className: 'Foo',
          agent: 'agent1'
        })
        assert.strictEqual(instances.length, 0)
      })
      // FIXME Explicit deletion of isolated proxies is not yet implemented
      it.skip('should delete the isolated instances', async () => {
        const result1 = await client.delete(proxy1)
        const result2 = await client.delete(proxy2)
        assert.strictEqual(result1, true)
        assert.strictEqual(result2, true)
      })
    })
    context('when using good options and instance', () => {
      let proxy1
      let proxy2
      const classSpy = sinon.spy()
      const instanceNewSpy = sinon.spy()
      const instanceGoneSpy = sinon.spy()
      before(() => {
        client.on('class', classSpy)
        client.on('instanceNew', instanceNewSpy)
        client.on('instanceGone', instanceGoneSpy)
      })
      after(() => {
        client.off('class', classSpy)
        client.off('instanceNew', instanceNewSpy)
        client.off('instanceGone', instanceGoneSpy)
      })
      it('should create a shared proxy using constructor defaults', async () => {
        proxy1 = await client.create({
          agent: 'agent1',
          className: 'Foo',
          instance: 'instance1'
        })
        const value = await proxy1.increment()
        assert.strictEqual(value, 1)
      })
      it('should create another shared proxy using custom arguments', async () => {
        proxy2 = await client.create({
          agent: 'agent1',
          className: 'Foo',
          instance: 'instance2',
          args: [41]
        })
        const value = await proxy2.increment()
        assert.strictEqual(value, 42)
      })
      it('should have emitted "class" and "instanceNew" event', () => {
        assert(classSpy.calledTwice)
        assert.deepStrictEqual(classSpy.args[0][0], {
          domain: 'test.vrpc',
          agent: 'agent1',
          className: 'Foo',
          instances: ['instance1'],
          memberFunctions: [
            'constructor',
            'increment',
            'reset',
            'callback',
            'resolvePromise',
            'rejectPromise',
            'onValue',
            'setMaxListeners',
            'getMaxListeners',
            'emit',
            'addListener',
            'on',
            'prependListener',
            'once',
            'prependOnceListener',
            'removeListener',
            'off',
            'removeAllListeners',
            'listeners',
            'rawListeners',
            'listenerCount',
            'eventNames'
          ],
          // FIXME: Think about hiding the VRPC injected __<function>__ already here
          staticFunctions: [
            'staticIncrement',
            'staticResolvePromise',
            'staticRejectPromise',
            'staticCallback',
            'once',
            'on',
            'EventEmitter',
            'init',
            'listenerCount',
            '__createIsolated__',
            '__createShared__',
            '__callAll__',
            '__delete__'
          ],
          meta: {}
        })
        assert(instanceNewSpy.calledTwice)
        assert.deepStrictEqual(instanceNewSpy.args[1][0], ['instance2'])
        assert.deepStrictEqual(instanceNewSpy.args[1][1], {
          domain: 'test.vrpc',
          agent: 'agent1',
          className: 'Foo'
        })
      })
      it('should list the available instances', () => {
        const instances = client.getAvailableInstances({
          className: 'Foo',
          agent: 'agent1'
        })
        assert.deepStrictEqual(instances, ['instance1', 'instance2'])
      })
      it('should delete the shared instances', async () => {
        const result1 = await client.delete('instance1')
        assert.strictEqual(result1, true)
        assert.strictEqual(classSpy.callCount, 3)
        assert.strictEqual(classSpy.args[2][0].instances.length, 1)
        assert.strictEqual(instanceGoneSpy.callCount, 1)
        const result2 = await client.delete('instance2')
        assert.strictEqual(result2, true)
        assert.strictEqual(classSpy.callCount, 4)
        assert.strictEqual(classSpy.args[3][0].instances.length, 0)
        assert.strictEqual(instanceGoneSpy.callCount, 2)
      })
      it('should contain proper instance-, and client ids', () => {
        assert.strictEqual(proxy1.vrpcClientId, client.getClientId())
        assert.strictEqual(proxy1.vrpcInstanceId, 'instance1')
        assert.strictEqual(proxy2.vrpcClientId, client.getClientId())
        assert.strictEqual(proxy2.vrpcInstanceId, 'instance2')
        assert(proxy1.vrpcProxyId !== proxy2.vrpcProxyId)
      })
    })
  })
  /*************************
   * remote function calls *
   *************************/
  describe('remote function calls', () => {
    let client
    before(async () => {
      client = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc'
      })
      await client.connect()
    })
    after(async () => {
      await client.end()
    })
    context('static context', () => {
      it('should work for synchronous functions without arguments', async () => {
        const value = await client.callStatic({
          agent: 'agent1',
          className: 'Foo',
          functionName: 'staticIncrement'
        })
        assert.strictEqual(value, 1)
      })
      it('should work for synchronous functions with arguments', async () => {
        const value = await client.callStatic({
          agent: 'agent1',
          className: 'Bar',
          functionName: 'staticIncrement',
          args: [41]
        })
        assert.strictEqual(value, 42)
      })
      it('should work for resolving asynchronous functions', async () => {
        const value = await client.callStatic({
          agent: 'agent1',
          className: 'Foo',
          functionName: 'staticResolvePromise',
          args: [100]
        })
        assert.strictEqual(value, 'Foo')
      })
      it('should work for rejecting asynchronous functions', async () => {
        await assert.rejects(
          async () => {
            await client.callStatic({
              agent: 'agent1',
              className: 'Foo',
              functionName: 'staticRejectPromise',
              args: [100]
            })
          },
          { message: '[vrpc agent1-Foo-staticRejectPromise]: Test Error: 100' }
        )
      })
      it('should work for functions with callback arguments', async () => {
        const callbackSpy = sinon.spy()
        await client.callStatic({
          agent: 'agent1',
          className: 'Foo',
          functionName: 'staticCallback',
          args: [callbackSpy, 50]
        })
        await new Promise(resolve => setTimeout(resolve, 100))
        assert(callbackSpy.calledOnce)
        assert.strictEqual(callbackSpy.args[0][0], null)
        assert.strictEqual(callbackSpy.args[0][1], 50)
      })
    })
    context('instance context', () => {
      let agent1Foo1
      let agent1Foo2
      let agent2Foo1
      before(async () => {
        agent1Foo1 = await client.create({
          agent: 'agent1',
          className: 'Foo',
          instance: 'agent1Foo1'
        })
        agent1Foo2 = await client.create({
          agent: 'agent1',
          className: 'Foo',
          instance: 'agent1Foo2',
          args: [1]
        })
        agent2Foo1 = await client.create({
          agent: 'agent2',
          className: 'Foo',
          instance: 'agent2Foo1',
          args: [3]
        })
        await client.create({
          agent: 'agent2',
          className: 'Foo',
          instance: 'agent2Foo2',
          args: [3]
        })
      })
      after(async () => {
        await client.delete('agent1Foo1')
      })
      it('should work for synchronous functions', async () => {
        const valueSpy1 = sinon.spy()
        const valueSpy2 = sinon.spy()
        const retOn = await agent1Foo1.on('value', valueSpy1)
        await agent1Foo1.vrpcOn('onValue', valueSpy2)
        assert.strictEqual(retOn, true)
        let value = await agent1Foo1.increment()
        assert.strictEqual(value, 1)
        assert(valueSpy1.calledWith(1))
        assert(valueSpy2.calledWith(1))
        value = await agent1Foo1.increment()
        assert.strictEqual(value, 2)
        assert(valueSpy1.calledWith(2))
        assert(valueSpy2.calledWith(2))
        const retOff = await agent1Foo1.off('value', valueSpy1)
        assert.strictEqual(retOff, true)
        await agent1Foo1.vrpcOff('onValue')
        value = await agent1Foo1.increment()
        assert.strictEqual(value, 3)
        assert(valueSpy1.callCount, 2)
        assert(valueSpy2.callCount, 2)
      })
      it('should work for asynchronous functions', async () => {
        const value = await agent1Foo1.resolvePromise(100)
        assert.strictEqual(value, 3)
      })
      it('should work for functions with callback arguments', async () => {
        const callbackSpy = sinon.spy()
        await agent1Foo1.callback(callbackSpy, 50)
        await new Promise(resolve => setTimeout(resolve, 100))
        assert(callbackSpy.calledOnce)
        assert.strictEqual(callbackSpy.args[0][0], null)
        assert.strictEqual(callbackSpy.args[0][1], 3)
      })
      it('should allow batch-calling synchronous functions on a single agent', async () => {
        const value = await client.callAll({
          agent: 'agent1',
          className: 'Foo',
          functionName: 'increment'
        })
        assert.deepStrictEqual(
          value.map(({ val }) => val),
          [4, 2]
        )
        assert.deepStrictEqual(
          value.map(({ err }) => err),
          [null, null]
        )
        const ids = value.map(({ id }) => id)
        assert(ids.includes('agent1Foo1'))
        assert(ids.includes('agent1Foo2'))
      })
      it('should allow batch-calling asynchronous functions on a single agent', async () => {
        const value = await client.callAll({
          agent: 'agent2',
          className: 'Foo',
          functionName: 'resolvePromise'
        })
        assert.deepStrictEqual(
          value.map(({ val }) => val),
          [3, 3]
        )
        assert.deepStrictEqual(
          value.map(({ err }) => err),
          [null, null]
        )
        const ids = value.map(({ id }) => id)
        assert(ids.includes('agent2Foo1'))
        assert(ids.includes('agent2Foo2'))
      })
      it('should allow batch-calling synchronous functions across agents', async () => {
        const value = await client.callAll({
          className: 'Foo',
          functionName: 'increment'
        })
        assert.deepStrictEqual(
          value.map(({ err }) => err),
          [null, null, null, null]
        )
        const ids = value.map(({ id }) => id)
        assert(ids.includes('agent1Foo1'))
        assert(ids.includes('agent1Foo2'))
        assert(ids.includes('agent2Foo1'))
        assert(ids.includes('agent2Foo2'))
        value.forEach(({ id, val }) => {
          switch (id) {
            case 'agent1Foo1':
              assert(val, 5)
              break
            case 'agent1Foo2':
              assert(val, 3)
              break
            case 'agent2Foo1':
              assert(val, 4)
              break
            case 'agent2Foo2':
              assert(val, 4)
              break
          }
        })
      })
      it('should allow batch-calling asynchronous functions across agents', async () => {
        const value = await client.callAll({
          agent: '*',
          className: 'Foo',
          functionName: 'resolvePromise'
        })
        assert.deepStrictEqual(
          value.map(({ err }) => err),
          [null, null, null, null]
        )
        const ids = value.map(({ id }) => id)
        assert(ids.includes('agent1Foo1'))
        assert(ids.includes('agent1Foo2'))
        assert(ids.includes('agent2Foo1'))
        assert(ids.includes('agent2Foo2'))
        value.forEach(({ id, val }) => {
          switch (id) {
            case 'agent1Foo1':
              assert(val, 5)
              break
            case 'agent1Foo2':
              assert(val, 3)
              break
            case 'agent2Foo1':
              assert(val, 4)
              break
            case 'agent2Foo2':
              assert(val, 4)
              break
          }
        })
      })
      it('should allow batch event-registration on a single agent', async () => {
        const callbackSpy = sinon.spy()
        await client.callAll({
          agent: 'agent1',
          className: 'Foo',
          functionName: 'on',
          args: ['value', callbackSpy]
        })
        await agent1Foo1.increment()
        await new Promise(resolve => setTimeout(resolve, 100))
        assert(callbackSpy.calledOnce)
        assert.strictEqual(callbackSpy.args[0][0], 'agent1Foo1')
        assert.strictEqual(callbackSpy.args[0][1], 6)
        await agent1Foo2.increment()
        await new Promise(resolve => setTimeout(resolve, 100))
        assert(callbackSpy.calledTwice)
        assert.strictEqual(callbackSpy.args[1][0], 'agent1Foo2')
        assert.strictEqual(callbackSpy.args[1][1], 4)
      })
      it('should allow batch event-registration across agents', async () => {
        const callbackSpy = sinon.spy()
        const ret = await client.callAll({
          agent: '*',
          className: 'Foo',
          functionName: 'on',
          args: ['value', callbackSpy]
        })
        // both instances of agent1 were subscribed previously and are correctly
        // skipped here
        assert.deepStrictEqual(
          ret.map(({ val }) => val),
          [true, true]
        )
        await agent1Foo1.increment()
        await new Promise(resolve => setTimeout(resolve, 100))
        assert(callbackSpy.calledOnce)
        assert.strictEqual(callbackSpy.args[0][0], 'agent1Foo1')
        assert.strictEqual(callbackSpy.args[0][1], 7)
        await agent2Foo1.increment()
        await new Promise(resolve => setTimeout(resolve, 100))
        assert(callbackSpy.calledTwice)
        assert.strictEqual(callbackSpy.args[1][0], 'agent2Foo1')
        assert.strictEqual(callbackSpy.args[1][1], 5)
      })
    })
  })
  /******************
   * event handling *
   ******************/
  describe('event handling', () => {
    let client1
    let client2
    before(async () => {
      client1 = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc'
      })
      await client1.connect()
      client2 = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc'
      })
      await client2.connect()
    })
    after(async () => {
      await client1.end()
      await client2.end()
    })
    context('single proxy to single instance', () => {
      let bar
      before(async () => {
        bar = await client1.create({
          agent: 'agent1',
          className: 'Bar',
          instance: 'bar'
        })
      })
      after(async () => {
        await client1.delete('bar')
      })
      it('should properly implement "once"', async () =>{
        const valueSpy = sinon.spy()
        await bar.once('value', valueSpy)
        await bar.increment()
        assert(valueSpy.calledOnce)
        await bar.increment()
        assert(valueSpy.calledOnce)
      })
      it('should properly implement "on/off"', async () => {
        const valueSpy = sinon.spy()
        await bar.on('value', valueSpy)
        await bar.increment()
        assert(valueSpy.calledOnce)
        await bar.increment()
        assert(valueSpy.calledTwice)
        await bar.off('value', valueSpy)
        await bar.increment()
        assert(valueSpy.calledTwice)
        await bar.on('value', valueSpy)
        await bar.increment()
        assert(valueSpy.calledThrice)
      })
      it('should properly handle multiple "on/off"', async () => {
        const valueSpy = sinon.spy()
        await bar.on('value', valueSpy)
        await bar.on('value', valueSpy)
        await bar.increment()
        assert.strictEqual(valueSpy.callCount, 2)
        await bar.increment()
        assert.strictEqual(valueSpy.callCount, 4)
        await bar.off('value', valueSpy)
        await bar.increment()
        assert.strictEqual(valueSpy.callCount, 5)
        await bar.off('value', valueSpy)
        await bar.increment()
        assert.strictEqual(valueSpy.callCount, 5)
      })
      it('should properly handle "removeAllListeners"', async () => {
        const valueSpy = sinon.spy()
        await bar.on('value', valueSpy)
        await bar.on('value', valueSpy)
        await bar.increment()
        assert.strictEqual(valueSpy.callCount, 2)
        await bar.removeAllListeners('value')
        await bar.increment()
        assert.strictEqual(valueSpy.callCount, 2)
      })
    })
    context('multi proxy to single instance', () => {
      let bar1
      let bar2
      before(async () => {
        bar1 = await client1.create({
          agent: 'agent1',
          className: 'Bar',
          instance: 'bar'
        })
        bar2 = await client1.create({
          agent: 'agent1',
          className: 'Bar',
          instance: 'bar'
        })
      })
      after(async () => {
        await client1.delete('bar')
      })
      it('should properly implement "on/off"', async () => {
        const valueSpy1 = sinon.spy()
        const valueSpy2 = sinon.spy()
        await bar1.on('value', valueSpy1)
        await bar2.on('value', valueSpy2)
        await bar1.increment()
        assert(valueSpy1.calledOnce)
        assert(valueSpy2.calledOnce)
        await bar2.increment()
        assert(valueSpy1.calledTwice)
        assert(valueSpy2.calledTwice)
        await bar1.off('value', valueSpy1)
        await bar1.increment()
        assert(valueSpy1.calledTwice)
        assert(valueSpy2.calledThrice)
        await bar2.off('value', valueSpy2)
        await bar2.increment()
        assert(valueSpy1.calledTwice)
        assert(valueSpy2.calledThrice)
        await bar1.on('value', valueSpy1)
        await bar1.increment()
        assert(valueSpy1.calledThrice)
        assert(valueSpy2.calledThrice)
      })
    })
  })
  /*****************
   * proxy caching *
   *****************/

  describe('proxy caching', () => {
    let client
    before(async () => {
      client = new VrpcClient({
        broker: 'mqtt://broker',
        domain: 'test.vrpc'
      })
      await client.connect()
    })
    after(async () => {
      await client.end()
    })
    context('cached context', () => {
      let cachedProxy
      before(async () => {
        cachedProxy = await client.create({
          agent: 'agent1',
          className: 'Foo',
          instance: 'cachedFoo',
          cacheProxy: true
        })
      })
      it('should return the same object when calling getInstance()', async () => {
        const proxy = await client.getInstance('cachedFoo')
        assert(Object.is(cachedProxy, proxy))
      })
      it('should have cleared cache after deletion', async () => {
        await client.delete('cachedFoo')
        assert.rejects(async () =>
          client.getInstance('cachedFoo', { noWait: true })
        )
      })
    })
    context('uncached context', () => {
      let uncachedProxy
      before(async () => {
        uncachedProxy = await client.create({
          agent: 'agent1',
          className: 'Foo',
          instance: 'uncachedFoo'
        })
      })
      after(async () => {
        await client.delete('uncachedFoo')
      })
      it('should return a different object when calling getInstance()', async () => {
        const proxy = await client.getInstance('uncachedFoo')
        assert(!Object.is(uncachedProxy, proxy))
      })
    })
  })
})
