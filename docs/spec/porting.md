# Implementing VRPC

This page is for authors of a VRPC implementation in another language - an
agent, a client, or both. It names the parts an implementation consists of,
what each must do, and where the [protocol specification](protocol.md)
defines it. The specification is normative; this page is a map to it.

## The parts

| Part | Does | JavaScript |
| --- | --- | --- |
| **Adapter** | registers classes, keeps instances, executes calls, keeps registrations | `VrpcAdapter` (`vrpc/VrpcAdapter.js`, `vrpc/Registrations.js`) |
| **Agent** | connects an adapter to the broker: subscribes, announces, answers, watches presence | `VrpcAgent` (`vrpc/VrpcAgent.js`) |
| **Client** | discovers agents, sends requests, hands out proxies, keeps subscriptions | `VrpcClient` (`vrpc/VrpcClient.js`) |

An implementation for a device (vrpc-arduino) may offer an agent only; one
for a backend language usually offers all three.

## The adapter

The adapter knows nothing about MQTT. It is the in-process half of VRPC, and
it should stay usable on its own: embedding one language in another (the
Node.js addon `VrpcNative` drives a C++ adapter this way) needs only the
adapter.

It MUST be able to:

- **register classes without changing them.** Code that existed before VRPC
  must become callable as it is: through reflection where the language has
  it (JavaScript, Python), through registration macros where it does not
  (C++: `VRPC_CTOR`, `VRPC_MEMBER_FUNCTION`, ...);
- **list** its classes, and per class its shared instances, member functions
  and static functions - exactly what a request can call
  ([CALL-1](protocol.md#91-what-a-request-reaches));
- **create and delete instances by name**, shared and isolated, and dispose
  of an instance through its language's mechanism
  ([section 10](protocol.md#10-instances));
- **handle a request in place**: take a request object (section 6.1), run it,
  and fill in its answer (section 6.2) - in JavaScript
  `VrpcAdapter.call(jsonString) -> jsonString`;
- **hand out what it sends on its own** - callbacks, events, second answers of
  promises, ended notices (section 6.3) - through one hook, in JavaScript
  `VrpcAdapter.onCallback(message => ...)`. A promise id carries a random
  part per process next to its counter, so no other agent repeats it
  ([CALL-6](protocol.md#94-promises));
- **keep registrations** with the guarantees of
  [section 12](protocol.md#12-events). `vrpc/Registrations.js` is the
  reference design: one book per adapter of contexts, registrations and
  subscriptions, independent of the transport.

For embedding, the minimal interface is:

```text
getClasses() -> JSON array of class names
getMemberFunctions(className) -> JSON array of function names
getStaticFunctions(className) -> JSON array of function names
call(request: JSON string) -> answer: JSON string
onCallback(handler: (message: JSON string) -> void)
```

## The agent

Section [7](protocol.md#7-agents-serving-and-announcing) and the agent rules
of section [8.2](protocol.md#82-presence). In order of a connection's life:

1. Connect with a clean session and a last will: the agent info, `offline`,
   retained (AG-3). Derive the MQTT client id from domain and agent name
   (TOP-2).
2. Subscribe every request topic (AG-2), wait for every SUBACK, retry
   refused ones (TR-7), and only then publish the agent info `online` and
   both class infos of every class (AG-1, AG-3, AG-7). Clear the retained
   class info of a class you no longer offer (AG-12).
3. For every request: check the sender (MSG-2, SEC-2), take context and
   function from the topic (MSG-1), let the adapter run it, publish the
   answer to `s` (MSG-6). Watch the presence of connections that hold
   something (AG-10, AG-11).
4. Republish the class info when shared instances come and go (AG-7).
5. On a clean end, publish the agent info `offline` (AG-4); on unregister,
   clear the retained messages (AG-5).

## The client

Sections [8](protocol.md#8-clients-connection-and-presence),
[9](protocol.md#9-calls) and the client duties of
[12](protocol.md#1211-client-duties):

1. Make a connection id with a secret (CL-1), set the presence will (CL-4),
   and subscribe the connection's topics before the first request (CL-2).
2. Subscribe agent info and class info (CL-3); read each agent's protocol
   version (AG-6) to know which rules of section 13 apply.
3. Give every request its own correlation id (MSG-4); treat a `__p__` answer
   as pending (CALL-7); accept errors as objects and as strings (MSG-7).
4. Derive subscription ids from everything that tells subscriptions apart
   (EV-2), keep them across losses, declare again after your own reconnect
   (CL-6) and after an agent's loss (CL-10), and deliver withdrawals that
   could not be sent (CL-11).

## Testing an implementation

The JavaScript test suites check every rule by its identifier:

- `tests/subscriptions/wire.spec.js` sends hand-made requests to an agent
  over a real MQTT connection and checks every answer field by field. Each
  test names the rules it checks; it is the model for an agent's
  conformance tests in any language.
- `tests/adapter/registrations.spec.js` checks the registration rules of
  section 12 against the adapter alone.

A port is interoperable when the vrpc-js client works against its agent and
its client works against a vrpc-js agent, through the same broker.
