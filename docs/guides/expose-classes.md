# Offering classes from an agent

This guide shows how to make existing JavaScript code callable: registering
classes, choosing what is published, documenting it for clients, validating
constructor arguments, and running the agent.

## Register a class

```javascript
const { VrpcAdapter, VrpcAgent } = require('vrpc')
const Press = require('./Press')

VrpcAdapter.register(Press)

const agent = new VrpcAgent({ domain: 'factory', agent: 'line-1', broker: 'mqtts://broker.example.com:8883' })
await agent.serve()
```

Registering changes nothing in the class. From then on clients can create
instances of it, call its member functions on them and its static functions
on the class.

Other ways to register:

```javascript
// by path, relative to the calling file: the JSDoc is read as well
VrpcAdapter.register('./src/Press')

// every .js file below a directory that registers itself when required
VrpcAdapter.addPluginPath('./plugins')

// an object that already exists, under a class name and an instance name
VrpcAdapter.registerInstance(machine, { className: 'Machine', instance: 'machine-1' })
```

## What is published

The agent publishes - and clients can call - exactly:

- the class's **member functions**: the methods of its prototype chain,
  inherited ones included;
- its **static functions**;
- not functions whose name begins with `_` (register with
  `{ onlyPublic: false }` to publish them);
- not `constructor`: clients construct through `client.create()`;
- for a class that extends `EventEmitter`: `on`, `addListener`, `off`,
  `removeListener`, `once` and `removeAllListeners`, but never `emit` or
  Node's other emitter functions.

A function an instance only gets at run time (assigned in the constructor,
say) is not published. Nothing that is not published can be reached: a
request for it fails with `Could not find function`.

## Document it

Clients that read meta data (`requiresSchema: true`), such as builders and
generic tools, show the JSDoc of your functions. Register with the source
file to publish it:

```javascript
VrpcAdapter.register(Press, { jsdocPath: './Press.js' })
```

```javascript
/**
 * Sets the target pressure
 * @param {number} bar - Pressure in bar, 0 to 10
 * @param {Object} [options]
 * @param {boolean} [options.ramp=true] - Approach the target slowly
 * @returns {Promise<number>} The pressure reached
 */
async setPressure (bar, { ramp = true } = {}) { /* ... */ }
```

Descriptions, parameter names and types, optional parameters with their
defaults, return types, and `@callback` signatures of function parameters
are published. The constructor's documentation describes `create`. A
function declared `@returns {Registration}` is an event function to every
client that reads meta data (see [Writing event functions](event-functions.md)).

## Validate constructor arguments

A class constructed from options can have them checked, and defaulted,
before any instance is made:

```javascript
VrpcAdapter.register(Press, {
  schema: {
    type: 'object',
    properties: {
      port: { type: 'string' },
      pressure: { type: 'number', minimum: 0, maximum: 10, default: 5 }
    },
    required: ['port']
  }
})
```

The schema (JSON Schema, validated with Ajv) applies to the **first**
constructor argument. A create whose options do not validate fails with the
validation error, and no instance is made; defaults the schema declares are
filled in.

A class that must not be called with `new` (a factory function) registers
with `{ withNew: false }`.

## Run the agent

```javascript
const agent = new VrpcAgent({
  domain: 'factory',
  agent: 'line-1',
  broker: 'mqtts://broker.example.com:8883',
  token: process.env.VRPC_TOKEN,
  version: '1.4.2'
})
await agent.serve()
```

| Option | Default | Meaning |
| --- | --- | --- |
| `domain` | `'vrpc'` | the domain the agent serves in |
| `agent` | `<user>-<id>@<host>-<platform>-js` | the agent's name; the default is stable for the installation, but name agents in production |
| `broker` | `mqtts://broker.hivemq.com:8883` | the broker, `mqtt://`, `mqtts://`, `ws://` or `wss://` |
| `token` | - | an access token, sent as the MQTT password |
| `username`, `password` | - | MQTT credentials instead of a token |
| `tls` | - | `{ ca, rejectUnauthorized }`; without it the broker's certificate is not verified |
| `bestEffort` | `true` | QoS 0; `false` for QoS 1 |
| `version` | `''` | a version of your choice, shown to clients |
| `log` | `'console'` | a logger with `debug`, `info`, `warn` and `error` |
| `mqttClientId` | derived from domain and agent | the MQTT client id |

`serve()` resolves once the agent has subscribed everything it offers and
announced itself. `end()` takes it offline; `end({ unregister: true })` also
clears what the broker keeps of it, so clients forget it.

Instances the agent's own program should have can be created before or
after `serve()`:

```javascript
agent.create({ className: 'Press', instance: 'press-a', args: [{ port: '/dev/ttyUSB0' }] })
```

## From the command line

`VrpcAgent.fromCommandline()` builds an agent from command-line flags, with
the given values as defaults:

```javascript
VrpcAdapter.register(Press)
await VrpcAgent.fromCommandline({ domain: 'factory' }).serve()
```

```bash
node agent.js --agent line-1 --broker mqtts://broker.example.com:8883 --token "$VRPC_TOKEN"
node agent.js --help
```

The package also installs `vrpc-agent-js`, which loads an adapter file that
registers your classes and serves them:

```bash
npx vrpc-agent-js --file ./adapter.js --domain factory --agent line-1
```
