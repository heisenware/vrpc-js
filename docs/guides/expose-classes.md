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
- not functions whose name begins with `_`, nor, when the agent reads the
  class's JSDoc, functions tagged `@private` (see below);
- not `constructor`: clients construct through `client.create()`;
- for a class that extends `EventEmitter`: `on`, `addListener`, `off`,
  `removeListener`, `once` and `removeAllListeners`, but never `emit` or
  Node's other emitter functions.

A function an instance only gets at run time (assigned in the constructor,
say) is not published. Nothing that is not published can be reached: a
request for it fails with `Could not find function`.

### Keep a function inside

Three ways keep a function off the network, the strongest first:

| Write | What it is | When it holds |
| --- | --- | --- |
| `#calibrate () {}` | a private method of JavaScript itself | always: the language hides it from everything outside the class, the agent included |
| `_calibrate () {}` | a name beginning with `_` | unless you register with `{ onlyPublic: false }` |
| `@private` in its JSDoc (or `@access private`) | a documentation tag | when the agent reads the class's JSDoc: registered by path, or with `jsdocPath` |
| `private calibrate () {}` (or `protected`) in TypeScript | TypeScript's access | when the agent reads the TypeScript source: `jsdocPath` names the `.ts` file |

`@private` hides nothing when the agent does not read the JSDoc - after a
plain `VrpcAdapter.register(Press)`, and always in the browser, where there
is no source to read. For a function that must never be reached, use `#`.
A tag counts for the class it is written in, static or member as it is
declared, and a hidden function's documentation stays inside the agent, too.
`{ onlyPublic: false }` publishes the `_` and `@private` functions as well.

TypeScript erases `private` and `protected` when it compiles: a compiled
class publishes them like any other function. Point `jsdocPath` at the
TypeScript source, with or without doc comments on the private members,
and the agent keeps them inside:

```javascript
VrpcAdapter.register(Press, { jsdocPath: '/app/src/Press.ts' })
```

A class that extends another declared in a source of its own names both
sources; the agent reads them along the class chain, so what the base class
keeps `private` or `protected` stays inside the subclass, too:

```javascript
VrpcAdapter.register(Press, {
  jsdocPath: ['/app/src/Press.ts', '/app/src/Machine.ts']
})
```

A function follows the nearest class that defines it: a subclass that
defines a `protected` function of its base again as public publishes it,
as TypeScript allows.

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

### Declare what changes nothing

Tag a function `@nosideeffects` when calling it changes nothing another
caller, a device or storage could observe afterwards: no instance state, no
stored record, no output of a device, no message or event to others.
Computing the answer, filling a cache, reading a device in a way that
leaves it as it was and the caller's own subscriptions do not count; a
read that clears a counter, takes from a queue or acknowledges an alarm
does.

```javascript
/**
 * The pressure now
 * @nosideeffects
 * @returns {number} Pressure in bar
 */
readPressure () { /* ... */ }
```

The class info then carries `"nosideeffects": true` for the function. A
broker that reads it can let a connection call such functions and nothing
else (see [Securing a deployment](security.md#3-authorize-by-topic)); a
function without the tag counts as having side effects. Declare only what
holds: a function that calibrates while it reads has side effects.

Tag event functions, too, when subscribing changes nothing but the
caller's own subscriptions: a client confined to such functions can
subscribe only to declared event functions. A subclass that overrides a
function without documenting it keeps the documentation of its base, but
not the tag - the promise was made for the base's code.

For code whose source you cannot tag, declare at registration; it is merged
over the documentation, function by function, and `false` withdraws a
declaration:

```javascript
VrpcAdapter.register(VendorPress, {
  meta: { readPressure: { nosideeffects: true } }
})
```

The EventEmitter functions an EventEmitter class publishes are declared
for you, unless the class replaces them: they act on the caller's own
subscriptions only. A class whose `on` does more - it starts a device
stream on `'newListener'`, say - withdraws that with
`meta: { on: { nosideeffects: false } }`. `nosideeffects(classInfo,
functionName)`, exported by `vrpc`, answers the question for any function
of a class info.

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
filled in. The browser build leaves the validator out to stay small: an agent
in a page warns once and constructs with the options as given, unchecked and
without defaults.

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
