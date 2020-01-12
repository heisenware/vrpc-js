# VRPC - Variadic Remote Procedure Calls
[![Build Status](https://travis-ci.org/bheisen/vrpc.svg?branch=master)](https://travis-ci.org/bheisen/vrpc)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/bheisen/vrpc/master/LICENSE)
[![Semver](https://img.shields.io/badge/semver-2.0.0-blue)](https://semver.org/spec/v2.0.0.html)
[![GitHub Releases](https://img.shields.io/github/tag/bheisen/vrpc.svg)](https://github.com/bheisen/vrpc/tag)
[![GitHub Issues](https://img.shields.io/github/issues/bheisen/vrpc.svg)](http://github.com/bheisen/vrpc/issues)

---
## Visit our website: https://vrpc.io
---

## What is VRPC?

VRPC - Variadic Remote Procedure Calls - is a modern and asynchronous
implementation of the old RPC (remote procedure calls) idea. Basically, it
allows to directly call functions written in any programming language by
functions written in any other (or the same) programming language.

VRPC is modern as existing code can be made remotely callable:

- without having to change it
- without the need to program any binding code or complex
  schemas
- without the need to run a server

VRPC is unique as it supports the full power of the programming language in use,
such as:

- automated memory handling
- language native and custom data type support
- callback mechanisms
- asynchronicity (i.e. event-loop integration)
- exception handling
- object orientation
- lambda and closures support

Depending on the targeted technologies, VRPC ships as a library (static or
dynamic linkage), executable or source package.

## Examples

### Embedding C++ into NodeJS

- [Simple C++ to NodeJS Binding Example](docs/examples/CppNodeExample1.md)
- [Advanced C++ to NodeJS Binding Example](docs/examples/CppNodeExample2.md)

### Embedding C++ into Python3

- [Simple C++ to Python Binding Example](docs/examples/CppPythonExample1.md)
- [Advanced C++ to Python Binding Example](docs/examples/CppPythonExample2.md)

### Making existing C++ code remotely callable (agent)

- [Simple C++ Agent Example](docs/examples/CppAgentLinuxExample1.md)
- [Advanced C++ Agent Example](docs/examples/CppAgentLinuxExample2.md)

### Making existing NodeJS code remotely callable (agent)

- [NodeJS Agent Example](docs/examples/NodeAgentExample.md)

### Calling code remotely from NodeJS (client)

- [NodeJS Remote Client Example](docs/examples/NodeClientExample.md)

## Reference Documentation

- [RPC Protocol Details](docs/reference/remoteProtocol.md)
- [C++ Binding Syntax](docs/reference/cppBinding.md)
- [C++ Agent](docs/reference/cppAgent.md)
