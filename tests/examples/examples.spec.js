'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFile } = require('child_process')
const { expect } = require('chai')
const RoutingBroker = require('../subscriptions/routingBroker')

/* global describe, it, before, after */

// The examples run as a reader runs them - the agent example, then the
// client example against it - so that what the documentation shows works.

const root = path.resolve(__dirname, '../..')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('the examples', function () {
  this.timeout(30000)
  let broker
  let agent
  let modules

  before(async () => {
    broker = await new RoutingBroker().start()
    // `require('vrpc')` in an example resolves to this repository
    modules = fs.mkdtempSync(path.join(os.tmpdir(), 'vrpc-examples-'))
    fs.symlinkSync(root, path.join(modules, 'vrpc'))
  })

  after(async () => {
    if (agent) agent.kill()
    await broker.stop()
    fs.rmSync(modules, { recursive: true, force: true })
  })

  it('serve the bar (01-agent) and use it (02-client)', async () => {
    const env = { ...process.env, NODE_PATH: modules }
    agent = spawn(
      process.execPath,
      ['index.js', '--broker', broker.url, '--domain', 'test.examples', '--agent', 'bar'],
      { cwd: path.join(root, 'examples/01-agent'), env, stdio: 'ignore' }
    )
    const start = Date.now()
    while (broker.retainedUnder('test.examples/bar/Bar/').length === 0) {
      if (Date.now() - start > 10000) throw new Error('the agent example did not come up')
      await sleep(50)
    }
    const output = await new Promise((resolve, reject) =>
      execFile(
        process.execPath,
        ['index.js'],
        {
          cwd: path.join(root, 'examples/02-client'),
          env: { ...env, VRPC_BROKER: broker.url, VRPC_DOMAIN: 'test.examples', VRPC_AGENT: 'bar' },
          timeout: 20000
        },
        (err, stdout) => (err ? reject(err) : resolve(stdout))
      )
    )
    expect(output).to.include('Because, I have mixed drinks about feelings.')
    expect(output).to.include("I searched, but couldn't find any bottles")
    expect(output).to.include('Oh, the Coke went empty!')
    expect(output).to.include('Your drink is ready!')
    expect(output).to.not.include('An error happened')
  })
})
