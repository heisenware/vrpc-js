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

Beside the classes, `vrpc` exports one function:

| Function | Answers |
| --- | --- |
| `nosideeffects(classInfo, functionName)` | whether the class info (with meta data, as on `__classInfo__`) declares the function free of side effects: the protocol's own functions by the protocol, with or without a class info, every other function by `"nosideeffects": true` in its meta data, an undeclared or unlisted function `false` (see [Declare what changes nothing](../guides/expose-classes.md#declare-what-changes-nothing)) |

## In the browser

The browser build of `vrpc` exports `VrpcClient`, and a `VrpcAgent` and
`VrpcAdapter` for agents in a page (see [VRPC in the browser](../guides/browser-and-react.md)).
`VrpcClient` is the same class. The browser `VrpcAgent` takes the same
options, but has no `create()` and no `fromCommandline()`; the browser
`VrpcAdapter` registers classes with `registerClass(Klass, options)` and
plain functions with `registerFunction(fn, name, options)`, and publishes
no JSDoc meta data - only what `options.meta` declares. `nosideeffects` is exported
as well. `VrpcPersistor` and `VrpcNative` are Node.js only.
