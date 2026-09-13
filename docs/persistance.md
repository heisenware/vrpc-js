# Instance Persistence

`vrpc-js` provides a persistence layer that can automatically save and restore
`VrpcAgent` instances. This is useful for applications that need to maintain
state across restarts.

**Usage:**

```javascript
const { VrpcAgent, VrpcPersistor } = require('vrpc')
const agent = new VrpcAgent({
  // ... agent configuration
})

// Initialize the persistor
const persistor = new VrpcPersistor({ agentInstance: agent, dir: '/data/my-agent' })

// Restore any previously saved instances
const { restored, quarantined } = await persistor.restore()

// Now, any shared instance created via agent.create() (or by a client) is
// persisted; isolated instances belong to their connection and are not.
```

**What is persisted:** the class name and the constructor arguments of every
shared instance, in the storage directory (`@heisenware/storage`, a peer
dependency). An instance that emits an `update` event has the event's payload
persisted as its single constructor argument, so a class can keep its
persisted state current by emitting its full options whenever they change.
A deleted instance is removed from the storage.

**What restore does:** it re-creates every record. A record that fails on a
fresh restore is retried with a growing delay (`retries`, `retryDelay`
options). A record that still fails is **quarantined**: it stays on disk,
marked with the error, the time and the number of attempts, and `restore()`
reports it. On the next start a quarantined record gets exactly one attempt,
so it heals by itself once the cause is fixed (a class registered again, a
constructor that accepts the arguments again) and never turns a start into a
retry storm. A record is never deleted by the persistor itself.

**Inspecting and healing by hand:**

```javascript
await persistor.status()   // { dir, instances: [{ instance, className, restoreError }] }
await persistor.retry(id)  // one more attempt; true when the instance exists afterwards
await persistor.forget(id) // removes the record on purpose
```
