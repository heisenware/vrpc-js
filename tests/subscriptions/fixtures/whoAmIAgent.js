'use strict'

// An agent process of its own: Box.whoAmI() answers the agent's name once
// `delay` ms passed. Prints `ready` when it serves.
const { VrpcAdapter, VrpcAgent } = require('../../../index')

const [broker, domain, agent, delay] = process.argv.slice(2)

class Box {
  static whoAmI () {
    return new Promise(resolve => setTimeout(() => resolve(agent), Number(delay)))
  }
}

VrpcAdapter.register(Box)

const quiet = { debug () {}, info () {}, warn () {}, error () {} }
new VrpcAgent({ domain, agent, broker, log: quiet })
  .serve()
  .then(() => process.send('ready'))
