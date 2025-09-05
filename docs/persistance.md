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
const persistor = new VrpcPersistor({ agentInstance: agent })

// Restore any previously saved instances
await persistor.restore()

// Now, any instances created via agent.create() will be persisted.
```
