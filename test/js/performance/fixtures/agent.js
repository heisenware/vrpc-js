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
}

VrpcAdapter.register(PlusOne)

async function main () {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const agent = new VrpcAgent({
    domain: 'public.vrpc',
    agent: os.hostname(),
    broker: 'mqtt://broker:1883'
  })
  await agent.serve()
}

main().catch(err => console.error(err))
