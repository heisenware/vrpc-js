const os = require('os')
const { VrpcAdapter, VrpcAgent } = require('../../../../index')

class PlusOne {
  constructor () {
    this._value = 0
  }

  increment () {
    this._value += 1
    return this._value
  }

  reset () {
    this._value = 0
  }

  dummy1 () {
    return 'dummy1'
  }

  dummy2 () {
    return 'dummy2'
  }

  dummy3 () {
    return 'dummy3'
  }

  dummy4 () {
    return 'dummy4'
  }

  dummy5 () {
    return 'dummy5'
  }

  dummy6 () {
    return 'dummy6'
  }

  dummy7 () {
    return 'dummy7'
  }

  dummy8 () {
    return 'dummy8'
  }

  dummy9 () {
    return 'dummy9'
  }

  dummy10 () {
    return 'dummy10'
  }
}

VrpcAdapter.register(PlusOne)

async function main () {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const agent = new VrpcAgent({
    domain: 'public.vrpc',
    agent: os.hostname(),
    broker: 'mqtt://broker:1883',
    bestEffort: false
  })
  await agent.serve()
}

main().catch(err => console.error(err))
