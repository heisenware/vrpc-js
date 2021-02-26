const { VrpcAdapter, VrpcAgent } = require('vrpc')

// Register class "Bar" to be remotely callable
VrpcAdapter.register('./src/Bar')

async function main () {
  try {
    const agent = VrpcAgent.fromCommandline()
    await agent.serve()
  } catch (err) {
    console.log('VRPC triggered an unexpected error', err)
  }
}

// Start the agent
main()
