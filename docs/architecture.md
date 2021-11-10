# Architecture

In general, VRPC differentiates between 4 fundamental components on which the
entire eco-system is built on:

1. Adapter
2. Agent
3. Client
4. Broker

While the broker is programming language agnostic, the *adapter*, *agent* and
*client* components have to be implemented for each programming language which
is supported by VRPC.

## Adapter

The adapter can be understood like a local factory (in an OOP sense). It must
support the entire lifecycle management of objects (i.e. creation and deletion)
and hence must own the instances it creates. Creation of objects and calling of
functions must be possible using string identifiers only.

Functions and classes must be able to be registered to the adapter in a
non-intrusive fashion (i.e. the code may have existed before VRPC was invented
and must still be adaptable).

Currently, adapters exist for:

- [C++](https://github.com/heisenware/vrpc-hpp)
- [Javascript](https://github.com/heisenware/vrpc)
- [R](https://github.com/heisenware/vrpc-r)

### Minimal interface

```ts
static function register(code: Any): void;
```

Depending on the the programming language, one or more interfaces to
non-intrusively register classes and functions may be provided.

In C++ those functions are expressed as macros such as:

```ts
VRPC_CTOR(klass: class, ...args: any[])
VRPC_MEMBER_FUNCTION(klass: class, ret: any, ...args: any[])
```

- - -

```ts
static function getClasses(): string;
```

The returned string must reflect a stringified JSON which itself reflects
an array strings.

- - -

```ts
function getInstances(className: string): string;
```

The returned string must reflect a stringified JSON which itself reflects
an array strings.

- - -

```ts
function getMemberFunctions(className: string): string;
```

The returned string must reflect a stringified JSON which itself reflects
an array strings.

- - -

```ts
function getStaticFunctions(className: string): string;
```

The returned string must reflect a stringified JSON which itself reflects
an array strings.

- - -

```ts
function call(jsonString: string): string;
```

This function must be provided a string-serialized JSON (VRPC format) and
it must return a stringified JSON (VRPC format) as well.

Besides the registered functionality `call` must additionally support the
following static functions:

```ts
function __createIsolated__ (className: string, ...args: any[]): string;

function __createShared__ (className: string, instanceName: string, ...args: any[]): string;

function __delete__ (instanceName: string): boolean;
```

reflecting the factory methods for the instances' life-cycle management.

While not needed for VRPC, those life-cycle functions are typically made
available as proper public (and static) interface on the Adapter itself.
Hence, implementing a powerful plug-able local factory.

- - -

```ts
function onCallback(callback: (jsonString: string) => void): void;
```

This function expects a callback function which receives a string-serialized
JSON (in VRPC format).

## Agent

The agent's task is to grab the JSON formatted strings from the clients and
pass them on to the adapter's interface. The agent is the callee whereas the
client is the caller.

The agent must implement a MQTT client as the VRPC clients will send their JSON
strings via the broker.

Currently, agents exist for

- [C++](https://github.com/heisenware/vrpc-hpp)
- [Javascript](https://github.com/heisenware/vrpc)
- [Arduino](https://github.com/heisenware/vrpc-arduino-agent)

## Client

To be done...
