# Example 1 - "Foo'ed again"

This is a very simple example demonstrating the basic steps needed to
integrate existing C++ code into Python 3.

---
**NOTE**

In order to follow this example from scratch, create a new directory (e.g.
`vrpc-cpp-python-example1`), cd into it and run:

```bash
pip3 install 'vrpc==2.0.0a8' --user
```
Finally create a directory `src` and you are good to go.

---

## STEP 1: C++ code that should be bound

We pretend that the code below already existed and should be made usable
from within Python3.

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

## STEP 2: Binding file

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

We want to run the C++ code embedded in our final Python application.
Hence, a native addon must be created. We follow standard technology
and create a `setup.py` file:

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
    'vrpc_foo', # Your module name here
    include_dirs=[vrpc_path, './src'],
    define_macros=[
        ('VRPC_MODULE_NAME', '"vrpc_foo"'), # and here
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_foo') # and again here
    ],
    extra_compile_args=['-std=c++14', '-fPIC'],
    sources=[vrpc_module_cpp],
    language='c++'
)

setup(
    name='vrpc-python-example1',
    install_requires=['vrpc'],
    ext_modules=[module]
)

```

In order to trigger the compilation run:

```bash
pip3 install . --user
```

Once finished, a freshly created module called something like
`vrpc_foo.cpython-36m-x86_64-linux-gnu.so` is available
under your python's `site-packages` folder.

## STEP 4: The Python application

*main.py*

```python
from vrpc import VrpcLocal
import vrpc_foo # Imports the extension

vrpc = VrpcLocal(vrpc_foo)

foo = vrpc.create("Foo", 42)
print(foo.getValue()) # prints 42
foo.setValue(24)
print(foo.getValue()) # prints 24
```

Test it using:

```bash
python3 main.py
```

Note that the C++ code is called like all other instructions in Python
by the interpreter. The execution however, is at the speed of compiled
C++!!
