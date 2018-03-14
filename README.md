# VRPC - Variadic Remote Procedure Calls
[![Build Status](https://travis-ci.org/bheisen/vrpc.svg?branch=master)](https://travis-ci.org/bheisen/vrpc)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/bheisen/vrpc/master/LICENSE)
[![GitHub Releases](https://img.shields.io/github/tag/bheisen/vrpc.svg)](https://github.com/bheisen/vrpc/tag)
[![GitHub Issues](https://img.shields.io/github/issues/bheisen/vrpc.svg)](http://github.com/bheisen/vrpc/issues)
* Need to bridge programming languages?
* Tired of writing bindings?
* Want to have Node.js or Python classes and objects that call corresponding C++
  code under the hood, natively or remotely?
* Details like memory management, exception handling, overload resolution should
  just work?

If your answer is **yes**, then read further.

## Design Goals

**Integration Speed** vrpc's most important goal is to provide C/C++ code to
other languages (currently *Node.js* and *Python*) without having to write any
bindings or having to touch any of the existing code.

**Completeness** Any C++ function with any signature, including callbacks and
custom data-types can be bound. Return values and exceptions are properly
forwarded. Memory allocation is transparently mapped to the remote-object`s
lifetime.

**Asynchronicity** vrpc is completely asynchronous which is especially important
if used remotely. Node.js' `async/await` can be used to
have synchronous API feeling running a highly-performing non-blocking code
under the hood.

**Ease of Use** vrpc is a header only library having no dependencies besides
the amazing *json* library of Niels Lohmann (http://nlohmann.me) which is
shipped with vrpc and is already integrated.
Building addons follows Node.js` regular workflow using the *node-gyp* tool.

## Appetizer

Say you had some existing C++ code looking like this:

*Foo.hpp*
```cpp
class Foo {

  int _value;

public:

  Foo(int value) : _value(value) {}

  int getValue() {
    return _value;
  }

};
```

Then all you need to do is listing the functions you want to bind in a file:

*binding.cpp*

```cpp
#include "Foo.hpp"

// Register the constructor, provide class and arguments
VRPC_CTOR(Foo, int);

// Register member function, provide class, return type, function name and arguments
VRPC_MEMBER_FUNCTION(Foo, int, getValue);
```

During project installation, vprc will compile the existing C++ code
together with your binding file into a native language addon. Afterwards, in
**Node.js** you can call the C++ code like:

*foo.js*

```javascript
'use strict'

const VrpcLocal = require('vrpc')
const addon = require('build/Release/vrpc_foo')

const vrpc = VrpcLocal(addon)

const foo = vrpc.create('Foo', 42)
console.log(foo.getValue()) // prints 42
```

or in **Python** like so:

*foo.py*

```python
from vrpc import VrpcLocal
import vrpc_foo  # imports the addon

vrpc = VrpcLocal(vrpc_foo)

foo = vrpc.create('Foo', 42)
print(foo.getValue()) # prints 42
```

 **NOTE**: In both cases (Node.js and Python) `foo` really only is a proxy to
    the C++ object that was created. vrpc automatically injected all functions
    specified in the bindings file into that proxy, providing a native "Call &
    Feel" to the underlying C++ code.

## Setup and Compilation - Node.js

1.  In your project, add vrpc as dependency
    ```
    npm install vrpc
    ```

2.  Add a `binding.gyp` file (use the one below as template) to the root of your
    project. Modify it as needed to e.g. express additional include directories
    or dependent libraries.

    *binding.gyp*

    ```python
    {
      'variables': {
        'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc; else echo node_modules/vrpc; fi)'
      },
      'targets': [
        {
          'target_name': 'vrpc_foo',  # Name of the extension
          'defines': ['VRPC_COMPILE_AS_ADDON=<binding.cpp>'],  # Name of the binding file
          'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
          'cflags_cc': ['-std=c++14', '-fPIC'],
          'include_dirs': [  # Include dirs needing to be found
            '<(vrpc_path)/cpp'
          ],
          'sources': [  # Sources needing to be compiled
            '<(vrpc_path)/cpp/addon.cpp'
          ],
          'link_settings': {
            'libraries': [  # System library dependencies, e.g.
              # '-lpthread'
            ],
            'ldflags': [  # Linker flags
              '-Wl,-rpath,\$$ORIGIN' #  Makes us relocatable
              # '-Wl,-rpath,\$$ORIGIN/runtime/path/to/local/lib',
              # '-L<!(pwd)/compiletime/path/to/local/lib'
            ]
          },
          'libraries': ['-Wl,-rpath,\$$ORIGIN'] #  Makes us relocatable
        }
      ]
    }
    ```

    **NOTE**: Mention include directories and source files using a relative
    path with respect to your project's root.

2.  Run `npm install` (or `node-gyp rebuild`).

    This will build the native addon: `build/Release/<target_name>.node`.

    **HINT**: Use `node-gyp rebuild --verbose` to see what's going on.


## Binding File Details

The binding file - typically named `binding.cpp` - is the only piece of code
you really have to provide in order to make language bindings happen.

In the binding file you have to mention:

1. All classes and functions you want to bind
2. All custom C++ data-types you want to expose

### Bind classes and functions

vprc basically provides four different macros for:

  1. **Constructors**
      ```cpp
      VRPC_CTOR(<className>, <args>)
      ```

      Use this macro to register constructors with arguments. Repeat
      this macro for all overloads you need.

      For constructors without arguments use:
      ```cpp
      VRPC_VOID_CTOR(<className>)
      ```

  2. **Member functions**
      ```cpp
      VRPC_MEMBER_FUNCTION(<className>, <returnValue>, <functionName>[, <args>])
      ```

      Use this macro to register class member functions. Repeat this macro for
      all overloads you need.

      For member functions with **void return value** use:
      ```cpp
      VRPC_VOID_MEMBER_FUNCTION(<className>, <functionName>[, <args>])
      ```

      For **const**ant member functions use:
      ```cpp
      VRPC_MEMBER_FUNCTION_CONST(<className>, <functionName>[, <args>])
      ```

  3. **Static functions**
      ```cpp
      VRPC_STATIC_FUNCTION(<className>, <returnValue>, <functionName>, <args>)
      ```

       Use this macro to register static functions. Repeat this macro for all
       overloads you need.

      For static functions with **void return value** use:
      ```cpp
      VRPC_VOID_STATIC_FUNCTION(<className>, <functionName>[, <args>])
      ```

  4. **Callbacks**
      ```cpp
      VRPC_CALLBACK(<args>)
      ```

      Use this macro if an argument of a function you bind reflects a callback.
      The provided arguments must match the expected signature of the callback.

### Bind custom data types

This feature is brought in by the *json* library (http://nlohmann.me) which
is shipped with vrpc (see documentation there for full details).

Say your existing code had a `struct`:

```cpp
namespace ns {
  // a simple struct to model a person
  struct Person {
    std::string name;
    std::string address;
    int age;
  };
}
```
Then on the top of your binding file (before the macros) add:

```cpp
#include <json.hpp>
using nlohmann::json;

namespace ns {
  void to_json(json& j, const Person& p) {
    j = json{{"name", p.name}, {"address", p.address}, {"age", p.age}};
  }

  void from_json(const json& j, Person& p) {
    p.name = j.at("name").get<std::string>();
    p.address = j.at("address").get<std::string>();
    p.age = j.at("age").get<int>();
  }
}
```

**NOTE**: Once you exposed you custom data-types you are ready to use them as
arguments in the binding macros (see above). They automatically also work within
all STL containers and even as arguments of callback functions!

### More Elaborate Example

Say your existing C++ code looks like that:

*Bar.hpp*

```cpp
#include <chrono>
#include <functional>
#include <thread>
#include <unordered_map>
#include <vector>
#include <stdlib.h>

namespace vrpc_example {

  struct Bottle {
    std::string brand;
    std::string country;
    int age;
  };

  class Bar {

  public:

    typedef std::function<void (const std::string& /*type*/)> Callback;
    typedef std::vector<Bottle> Bottles;
    typedef std::unordered_map<std::string, Bottles> Assortment;

    Bar() = default;

    explicit Bar(const Assortment& assortment): _assortment(assortment) {
    }

    static std::string philosophy() {
      return "I have mixed drinks about feelings.";
    }

    bool hasDrink(const std::string& type) const {
      return _assortment.find(type) != _assortment.end();
    }

    void addBottle(const std::string& type, const Bottle& bottle) {
      _assortment[type].push_back(bottle);
    }

    Bottle removeBottle(const std::string& type) {
      if (!hasDrink(type)) {
        throw std::runtime_error("Can't remove bottle of unavailable category");
      }
      Bottles& bottles = _assortment[type];
      Bottle bottle =  bottles.back();
      bottles.pop_back();
      if (bottles.size() == 0) {
        _callback(type);
        _assortment.erase(type);
      }
      return bottle;
    }

    void onEmptyDrink(const Callback& callback) {
      _callback = callback;
    }

    void prepareDrink(const std::function<void (int)>& done) const {
      const int seconds = rand() % 4;
      std::this_thread::sleep_for(std::chrono::seconds(seconds));
      done(seconds);
    }

    Assortment getAssortment() const {
      return _assortment;
    }

  private:

    Callback _callback;
    Assortment _assortment;

  };
}
```

Then you can fully bind it like that:

*binding.cpp*

```cpp
#include <json.hpp> // needed to register custom data types
#include "Bar.hpp"

// NOTE: Do not include <vrpc.hpp>, even if you IDE complains

using nlohmann::json;

namespace vrpc_example {

  // Register custom type: Bottle
  void to_json(json& j, const Bottle& b) {
    j = json{{"brand", b.brand}, {"country", b.country}, {"age", b.age}};
  }
  void from_json(const json& j, Bottle& b) {
    b.brand = j.at("brand").get<std::string>();
    b.country = j.at("country").get<std::string>();
    b.age = j.at("age").get<int>();
  }

  // Register constructors
  VRPC_VOID_CTOR(Bar)
  VRPC_CTOR(Bar, const Bar::Assortment&)

  // Register static functions
  VRPC_STATIC_FUNCTION(Bar, std::string, philosophy)

  // Register member functions
  VRPC_MEMBER_FUNCTION_CONST(Bar, bool, hasDrink, const std::string&)
  VRPC_VOID_MEMBER_FUNCTION(Bar, addBottle, const std::string&, const Bottle&)
  VRPC_MEMBER_FUNCTION(Bar, Bottle, removeBottle, const std::string&)
  VRPC_VOID_MEMBER_FUNCTION(Bar, onEmptyDrink, VRPC_CALLBACK(const std::string&))
  VRPC_VOID_MEMBER_FUNCTION_CONST(Bar, prepareDrink, VRPC_CALLBACK(int))
  VRPC_MEMBER_FUNCTION_CONST(Bar, Bar::Assortment, getAssortment)
```

Once compiled into an addon you can run
this pure Node.js code:

*Bar.js*

```javascript
'use strict'

const EventEmitter = require('events')
const VrpcLocal = require('../js/VrpcLocal')
const addon = require('../build/Release/vrpc_example')

// Create an event emitter
const emitter = new EventEmitter()

emitter.on('empty', what => {
  console.log(` - Oh no! The ${what} is empty!`)
})

// Create an instance of a local (native-addon) vrpc factory
const vrpc = VrpcLocal(addon)

console.log('Why an example at the Bar?')
console.log(' - Because', vrpc.callStatic('Bar', 'philosophy'))

// Create a Bar instance (using default constructor)
const bar = vrpc.create('Bar')

console.log('Do you have rum?')
console.log(bar.hasDrink('rum') ? ' - Yes' : ' - No')

console.log('Well, then let\'s get a bottle out of the cellar.')
bar.addBottle('rum', { brand: 'Don Papa', country: 'Philippines', age: 7 })

console.log('Now, can I have a drink?')
console.log(bar.hasDrink('rum') ? ' - Yes' : ' - No')

console.log('I would go for a "Dark and Stormy", please.')
bar.prepareDrink(seconds => {
  console.log(` - Here's your drink, took only ${seconds}s`)
})

console.log('Nice! I take another one. Please tell me, once the rum is empty.')
bar.onEmptyDrink({ emitter: emitter, event: 'empty' })
bar.prepareDrink(seconds => {
  console.log(` - Here's your drink, took ${seconds}s this time.`)
})
bar.removeBottle('rum')

// Create another bar - already equipped - using second constructor
const neighborsBar = vrpc.create(
  'Bar',
  {
    rum: [
      { brand: 'Botucal', country: 'Venezuela', age: 8 },
      { brand: 'Plantation XO', country: 'Barbados', age: 20 }
    ],
    brandy: [
      { brand: 'Lustau Solera', country: 'Spain', age: 15 }
    ]
  }
)
console.log('How is your neighbor sorted?')
console.log(' - Very well:\n', neighborsBar.getAssortment())
```
which will output something like this:

*stdout*

```
Why an example at the Bar?
 - Because I have mixed drinks about feelings.
Do you have rum?
 - No
Well, then let's get a bottle out of the cellar.
Now, can I have a drink?
 - Yes
I would go for a "Dark and Stormy", please.
 - Here's your drink, took only 3s
Nice! I take another one. Please tell me, once the rum is empty.
 - Here's your drink, took 2s this time.
 - Oh no! The rum is empty!
How is your neighbor sorted?
 - Very well:
 { brandy: [ { age: 15, brand: 'Lustau Solera', country: 'Spain' } ],
  rum:
   [ { age: 8, brand: 'Botucal', country: 'Venezuela' },
     { age: 20, brand: 'Plantation XO', country: 'Barbados' } ] }
```

Hopefully, this example is more or less self-explanatory. It is shipped within
this repository (see `examples` directory) and can be build using:
```
BUILD_EXAMPLE=1 npm install
```
and run like so:
```
node examples/Bar.js
```

### Existing project example - Node.js

The npm project **vrpc-nodejs-example** is a real-life example of another
node-js project using vrpc as dependency (github is
[here](https://github.com/bheisen/vrpc-nodejs-example)).


### The thing with the callbacks

There are two very different categories of callbacks:

* **Those you provide as function argument and are called exactly once.** All kinds
  of `done` callbacks, indicating the completion of an asynchronous activity
  belong to this category.

* **Those which you register once, and which are called any number of times until
  you explicitly de-register them.** All kinds of event callbacks that work in a
  publish/subscribe fashion fall into that category.

The example demonstrates this two different callbacks, `prepareDrink` belonging
to the first and `onEmptyDrink` to the second category, respectively.

vrpc can handle both of them in their natural way, i.e. use callback functions
that can be wrapped up to `Promise`s and play nice with `async/await` patterns
for category one. The event-like callbacks can be taken up by Node.js' inbuilt
`EventEmitter` and assigned an arbitrary event-name. In both cases, all
callback arguments are perfectly forwarded.
