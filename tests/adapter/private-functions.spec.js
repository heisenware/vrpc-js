'use strict'

const { expect } = require('chai')
const Adapter = require('../../vrpc/VrpcAdapter')
const { Gate, Barrier } = require('./fixtures/TestPrivate')

/* global describe, it, before, after */

// What a class keeps inside: a #private method (the language's own), a
// name beginning with an underscore, and - when the agent reads the
// class's JSDoc - a function tagged @private or @access private. None is
// listed in the class info, so none can be called (CALL-1).

const call = json => JSON.parse(Adapter.call(JSON.stringify(json)))
const sender = 'test/private/conn'
const docs = './fixtures/TestPrivate.js'

describe('functions a class keeps inside', () => {
  const info = className => ({
    member: Adapter._getMemberFunctionsArray(className),
    static: Adapter._getStaticFunctionsArray(className)
  })

  before(() => {
    Adapter.register(Gate, { jsdocPath: docs })
    Adapter.register(Barrier, { jsdocPath: docs })
    call({ c: 'Gate', f: '__createShared__', a: ['gate1'], i: 'c', s: sender })
  })

  after(() => {
    Adapter._instances.delete('gate1')
    Adapter._functionRegistry.delete('Gate')
    Adapter._functionRegistry.delete('Barrier')
  })

  it('lists none of them, and the rest of the class', () => {
    const { member, static: statics } = info('Gate')
    expect(member).to.include.members(['open', 'start', 'reveal'])
    expect(member).to.not.include.members(['calibrate'])
    expect(member).to.not.include('_helper')
    expect(member.some(f => f.includes('secret'))).to.equal(false)
    expect(statics).to.include('count')
    expect(statics).to.not.include('reset')
  })

  it('hides by the class a tag is in, and by static or member', () => {
    const barrier = info('Barrier')
    expect(barrier.member).to.include('lower')
    expect(barrier.member).to.not.include('start') // private on the barrier
    expect(barrier.static).to.not.include('open') // its static open
    const gate = info('Gate')
    expect(gate.member).to.include.members(['start', 'open']) // public on the gate
    expect(gate.static).to.include('count') // the private count is outside every class
  })

  it('answers a call of a hidden function with an error, and runs the others', () => {
    for (const f of ['calibrate', '_helper', '#secret', 'secret']) {
      const answer = call({ c: 'gate1', f, a: [], i: f, s: sender })
      expect(answer.e, f).to.be.an('object')
      expect(answer).to.not.have.property('r')
    }
    const reset = call({ c: 'Gate', f: 'reset', a: [], i: 'reset', s: sender })
    expect(reset.e).to.be.an('object')
    expect(call({ c: 'gate1', f: 'open', a: [], i: 'o', s: sender }).r).to.equal('open')
    expect(call({ c: 'gate1', f: 'reveal', a: [], i: 'v', s: sender }).r).to.equal('secret')
  })

  it("keeps a hidden function's documentation inside, too", () => {
    const meta = Adapter._getMetaData('Gate')
    expect(meta).to.include.keys('open', 'start', 'reveal', 'count')
    expect(meta).to.not.have.any.keys('calibrate', 'reset', '_helper')
    expect(meta.start.description).to.equal(
      'Starts the gate - private on the barrier below, public here'
    )
  })

  it('publishes everything with onlyPublic: false', () => {
    Adapter.register(Gate, { jsdocPath: docs, onlyPublic: false })
    expect(info('Gate').member).to.include.members(['calibrate', '_helper'])
    expect(info('Gate').static).to.include('reset')
    Adapter.register(Gate, { jsdocPath: docs })
  })

  it('cannot see @private without the JSDoc: then a #private method keeps it inside', () => {
    Adapter.register(Gate)
    expect(info('Gate').member).to.include('calibrate')
    expect(info('Gate').member.some(f => f.includes('secret'))).to.equal(false)
    Adapter.register(Gate, { jsdocPath: docs })
  })
})
