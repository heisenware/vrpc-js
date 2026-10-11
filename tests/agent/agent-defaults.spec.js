'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { expect } = require('chai')

/* global describe, it, after */

// What an agent is when nobody said otherwise: a name that stands for its
// installation (where this vrpc is installed) - the same however and from
// wherever it is started, different for every installation of a user on a
// host - and QoS 0, in code, on the command line and in the browser.

const VRPC = path.resolve(__dirname, '../../vrpc')

// the default name as a fresh process started in `cwd` sees it
const defaultName = (vrpcDir, cwd) =>
  execFileSync(
    process.execPath,
    [
      '-e',
      `process.stdout.write(require(${JSON.stringify(
        path.join(vrpcDir, 'VrpcAgent')
      )})._generateAgentName())`
    ],
    { cwd }
  ).toString()

describe('the default agent name', () => {
  // another installation: a copy of the package (its dependencies resolve
  // from this repository)
  const installation = fs.mkdtempSync(path.join(__dirname, '.installation-'))

  after(() => fs.rmSync(installation, { recursive: true, force: true }))

  it('is the same from wherever the agent is started', () => {
    const names = [os.tmpdir(), path.parse(process.cwd()).root, __dirname].map(
      cwd => defaultName(VRPC, cwd)
    )
    expect(new Set(names).size).to.equal(1)
    const [user, rest] = names[0].split('-', 2)
    expect(user).to.equal(os.userInfo().username)
    expect(rest).to.match(/^[0-9a-f]{4}@/)
    expect(names[0].endsWith(`@${os.hostname()}-${os.platform()}-js`)).to.equal(true)
  })

  it('is another one for another installation', () => {
    fs.cpSync(VRPC, path.join(installation, 'vrpc'), { recursive: true })
    expect(defaultName(path.join(installation, 'vrpc'), os.tmpdir())).to.not.equal(
      defaultName(VRPC, os.tmpdir())
    )
  })
})

// the QoS of an agent the command line makes from these arguments
const commandLineQos = args =>
  Number(
    execFileSync(process.execPath, [
      '-e',
      `process.argv = ['node', 'agent', ...${JSON.stringify(args)}]
      const VrpcAgent = require(${JSON.stringify(path.join(VRPC, 'VrpcAgent'))})
      process.stdout.write(String(VrpcAgent.fromCommandline({ domain: 'd', agent: 'a' })._qos))`
    ]).toString()
  )

describe('the default QoS', () => {
  it('is 0 for an agent made in code', () => {
    const VrpcAgent = require(path.join(VRPC, 'VrpcAgent'))
    expect(new VrpcAgent({ domain: 'd', agent: 'a' })._qos).to.equal(0)
  })

  it('is 0 for an agent made on the command line, 1 with --no-bestEffort', () => {
    expect(commandLineQos([])).to.equal(0)
    expect(commandLineQos(['--bestEffort'])).to.equal(0)
    expect(commandLineQos(['--no-bestEffort'])).to.equal(1)
  })

  it('is 0 for a browser agent', () => {
    const VrpcBrowserAgent = require(path.join(VRPC, 'VrpcBrowserAgent'))
    expect(new VrpcBrowserAgent({ domain: 'd', agent: 'a' })._qos).to.equal(0)
  })
})
