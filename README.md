# VRPC for JavaScript

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/vrpc.svg)](https://www.npmjs.com/package/vrpc)
[![CI](https://github.com/heisenware/vrpc-js/actions/workflows/ci.yml/badge.svg)](https://github.com/heisenware/vrpc-js/actions/workflows/ci.yml)

**Call classes in other programs as if they were local.** VRPC (Variadic
Remote Procedure Call) makes the classes of a Node.js, C++, Python or
Arduino program callable from any other program - a backend service, a
browser, a device - across any network, without REST routes, schemas or
WebSocket plumbing.

This package is VRPC for JavaScript: the **agent** that offers your Node.js
or browser code, and the **client** that uses remote code from Node.js or
the browser.

## Why VRPC

- **No API layer.** Register a class and its functions are callable
  remotely: instances, static functions, promises, callbacks and errors work
  as they do locally.
- **Events that scale.** Many clients can listen to the same events; the
  agent calls your event function once, hands every event to every
  listener, greets newcomers with the current state, and cleans up when the
  last one leaves.
- **Reaches everything.** Built on MQTT: agents and clients only connect out
  to a broker, so code behind firewalls and NATs is reachable, and
  connections that break come back by themselves.
- **One protocol, several languages.** A browser can call a C++ agent; a
  Python service can listen to a Node.js agent.

## Install

```bash
npm install vrpc
```

Node.js 18 or newer, or any current browser. VRPC is free and open source;
all it needs is an MQTT broker.

## Quick start

Offer a class from one program - the **agent**:

```javascript
// agent.js
const EventEmitter = require('events')
const { VrpcAdapter, VrpcAgent } = require('vrpc')

class Sensor extends EventEmitter {
  constructor (id) {
    super()
    this._timer = setInterval(() => this.emit('data', { id, value: Math.random() }), 1000)
  }

  async calibrate () {
    return true
  }

  [Symbol.dispose] () {
    clearInterval(this._timer)   // released when the instance is deleted
  }
}

VrpcAdapter.register(Sensor)

new VrpcAgent({ domain: 'my-domain', agent: 'sensors' })
  .serve()
  .then(() => console.log('Agent is serving'))
```

Use it from another - the **client**, in Node.js or a browser:

```javascript
// client.js
const { VrpcClient } = require('vrpc')

async function main () {
  const client = new VrpcClient({ domain: 'my-domain' })
  await client.connect()

  const sensor = await client.create({
    agent: 'sensors',
    className: 'Sensor',
    instance: 'living-room',
    args: ['living-room']
  })

  console.log('calibrated:', await sensor.calibrate())
  await sensor.on('data', ({ id, value }) => console.log(id, value))
}

main()
```

Both connect to a public test broker by default; use a domain of your own,
and your own broker for anything real. The
[tutorial](docs/getting-started.md) takes it further in ten minutes.

## Event functions

A function that calls a handler again and again returns a **registration**
that tells the agent how to undo the call, and optionally how to greet a new
listener:

```javascript
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
```

The agent calls it once, however many clients subscribe, and releases it
when the last one leaves. See [Events](docs/concepts/events.md) and
[Writing event functions](docs/guides/event-functions.md).

## Documentation

- [Getting started](docs/getting-started.md) - a ten-minute tutorial
- [How VRPC works](docs/concepts/overview.md), [Instances](docs/concepts/instances.md),
  [Calls](docs/concepts/calls.md), [Events](docs/concepts/events.md)
- Guides: [offering classes](docs/guides/expose-classes.md),
  [the browser](docs/guides/browser-and-react.md),
  [persistence](docs/guides/persistence.md),
  [security](docs/guides/security.md), [production](docs/guides/production.md),
  [troubleshooting](docs/guides/troubleshooting.md)
- [API reference](docs/reference/README.md)
- [Protocol specification](docs/spec/protocol.md), for every VRPC implementation
- [All documentation](docs/README.md), and [vrpc.io](https://vrpc.io)
- [llms.txt](https://vrpc.io/llms.txt) - the documentation's index for AI
  coding assistants; every page is also served as Markdown

## The VRPC family

- [vrpc-hpp](https://github.com/heisenware/vrpc-hpp) - C++
- [vrpc-py](https://github.com/heisenware/vrpc-py) - Python
- [vrpc-arduino](https://github.com/heisenware/vrpc-arduino) - Arduino and ESP32
- [vrpc-react](https://github.com/heisenware/vrpc-react) - React hooks

## Contributing and security

Bug reports and small fixes are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md)
and the [code of conduct](CODE_OF_CONDUCT.md). Report security issues
privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
