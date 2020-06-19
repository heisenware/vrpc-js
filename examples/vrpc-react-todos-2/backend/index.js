const { VrpcAdapter, VrpcAgent } = require('vrpc')
// Register class "Todos" to be remotely callable
VrpcAdapter.register(require('./src/Todo'))

async function main () {
  try {
    const vrpcAgent = new VrpcAgent({
      agent: 'burkhards-advanced-todos-agent',
      domain: 'public.vrpc'
    })
    await vrpcAgent.serve()
  } catch (err) {
    console.log('VRPC triggered an unexpected error', err)
  }
}

// Start the agent
main()
