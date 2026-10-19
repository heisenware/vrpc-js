const Foo = require('../Foo')
const { VrpcAdapter, VrpcAgent } = require('../../../../index')

VrpcAdapter.register(Foo, { jsdocPath: require.resolve('../Foo') })

async function main () {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const agent = new VrpcAgent({
    domain: 'test.vrpc',
    agent: 'confined',
    broker: 'mqtt://confined-broker:1883',
    username: 'agent',
    password: 'agent'
  })
  await agent.serve()
}

main().catch(err => console.error(err))
