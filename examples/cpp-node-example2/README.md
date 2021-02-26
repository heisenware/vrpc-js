# Example 2 - "At the Bar"

This example shows a more realistic case of a C++ application that
is comprised of header and source files and using more advanced language
data-types and constructs. By going through it, you will hopefully notice
that creating VRPC bindings still remains a trivial task...

---
**NOTE**

In order to follow this example from scratch, create a new directory (e.g.
`vrpc-cpp-node-example2`), cd into it and run:

```bash
npm init -f -y
npm install vrpc
```

Finally create a directory `src` and you are good to go.

---

## STEP 1: C++ code that should be bound

This time our code is a bit more elaborate and split into header and
corresponding source file.

*src/Bar.hpp*

```cpp
#include <functional>
#include <unordered_map>
#include <vector>

namespace bar {

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

    explicit Bar(const Assortment& assortment);

    static std::string philosophy();

    bool hasDrink(const std::string& type) const;

    void addBottle(const std::string& type, const Bottle& bottle);

    Bottle removeBottle(const std::string& type);

    void onEmptyDrink(const Callback& callback);

    void prepareDrink(const std::function<void (int)>& done) const;

    Assortment getAssortment() const;

  private:

    Callback _callback;
    Assortment _assortment;

  };
}
```
*src/Bar.cpp*

```cpp
#include "Bar.hpp"
#include <chrono>
#include <thread>
#include <stdlib.h>

namespace bar {

  Bar::Bar(const Assortment& assortment): _assortment(assortment) {}

  std::string Bar::philosophy() {
    return "I have mixed drinks about feelings.";
  }

  bool Bar::hasDrink(const std::string& type) const {
    return _assortment.find(type) != _assortment.end();
  }

  void Bar::addBottle(const std::string& type, const Bottle& bottle) {
    _assortment[type].push_back(bottle);
  }

  Bottle Bar::removeBottle(const std::string& type) {
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

  void Bar::onEmptyDrink(const Bar::Callback& callback) {
    _callback = callback;
  }

  void Bar::prepareDrink(const std::function<void (int)>& done) const {
    const int seconds = rand() % 4;
    std::this_thread::sleep_for(std::chrono::seconds(seconds));
    done(seconds);
  }

  Bar::Assortment Bar::getAssortment() const {
    return _assortment;
  }
}
```

## STEP 2: Binding file

This binding code shows some new features, like binding of custom data types,
handling callbacks, overloads and static functions.

*src/binding.cpp*

```cpp
#include <json.hpp> // needed to register custom data types
#include "Bar.hpp"

// NOTE: Do not include <vrpc.hpp>, even if your IDE complains

using namespace bar;

namespace vrpc {

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

  // Register functions
  VRPC_MEMBER_FUNCTION_CONST(Bar, bool, hasDrink, const std::string&)
  VRPC_VOID_MEMBER_FUNCTION(Bar, addBottle, const std::string&, const Bottle&)
  VRPC_MEMBER_FUNCTION(Bar, Bottle, removeBottle, const std::string&)
  VRPC_VOID_MEMBER_FUNCTION(Bar, onEmptyDrink, VRPC_CALLBACK(const std::string&))
  VRPC_VOID_MEMBER_FUNCTION_CONST(Bar, prepareDrink, VRPC_CALLBACK(int))
  VRPC_MEMBER_FUNCTION_CONST(Bar, Bar::Assortment, getAssortment)
  VRPC_STATIC_FUNCTION(Bar, std::string, philosophy)
}
```

## STEP 3: Creation of native addon

Creation of the addon actually always stays the same. Typically, you can start
from copying some example file over and slightly adapt it to your needs.

*binding.gyp*

```python
{
  'variables': {
    'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc/vrpc; else echo node_modules/vrpc/vrpc; fi)'
  },
  'targets': [
    {
      'target_name': 'vrpc_bar',  # name of the extension
      'defines': [],
      'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
      'cflags_cc': ['-std=c++14', '-fPIC'],
      'include_dirs': [  # include dirs that need to be found
        '<(vrpc_path)',
        'src'
      ],
      'sources': [
        '<(vrpc_path)/addon.cpp', # the VRPC adapter code
        'src/Bar.cpp' # our given C++ code
      ],
      'link_settings': {
        'libraries': [  # System library dependencies, e.g.
          # '-lpthread'
        ],
        'ldflags': [  # Linker flags
          # '-Wl,-rpath,\$$ORIGIN/runtime/path/to/local/lib',
          # '-L<!(pwd)/compiletime/path/to/local/lib'
        ]
      },
    }
  ]
}
```

As already stated in the first example you need to run:

```bash
npm install
```

in order to build the native addon.

## STEP 4: The Node.js application

By reading the code, you will get a feeling how VRPC exposes you the bound
code. VRPC uses typical language features to represent the bound functionality.

*index.js*

```javascript
'use strict'

const EventEmitter = require('events')
const { VrpcLocal } = require('vrpc')
const addon = require('./build/Release/vrpc_bar')

// Create an event emitter
const emitter = new EventEmitter()

emitter.on('empty', what => {
  console.log(` - Oh no! The ${what} is empty!`)
})

// Create an instance of a local (native-addon) vrpc factory
const vrpc = new VrpcLocal(addon)

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

Test it using:

```bash
node index.js
```

If you see the program running you are using a good portion of
native C++ code from within Node.js, congrats!!

### The thing with the C++ callbacks

There are two very different categories of callbacks:

* **Those you provide as function argument and are called exactly once.** All kinds
  of `done` callbacks, indicating the completion of an asynchronous activity
  belong to this category.

* **Those which you register once, and which are called any number of times until
  you explicitly de-register them.** All kinds of event callbacks that work in a
  publish/subscribe fashion fall into that category.

The example demonstrates this two different callbacks, `prepareDrink` belonging
to the first and `onEmptyDrink` to the second category, respectively.

VRPC can handle both of them in their natural way, i.e. use callback functions
that can be wrapped up to `Promise`s and play nice with `async/await` patterns
for category one. The event-like callbacks can be taken up by Node.js' inbuilt
`EventEmitter` and assigned an arbitrary event-name. In both cases, all
callback arguments are perfectly forwarded.
