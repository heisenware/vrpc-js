'use strict'
const path = require('path')
const { expect } = require('chai')
const VrpcAdapter = require('../../vrpc/VrpcAdapter')

/* global describe, it, before, after */

// Constructor arguments of a class registered with a schema: validated
// and defaulted in Node; the browser bundle leaves the validator out to
// stay small, warns once and constructs unchecked (#73).

const schema = {
  type: 'object',
  properties: { pressure: { type: 'number', default: 5 } }
}

class Press {
  constructor (options) {
    this.options = options
  }

  read () {
    return this.options
  }
}

describe('constructor schemas', () => {
  describe('in Node', () => {
    before(() => VrpcAdapter.register(Press, { schema }))
    after(() => {
      VrpcAdapter.delete('press-1')
      // other specs count the registered classes
      VrpcAdapter._functionRegistry.delete('Press')
    })

    it('fills in defaults', () => {
      VrpcAdapter.create({ className: 'Press', instance: 'press-1', args: [{}] })
      expect(VrpcAdapter.getInstance('press-1').read()).to.deep.equal({ pressure: 5 })
    })

    it('refuses arguments that do not validate', () => {
      expect(() =>
        VrpcAdapter.create({ className: 'Press', instance: 'press-2', args: [{ pressure: 'high' }] })
      ).to.throw(/must be number/)
    })
  })

  describe('in the browser bundle', () => {
    let BundledAdapter
    const warnings = []
    let warn

    before(() => {
      // the UMD wrapper reads `self` and the bundle `crypto`, which a page
      // has - and Node.js before 19 not globally
      const hadSelf = 'self' in globalThis
      const hadCrypto = 'crypto' in globalThis
      if (!hadSelf) globalThis.self = globalThis
      if (!hadCrypto) globalThis.crypto = require('crypto').webcrypto
      BundledAdapter = require(path.join(__dirname, '../../browser/vrpc.js')).VrpcAdapter
      if (!hadSelf) delete globalThis.self
      if (!hadCrypto) delete globalThis.crypto
      warn = console.warn
      console.warn = message => warnings.push(message)
      BundledAdapter.registerClass(Press, { schema })
    })
    after(() => {
      console.warn = warn
    })

    it('constructs with the arguments as given, and warns once', () => {
      BundledAdapter.create({ className: 'Press', instance: 'p1', args: [{}] })
      BundledAdapter.create({ className: 'Press', instance: 'p2', args: [{ pressure: 'high' }] })
      expect(BundledAdapter.getInstance('p1').read()).to.deep.equal({})
      expect(BundledAdapter.getInstance('p2').read()).to.deep.equal({ pressure: 'high' })
      expect(warnings).to.deep.equal([
        'vrpc: schema validation is not available in the browser build, constructor arguments are not checked'
      ])
    })
  })
})
