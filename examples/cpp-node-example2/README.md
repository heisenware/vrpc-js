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

struct Bottle {
  std::string name;
  std::string category;
  std::string country;
};

class Bar {
 public:
  typedef std::function<void(const std::string&)> StringCallback;
  typedef std::function<void(const Bottle&)> BottleCallback;
  typedef std::vector<BottleCallback> BottleCallbacks;
  typedef std::vector<Bottle> Selection;

  static std::string philosophy();

  Bar() = default;

  explicit Bar(const Selection& selection);

  void addBottle(const std::string& name,
                 const std::string& category = "n/a",
                 const std::string& country = "n/a");

  Bottle removeBottle(const std::string& name);

  void onAdd(const BottleCallback& listener);

  void onRemove(const BottleCallback& listener);

  std::string prepareDrink(const StringCallback& done) const;

  Selection getSelection() const;

 private:

  std::string _random() const;

  BottleCallbacks _addListeners;
  BottleCallbacks _removeListeners;
  Selection _selection;
};
```

*src/Bar.cpp*

```cpp
#include "Bar.hpp"
#include <chrono>
#include <iostream>
#include <thread>

std::string Bar::philosophy() {
  return "I have mixed drinks about feelings.";
}

Bar::Bar(const Selection& selection) : _selection(selection) {}

void Bar::addBottle(const std::string& name,
                    const std::string& category,
                    const std::string& country) {
  Bottle bottle = {name, category, country};
  _selection.push_back(bottle);
  for (const auto& notify : _addListeners) notify(bottle);
}

Bottle Bar::removeBottle(const std::string& name) {
  Selection filtered;
  Bottle bottle;
  for (const auto& x : _selection) {
    if (bottle.name.empty() && (x.name == name)) {
      for (const auto& notify : _removeListeners) notify(x);
      bottle = x;
      continue;
    }
    filtered.push_back(x);
  }
  if (bottle.name.empty()) {
    throw std::runtime_error("Sorry, this bottle is not in our selection");
  }
  _selection = filtered;
  return bottle;
}

void Bar::onAdd(const Bar::BottleCallback& listener) {
  _addListeners.push_back(listener);
}

void Bar::onRemove(const Bar::BottleCallback& listener) {
  _removeListeners.push_back(listener);
}

std::string Bar::prepareDrink(const Bar::StringCallback& done) const {
  const std::vector<std::string> v = {_random(), _random(), _random()};
  std::thread([=]() {
    std::this_thread::sleep_for(std::chrono::seconds(3));
    done("Your drink is ready! I mixed " + v[0] + " with " + v[1] +
         " and a bit of " + v[2] + ".");
  }).detach();
  return "In preparation...";
}

Bar::Selection Bar::getSelection() const {
  return _selection;
}

std::string Bar::_random() const {
  if (_selection.size() == 0) {
    throw std::runtime_error("I searched, but couldn\'t find any bottles");
  }
  int index = std::rand() % _selection.size();
  return _selection[index].name;
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

namespace vrpc {
  // Register custom type: Bottle
  void to_json(json& j, const Bottle& b) {
    j = json{{"name", b.name}, {"category", b.category}, {"country", b.country}};
  }
  void from_json(const json& j, Bottle& b) {
    b.name = j.at("name").get<std::string>();
    b.category = j.at("category").get<std::string>();
    b.country = j.at("country").get<std::string>();
  }

  // Register static function
  VRPC_STATIC_FUNCTION(Bar, std::string, philosophy)

  // Register constructors
  VRPC_CTOR(Bar)
  VRPC_CTOR(Bar, const Bar::Selection&)

  // Register member functions
  VRPC_MEMBER_FUNCTION_X(Bar,
                      void, "",
                      addBottle, "Adds a bottle to the bar",
                      const std::string&, "name", required(), "name of the bottle",
                      const std::string&, "category", "n/a", "category of the drink",
                      const std::string&, "country", "n/a", "country of production")
  VRPC_MEMBER_FUNCTION(Bar, Bottle, removeBottle, const std::string&)
  VRPC_MEMBER_FUNCTION(Bar, void, onAdd, VRPC_CALLBACK(const Bottle&))
  VRPC_MEMBER_FUNCTION(Bar, void, onRemove, VRPC_CALLBACK(const Bottle&))
  VRPC_CONST_MEMBER_FUNCTION(Bar, std::string, prepareDrink, VRPC_CALLBACK(const std::string&))
  VRPC_CONST_MEMBER_FUNCTION(Bar, Bar::Selection, getSelection)
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
  console.log(` - Oh, the ${what.name} went empty!`)
})

// Create an instance of a local (native-addon) vrpc factory
const vrpc = new VrpcLocal(addon)

console.log('Why an example at the Bar?')
console.log(' - Because', vrpc.callStatic('Bar', 'philosophy'))

// Create a Bar instance (using default constructor)
const bar = vrpc.create('Bar')

console.log('Well then, get me a drink!')
try {
  bar.prepareDrink((done) => console.log(done))
} catch (err) {
  console.log(` - ${err.message}`)
  console.log(' - I\'ll get some bottles out of the cellar.')
}

bar.addBottle('Don Papa', 'rum', 'Philippines')
bar.addBottle('Botucal', 'rum', 'Venezuela')
bar.addBottle('Lustau Solera', 'brandy', 'Spain')
bar.addBottle('Coke', 'soft', 'USA')
bar.onRemove({ emitter, event: 'empty' })

console.log('Fine, can I have a drink now?')
const answer = bar.prepareDrink((done) => console.log(` - ${done}`))
console.log(` - ${answer}`)
bar.removeBottle('Coke')

// Create another bar - already equipped - using second constructor
const neighborsBar = vrpc.create(
  'Bar',
  [
    { name: 'Adelholzer', category: 'water', country: 'Germany' },
    { name: 'Hohes C', category: 'juice', country: 'Germany' }
  ]
)
console.log('How is your neighbor sorted?')
console.log(' - Not so well... \n', neighborsBar.getSelection())
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
to the first and `onRemove` to the second category, respectively.

VRPC can handle both of them in their natural way, i.e. use callback functions
that can be wrapped up to `Promise`s and play nice with `async/await` patterns
for category one. The event-like callbacks can be taken up by Node.js' inbuilt
`EventEmitter` and assigned an arbitrary event-name. In both cases, all
callback arguments are perfectly forwarded.
