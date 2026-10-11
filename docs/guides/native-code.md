# Calling C++ from Node.js

VRPC can embed existing C++ code in a Node.js program: the C++ classes
become JavaScript classes whose calls run the compiled code in-process, in
the same event loop, without a broker.

This guide shows the steps. The examples
[03-native-simple](../../examples/03-native-simple) and
[04-native-advanced](../../examples/04-native-advanced) carry them out in
full, and [vrpc-hpp](https://github.com/heisenware/vrpc-hpp) documents every
registration macro.

## 1. Adapt the C++ code

The C++ code stays as it is. An adapter file names the constructors and
functions to offer:

`src/adapter.cpp`

```cpp
#include "Foo.hpp"

VRPC_CTOR(Foo);
VRPC_CONST_MEMBER_FUNCTION(Foo, int, getValue);
VRPC_MEMBER_FUNCTION(Foo, void, setValue, int);
```

Arguments and results travel as JSON; custom types are described once with
`VRPC_DEFINE_TYPE`. A callback parameter is declared with `VRPC_CALLBACK`.

## 2. Build an addon

A `binding.gyp` builds VRPC's addon source together with your code:

```python
{
  'variables': {
    'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc; else echo node_modules/vrpc; fi)'
  },
  'targets': [
    {
      'target_name': 'vrpc_foo',
      'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
      'cflags_cc': ['-std=c++14', '-fPIC'],
      'include_dirs': ['<(vrpc_path)', 'src'],
      'sources': ['<(vrpc_path)/vrpc/addon.cpp']
    }
  ]
}
```

`npm install` (or `npx node-gyp rebuild`) compiles it to
`build/Release/vrpc_foo.node`. You need a C++14 compiler and the usual
[node-gyp prerequisites](https://github.com/nodejs/node-gyp#installation).

## 3. Use it

```javascript
const { VrpcNative } = require('vrpc')
const addon = require('./build/Release/vrpc_foo')

const native = new VrpcNative(addon)
const Foo = native.getClass('Foo')

const foo = new Foo()
foo.setValue(42)
console.log(foo.getValue()) // 42
```

Calls are synchronous: they run the C++ code directly. Static functions are
static functions of the proxy class. A callback called once (a `done`) is
passed as a function; one called again and again goes through `vrpcOn`:

```javascript
bar.vrpcOn('onRemove', bottle => console.log(`${bottle.name} went empty`))
```

`native.getAvailableClasses()` lists what the addon offers.

## Offering C++ code remotely

To call C++ code from other programs, run it as an agent of its own with
[vrpc-hpp](https://github.com/heisenware/vrpc-hpp), which speaks the same
protocol as every other VRPC agent.
