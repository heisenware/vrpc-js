# Persisting instances

Instances live in an agent's memory and are gone when it restarts. A
`VrpcPersistor` keeps a record of every shared instance - its class and its
constructor arguments - and re-creates the instances when the agent starts
again. This guide shows how to set it up, what it keeps, and what it does
when an instance cannot be restored.

## Setting it up

The persistor stores its records with `@heisenware/storage`, a peer
dependency you install yourself:

```bash
npm install @heisenware/storage
```

Create it right after the agent, restore, and only then serve:

```javascript
const { VrpcAdapter, VrpcAgent, VrpcPersistor } = require('vrpc')

VrpcAdapter.register(Press)

const agent = new VrpcAgent({ domain: 'factory', agent: 'line-1' })
const persistor = new VrpcPersistor({ agentInstance: agent, dir: '/var/lib/line-1' })

const { restored, quarantined } = await persistor.restore()
await agent.serve()
```

Restoring before serving means the agent announces itself with every
instance already there: a client that sees it online finds what it expects.

Give `dir` explicitly. Without it the persistor uses
`/shared/extensions/<agent name>`, a path from the Heisenware platform.

## What is kept

- **Every shared instance**, from the moment it is created - by a client,
  by `agent.create()`, or by a restore. The record holds the class name and
  the constructor arguments.
- **Not isolated instances.** They belong to the connection that created
  them, and that connection is gone after a restart.
- **Deletions.** When a client deletes an instance, its record is removed.
  `VrpcAdapter.delete()` called in your own code does not remove the record;
  call `forget()` for that instance as well (below).

### Keeping state current

The record keeps the arguments an instance was *created* with. An instance
whose state changes later can keep its record current: when it emits an
`update` event, the event's payload becomes its single constructor argument
for the next restore.

```javascript
class Press extends EventEmitter {
  constructor (options = {}) {
    super()
    this._options = { pressure: 5, ...options }
  }

  setPressure (pressure) {
    this._options.pressure = pressure
    this.emit('update', this._options)   // restored as new Press(this._options)
  }
}
```

Emit the full options, not a change: the payload replaces the constructor
arguments.

## When an instance cannot be restored

A record whose instance fails to construct - its class is no longer
registered, its constructor refuses the stored arguments, a device it opens
is missing - is never deleted by the persistor:

1. On a restore, a failing record is retried `retries` times (5 by default)
   with a growing delay (`retryDelay` × attempt, 1 second by default).
2. A record that still fails is **quarantined**: it stays on disk, marked
   with the error, when it first failed and how many attempts it had.
   `restore()` reports it.
3. On the next start, a quarantined record gets exactly one attempt. Once
   the cause is fixed - the class registered again, the device back - it
   heals by itself; a start never turns into a retry storm.

```javascript
const { restored, quarantined } = await persistor.restore()
for (const { instance, className, error, attempts } of quarantined) {
  console.warn(`${instance} (${className}) not restored after ${attempts} attempts: ${error}`)
}
```

## Inspecting and repairing by hand

```javascript
await persistor.status()
// { dir: '/var/lib/line-1', instances: [{ instance: 'press-a', className: 'Press', restoreError: null }] }

await persistor.retry('press-b')    // one more attempt; true when the instance exists afterwards
await persistor.forget('press-c')   // removes the record on purpose
```

`forget` is the only way a record leaves the storage other than the
deletion of its instance.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `agentInstance` | required | the `VrpcAgent` whose instances are kept |
| `dir` | `/shared/extensions/<agent name>` | where the records are stored |
| `log` | `console` | a logger with `info`, `warn` and `error` |
| `retries` | `5` | retries of a record that fails on a fresh restore |
| `retryDelay` | `1000` | milliseconds between retries, multiplied by the attempt |
