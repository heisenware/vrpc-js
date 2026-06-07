# Persistence

By default, VRPC Agents are stateless. If your Node.js backend or IoT edge device restarts, all dynamically created instances are lost.

However, many applications require statefulness. For example, if a React frontend creates a `HardwareController` instance to monitor a specific sensor, you expect that controller to still be there if the backend briefly restarts.

Instead of forcing you to write complex database logic, VRPC provides a drop-in **Persistence Layer** for Node.js.

## The `VrpcPersistor`

The `VrpcPersistor` automatically hooks into the `VrpcAdapter`. It listens for instance creation, deletion, and state updates, writing the minimal necessary data (the class name and constructor arguments) to local storage. When your agent restarts, it seamlessly re-hydrates all instances before coming online.

### Installation

The persistor relies on `@heisenware/storage` as a peer dependency. Install both packages in your Node.js backend:

```bash
npm install vrpc @heisenware/storage
```

### Basic Usage

Setting up persistence requires only three extra lines of code in your Agent startup script:

```javascript
const { VrpcAgent, VrpcAdapter, VrpcPersistor } = require('vrpc')
const MyStatefulClass = require('./MyStatefulClass')

VrpcAdapter.register(MyStatefulClass)

async function main() {
  const agent = new VrpcAgent({
    domain: 'my-domain',
    agent: 'stateful-node-agent',
    broker: 'mqtts://broker.hivemq.com:8883'
  })

  // 1. Initialize the Persistor
  const persistor = new VrpcPersistor({ agentInstance: agent })

  // 2. Restore all previously created instances from disk
  await persistor.restore()

  // 3. Start the agent as usual
  await agent.serve()
  console.log('Agent is online with restored state!')
}

main().catch(console.error)
```

## How It Works

When a frontend Client calls `client.create({ className: 'MyStatefulClass', args: ['config1'] })`, the `VrpcPersistor` intercepts the `create` event and saves the class name and `['config1']` array to disk.

During the `await persistor.restore()` call on restart, the Agent loops through the storage directory and feeds those arguments back into the `MyStatefulClass` constructor, completely restoring the environment before the Agent ever announces itself as "online" to the MQTT broker.

> Note: The Persistor is incredibly resilient. If an instance fails to restore (e.g., due to a temporary network unavailability in the constructor), VRPC will retry up to 5 times using an exponential backoff strategy before permanently cleaning up the broken instance.

## Persisting Internal State Changes

Storing constructor arguments is great, but what if the internal state of the object changes _after_ it is created?

VRPC handles this beautifully through standard `EventEmitter` patterns. If your class emits an `'update'` event containing new constructor arguments, the `VrpcPersistor` will automatically overwrite the stored data.

```javascript
const EventEmitter = require('events')

class SmartThermostat extends EventEmitter {
  constructor(targetTemp) {
    super()
    this.targetTemp = targetTemp
  }

  setTemperature(newTemp) {
    this.targetTemp = newTemp

    // Tell the VRPC Persistor to update the saved state!
    // The payload must be an array of arguments that match the constructor.
    this.emit('update', newTemp)
  }
}
```

Now, if a React frontend calls `thermostatProxy.setTemperature(22)`, the new target temperature is flushed to disk. If the backend loses power and restarts, the `SmartThermostat` will be re-instantiated with `22` instead of the original value!
