# VRPC documentation

VRPC makes the classes and functions of one program callable from others,
over MQTT, in JavaScript, C++, Python and on Arduino, with React hooks for the
browser. This folder documents
VRPC for JavaScript (Node.js and the browser) and the protocol every VRPC
implementation speaks.

## Start here

- **[Getting started](getting-started.md)** - offer a class from one program
  and use it from another, in ten minutes.

## Understand

- [How VRPC works](concepts/overview.md) - agents, clients, the broker, and
  how a call travels.
- [Instances](concepts/instances.md) - shared and isolated instances, how
  long they live, and how they release what they run.
- [Calls, callbacks and errors](concepts/calls.md) - what can be called, how
  values travel, what a caller sees when something fails.
- [Events](concepts/events.md) - event functions, registrations and
  subscriptions, greeting, ends and losses.
- [Glossary](concepts/glossary.md) - every term in one meaning.

## Do

- [Offering classes from an agent](guides/expose-classes.md)
- [Writing event functions](guides/event-functions.md)
- [VRPC in the browser](guides/browser-and-react.md)
- [Persisting instances](guides/persistence.md)
- [Calling C++ from Node.js](guides/native-code.md)
- [Securing a deployment](guides/security.md)
- [Running in production](guides/production.md)
- [Troubleshooting](guides/troubleshooting.md)

## Look up

- [API reference](reference/README.md) - every class, function and option of vrpc-js.
- [Protocol specification](spec/protocol.md) - exactly what travels on the
  wire, for every VRPC implementation.
- [Implementing VRPC](spec/porting.md) - building an agent or a client in
  another language.
- [Changelog](../CHANGELOG.md) - what changed in each version.

## Other languages

Each implementation documents its own API and examples and refers here for
the protocol:

- [vrpc-hpp](https://github.com/heisenware/vrpc-hpp) (C++)
- [vrpc-py](https://github.com/heisenware/vrpc-py) (Python)
- [vrpc-arduino](https://github.com/heisenware/vrpc-arduino) (Arduino, ESP32)
- [vrpc-react](https://github.com/heisenware/vrpc-react) (React hooks)
