# VRPC

> Remote objects over MQTT: VRPC makes the classes of Node.js, C++, Python and Arduino programs callable from any other program, as if they were local - without an API layer, routes or schemas.

VRPC is free and open source under the MIT license. There is no hosted
service, no account and no API key: you install a library, and your programs
meet at an MQTT broker of your choice (Mosquitto, EMQX, HiveMQ and others).
The broker is the only thing to run.

- Install for Node.js and the browser: `npm install vrpc` (Node.js 18 or
  newer).
- An **agent** offers classes: `VrpcAdapter.register(Counter)`, then
  `new VrpcAgent({ domain, agent }).serve()`.
- A **client** uses them: `new VrpcClient({ domain })`, `await client.connect()`,
  then `client.create(...)` or `client.getInstance(...)` returns a proxy whose
  functions return promises.
- The client's functions take their arguments like this:
  `create({ agent, className, instance, args })`,
  `getInstance(instance, { agent, className })`,
  `delete(instance, { agent, className })`,
  `callStatic({ agent, className, functionName, args })`,
  `callAll({ agent, className, functionName, args })`.
- Without a `broker` option, agent and client connect to the public test
  broker `mqtts://broker.hivemq.com:8883`. Anybody can read what travels
  there, and it is at times slow: a call that gets no answer within 12 s fails
  with `timed out (> 12000 ms)`. Raise the client's `timeout`, or run a broker
  of your own - `docker run -p 1883:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf`,
  then `broker: 'mqtt://localhost:1883'` for agent and client. A browser connects
  over WebSocket (`wss://`).
- Other languages speak the same protocol:
  [vrpc-hpp](https://github.com/heisenware/vrpc-hpp) (C++),
  [vrpc-py](https://github.com/heisenware/vrpc-py) (Python, `pip install vrpc`),
  [vrpc-arduino](https://github.com/heisenware/vrpc-arduino) (Arduino, ESP32),
  [vrpc-react](https://github.com/heisenware/vrpc-react) (React hooks).

Every page of the documentation is also served as Markdown, at its address
with `.md` in place of the trailing slash:
<https://vrpc.io/docs/getting-started/> as
<https://vrpc.io/docs/getting-started.md>. All pages in one file:
<https://vrpc.io/llms-full.txt>

<!-- pages -->

## Optional

- [Examples](https://github.com/heisenware/vrpc-js/tree/master/examples): runnable agents and clients
- [Changelog](https://raw.githubusercontent.com/heisenware/vrpc-js/master/CHANGELOG.md): what changed in each version of vrpc-js
- [Source code](https://github.com/heisenware/vrpc-js): vrpc-js on GitHub
- [Blog](https://vrpc.io/blog/): news and stories from VRPC
