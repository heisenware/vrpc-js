'use strict'

/* global describe, before, after, it */

const { assert } = require('chai')
const process = require('process')
const EventEmitter = require('events')
const { VrpcAdapter, VrpcAgent, VrpcClient } = require('../../index')

class Foo extends EventEmitter {
  constructor (foo) {
    super()
    this._foo = foo
  }

  foo () {
    return this._foo
  }

  async promisedFoo () {
    await new Promise(resolve => setTimeout(resolve, 100))
    return `promised-${this._foo}`
  }

  echo (value) {
    this.emit('echo', value)
    return value
  }
}

class MiniFoo extends Foo {
  constructor (value) {
    super(value)
    this._miniFoo = value
  }
}

class Bar {
  constructor (bar) {
    this._bar = bar
  }

  bar () {
    return this._bar
  }
}

VrpcAdapter.register(Foo)
VrpcAdapter.register(MiniFoo)
VrpcAdapter.register(Bar)

// Top Level
describe('Agent Life-Cycle', () => {
  let agent
  let remote

  describe('Agent up', () => {
    before(async () => {
      agent = new VrpcAgent({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883',
        version: '1.0.0-test'
      })
      await agent.serve()
      remote = new VrpcClient({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883'
      })
      await remote.connect()
    })
    it('VrpcClient should see the agent online', done => {
      const testFunc = ({ domain, agent, status, version }) => {
        if (
          domain === 'test.vrpc' &&
          agent === 'nodeJsTestAgent' &&
          status === 'online' &&
          version === '1.0.0-test'
        ) {
          remote.removeListener('agent', testFunc)
          done()
        }
      }
      remote.on('agent', testFunc)
    })
  })

  describe('Agent down (and unregister)', () => {
    it('VrpcClient should see the agent offline', async () => {
      const promise = new Promise(resolve => {
        const testFunc = ({ domain, agent, status, version }) => {
          if (
            domain === 'test.vrpc' &&
            agent === 'nodeJsTestAgent' &&
            status === 'offline' &&
            version === '1.0.0-test'
          ) {
            remote.removeListener('agent', testFunc)
            resolve()
          }
        }
        remote.on('agent', testFunc)
      })
      await agent.end({ unregister: true })
      await remote.end()
      await promise
    })
    it('a new VrpcClient should not see the agent online', async () => {
      const remoteInner = new VrpcClient({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883'
      })
      await remoteInner.connect()
      const promise = new Promise((resolve, reject) => {
        remoteInner.on('agent', ({ domain, agent, status }) => {
          if (
            domain === 'test.vrpc' &&
            agent === 'nodeJsTestAgent' &&
            status === 'offline'
          ) {
            reject(new Error('Agent should have been unregistered'))
          }
        })
        setTimeout(resolve, 500)
      })
      await remoteInner.connect()
      await promise
      await remoteInner.end()
    })
  })
})

// Top Level
describe('Instance life-cycle', () => {
  let agent
  before(async () => {
    agent = new VrpcAgent({
      domain: 'test.vrpc',
      agent: 'nodeJsTestAgent',
      broker: 'mqtts://vrpc.io:8883'
    })
    await agent.serve()
  })
  after(async () => {
    await agent.end()
  })
  describe('Instances up', () => {
    let remote
    before(async () => {
      remote = new VrpcClient({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883'
      })
      await remote.connect()
    })
    after(async () => {
      await remote.end()
    })
    it('should be possible to start several instances', async () => {
      const newInstances = []
      remote.on('instanceNew', instances => {
        newInstances.push(...instances)
      })
      await remote.create({
        className: 'Foo',
        instance: 'foo-1',
        args: ['foo-1']
      })
      await remote.create({
        className: 'Foo',
        instance: 'foo-2',
        args: ['foo-2']
      })
      await remote.create({
        className: 'Bar',
        instance: 'bar-1',
        args: ['bar-1']
      })
      const foo3 = await remote.create({
        className: 'Foo',
        args: ['foo-3'],
        isIsolated: true
      })
      assert.strictEqual(await foo3.foo(), 'foo-3')
      assert.deepStrictEqual(newInstances, ['foo-1', 'foo-2', 'bar-1'])
    })
    it('should be possible to call functions across all instances', async () => {
      const result = await remote.callAll({
        className: 'Foo',
        functionName: 'foo'
      })
      assert.deepStrictEqual(result, [
        { id: 'foo-1', val: 'foo-1', err: null },
        { id: 'foo-2', val: 'foo-2', err: null }
      ])
    })
    it('should be possible to call async functions across all instances', async () => {
      const result = await remote.callAll({
        className: 'Foo',
        functionName: 'promisedFoo'
      })
      assert.deepStrictEqual(result, [
        { id: 'foo-1', val: 'promised-foo-1', err: null },
        { id: 'foo-2', val: 'promised-foo-2', err: null }
      ])
    })
  })
  describe('Instances attach', () => {
    const inst1 = {}
    let remote
    before(async () => {
      remote = new VrpcClient({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883'
      })
      remote.on('class', ({ className, instances }) => {
        inst1[className] = instances
      })
      await remote.connect()
      await new Promise(resolve => setTimeout(resolve, 1000))
    })
    after(async () => {
      await remote.end()
    })
    it('should be possible to list and attach all instances', async () => {
      assert.deepEqual(inst1, {
        Foo: ['foo-1', 'foo-2'],
        Bar: ['bar-1'],
        MiniFoo: []
      })
      const inst2 = await remote.getAvailableInstances({ className: 'Foo' })
      assert.deepEqual(inst2, ['foo-1', 'foo-2'])
      const foo1 = await remote.getInstance('foo-1', { className: 'Foo' })
      assert.strictEqual(await foo1.foo(), 'foo-1')
      const foo2 = await remote.getInstance('foo-2')
      assert.strictEqual(await foo2.foo(), 'foo-2')
      const bar1 = await remote.getInstance('bar-1', { className: 'Bar' })
      assert.strictEqual(await bar1.bar(), 'bar-1')
      try {
        await remote.getInstance('no-exist')
        assert.isTrue(false)
      } catch (err) {}
    })
    it('should be possible to delete instances', async () => {
      const removed = []
      remote.on('instanceGone', instances => {
        removed.push(...instances)
      })
      await remote.delete('foo-2', { className: 'Foo' })
      const inst2 = await remote.getAvailableInstances({ className: 'Foo' })
      assert.deepEqual(inst1, { Foo: ['foo-1'], Bar: ['bar-1'], MiniFoo: [] })
      assert.deepEqual(inst2, ['foo-1'])
      assert.deepStrictEqual(removed, ['foo-2'])
    })
  })
})

// Top Level
describe('Event Callbacks', () => {
  let agent
  const miniFooEvents = []
  const events1 = []
  const otherEvents1 = []
  const events2 = []
  const otherEvents2 = []
  before(async () => {
    agent = new VrpcAgent({
      domain: 'test.vrpc',
      agent: 'nodeJsTestAgent',
      broker: 'mqtts://vrpc.io:8883'
    })
    await agent.serve()
  })
  after(async () => {
    await agent.end()
  })
  describe('on the same client', () => {
    let remote
    before(async () => {
      remote = new VrpcClient({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883'
      })
      await remote.connect()
    })
    after(async () => {
      await remote.end()
    })
    it('should receive events on fresh instance', async () => {
      const foo = await remote.create({
        className: 'Foo',
        instance: 'foo'
      })
      let ret = await foo.echo(0)
      assert.strictEqual(ret, 0)
      await foo.on('echo', value => events1.push(value))
      ret = await foo.echo(1)
      assert.strictEqual(ret, 1)
      ret = await foo.echo(2)
      assert.strictEqual(ret, 2)
      assert.deepEqual(events1, [1, 2])
      await foo.removeAllListeners('echo')
    })
    it('should further receive events on another instance', async () => {
      const anotherFoo = await remote.create({
        className: 'Foo',
        instance: 'foo'
      })
      let ret = await anotherFoo.echo(3)
      assert.strictEqual(ret, 3)
      await anotherFoo.on('echo', value => otherEvents1.push(value))
      ret = await anotherFoo.echo(4)
      assert.strictEqual(ret, 4)
      ret = await anotherFoo.echo(5)
      assert.strictEqual(ret, 5)
      assert.deepEqual(otherEvents1, [4, 5])
    })
    it('should not have received further events on the original instance', () => {
      assert.deepEqual(events1, [1, 2])
    })
    it('should support callback function based toggling', async () => {
      const localEvents = []
      const foo = await remote.create({
        className: 'Foo',
        instance: 'foo'
      })
      const cb = value => localEvents.push(value)
      const cbo = value => localEvents.push(value)
      await foo.once('echo', cb)
      await foo.on('echo', cb)
      await foo.on('echo', cbo)
      await foo.echo(1)
      await foo.echo(2)
      await foo.removeListener('echo', cb)
      await foo.echo(3)
      await foo.on('echo', cb)
      await foo.echo(4)
      await foo.removeListener('echo', cb)
      await foo.removeListener('echo', cbo)
      assert.deepEqual(localEvents, [1, 1, 1, 2, 2, 3, 4, 4])
    })
    it('should receive events on deep derived instance', async () => {
      const miniFoo = await remote.create({
        className: 'MiniFoo',
        instance: 'miniFoo'
      })
      let ret = await miniFoo.echo(0)
      assert.strictEqual(ret, 0)
      await miniFoo.on('echo', value => miniFooEvents.push(value))
      ret = await miniFoo.echo(1)
      assert.strictEqual(ret, 1)
      ret = await miniFoo.echo(2)
      assert.strictEqual(ret, 2)
      assert.deepEqual(miniFooEvents, [1, 2])
    })
  })
  describe('on another client', () => {
    let remote
    before(async () => {
      remote = new VrpcClient({
        domain: 'test.vrpc',
        agent: 'nodeJsTestAgent',
        broker: 'mqtts://vrpc.io:8883'
      })
      await remote.connect()
    })
    after(async () => {
      await remote.end()
    })
    it('should not receive events from old client and instance', async () => {
      const miniFoo = await remote.create({
        className: 'MiniFoo',
        instance: 'miniFoo'
      })
      let ret = await miniFoo.echo(0)
      assert.strictEqual(ret, 0)
      await miniFoo.on('echo', value => miniFooEvents.push(value))
      ret = await miniFoo.echo(3)
      assert.strictEqual(ret, 3)
      assert.deepEqual(miniFooEvents, [1, 2, 3])
    })
    it('should receive events on fresh instance', async () => {
      const foo = await remote.create({
        className: 'Foo',
        instance: 'foo'
      })
      let ret = await foo.echo(0)
      assert.strictEqual(ret, 0)
      await foo.on('echo', value => events2.push(value))
      ret = await foo.echo(1)
      assert.strictEqual(ret, 1)
      ret = await foo.echo(2)
      assert.strictEqual(ret, 2)
      assert.deepEqual(events2, [1, 2])
      await foo.removeAllListeners('echo')
    })
    it('should further receive events on another instance', async () => {
      const anotherFoo = await remote.create({
        className: 'Foo',
        instance: 'foo'
      })
      let ret = await anotherFoo.echo(3)
      assert.strictEqual(ret, 3)
      await anotherFoo.on('echo', value => otherEvents2.push(value))
      ret = await anotherFoo.echo(4)
      assert.strictEqual(ret, 4)
      ret = await anotherFoo.echo(5)
      assert.strictEqual(ret, 5)
      assert.deepEqual(otherEvents2, [4, 5])
    })
    it('should not have received further events on the original instance', () => {
      assert.deepEqual(events2, [1, 2])
    })
  })
})
