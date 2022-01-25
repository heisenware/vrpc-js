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

async function main () {
  // create a remote client
  const client = new VrpcClient({
    domain: 'vrpc',
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

  // create a remote instance of the bar class
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

Using the services from [Heisenware GmbH](https://heisenware.com) you can make
your communication private by obtaining an exclusive and access controlled
domain.

### STEP A: Create a Heisenware account

If you already have an account, simply skip this step.

If not, quickly create a new one
[here](https://admin.heisenware.cloud/#/createAccount). It takes less than a
minute and the only thing required is your name and a valid email address.

### STEP B: Get a domain

If you already have a domain, simply skip this step.

If not, navigate to the `Domains` tab in the [Admin
Tool](https://admin.heisenware.cloud) and click *ADD DOMAIN*, choose a free
domain and hit *Start 30 days trial* button.

### STEP C: Test connectivity

Using the [Admin
Tool](https://admin.heisenware.cloud), navigate to the *Access Control* tab
and copy the default `Client Token` of the `Full Access` role.

Or create a new role that has sufficient rights to access all functions of the
`Bar` class served by your agent.

Once done, replace the options of `VrpcClient` in the above code with:

```javascript
const VrpcClient = new VrpcClient({
  domain: '<yourDomain',
  agent: '<yourAgent>',
  token: '<yourToken>'
  broker: 'mqtts://heisenware.cloud'
})
```

and you are good to go.

**IMPORTANT**
>
> Use `heisenware.cloud` as broker host when working with professional
> Heisenware accounts.
>
