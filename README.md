# VRPC - Variadic Remote Procedure Calls

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/heisenware/vrpc-js/master/LICENSE)
[![Semver](https://img.shields.io/badge/semver-2.0.0-blue)](https://semver.org/spec/v2.0.0.html)
[![GitHub Releases](https://img.shields.io/github/tag/heisenware/vrpc-js.svg)](https://github.com/heisenware/vrpc-js/tag)
[![GitHub Issues](https://img.shields.io/github/issues/heisenware/vrpc-js.svg)](http://github.com/heisenware/vrpc-js/issues)
![ci](https://github.com/heisenware/vrpc-js/actions/workflows/ci.yml/badge.svg)

## Visit our website: [vrpc.io](https://vrpc.io)

## What is VRPC?

VRPC - Variadic Remote Procedure Calls - is an enhancement of the old RPC
(remote procedure calls) idea. Like RPC, it allows to directly call functions
written in any programming language by functions written in any other (or the
same) programming language. Unlike RPC, VRPC furthermore supports:

- non-intrusive adaption of existing code, making it callable remotely
- remote function calls on many distributed receivers at the same time (one
  client - multiple agents)
- service discovery
- outbound-connection-only network architecture (using MQTT technology)
- isolated (multi-tenant) and shared access modes to remote resources
- asynchronous language constructs (callbacks, promises, event-loops)
- OOP (classes, objects, member functions) and functional (lambda) patterns
- exception forwarding

VRPC is available for an entire spectrum of programming technologies including
embedded, data-science, and web technologies.

As a robust and highly performing communication system, it can build the
foundation of complex digitization projects in the area of (I)IoT or
Cloud-Computing.

## This is VRPC for Javascript (Node.js and Browser)

Understand how to use it by looking at the examples:

- [Agent Example](examples/01-agent/README.md)
- [Client Example](examples/02-client/README.md)
- [Simple C++ Embedding Example](examples/03-native-simple/README.md)
- [Advanced C++ Embedding Example](examples/04-native-advanced/README.md)

Get all the details by reading the documentation:

- [API Reference](docs/api.md)
- [RPC Protocol Details](docs/protocol.md)

> This open-source project is professionally managed and supported by
> [Heisenware GmbH](https://heisenware.com).
