# Calls, callbacks and errors

A client calls a function of an agent's instance or class and gets its
result back. This page explains what can be called, how arguments and
results travel, and what a caller sees when something goes wrong.

## What can be called

Exactly what the class info lists - nothing else:

- the **member functions** of a class, on its instances;
- the **static functions** of a class, on the class;
- for a class that extends Node's `EventEmitter`: `on`, `addListener`,
  `off`, `removeListener`, `once` and `removeAllListeners` - never `emit` or
  Node's other emitter internals, which would let any client fake events.

Functions whose name begins with `_` are left out when a class is registered
(`onlyPublic`, the default). A function an object only acquires at run time,
or one the class info does not list for any other reason, cannot be reached
from the wire at all.

## Calling

```javascript
// a member function, through a proxy
const press = await client.getInstance('press-a', { agent: 'line-1' })
const pressure = await press.readPressure()

// a static function
const models = await client.callStatic({
  agent: 'line-1',
  className: 'Press',
  functionName: 'supportedModels'
})

// the same member function on every shared instance of a class
const all = await client.callAll({
  agent: 'line-1',
  className: 'Press',
  functionName: 'readPressure'
})
// [{ id: 'press-a', val: 7.2 }, { id: 'press-b', err: { message: 'sensor offline' } }]
```

Every call is asynchronous for the caller, whatever the function is.
`callAll` answers one entry per shared instance: `val` with the result, or
`err` when that instance failed - one failing instance does not fail the
others.

`instances` selects some instances instead of all: a name pattern, where
`*` matches any run of characters, or a list of names and patterns. The
agent calls the selected instances alone, in one request however many it
holds:

```javascript
const pressA = await client.callAll({
  agent: 'line-1',
  className: 'Press',
  functionName: 'readPressure',
  instances: 'press-a*' // or ['press-a', 'press-c*']
})
```

`agent` takes a pattern or a list as well. `callAll` then asks every
matching online agent that offers the class - or every listed agent - all
at once, and every entry names its agent: `{ agent, id, val }`. `*`, the
default, asks them all. An agent that fails as a whole (it does not answer
in time, say) answers an `err` for each of its instances, or one entry
with the error when the client knows none of them, and the other agents'
answers stand.

```javascript
const fleet = await client.callAll({
  agent: 'edge-*',
  className: 'Press',
  functionName: 'readPressure',
  instances: 'press-*'
})
// [{ agent: 'edge-1', id: 'press-a', val: 7.2 }, { agent: 'edge-2', id: 'press-a', val: 6.9 }]
```

An agent before protocol 4 cannot select instances: the client calls each
selected instance there on its own, and refuses a selection for a
subscription, whose events would then not name their instance.

## Arguments and results

Arguments and results travel as JSON:

- Numbers, strings, booleans, `null`, arrays and plain objects arrive as
  they were sent. A `Date` arrives as its ISO string; a class instance as its
  enumerable properties; `undefined` inside an array as `null`.
- A function that returns nothing resolves to `undefined`.
- A result with circular references arrives with those references cut
  (replaced by strings such as `"[Circular ~.r]"`).
- A result JSON cannot carry at all, such as a `BigInt`, fails the call with
  an error saying so.

A function that returns a promise is answered once the promise settles: the
caller's promise resolves with its value or rejects with its error. A
function may take as long as it needs; the caller waits for a settling
promise without a time limit.

## Callbacks

A function argument becomes a **callback** the agent calls back into the
caller:

```javascript
await press.calibrate(progress => console.log(`${progress} %`))
```

The agent passes a function in its place; each time the class calls it, its
arguments travel to the caller, and the client calls your function with
them. Such a callback is meant to be called once, or a few times during the
call - to report progress or a result later. It cannot be withdrawn and
falls silent when its instance is deleted.

A function that calls a handler again and again for as long as somebody
listens is an **event function**, and its handler is a subscription, not a
callback. The client tells them apart by the function: one declared
`@returns {Registration}`, or named `on` followed by a capital letter, or
Node's `on(event, handler)`. See [Events](events.md).

## Errors

A call fails with an `Error` when:

| What happened | Message |
| --- | --- |
| the function threw or its promise rejected | `[vrpc <agent>-<context>-<function>]: <the error's message>`; the error's `cause` travels along |
| the function is not one the class info lists | `[vrpc ...]: Could not find function: <name>` |
| the instance is isolated to another connection | `[vrpc ...]: Instance '<name>' is isolated to another connection` |
| no answer came in time | `Function call "<context>::<function>()" on agent "<agent>" timed out (> <ms> ms)` |
| the answer can no longer arrive | `Function call "<context>::<function>()" on agent "<agent>" lost its answer: <reason>` |

A call to an instance that does not exist, or to a static function the class
does not list, reaches no agent at all: the agent does not listen on such a
topic. It fails with the timeout.

## Timeouts

A client waits `timeout` milliseconds (12 000 by default) for the answer of
a request, and for an agent or class to come online before it sends one.
A request or its answer can be lost on the way - VRPC publishes at QoS 0 by
default - and the timeout is how a caller learns of it. Pass
`bestEffort: false` to the client and the agent to publish at QoS 1, which
rides out short connection losses at some cost.

```javascript
const client = new VrpcClient({ domain: 'factory', timeout: 30000 })
```

A function that returns a promise is answered at once that its result will
follow, and the result has no time limit: the function may run as long as it
needs. The client waits for it as long as the path it would travel stands.
When the agent goes offline or announces itself from a new connection, or
the client loses its own connection, the call fails at once with
`lost its answer` - the result can no longer arrive. A caller that wants a
bound on a long-running function races the call against a timer of its own.

## Where a call goes

A client publishes a request to a topic that names the target, and the agent
answers on a topic of the calling connection - see
[How VRPC works](overview.md#what-happens-on-a-call) and, for every detail,
the [protocol specification](../spec/protocol.md#9-calls).
