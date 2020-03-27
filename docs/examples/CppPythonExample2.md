# Example 2 - "At the Bar"

This example shows a more realistic case of a C++ application that
is comprised of header and source files and using more advanced language
data-types and constructs. By going through it, you will hopefully notice
that creating VRPC bindings still remains a trivial task...

---
**NOTE**

In order to follow this example from scratch, create a new directory (e.g.
`vrpc-cpp-python-example2`), cd into it and run:

```bash
pip3 install vrpc --user
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
#include "Bar.hpp"

// NOTE: Do not include <vrpc.hpp>, even if you IDE complains

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

*setup.py*

```python
from distutils.sysconfig import get_python_lib
from setuptools import setup, Extension
from os import path
import subprocess
import re

res = subprocess.run(
    ['pip3', 'show', 'vrpc', '--disable-pip-version-check'], stdout=subprocess.PIPE)
install_path = re.search('Location: (.*)', res.stdout.decode('utf-8')).group(1)
vrpc_path = path.join(install_path, 'vrpc')
vrpc_module_cpp = path.join(vrpc_path, 'module.cpp')

module = Extension(
    'vrpc_bar', # Your module name here
    include_dirs=[vrpc_path, './src'],
    define_macros=[
        ('VRPC_MODULE_NAME', '"vrpc_bar"'), # and here
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_bar') # and again here
    ],
    extra_compile_args=['-std=c++14', '-fPIC'],
    sources=[
        vrpc_module_cpp,
         './src/Bar.cpp'
    ],
    language='c++'
)

setup(
    name='vrpc-python-example2',
    install_requires=['vrpc'],
    ext_modules=[module]
)
```

As already stated in the first example you need to run:
```bash
pip3 install . --user
```
in order to build the python native extension.

## STEP 4: The Python application

By reading the code, you will get a feeling how VRPC exposes the bound
code. VRPC uses typical language features to represent the bound functionality.

*main.py*

```python
from vrpc import VrpcLocal
import vrpc_bar  # Imports the extension


def _onEvent(event, *args):
    if event == 'empty':
        print(" - Oh no! The {} is empty!".format(args[0]))


def main():
    # Create an instance of a local (native-extension) vrpc factory
    vrpc = VrpcLocal(vrpc_bar)
    print("Why an example at the Bar?")
    print(" - Because {}".format(vrpc.call_static('Bar', 'philosophy')))

    # Create a Bar instance (using default constructor)
    bar = vrpc.create('Bar')

    print("Do you have rum")
    print(" - Yes" if bar.hasDrink('rum') else " - No")

    print("Well, then let's get a bottle out of the cellar.")
    bar.addBottle(
        'rum',
        {'brand': 'Don Papa', 'country': 'Philippines', 'age': 7}
    )

    print("Now, can I have a drink?")
    print(" - Yes" if bar.hasDrink('rum') else " - No")

    print("I would go for a \"Dark and Stormy\", please")
    msg = " - Here's your drink, took only {}s"
    bar.prepareDrink(lambda seconds: print(msg.format(seconds)))

    print("Nice! I take another one. Please tell me, once the rum is empty.")
    bar.onEmptyDrink((_onEvent, 'empty'))
    bar.prepareDrink(lambda seconds: print(msg.format(seconds) + " this time"))
    bar.removeBottle('rum')

    # Create another bar - already equipped - using second constructor
    neighborsBar = vrpc.create(
        'Bar',
        {
            'rum': [
                {'brand': 'Botucal', 'country': 'Venezula', 'age': 8},
                {'brand': 'Plantation XO', 'country': 'Barbados', 'age': 20}
            ],
            'brandy': [
                {'brand': 'Lustau Solera', 'country': 'Spain', 'age': 15}
            ]
        }
    )
    print("How is your neighbor sorted?")
    print(" - Very well:\n{}".format(neighborsBar.getAssortment()))


if __name__ == '__main__':
    main()
```

Test it using:

```bash
python3 main.py
```
