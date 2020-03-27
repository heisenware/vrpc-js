# Example - "Straight to the bar"

With NodeJS being such a nice and easy programming language we will not split
the example in two, but directly head to the bar.

> **NOTE**
>
> In order to follow this example from scratch, create a new directory (e.g.
> `vrpc-node-agent-example`), cd into it and run:
>
> ```bash
> npm init -f -y
> npm install vrpc
> ```
>
> Finally create a directory `src` and you are good to go.

## STEP 1: NodeJS code that should be bound

We pretend that the code below already existed and should be made remotely
accessible.

*src/Bar.js*

```javascript
const EventEmitter = require('events')

class Bar extends EventEmitter {

  constructor (assortment = {}) {
    super()
    this._assortment = assortment
    this._callbacks = new Map()
  }

  static philosophy () {
    return 'I have mixed drinks about feelings.'
  }

  hasDrink (type) {
    return this._assortment[type] !== undefined
  }

  addBottle (type, bottle) {
    const bottles = this._assortment[type]
    if (bottles) bottles.push(bottle)
    else {
      this._assortment[type] = [bottle]
      this.emit('new', bottle)
    }
  }

  removeBottle (type) {
    if (!this.hasDrink(type)) {
      throw new Error('Can not remove non-existing type')
    }
    const bottles = this._assortment[type]
    const bottle = bottles.pop()
    if (bottles.length === 0) {
      delete this._assortment[type]
      this.emit('empty', bottle)
    }
    return bottle
  }

  async prepareDrink (type, callback) {
    const ms = this._getRandomInt(4) * 1000
    await new Promise(resolve => setTimeout(resolve, ms))
    if (!this.hasDrink(type)) {
      throw new Error('I searched it all, but couldn\'t find proper bottles')
    }
    if (callback) callback('Drink is ready')
    return ms
  }

  _getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max))
  }

}
module.exports = Bar
```

## STEP 2: Make the code remotely callable

There are two things to do:

- register that should be remotely callable with the `VrpcAdapter`
- create an `VrpcAgent` instance that listens for incoming remote calls

We will do both in a single short `index.js` file, like so:

*index.js*

```javascript
const { VrpcAdapter, VrpcAgent } = require('vrpc')
const Bar = require('./src/Bar')

// Register class "Bar" to be remotely callable
VrpcAdapter.register(Bar)

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
```

That's it, try it by using the free `public.vrpc` domain and type:

```bash
node index.js -d public.vrpc -a $(hostname)
```

> **NOTE**
>
> The function `VrpcAdapter.register()` can take options detailing
> the class registration process. The following options are available:
>
> - `onlyPublic` - registers only public functions, i.e. skips those starting with
>   an underscore "`_`"  (default: true)
>
> - `withNew` - whether the registered class needs the `new` keyword to be
>   constructed (default: true)
>
> - `schema` - optionally provide a JSON schema (in ajv style) that is used for
>   validating arguments before object instantiation (default: null)

# Optional steps to make your communication private

## STEP A: Create a free VRPC account

If you already have an account, simply skip this step.

If not, quickly create a new one by clicking on "CREATE A NEW ACCOUNT"
under https://app.vrpc.io. It takes less than a minute and the only thing
required is your name and a valid email address.

## STEP B: Create a free domain

If you already have a domain, simply skip this step.

If not, navigate to the `Domains` tab in your VRPC app and click *ADD DOMAIN*,
choose a free domain and hit *Start 30 days trial* button.

## STEP C: Test VRPC installation and connectivity

For any agent to work, you must provide it with a valid domain and agent
token. You get an agent token from your VRPC app using the `Access Control` tab.

Simply copy the *defaultAgentToken* or create a new one and use this.

Having that you are ready to make the communication to your agent private:

```bash
node index.js -d <yourDomain> -a $(hostname) -t <yourToken>
```
