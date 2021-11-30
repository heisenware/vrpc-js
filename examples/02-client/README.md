# Example - "Remote conversation at the bar"

In the `C++ Agent` and `Node.js Agent` example we prepared some code that
represents a bar. This code includes language features like classes, static
functions, asynchronous functions, callbacks, and exceptions.

Let's see how VRPC handles all these cases and how it feels to use the bar
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
as made available through the bar agent.

The only VRPC component needed is the `VrpcClient` client.

### Client Code

*index.js*

```javascript
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
    agent: '<yourBarAgent>'
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
```

> **IMPORTANT**
>
> Don't forget to exchange `<yourBarAgent>` with the name you used while
> starting the bar agent! See the console output to find it.

Make sure you have an agent running, then try the client using:

```bash
node index.js
```

Convince yourself, that this example works no matter whether you used the C++ or
Node.js bar implementation!

## Optional steps to make your communication private

A private communication requires the agent already being started using your own
domain as created via the [VRPC App](https://app.vrpc.io) app. Please refer to
an agent example for further details.

### STEP A: Retrieve client access token

Using the [VRPC App](https://app.vrpc.io), navigate to the *Access Control* tab
and copy the `defaultClientToken` of the `fullAccess` role.

Or create a new role that has sufficient rights to access all functions of the
`Bar` class served by your agent.

Once done, replace the options of `VrpcClient` in the above code with:

```javascript
const VrpcClient = new VrpcClient({
  domain: '<yourDomain',
  agent: '<yourAgent>',
  token: '<yourToken>'
})
```

and you are good to go.
