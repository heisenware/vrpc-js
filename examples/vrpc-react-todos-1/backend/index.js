const { VrpcAdapter, VrpcAgent } = require('vrpc')
// Adapts the code and makes it remotely callable
VrpcAdapter.register('./src/Todos')

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
