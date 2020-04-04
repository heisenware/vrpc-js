'use strict'

/* global describe, before, after, it */

const { assert } = require('chai')
const { VrpcRemote } = require('../../../index')
const {
  performance,
  PerformanceObserver,
  monitorEventLoopDelay
} = require('perf_hooks')
const Dockerode = require('dockerode')

describe('A single this.client connected to a single agent', () => {

  before(async () => {

    // Create docker instance
    this.docker = new Dockerode()

    // Activate performance observer
    this.ave = []
    const obs = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0]
      this.ave.push(entry.duration)
      console.log(`Time for ('${entry.name}')`, entry.duration)
    })

    obs.observe({ entryTypes: ['measure'], buffered: false })

    // Start this.client
    this.client = new VrpcRemote({
      domain: 'public.vrpc',
      broker: 'mqtt://broker:1883',
      timeout: 10000
    })
    await this.client.connect()
  })

  after(async () => {
    await this.client.end()
  })

  it('should create a multiple proxy instances', async () => {
    this.proxies = []
    for (let i = 0; i < 10; i++) {
      this.proxies.push(this.client.create({ agent: 'agent1', className: 'PlusOne' }))
    }
    this.proxies = await Promise.all(this.proxies)
  })

  it('should not loose messages when calling the agent full speed', async () => {
    for (let i = 1; i <= 100; i++) {
      performance.mark(`${i}b`)
      const values = await Promise.all(this.proxies.map(proxy => proxy.increment()))
      performance.mark(`${i}e`)
      performance.measure(`rpc-online-${i}`, `${i}b`, `${i}e`)
      assert.deepStrictEqual(values, Array(10).fill(i))
    }
    console.log('AVE:', this.ave.reduce((a, b) => (a + b)) / this.ave.length)
    await Promise.all(this.proxies.map(proxy => proxy.reset()))
  })
]
  // NOTE: Reduce the agent's keep-alive to trigger a full re-connect.
  // This test will still pass!
  it('should not even loose messages when the agent is shortly offline', async () => {
    await this.docker.getNetwork('test_vrpc').disconnect({
      Container: 'test_agent1_1',
      Force: true
    })
    setTimeout(async () => {
      await this.docker.getNetwork('test_vrpc').connect({
        Container: 'test_agent1_1'
      })
    }, 5000)
    for (let i = 1; i <= 100; i++) {
      performance.mark(`${i}b`)
      const values = await Promise.all(this.proxies.map(proxy => proxy.increment()))
      performance.mark(`${i}e`)
      performance.measure(`rpc-offline-${i}`, `${i}b`, `${i}e`)
      assert.deepStrictEqual(values, Array(10).fill(i))
    }
  })
})
