'use strict'
const { expect } = require('chai')

// Runtimes before Node 18.18 / 20.4 have no Symbol.dispose and
// Symbol.asyncDispose. There a class's [Symbol.asyncDispose]() becomes a
// method named 'undefined' - offered as a remote method, and sync and async
// dispose collide. vrpc provides Node's own stand-ins, keyed in the symbol
// registry, so a class file and the adapter always meet on one symbol
// (#1705). tests/legacy-runtime/test.sh runs this on Node 16.

const nativeSymbols = typeof Symbol.asyncDispose === 'symbol'
const VrpcAdapter = require('../../vrpc/VrpcAdapter')

class LegacyDisposable {
  constructor () {
    this.calls = []
  }

  ping () {
    return 'pong'
  }

  [Symbol.dispose] () {
    this.calls.push('dispose')
  }

  async [Symbol.asyncDispose] () {
    this.calls.push('asyncDispose')
  }
}

/* global describe, it, before */

describe(`legacy runtime ${process.version}`, () => {
  before(() => {
    VrpcAdapter.register(LegacyDisposable)
    VrpcAdapter.onCallback(() => {})
  })

  it('runs on a runtime without the dispose symbols', function () {
    if (nativeSymbols) this.skip()
  })

  it('provides the dispose symbols under Node\'s registry keys (#1705)', () => {
    expect(typeof Symbol.dispose).to.equal('symbol')
    expect(typeof Symbol.asyncDispose).to.equal('symbol')
    if (nativeSymbols) return
    expect(Symbol.dispose).to.equal(Symbol.for('nodejs.dispose'))
    expect(Symbol.asyncDispose).to.equal(Symbol.for('nodejs.asyncDispose'))
  })

  it('never offers dispose as a remote method (#1705)', () => {
    const { memberFunctions } = VrpcAdapter._functionRegistry.get('LegacyDisposable')
    expect(memberFunctions).to.include('ping')
    expect(memberFunctions).to.not.include('undefined')
  })

  it('disposes on delete (#1705)', async () => {
    const obj = VrpcAdapter.create({ className: 'LegacyDisposable', instance: 'legacy-1' })
    VrpcAdapter._call({ c: 'LegacyDisposable', f: '__delete__', a: ['legacy-1'], s: 'test' })
    await new Promise(resolve => setImmediate(resolve))
    expect(obj.calls).to.deep.equal(['asyncDispose'])
  })
})
