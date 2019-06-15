# Example 1 - "Foo'ed again"

This is a very simple example demonstrating the basic steps needed to
integrate existing C++ code into Node.js.

---
**NOTE**

In order to follow this example from scratch, create a new directory (e.g.
`vrpc-cpp-node-example1`), cd into it and run:

```bash
npm init -f -y
npm install vrpc@2.0.0-alpha.8
```
Finally create a directory `src` and you are good to go.

---


## STEP 1: C++ code that should be bound

We pretend that the code below already existed and should be made usable
from within Node.js.

*src/Foo.hpp*
```cpp
class Foo {

  int _value;

public:

  Foo(int value) : _value(value) {}

  int getValue() const {
    return _value;
  }

  void setValue(int value) {
    _value = value;
  }

};
```

## STEP 2: Binding File

The binding file (conventionally called `binding.cpp`) must include all relevant
headers and mention all constructors and functions that should be bound.

*src/binding.cpp*

```cpp
#include "Foo.hpp"

// Bind constructor
// Needs: class, argument-type
VRPC_CTOR(Foo, int);

// Bind constant member function
// Needs: class, return type, function, [argument-type]
VRPC_MEMBER_FUNCTION_CONST(Foo, int, getValue);

// Bind void, non-const member function
// Needs: class, function, [argument-type]
VRPC_VOID_MEMBER_FUNCTION(Foo, setValue, int);
```

See here for a full reference of all available binding macros.

## STEP 3: Creation of a native addon

We want to run the C++ code embedded in our final Node.js application.
Hence, a native addon must be created. We follow standard technology
and create a `binding.gyp` file (and place it in the root directory):

*binding.gyp*
```python
{
  'variables': {
    'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc/vrpc; else echo node_modules/vrpc/vrpc; fi)'
  },
  'targets': [
    {
      'target_name': 'vrpc_foo',  # name of the extension
      'defines': [],  # any pre-processor defines you need
      'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
      'cflags_cc': ['-std=c++14', '-fPIC'],
      'include_dirs': [  # include dirs to be found
        '<(vrpc_path)',
        'src'
      ],
      'sources': [  # sources to be compiled
        '<(vrpc_path)/addon.cpp', # builds the VRPC adapter
      ]
    }
  ]
}
```

In order to trigger the compilation we must run:

```bash
npm install
```

Once finished, the freshly created addon called `vrpc_foo.node` is available
under `build/Release`.

## STEP 4: The Node.js application

*src/foo.js*

```javascript
'use strict'

const { VrpcLocal } = require('vrpc')
const addon = require('../build/Release/vrpc_foo')

const vrpc = new VrpcLocal(addon)

const foo = vrpc.create('Foo', 42)
console.log(foo.getValue()) // prints 42
foo.setValue(24)
console.log(foo.getValue()) // prints 24
```

Test it using:

```bash
node src/foo.js
```

Note that the C++ code is called like all other instructions in Node.js as
part of the event-loop. The execution however, is at the speed of compiled
C++ !!
