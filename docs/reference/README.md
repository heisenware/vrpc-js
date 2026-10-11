# API reference

Every public class of vrpc-js, generated from its JSDoc. For what the
classes are for and how they work together, start with
[How VRPC works](../concepts/overview.md).

| Class | Use it to |
| --- | --- |
| [VrpcClient](vrpc-client.md) | call agents: create and delete instances, call functions, subscribe to events |
| [VrpcAgent](vrpc-agent.md) | offer the classes of a program to clients over a broker |
| [VrpcAdapter](vrpc-adapter.md) | register classes and instances, and listen to what happens to them |
| [VrpcPersistor](vrpc-persistor.md) | keep an agent's shared instances across restarts |
| [VrpcNative](vrpc-native.md) | call C++ code compiled into a Node.js addon |

```javascript
const { VrpcClient, VrpcAgent, VrpcAdapter, VrpcPersistor, VrpcNative } = require('vrpc')
```

## In the browser

The browser build of `vrpc` exports `VrpcClient`, and a `VrpcAgent` and
`VrpcAdapter` for agents in a page (see [VRPC in the browser](../guides/browser-and-react.md)).
`VrpcClient` is the same class. The browser `VrpcAgent` takes the same
options, but has no `create()` and no `fromCommandline()`; the browser
`VrpcAdapter` registers classes with `registerClass(Klass, options)` and
plain functions with `registerFunction(fn, name)`, and publishes no JSDoc
meta data. `VrpcPersistor` and `VrpcNative` are Node.js only.
