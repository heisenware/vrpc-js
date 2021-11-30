const { VrpcClient } = require('vrpc')
const EventEmitter = require('events')

// Create an event emitter
const emitter = new EventEmitter()

// Listen to the empty event
emitter.on('empty', what => {
  console.log(` - Oh, the ${what.name} went empty!`)
})

async function main () {

  // Create a remote client
  const VrpcClient = new VrpcClient({
    domain: 'public.vrpc',
    agent: 'bheisen-2d7b@burkhardsXps-linux-js',
    broker: 'mqtts:localhost:8883'
  })

  // Connect it
  await VrpcClient.connect()

  console.log('Why an example at the Bar?')
  const sense = await VrpcClient.callStatic({
    className: 'Bar',
    functionName: 'philosophy'
  })
  console.log(` - Because, ${sense}`)

  // Create an anonymous remote instance of the bar class
  const bar = await VrpcClient.create({ className: 'Bar' })

  // Register an event listener
  await bar.onRemove({ emitter, event: 'empty' })

  console.log('Well then, get me a drink!')
  try {
    // Every call on the remote instance needs an await
    await bar.prepareDrink((done) => console.log(done))
  } catch (err) {
    // We expect this exception to happen
    console.log(` - ${err.message}`)
    console.log(' - I\'ll get some bottles out of the cellar.')
  }

  await bar.addBottle('Don Papa', 'rum', 'Philippines')
  await bar.addBottle('Botucal', 'rum', 'Venezuela')
  await bar.addBottle('Lustau Solera', 'brandy', 'Spain')
  await bar.addBottle('Coke', 'soft', 'USA')

  console.log('Fine, can I have a drink now?')
  const answer = await bar.prepareDrink((done) => console.log(` - ${done}`))
  console.log(` - ${answer}`)

  // let's pretend the coke went empty...
  await bar.removeBottle('Coke')


  // Create another bar - already equipped - using second constructor
  const neighborsBar = await VrpcClient.create({
    className: 'Bar',
    args: [[
      { name: 'Adelholzer', category: 'water', country: 'Germany' },
      { name: 'Hohes C', category: 'juice', country: 'Germany' }
    ]]
  })
  console.log('How is your neighbor sorted?')
  console.log(' - Very well:\n', await neighborsBar.getSelection())

  // This disconnects the client
  await VrpcClient.end()
}

// Start the script
main().catch(err => console.log(`An error happened: ${err.message}`))
