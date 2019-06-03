# Example - "Remote conversation at the bar"

In the NodeAgent example we prepared some code that representing a bar. This
code includes some NodeJS language features like classes, static functions,
asynchronous functions, event-emitter callbacks, exceptions and promise
rejections.

Let's see how VRPC handles all this cases and how it feels to use the bar
remotely...

---
**NOTE**

In order to follow this example from scratch, make sure you ran through the
*NodeAgent* example and have the agent online.

Once done, start with a new
directory (e.g. `vrpc-node-proxy-example`), cd into it and run:

```bash
npm init -f -y
npm install vrpc@2.0.0-alpha.8
```
---

## STEP A: Create a proxy token

Using the VRPC app (https://vrpc.io/app), create a proxy **access token** by
navigating to the *Access Control* tab. Add a new **role** which allows wildcard
access to the `Bar` class for your domain and the agent name you started the
NodeAgent with (if you followed the tutorial it will be named `barAgent`).

Finally, create an access token by clicking *ADD TOKEN*, copy it and use
it as token in the program depicted below.


## STEP 1: Write a program to remote-control the Bar

Let's write a little program that is capable to remotely call the functions
as registered by the `barAgent`.

The only VRPC component needed is the `VrpcRemoteProxy`.

*index.js*

```javascript
const { VrpcRemote } = require('vrpc')

const vrpcRemote = new VrpcRemote({
  agent: '<yourAgent>',
  domain: '<yourDomain>',
  token: '<yourProxyToken>'
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
    // NOTE: We await twice here, firstly the network call and secondly
    // the returned promise
    let seconds = await await bar.prepareDrink('rum', (answer) => {
      console.log(answer)
    })
    seconds /= 1000
    console.log(`Cool, that took only ${seconds} seconds to prepare!`)
  } catch (err) {
    console.log(`Sorry: ${err.message}`)
  }

  console.log('Please tell me once the rum is empty again.')
  await bar.on('empty', ({ brand, country, age }) => {
    console.log(`So sad, the ${age} year old ${brand} from ${country} is empty.`)
  })
  await bar.removeBottle('rum')
  // This disconnects the proxy (= stops putting work on NodeJS' event loop)
  await vrpcRemote.end()
}

// Start the script
main().catch(err => console.log(`An error happened: ${err.message}`))
```
