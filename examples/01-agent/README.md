# Example - "Straight to the bar"

With Node.js being such a nice and easy programming language we will not split
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

## STEP 1: Node.js code that should be bound

We pretend that the code below already existed and should be made remotely
accessible.

*src/Bar.js*

```javascript
const EventEmitter = require('events')

class Bar {

  constructor (selection = []) {
    this._selection = selection
    this._emitter = new EventEmitter()
  }

  /**
   * Provides deeper thoughts about bars.
   */
  static philosophy () {
    return 'I have mixed drinks about feelings.'
  }

  /**
   * Adds a bottle to the bar.
   *
   * @param {String} name Name of the bottle
   * @param {String} [category='n/a'] Category
   * @param {String} [country='n/a'] Country of production
   * @emits Bar#new
   *
   * @example
   * bar.addBottle('Botucal', category: 'rum', country: 'Venezuela')
   */
  addBottle (name, category = 'n/a', country = 'n/a') {
    this._selection.push({ name, category, country })
    this._emitter.emit('add', name)
  }

  /**
   * Removes a bottle from the bar.
   *
   * @param {String} name Removes the first bottle found having the given name.
   * @emits Bar#remove
   */
  removeBottle (name) {
    const index = this._selection.findIndex(x => x.name === name)
    if (index === -1) {
      throw new Error('Sorry, this bottle is not in our selection')
    }
    this._emitter.emit('remove', this._selection[index])
    return [
      ...this._selection.slice(0, index),
      ...this._selection.slice(index + 1)
    ]
  }

  /**
   * Adds a listener which is triggered whenever a bottle is added.
   *
   * @param {Function(Bottle)} listener
   */
  onAdd(listener) {
    this._emitter.on('add', listener)
  }

  /**
   * Adds a listener which is triggered whenever a bottle is removed.
   *
   * @param {Function(Bottle)} listener
   */
  onRemove(listener) {
    this._emitter.on('remove', listener)
  }

  /**
   * Ask the bartender to prepare a drink using the existing selection.
   *
   * @param {Function(String)} done Notification that the drink is ready
   * @returns {String} Some bartender wisdom
   */
  async prepareDrink (done) {
    const a = [this._random(), this._random(), this._random()]
    if (done) {
      setTimeout(() => {
        done(`Your drink is ready! I mixed ${a[0]} with ${a[1]} and a bit of ${a[2]}.`)
      }, 2000)
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
    return 'In preparation...'
  }

  /**
   * Shows the entire selection of the bar.
   */
  getSelection () {
    return this._selection
  }

  _random () {
    const nBottles = this._selection.length
    if (nBottles === 0) {
      throw new Error('I searched, but couldn\'t find any bottles')
    }
    const index = Math.floor(Math.random() * Math.floor(nBottles))
    return this._selection[index].name
  }
}
module.exports = Bar
```

## STEP 2: Make the code remotely callable

There are two things to do:

- register the class using the `VrpcAdapter`
- create an `VrpcAgent` instance that listens for incoming remote calls

We will do both in a single short `index.js` file, like so:

*index.js*

```javascript
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
```

That's it, try it by running the executable in an all-default setting (using the
vrpc.io broker and the free `public.vrpc` domain):

```bash
node index.js
```

With that you made your Node.js code remotely callable!

Convince yourself and point your browser to
[live.vrpc.io](https://live.vrpc.io). Log in using `public.vrpc` as domain name
and leave the token empty. You should see your agent online (it uses your user-,
host- and platform name).

Or call your code from another piece of code running somewhere else on the
planet. Follow e.g. the `Node.js Client` example.

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

## Optional steps to make your communication private

### STEP A: Create a free VRPC account

If you already have an account, simply skip this step.

If not, quickly create a new one by clicking on "CREATE NEW ACCOUNT" using the
[VRPC App](https://app.vrpc.io). It takes less than a minute and the only thing
required is your name and a valid email address.

### STEP B: Create a free domain

If you already have a domain, simply skip this step.

If not, navigate to the `Domains` tab in your VRPC app and click *ADD DOMAIN*,
choose a free domain and hit *Start 30 days trial* button.

### STEP C: Test VRPC installation and connectivity

For any agent to work, you must provide it with a valid domain and access
token. You get an access token from your VRPC app using the `Access Control` tab.

Simply copy the *defaultAgentToken* or create a new one and use this.

Having that you are ready to make the communication to your agent private:

```bash
node index.js -d <yourDomain> -t <yourToken>
```
