'use strict'

/* global describe, before, after, it */

const { assert } = require('chai')
const { VrpcRemote } = require('../../../index')
const {
  performance,
  PerformanceObserver
} = require('perf_hooks')
const Dockerode = require('dockerode')

const N_PROXIES = 500
const N_RPC_CALLS = 10

describe('A single client connected to a single agent', () => {
  before(async () => {
    // Create docker instance
    this.docker = new Dockerode()

    // Activate performance observer
    this.ave = []
    const obs = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0]
      this.ave.push(entry.duration)
      console.log(`Time for ${entry.name}`, entry.duration)
    })

    obs.observe({ entryTypes: ['measure'], buffered: false })

    // Start this.client
    this.client = new VrpcRemote({
      domain: 'public.vrpc',
      broker: 'mqtt://broker:1883',
      timeout: 10000,
      bestEffort: true
    })
    await this.client.connect()
  })

  after(async () => {
    await this.client.end()
  })

  it('should create multiple proxy instances', async () => {
    this.proxies = []
    for (let i = 0; i < N_PROXIES; i++) {
      performance.mark(`${i}b`)
      const proxy = await this.client.create({ agent: 'agent1', className: 'PlusOne' })
      this.proxies.push(proxy)
      performance.mark(`${i}e`)
      performance.measure(`proxy-creation-${i}`, `${i}b`, `${i}e`)
    }
    console.log('Average time for proxy-creation', this.ave.reduce((a, b) => (a + b)) / this.ave.length)
    this.ave = []
  })

  it('should not loose messages when calling the agent full speed', async () => {
    for (let i = 1; i <= N_RPC_CALLS; i++) {
      performance.mark(`${i}b`)
      const values = await Promise.all(this.proxies.map(proxy => proxy.increment()))
      performance.mark(`${i}e`)
      performance.measure(`rpc-online-${i}`, `${i}b`, `${i}e`)
      assert.deepStrictEqual(values, Array(N_PROXIES).fill(i))
    }
    console.log('Average time for rpc-online', this.ave.reduce((a, b) => (a + b)) / this.ave.length)
    this.ave = []
    await Promise.all(this.proxies.map(proxy => proxy.reset()))
  })

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
    for (let i = 1; i <= N_RPC_CALLS; i++) {
      performance.mark(`${i}b`)
      const values = await Promise.all(this.proxies.map(proxy => proxy.increment()))
      performance.mark(`${i}e`)
      performance.measure(`rpc-offline-${i}`, `${i}b`, `${i}e`)
      assert.deepStrictEqual(values, Array(N_PROXIES).fill(i))
    }
  })
})
