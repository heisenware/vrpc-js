# Writing event functions

This guide shows how to write a class function that clients can listen to:
one that calls a handler again and again, which the agent shares among all
subscribers, greets newcomers through, and releases when nobody listens any
more. It assumes you know [how events work](../concepts/events.md).

## The pattern

An event function takes a handler, starts calling it, and returns a
**registration**: an object that undoes exactly this call.

```javascript
const EventEmitter = require('events')

class Thermometer {
  constructor () {
    this._emitter = new EventEmitter()
    this._reading = null
    setInterval(() => this._measure(), 1000)
  }

  /**
   * Calls back with every reading, beginning with the current one
   * @param {Function} handler
   * @returns {Registration}
   */
  onReading (handler) {
    this._emitter.on('reading', handler)
    return {
      [Symbol.dispose]: () => this._emitter.off('reading', handler),
      greet: greeting => greeting(this._reading)
    }
  }

  _measure () {
    this._reading = readSensor()
    this._emitter.emit('reading', this._reading)
  }
}
```

That is all a class needs. The agent calls `onReading` once, however many
clients subscribe; hands every reading to every subscriber; greets each new
subscriber with the current reading; and calls `[Symbol.dispose]()` when the
last subscriber leaves. No `offReading`, no `removeListener`, no guard
against being called twice with the same handler.

## Make clients recognize it

A client decides which functions are event functions; any other function
argument it treats as a one-shot callback. It recognizes:

- a function named `on` followed by a capital letter - `onReading`,
  `onAlarm`, `onTopic` - **the safe choice**: every client recognizes it;
- `on(event, handler)` and `addListener(event, handler)`;
- a function whose JSDoc declares `@returns {Registration}` (or
  `{Promise<Registration>}`), when the client reads the class's meta data.
  A `VrpcClient` reads it with `requiresSchema: true`, and the agent publishes
  it when the class is registered with its source:

  ```javascript
  VrpcAdapter.register(OpcuaClient, { jsdocPath: './OpcuaClient.js' })
  ```

A client can always treat a function as an event function explicitly:
`proxy.vrpcOn('monitorNode', address, handler)`.

## The registration

| Member | Required | Meaning |
| --- | --- | --- |
| `[Symbol.dispose]()` or `[Symbol.asyncDispose]()` | yes | Undoes exactly this call: removes this handler, unsubscribes this topic, stops monitoring this node. |
| `greet(...handlers)` | no | Greets one new subscriber; called once for every subscriber, the first included. |
| `ended` | no | A promise: fulfilled when the source ended the registration, rejected when it failed. |
| `value` | no | What the subscribing call answers instead of `true`, such as an id the subscriber needs. |

### Releasing

The agent calls the release once, after the last subscriber left - or when
the registration ends, or its instance is deleted while it has no dispose of
its own. Afterwards the handler is silent: the agent drops whatever it is
still called with. An asynchronous release returns a promise from
`[Symbol.asyncDispose]()`:

```javascript
async onTopic (handler, topic) {
  await this._mqtt.subscribeAsync(topic)
  this._handlers.set(topic, handler)
  return {
    [Symbol.asyncDispose]: async () => {
      this._handlers.delete(topic)
      await this._mqtt.unsubscribeAsync(topic)
    }
  }
}
```

A release that throws or rejects is reported as the adapter event
`releaseFailed`, which the agent logs; the registration is gone either way.

### Greeting

`greet` receives one handler per handler position, each reaching only the
new subscriber. Call it with what a newcomer needs first:

```javascript
// the current value
greet: greeting => greeting(this._value)

// a snapshot first: the changes that follow refer to it
greet: greeting => greeting({ type: 'snapshot', rows: [...this._rows.values()] })

// nothing yet: greet nobody rather than with an empty value
greet: greeting => { if (this._value !== undefined) greeting(this._value) }
```

`greet` may be `async`. A greeting that throws is reported as
`greetFailed`; the subscriber stays subscribed. Do not also call the handler
inside the event function: that would greet the first subscriber twice, and
nobody after it.

### Ending from the source

When the source goes away by itself - a server drops a monitored item, a
device disconnects for good - settle `ended`. The agent drops the
registration, releases it, and tells every subscriber (the client emits
`ended`):

```javascript
async monitorNode (address, handler) {
  const item = await this._session.monitor(address, handler)
  return {
    ended: item.terminated,                        // fulfilled: ended; rejected: failed
    [Symbol.asyncDispose]: () => item.terminate()
  }
}
```

A fulfilled `ended` with a non-empty string gives the reason; a rejected one
reports the error's message, marked as failed.

### Answering a value

A subscribing call answers `true`. When subscribers need something back -
the id of a monitored node, a server-side subscription id - put it in
`value`; every subscriber gets the same:

```javascript
return { value: item.nodeId, [Symbol.asyncDispose]: () => item.terminate() }
```

## Arguments

The agent keeps one registration per function **and arguments**, compared
by value (object keys in any order). `onTopic('line/+/state')` from ten
clients is one registration; `onTopic('#')` is another. Make arguments
select what is delivered, and keep them to plain JSON.

## Classes that extend EventEmitter

A class that extends Node's `EventEmitter` needs no event functions of its
own: clients subscribe with `on(event, handler)`, and the agent keeps one
listener per event name on the emitter, whatever the number of clients. It
releases that listener with `removeListener` when the last subscriber of the
event leaves.

- Clients can call `on`, `addListener`, `off`, `removeListener`, `once` and
  `removeAllListeners`. `emit` and Node's other emitter functions are not
  callable remotely.
- An emitter that emits `'error'` without a listener ends the process.
  Listen to your own `'error'`.
- `on` cannot greet. A class that should greet its subscribers offers an
  event function with a registration instead.

## Moving from older event functions

Event functions written before VRPC 3.15 often came with an `off<Name>`
twin, a `removeListener`, or a guard that ignored a handler the class already
held. With registrations, delete them:

| Before | Now |
| --- | --- |
| `offReading(handler)` removes a handler | `[Symbol.dispose]` of the registration |
| a guard that ignores a known handler | not needed: the agent calls the function once per arguments |
| `removeListener(event, handler)` as release | not needed, unless the class extends `EventEmitter` |
| calling the handler inside the function to greet | `greet` |
| returning `'subscribed'` or the like | return the registration; put an id in `value` |

For a class that returns no registration, the agent still releases through
its `off<Name>` twin - called once, with the arguments of the original
call - or else its `removeListener`. Both are deprecated and go in VRPC 4.

## Checklist

- [ ] Named `on<Name>`, or declared `@returns {Registration}`.
- [ ] Returns a registration whose dispose undoes exactly this call.
- [ ] Greets through `greet`, not inside the function.
- [ ] Settles `ended` when the source goes away by itself.
- [ ] Arguments are plain JSON and select what is delivered.
- [ ] No `off<Name>` twin, no guard, no `removeListener` of its own.
