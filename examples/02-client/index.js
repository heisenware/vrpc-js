const { VrpcClient } = require('vrpc')

async function main () {
  // create a remote client
  const client = new VrpcClient({
    domain: 'public.vrpc',
    agent: `<yourBarAgent>`
  })

  // connect it
  await client.connect()

  console.log('Why an example at the Bar?')
  const sense = await client.callStatic({
    className: 'Bar',
    functionName: 'philosophy'
  })
  console.log(` - Because, ${sense}`)

  // create an anonymous remote instance of the bar class
  const bar = await client.create({ className: 'Bar' })

  // register an event listener
  await bar.vrpcOn('onRemove', what =>
    console.log(` - Oh, the ${what.name} went empty!`)
  )

  console.log('Well then, get me a drink!')
  try {
    // every call on the remote instance needs an await
    await bar.prepareDrink(done => console.log(done))
  } catch (err) {
    // we expect this exception to happen
    console.log(` - ${err.message}`)
    console.log(" - I'll get some bottles out of the cellar.")
  }

  await bar.addBottle('Don Papa', 'rum', 'Philippines')
  await bar.addBottle('Botucal', 'rum', 'Venezuela')
  await bar.addBottle('Lustau Solera', 'brandy', 'Spain')
  await bar.addBottle('Coke', 'soft', 'USA')

  console.log('Fine, can I have a drink now?')
  const answer = await bar.prepareDrink(done => console.log(` - ${done}`))
  console.log(` - ${answer}`)

  // let's pretend the coke went empty...
  await bar.removeBottle('Coke')

  // create another bar - already equipped - using second constructor
  const neighborsBar = await client.create({
    className: 'Bar',
    args: [
      [
        { name: 'Adelholzer', category: 'water', country: 'Germany' },
        { name: 'Hohes C', category: 'juice', country: 'Germany' }
      ]
    ]
  })
  console.log('How is your neighbor sorted?')
  console.log(' - Not so well...\n', await neighborsBar.getSelection())

  // give the bartender a bit of time to get the drink ready
  await new Promise(resolve => setTimeout(resolve, 1000))

  // this disconnects the client
  await client.end()
}

// start the script
main().catch(err => console.log(`An error happened: ${err.message}`))
