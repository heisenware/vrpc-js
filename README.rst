VRPC - Variadic Remote Procedure Calls
======================================

|Build Status| |GitHub license| |Semver| |GitHub Releases| |GitHub
Issues|

-  Need to bridge programming languages?
-  Tired of writing bindings?
-  Want to have Node.js or Python classes and objects that call
   corresponding C++ code under the hood, natively or remotely?
-  Details like memory management, exception handling, overload
   resolution should just work?

If your answer is **yes**, then read further.

Design Goals
------------

**Integration Speed** vrpc's most important goal is to provide C/C++
code to other languages (currently *Node.js* and *Python*) without
having to write any bindings or having to touch any of the existing
code.

**Completeness** Any C++ function with any signature, including
callbacks and custom data-types can be bound. Return values and
exceptions are properly forwarded. Memory allocation is transparently
mapped to the remote-object's lifetime.

**Asynchronicity** vrpc is completely asynchronous which is especially
important if used remotely. Node.js' ``async/await`` can be used to have
synchronous API feeling running a highly-performing non-blocking code
under the hood.

**Ease of Use** vrpc is a header only library having no dependencies
besides the amazing `JSON for Modern
C++ <https://github.com/nlohmann/json>`__ library of Niels Lohmann which
is shipped with vrpc and is already integrated. Building addons follows
Node.js' regular workflow using the *node-gyp* tool.

Appetizer
---------

Say you had some existing C++ code looking like this:

*Foo.hpp*

.. code:: cpp

    class Foo {

      int _value;

    public:

      Foo(int value) : _value(value) {}

      int getValue() {
        return _value;
      }

    };

Then all you need to do is listing the functions you want to bind in a
file:

*binding.cpp*

.. code:: cpp

    #include "Foo.hpp"

    // Register the constructor, provide class and arguments
    VRPC_CTOR(Foo, int);

    // Register member function, provide class, return type, function name and arguments
    VRPC_MEMBER_FUNCTION(Foo, int, getValue);

During project installation, vrpc will compile the existing C++ code
together with your binding file into a native language addon.
Afterwards, in **Node.js** you can call the C++ code like:

*foo.js*

.. code:: javascript

    'use strict'

    const VrpcLocal = require('vrpc')
    const addon = require('build/Release/vrpc_foo')

    const vrpc = VrpcLocal(addon)

    const foo = vrpc.create('Foo', 42)
    console.log(foo.getValue()) // prints 42

or in **Python** like so:

*foo.py*

.. code:: python

    from vrpc import VrpcLocal
    import vrpc_foo  # imports the addon

    vrpc = VrpcLocal(vrpc_foo)

    foo = vrpc.create('Foo', 42)
    print(foo.getValue()) # prints 42

**NOTE**: In both cases (Node.js and Python) ``foo`` really only is a
proxy to the C++ object that was created. vrpc automatically injected
all functions specified in the bindings file into that proxy, providing
a native "Call & Feel" to the underlying C++ code.

Real Life Examples
------------------

C++ to Node.js
~~~~~~~~~~~~~~

The npm project
`vrpc-nodejs-example <https://www.npmjs.com/package/vrpc-nodejs-example>`__
is an example of another node-js project using vrpc as dependency
(github is `here <https://github.com/bheisen/vrpc-nodejs-example>`__).

C++ to Python
~~~~~~~~~~~~~

The github project
`vrpc-python-example <https://github.com/bheisen/vrpc-python-example>`__
binds the same example code as in the Node.js example, but makes it
available to Python 3.

Setup and Compilation - Node.js
-------------------------------

Install vrpc
~~~~~~~~~~~~

In your project run:

::

    npm install vrpc

Add a ``binding.gyp`` file
~~~~~~~~~~~~~~~~~~~~~~~~~~

Add the file (see below for a template) to the root of your project.
Modify it as needed to e.g. express additional include directories or
dependent libraries.

*binding.gyp*

.. code:: python

    {
      'variables': {
        'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc/vrpc; else echo node_modules/vrpc/vrpc; fi)'
      },
      'targets': [
        {
          'target_name': 'vrpc_foo',  # Name of the extension
          'defines': [],  # Any pre-processor defines you need
          'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
          'cflags_cc': ['-std=c++14', '-fPIC'],
          'include_dirs': [  # Include dirs to be found
            '<(vrpc_path)',
            # '<path/to/binding-file>' # Make sure your binding.cpp file is found
            # '<other/include/dir>'
          ],
          'sources': [  # Sources to be compiled
            '<(vrpc_path)/addon.cpp',
              # <your/src/to_be_compiled.cpp>
          ],
          'link_settings': {
            'libraries': [  # System library dependencies, e.g.
              # '-lpthread'
            ],
            'ldflags': [  # Use e.g. for extern lib in a non-standard location:
              # '-Wl,-rpath,\$$ORIGIN<runtime/path/to/extern/lib>',
              # '-L<!(pwd)</compiletime/path/to/extern/lib>'
            ]
          },
        }
      ]
    }

**NOTE**: Mention include directories and source files using a relative
path with respect to your project's root.

Build your project
~~~~~~~~~~~~~~~~~~

After running

::

    npm install

you will find the native addon: ``build/Release/<target_name>.node``.

**HINT**: You can also use ``node-gyp rebuild`` to (re-)build the addon
and add the flag ``--verbose`` to see details of build step.

Setup and Compilation - Python 3
--------------------------------

Install vrpc
~~~~~~~~~~~~

.. code:: python

    pip install vrpc

Prepare your project's ``setup.py``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You have to modify your project's ``setup.py`` to define the native
extension:

*setup.py*

.. code:: python

    from distutils.sysconfig import get_python_lib
    from setuptools import setup, Extension, find_packages
    import os


    vrpc_path = os.path.join(get_python_lib(), 'vrpc')
    vrpc_module_cpp = os.path.join(vrpc_path, 'module.cpp')

    module = Extension(
        'vrpc_foo_ext',  # Name of the extension
        define_macros=[
            ('VRPC_MODULE_NAME', '"vrpc_foo_ext"'),  # Module name
            ('VRPC_MODULE_FUNC', 'PyInit_vrpc_foo_ext')  # Init function name
        ],
        include_dirs=[  # Include dirs to be found
          vrpc_path,
          # '<path/to/binding-file>'  # Make sure your binding.cpp file is found
        ],
        sources=[  # Sources to be compiled
            vrpc_module_cpp,
            # <your/src/to_be_compiled.cpp>
        ],
        extra_compile_args=['-std=c++14', '-fPIC'],
        language='c++'
    )

    setup(
        name='vrpc_foo',
        # [...]  Whatever needs to be set up for your package
        install_requires=[  # Mention vrpc as dependency
            'vrpc'
        ],
        ext_modules=[module]  # Add the extension module as defined above
    )

**NOTE**: As you can see from the ``Extension``, it is important that
the path to the prior installed vrpc dependency is found. Depending on
your pip installation the generic solution above may not always work and
may need manual tweaking.

Build your package
~~~~~~~~~~~~~~~~~~

While you are developing run e.g.:

.. code:: python

    pip install -e .

Binding File Details
--------------------

The binding file - typically named ``binding.cpp`` - is the only piece
of code you really have to provide in order to make language bindings
happen.

In the binding file you have to mention:

1. All classes and functions you want to bind
2. All custom C++ data-types you want to expose

Basically, vrpc uses only four different macros types to express all
bindings.

1. Constructors
~~~~~~~~~~~~~~~

.. code:: cpp

    VRPC_CTOR(<className>, <args>)

Use this macro to register constructors with arguments. Repeat this
macro for all overloads you need.

For constructors without arguments use:

.. code:: cpp

    VRPC_VOID_CTOR(<className>)

2. Member functions
~~~~~~~~~~~~~~~~~~~

.. code:: cpp

    VRPC_MEMBER_FUNCTION(<className>, <returnValue>, <functionName>[, <args>])

Use this macro to register class member functions. Repeat this macro for
all overloads you need.

For member functions with **void return value** use:

.. code:: cpp

    VRPC_VOID_MEMBER_FUNCTION(<className>, <functionName>[, <args>])

For **const**\ ant member functions use:

.. code:: cpp

    VRPC_MEMBER_FUNCTION_CONST(<className>, <functionName>[, <args>])

3. Static functions
~~~~~~~~~~~~~~~~~~~

.. code:: cpp

    VRPC_STATIC_FUNCTION(<className>, <returnValue>, <functionName>, <args>)

Use this macro to register static functions. Repeat this macro for all
overloads you need.

For static functions with **void return value** use:

.. code:: cpp

    VRPC_VOID_STATIC_FUNCTION(<className>, <functionName>[, <args>])

4. Callbacks
~~~~~~~~~~~~

.. code:: cpp

    VRPC_CALLBACK(<args>)

Use this macro if an argument of a function you bind reflects a
callback. The provided arguments must match the expected signature of
the callback.

Binding of custom data types
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This feature is brought in by the *json* library (http://nlohmann.me)
which is shipped with vrpc (see documentation there for full details).

Say your existing code had a ``struct``:

.. code:: cpp

    namespace ns {
      // a simple struct to model a person
      struct Person {
        std::string name;
        std::string address;
        int age;
      };
    }

Then on the top of your binding file (before the macros) add:

.. code:: cpp

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

**NOTE**: Once you exposed you custom data-types you are ready to use
them as arguments in the binding macros (see above). They automatically
also work within all STL containers and even as arguments of callback
functions!

More Elaborate Example
----------------------

Say your existing C++ code looks like that:

*Bar.hpp*

.. code:: cpp

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

Then you can fully bind it like that:

*binding.cpp*

.. code:: cpp

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
    }

Once compiled into an addon you can run this pure Node.js code:

*Bar.js*

.. code:: javascript

    'use strict'

    const EventEmitter = require('events')
    const VrpcLocal = require('../vrpc/VrpcLocal')
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

or if you prefer Python you can write:

*bar.py*

.. code:: python

    from vrpc import VrpcLocal
    import vrpc_example_ext  # Imports the extension


    def _onEvent(event, *args):
        if event == 'empty':
            print(" - Oh no! The {} is empty!".format(args[0]))


    def main():
        # Create an instance of a local (native-extension) vrpc factory
        vrpc = VrpcLocal(vrpc_example_ext)
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

The output will look something like this:

*stdout*

::

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

Hopefully, this example is more or less self-explanatory. It is shipped
within this repository (see ``examples`` directory) and can be build and
run using

::

    BUILD_EXAMPLE=1 npm install
    node examples/Bar.js

for Node.js and in Python like so:

::

    BUILD_EXAMPLE=1 pip install -e . --user
    python examples/bar.py

**HINT**: This example is also available as stand-alone Node.js or
Python project, see `above <#real-life-examples>`__

The thing with the callbacks
----------------------------

There are two very different categories of callbacks:

-  **Those you provide as function argument and are called exactly
   once.** All kinds of ``done`` callbacks, indicating the completion of
   an asynchronous activity belong to this category.

-  **Those which you register once, and which are called any number of
   times until you explicitly de-register them.** All kinds of event
   callbacks that work in a publish/subscribe fashion fall into that
   category.

The example demonstrates this two different callbacks, ``prepareDrink``
belonging to the first and ``onEmptyDrink`` to the second category,
respectively.

vrpc can handle both of them in their natural way, i.e. use callback
functions that can be wrapped up to ``Promise``\ s and play nice with
``async/await`` patterns for category one. The event-like callbacks can
be taken up by Node.js' inbuilt ``EventEmitter`` and assigned an
arbitrary event-name. In both cases, all callback arguments are
perfectly forwarded.

.. |Build Status| image:: https://travis-ci.org/bheisen/vrpc.svg?branch=master
   :target: https://travis-ci.org/bheisen/vrpc
.. |GitHub license| image:: https://img.shields.io/badge/license-MIT-blue.svg
   :target: https://raw.githubusercontent.com/bheisen/vrpc/master/LICENSE
.. |Semver| image:: https://img.shields.io/SemVer/2.0.0.png
   :target: https://semver.org/spec/v2.0.0.html
.. |GitHub Releases| image:: https://img.shields.io/github/tag/bheisen/vrpc.svg
   :target: https://github.com/bheisen/vrpc/tag
.. |GitHub Issues| image:: https://img.shields.io/github/issues/bheisen/vrpc.svg
   :target: http://github.com/bheisen/vrpc/issues
