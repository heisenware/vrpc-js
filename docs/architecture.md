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

VRPC may or may not be used in a distributed fashion. If it is used in the
non-distributed fashion the *client* executes local (same process) to the
*agent* and the *broker* component is not involved at all.

No matter whether distributed or not, function calls are always wrapped into
JSON which is serialized into a string. Return values and potential exceptions
are as well wrapped into string-serialized JSON and shipped back to the caller
(see remoteProtocol.md for details).

## Adapter

The adapter can be understood like a local factory (in an OOP sense). It must
support the entire lifecycle management of objects (i.e. creation and deletion)
and hence must own the instances it creates. Creation of objects and calling of
functions must be possible using string identifiers only.

Functions and classes must be able to be registered to the adapter in a
non-intrusive fashion (i.e. the code may have existed before VRPC was invented
and must still be adaptable).

Currently, adapters exist for:

- C++ - `vrpc.hpp`
- Javascript - `VrpcAdapter.js`

### Minimal interface

```ts
static function register(code: Any): void;
```

Depending on the technology one or more interfaces to non-intrusively register
classes and functions may be provided.

In C++ those functions are expressed as macros such as:

```ts
VRPC_CTOR(klass: class, ...args: any[])
VRPC_MEMBER_FUNCTION(ret: any, klass: class, ...args: any[])
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

Besides the registered functionality `call` must additionally provide the
following static functions:

```ts
function __create__ (className: string, ...args: any[]): string;

function __createNamed__ (className: string, instanceName: string, ...args: any[]): string;

function __getNamed__ (instanceName: string): instanceId;

function __delete__ (instanceName: string): boolean;
```

reflecting those methods abstracting the instances' life-cycle management.

While not needed for VRPC, those life-cycle functions are typically made
available as proper public (and static) interface on the Adapter itself.
Hence, implementing a powerful plug-able local factory.

- - -

```ts
function onCallback(callback: (jsonString: string) => void): void;
```

This function must be provided a callback function expecting a string-serialized
JSON (in VRPC format).

## Agent

The agent's task is to grab the JSON formatted strings from the clients and
pass them on to the adapter's interface. The agent is the callee whereas the
client is the caller.

When running in a distributed fashion the agent must implement a MQTT client as
the VRPC clients will send their JSON strings via the broker.

When running in local fashion the agent must allow to cross the boundary of
programming languages - typically via native addons or other means of in-process
communication.

Currently, local agents exist for

- Embedding C++ in Javascript (`addon.cpp`)
- Embedding C++ in Python3 (`module.cpp`)

Currently, remote agents exist for

- C++ (non-free component)
- Javascript (`VrpcAgent.js`)
- Arduino (https://github.com/heisenware/vrpc-arduino-agent)

### Interface

To be done...

## Client

To be done...
