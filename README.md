# VRPC JavaScript / Node.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/vrpc.svg)](https://www.npmjs.com/package/vrpc)

**Stop writing API boilerplate.** VRPC (Virtual Remote Procedure Call) allows you to call Node.js, C++, Python, and Arduino classes across any network as if they were local objects. Perfect for microservices, IoT backends, and directly driving React frontends—without the need for REST, GraphQL, or WebSocket boilerplate.

This repository provides both the **Agent** (to expose your Node.js code) and the **Client** (to seamlessly control remote code from Node.js, the browser, or React/Vue applications).

---

## Why VRPC for JavaScript?

- **Zero Boilerplate:** No Express routers, no OpenAPI schemas, and no payload parsing. Just register your ES6 class, and VRPC instantly makes its asynchronous methods remotely callable. Promises are handled natively!
- **Native Event Proxies:** Don't just fetch data—stream it. VRPC transparently proxies Node.js `EventEmitter` instances and standard callbacks across the network. When your backend emits an event, your React UI updates instantly.
- **MQTT-Powered NAT Traversal:** Built on top of robust MQTT, agents make outbound connections to your broker. No CORS headaches, no complex reverse proxies, and perfect resilience on unstable networks.
- **Universal Client:** The exact same client code works in Node.js microservices and in the browser. Easily build real-time dashboards that directly control distributed backend services.

## Installation

Install VRPC via npm or yarn:

```bash
npm install vrpc
# or
yarn add vrpc
```

## Quick Start

With VRPC, making a Node.js class remotely accessible and consuming it from a frontend requires almost zero API code.

### 1. Write and Expose your Backend Class (Agent)

```javascript
// backend.js
const { VrpcAdapter, VrpcAgent } = require('vrpc')
const EventEmitter = require('events')

// A standard ES6 Class using Promises and EventEmitters
class Sensor extends EventEmitter {
  constructor(sensorId) {
    super()
    this.id = sensorId

    // Simulate real-time data
    setInterval(() => {
      this.emit('data', { id: this.id, value: Math.random() })
    }, 1000)
  }

  async calibrate() {
    console.log(`Calibrating sensor ${this.id}...`)
    return true
  }
}

// 1. Register the class
VrpcAdapter.register(Sensor)

// 2. Start the Agent
const agent = new VrpcAgent({
  domain: 'my_domain',
  agent: 'sensor_backend',
  broker: 'mqtts://broker.hivemq.com:8883'
})

agent.serve().then(() => console.log('Backend is online!'))
```

### 2. Control it from your Frontend / Microservice (Client)

Once your Node.js agent is running, you can interact with it transparently from any VRPC client (Browser or Node.js):

```javascript
// frontend.js (or React component)
import { VrpcClient } from 'vrpc'

async function run() {
  const client = new VrpcClient({
    domain: 'my_domain',
    broker: 'mqtts://broker.hivemq.com:8883'
  })

  await client.connect()

  // Create a remote instance of your Node.js class
  const sensor = await client.create({
    agent: 'sensor_backend',
    className: 'Sensor',
    args: ['living-room-sensor']
  })

  // Call functions natively (Promises are automatically resolved)
  const isCalibrated = await sensor.calibrate()
  console.log(`Calibration successful: ${isCalibrated}`)

  // Listen to remote EventEmitters across the network!
  await sensor.on('data', reading => {
    console.log(`New reading from ${reading.id}: ${reading.value}`)
  })
}

run()
```

## The VRPC Ecosystem

Write your performance-critical code in **C++**, your data-science scripts in **Python**, your business logic in **Node.js**, and your IoT firmware on **Arduino**. Call them all identically.

- [VRPC for C++](https://github.com/heisenware/vrpc-cpp)
- [VRPC for Python](https://github.com/heisenware/vrpc-py)
- [VRPC for Arduino / ESP32](https://github.com/heisenware/vrpc-arduino)
- [VRPC for React](https://github.com/heisenware/vrpc-react)

## Documentation

For detailed API references, React hooks (`react-vrpc`), advanced schema validation, and architecture overviews, please visit our official documentation at **[vrpc.io/docs](https://vrpc.io/docs)**.

## Contributing

Contributions are welcome! Whether it's reporting a bug, proposing a new feature, or submitting a pull request, we'd love your help to make VRPC even better. Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## License

VRPC is released under the [MIT License](LICENSE).
