const { VrpcClient } = require('vrpc')

const VrpcClient = new VrpcClient({
  domain: 'public.vrpc',
  agent: '<yourAgent>'
})

async function main () {
  console.log('Why an example at the Bar?')
  const sense = await VrpcClient.callStatic({
    className: 'Bar',
    functionName: 'philosophy'
  })
  console.log(` - Because, ${sense}`)

  // Create an anonymous remote instance of the bar class
  const bar = await VrpcClient.create({ className: 'Bar' })

  console.log('Do you have rum?')
  // NOTE: Every call on the remote instance needs an await
  console.log(await bar.hasDrink('rum') ? ' - Yes' : ' - No')

  console.log('Well, then let\'s get a bottle out of the cellar.')
  await bar.addBottle(
    'rum',
    { brand: 'Don Papa', country: 'Philippines', age: 7 }
  )

  console.log('Now, can I have a drink?')
  console.log(await bar.hasDrink('rum') ? ' - Yes' : ' - No')

  console.log('I would go for a "Dark and Stormy", please.')
  try {
    const ms = await bar.prepareDrink('rum', (answer) => {
      console.log(answer)
    })
    console.log(`Cool, that took only ${ms / 1000} seconds to prepare!`)
  } catch (err) {
    console.log(`Sorry: ${err.message}`)
  }

  console.log('Please tell me once the rum is empty again.')
  await bar.on('empty', ({ brand, country, age }) => {
    console.log(`So sad, the ${age} year old ${brand} from ${country} is empty.`)
  })
  await bar.removeBottle('rum')
  // This disconnects the client (= stops putting work on Node.js' event loop)
  await VrpcClient.end()
}

// Start the script
main().catch(err => console.log(`An error happened: ${err.message}`))
