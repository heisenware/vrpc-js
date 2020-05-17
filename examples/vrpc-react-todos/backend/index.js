const { VrpcAdapter, VrpcAgent } = require('vrpc')
// Register class "Todos" to be remotely callable
VrpcAdapter.register(require('./src/Todos'))

async function main () {
  try {
    const vrpcAgent = new VrpcAgent({
      agent: 'burkhards-todos-agent',
      domain: 'public.vrpc'
    })
    await vrpcAgent.serve()
  } catch (err) {
    console.log('VRPC triggered an unexpected error', err)
  }
}

// Start the agent
main()
