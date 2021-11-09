# Example 1 - "Foo'ed again"

This is a very simple example demonstrating the basic steps needed to
embed existing C++ code into Node.js.

> **NOTE**
>
> In order to follow this example from scratch, create a new directory (e.g.
> `vrpc-embedded-cpp1`), cd into it and run:
>
> ```bash
> npm init -f -y
> npm install vrpc
> ```
>
> Finally create a directory `src` and you are good to go.

## STEP 1: C++ code that should be embedded

We pretend that the code below already existed and should be made usable
from within Node.js.

*src/Foo.hpp*

```cpp
class Foo {

  int _value = 0;

public:

  Foo() = default;

  int getValue() const {
    return _value;
  }

  void setValue(int value) {
    _value = value;
  }
};
```

## STEP 2: Adapter File

The adapter file (conventionally called `adapter.cpp`) must include all relevant
headers and mention all constructors and functions that are going to be used.

*src/adapter.cpp*

```cpp
#include "Foo.hpp"

// adapt constructor
VRPC_CTOR(Foo);

// adapt getter
VRPC_CONST_MEMBER_FUNCTION(Foo, int, getValue);

// adapt setter
VRPC_MEMBER_FUNCTION(Foo, void, setValue, int);
```

See [here](docs/reference/cppBinding.md) for a full reference of all available
binding macros.

## STEP 3: Creation of a native addon

We want to run the C++ code embedded in our final Node.js application.
Hence, a native addon must be compiled. We follow standard technology
and create a `binding.gyp` file (and place it in the root directory):

*binding.gyp*

```python
{
  'variables': {
    'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc; else echo node_modules/vrpc; fi)'
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
        '<(vrpc_path)/vrpc/addon.cpp', # builds the VRPC adapter
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

*index.js*

```javascript
const { VrpcNative } = require('vrpc')
const addon = require('./build/Release/vrpc_foo')

const native = new VrpcNative(addon)

// obtain proxy class
const Foo = native.getClass('Foo')

// create proxy instance
const foo = new Foo()

foo.setValue(42)
console.log(foo.getValue()) // prints 42
```

Test it using:

```bash
node index.js
```

Note that the C++ code is called like all other instructions in Node.js as
part of the event-loop. The execution however, is at the speed of compiled
C++ !!
