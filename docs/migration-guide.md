# Migration Guide

## Version 2 -> 3

### Client code

- Rename all occasions of `VrpcRemote` to `VrpcClient`

- Fix all API calls that produced a deprecation message

- Use the `isIsolated: true` option when creating instances that were formerly
  "anonymous" (i.e. were not provided with an `instance` name)

### Agent code

No changes needed

### C++ Embedding

- The class `VrpcLocal` is not longer available, instead use `VrpcNative`

- You should now create a **proxy class** and use it like any other class

  - Static calls are now available as methods of the proxy class

  - Proxy instances are automatically created when instantiating objects of the
    proxy class

  - Note the new `vrpcOn(<emittingFunction>, <args>)` function which is
    injected into each proxy. Use it if you want to treat a given callback as
    event-emitter (i.e. registered once, called-back many times). Formerly, you
    had to provide an `EventEmitter` in such cases. Providing an `EventEmitter`
    is not possible anymore.

  - See the examples and the documentation for all details

- When compiling the native addon, note the changed paths in the binding.gyp
  file (see the examples for all details)

### General

- Carefully check the new wire-protocol for everything you did at a lower level
  than the provided APIs

- Do not mix version 2 and version 3 components of VRPC in a distributed setup
