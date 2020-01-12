# Architecture

## Adapter

- can be understood like a local factory
- abstracts the life-cycle management of objects (creation and deletion)

### Interface

```
register (class)
getClasses ()
getInstances (className)
getMemberFunctions (className)
getStaticFunctions (className)
call (jsonString)
onCallback (callback<sonString>)
```

Besides the registered functionality `call` must additionally provide the
following static functions:

```
__create__ (className, args...)
__createNamed__ (className, instanceName, args...)
__getNamed__ (instanceName)
__delete__ (instanceName)
```
reflecting those methods abstracting the instances' life-cycle management.

While not needed for VRPC, those life-cycle functions are typically made
available as proper public (and static) interface on the Adapter itself.
Hence, implementing a powerful plug-able local factory.

### Existing adapters:


- `vrpc.hpp`: Adapter for C++
- `addon.cpp`: Adapter for C++ made available for javascript
- `module.cpp`: Adapter for C++ made available for python
- `VrpcAdapter.js` : Adapter for javascript


## Local Client

- communicates directly with an Adapter in the same application and without
  the need of a network
- provides access to all adapter functionality in form of object proxies or
  function call abstractions
- automatically realizes language bindings if Adapter and Local Client are
  using different technologies

### Interface

```
create (string className, any args...) -> proxy // overloaded to realize createNamed
getInstance (string instance) -> proxy
delete (string instance) -> bool
callStatic (string className, string functionName, any args...)
getAvailableClasses () -> array<string>
getAvailableInstances (string className) -> array<string>
getAvailableMemberFunctions (string className) -> array<string>
getAvailableStaticFunctions (string className) -> array<string>
```
