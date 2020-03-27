# Example - "Remote conversation at the bar"

In the NodeAgent example we prepared some code that representing a bar. This
code includes some NodeJS language features like classes, static functions,
asynchronous functions, event-emitter callbacks, exceptions and promise
rejections.

Let's see how VRPC handles all this cases and how it feels to use the bar
remotely...

> **NOTE**
>
> In order to follow this example from scratch, make sure you ran through the
> *NodeAgent* example and have the agent online.
>
> Once done, start with a new
> directory (e.g. `vrpc-node-client-example`), cd into it and run:
>
> ```bash
> npm init -f -y
> npm install vrpc
> ```

## STEP 1: Write a program to remote-control the Bar

Let's write a little program that is capable to remotely call the functions
as registered by the `barAgent`.

The only VRPC component needed is the `VrpcRemote` client.

> **Important**
>
> The C++ agent and the NodeJS agent examples are a bit different, as the NodeJS
> agent uses custom language features not easily available under C++.
> Hence, depending on the agent type you started please select the corresponding
> client implementation.

### Client for NodeJS agent

*index.js*

```javascript
const { VrpcRemote } = require('vrpc')

async function main () {

  // Create a remote client
  const vrpcRemote = new VrpcRemote({
    domain: 'public.vrpc',
    agent: '<yourAgent>'
  })
  // Connect it
  await vrpcRemote.connect()

  console.log('Why an example at the Bar?')
  const sense = await vrpcRemote.callStatic({
    className: 'Bar',
    functionName: 'philosophy'
  })
  console.log(` - Because, ${sense}`)

  // Create an anonymous remote instance of the bar class
  const bar = await vrpcRemote.create({ className: 'Bar' })

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
    console.log(`Cool, that took only ${ms} ms to prepare!`)
  } catch (err) {
    console.log(`Sorry: ${err.message}`)
  }

  console.log('Please tell me once the rum is empty again.')
  await bar.on('empty', ({ brand, country, age }) => {
    console.log(`So sad, the ${age} year old ${brand} from ${country} is empty.`)
  })
  await bar.removeBottle('rum')
  // This disconnects the client (= stops putting work on NodeJS' event loop)
  await vrpcRemote.end()
}

// Start the script
main().catch(err => console.log(`An error happened: ${err.message}`))
```

### Client for C++ agent

*index.js*
```javascript
const { VrpcRemote } = require('vrpc')
const EventEmitter = require('events')

const vrpcRemote = new VrpcRemote({
  domain: 'public.vrpc',
  agent: '<yourAgent>'
})

async function main () {
  console.log('Why an example at the Bar?')
  const sense = await vrpcRemote.callStatic({
    className: 'Bar',
    functionName: 'philosophy'
  })
  console.log(` - Because, ${sense}`)

  // Create an anonymous remote instance of the bar class
  const bar = await vrpcRemote.create({ className: 'Bar' })

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
    await bar.prepareDrink((s) => {
      console.log(`Cool, that took only ${s} seconds to prepare!`)
    })
  } catch (err) {
    console.log(`Sorry: ${err.message}`)
  }

  console.log('Please tell me once the rum is empty again.')
  const emitter = new EventEmitter()
  emitter.on('empty', type => console.log(`So sad, the ${type} is empty.`))
  await bar.onEmptyDrink({ emitter, event: 'empty' })
  await bar.removeBottle('rum')

  // Create another bar - already equipped - using second constructor
  const neighborsBar = await vrpcRemote.create({
    className: 'Bar',
    args: [{
      rum: [
        { brand: 'Botucal', country: 'Venezuela', age: 8 },
        { brand: 'Plantation XO', country: 'Barbados', age: 20 }
      ],
      brandy: [
        { brand: 'Lustau Solera', country: 'Spain', age: 15 }
      ]
    }]
  })
  console.log('How is your neighbor sorted?')
  console.log(' - Very well:\n', await neighborsBar.getAssortment())

  // This disconnects the client (= stops putting work on NodeJS' event loop)
  await vrpcRemote.end()
}

// Start the script
main().catch(err => console.log(`An error happened: ${err.message}`))
```

> **IMPORTANT**
>
> Don't forget to exchange `<yourAgent>` with the name you used while starting
> the agent! (If you used the example, it's your hostname)

Make sure you have an agent running, then try the client using:

```bash
node index.js
```

# Optional steps to make your communication private

A private communication requires the agent already being started using your own
domain as created via the https://app.vrpc.io app. Please refer to an agent
example for further details.

## STEP A: Retrieve client access token

Using the VRPC app (https://app.vrpc.io), navigate to the *Access Control* tab
and copy the `defaultClientToken` of the `fullAccess` role.

Or create a new role that has sufficient rights to access all functions of the
`Bar` class served by your agent (whose name - if you followed the agent's
example - is the name of the host it is running on).

Once done, replace the options of `VrpcRemote` in the above code with:

```javascript
const vrpcRemote = new VrpcRemote({
  domain: '<yourDomain',
  agent: '<yourAgent>',
  token: '<yourToken>'
})
```

and you are good to go.
