# Getting started

In ten minutes you will offer a JavaScript class from one program and use it
from another: create an instance remotely, call its functions, and listen to
its events. You need Node.js 18 or newer - nothing else: VRPC is open source
under the MIT license, with no account to create and no key to get.

## 1. Set up a project

```bash
mkdir vrpc-tutorial && cd vrpc-tutorial
npm init -y
npm install vrpc
```

Both programs of this tutorial connect to the public MQTT broker VRPC uses by
default, `broker.hivemq.com`. Anybody can read what travels there, so pick a
**domain** of your own - below it is `tutorial-<your-name>` - and use your own
broker for anything real.

The public broker is shared, and at times slow. If a step below fails with
`timed out (> 12000 ms)`, give the client more time,
`new VrpcClient({ domain: 'tutorial-<your-name>', timeout: 30000 })`, or run a
broker of your own with `docker run -p 1883:1883 eclipse-mosquitto:1.6.12`
and add `broker: 'mqtt://localhost:1883'` to the options of agent and client.

## 2. Write a class

`Counter.js` is plain JavaScript; nothing in it knows about VRPC.

```javascript
const EventEmitter = require('events')

class Counter {
  constructor (start = 0) {
    this._count = start
    this._emitter = new EventEmitter()
  }

  /**
   * Adds to the count and answers the new count
   * @param {number} [by=1]
   * @returns {number}
   */
  increment (by = 1) {
    this._count += by
    this._emitter.emit('change', this._count)
    return this._count
  }

  /**
   * Calls back with the count whenever it changes, beginning with the current one
   * @param {Function} handler
   * @returns {Registration}
   */
  onChange (handler) {
    this._emitter.on('change', handler)
    return {
      [Symbol.dispose]: () => this._emitter.off('change', handler),
      greet: greeting => greeting(this._count)
    }
  }

  static describe () {
    return 'A counter that tells everybody when it changes'
  }
}

module.exports = Counter
```

`onChange` is an **event function**: it calls a handler again and again. It
returns a **registration** that tells VRPC how to stop (`[Symbol.dispose]`)
and what every new listener gets first (`greet`). More in
[Events](concepts/events.md).

## 3. Offer it: the agent

`agent.js` registers the class and connects to the broker as an **agent**
named `counters`:

```javascript
const { VrpcAdapter, VrpcAgent } = require('vrpc')
const Counter = require('./Counter')

VrpcAdapter.register(Counter)

const agent = new VrpcAgent({ domain: 'tutorial-<your-name>', agent: 'counters' })
agent.serve().then(() => console.log('Agent is serving'))
```

Start it and leave it running:

```bash
node agent.js
```

## 4. Use it: the client

In a second terminal, `client.js` connects as a **client**, creates a
counter on the agent, listens to it, and calls it:

```javascript
const { VrpcClient } = require('vrpc')

async function main () {
  const client = new VrpcClient({ domain: 'tutorial-<your-name>' })
  await client.connect()

  // a static function of the class
  console.log(await client.callStatic({
    agent: 'counters',
    className: 'Counter',
    functionName: 'describe'
  }))

  // an instance on the agent, and a proxy to it
  const counter = await client.create({
    agent: 'counters',
    className: 'Counter',
    instance: 'visitors',
    args: [10]
  })

  // listen: greeted with the current count, then every change
  const onChange = count => console.log(`count is ${count}`)
  await counter.onChange(onChange)

  // call: every call is asynchronous for the caller
  await counter.increment()
  await counter.increment(5)

  // stop listening, and leave
  await client.unsubscribe(onChange)
  await client.end()
}

main().catch(err => console.error(err.message))
```

```bash
node client.js
```

```text
A counter that tells everybody when it changes
count is 10
count is 11
count is 16
```

Run `node client.js` again: the counter `visitors` still exists on the agent
(creating it again returns the existing one), so the count goes on from 16.
Run two clients at once, and both see every change.

## 5. Look around

A client always knows which agents are online and what they offer: agents
announce themselves, and clients keep track. Add these lines to `client.js`,
after the `create`:

```javascript
console.log(client.getAvailableAgents())                                                // [ 'counters' ]
console.log(client.getAvailableClasses({ agent: 'counters' }))                          // [ 'Counter' ]
console.log(client.getAvailableInstances({ className: 'Counter', agent: 'counters' }))  // [ 'visitors' ]
```

Stop the agent with Ctrl+C, and clients learn at once that it went offline.

## Where next

- [How VRPC works](concepts/overview.md) - the parts and how a call travels.
- [Instances](concepts/instances.md) - shared and isolated instances, and
  releasing what an instance runs.
- [Writing event functions](guides/event-functions.md) - everything a
  registration can do.
- [Persisting instances](guides/persistence.md) - keep instances across
  agent restarts.
- The [API reference](reference/README.md).
