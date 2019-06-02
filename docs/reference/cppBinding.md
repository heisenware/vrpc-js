# C++ Binding Macros

In order to let VRPC generate C++ language bindings you have to mention:

1. All classes and functions you want to bind
2. All custom C++ data-types you want to expose

This must be done in a file called `binding.cpp` in case you want to embed
C++ into NodeJS or Python3.

If you are going to build an agent (in order to make the bound code
remotely accessible) it is recommended to add the binding code directly to the
file that implements the `main` function.

---
**IMPORTANT**
Always define binding macros and function within the vrpc namespace, i.e.
```cpp
namespace vrpc {
  // Binding code goes here
}
```
---


Starting with the macros, VRPC uses basically only four different types to
express all bindings.

## 1. Constructors

```cpp
VRPC_CTOR(<className>, <args>)
```

Use this macro to register constructors with arguments. Repeat
this macro for all overloads you need.

For constructors without arguments use:
```cpp
VRPC_VOID_CTOR(<className>)
```

## 2. Member functions

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

## 3. Static functions

```cpp
VRPC_STATIC_FUNCTION(<className>, <returnValue>, <functionName>, <args>)
```

  Use this macro to register static functions. Repeat this macro for all
  overloads you need.

For static functions with **void return value** use:
```cpp
VRPC_VOID_STATIC_FUNCTION(<className>, <functionName>[, <args>])
```

## 4. Callbacks

```cpp
VRPC_CALLBACK(<args>)
```

Use this macro if an argument of a function you bind reflects a callback.
The provided arguments must match the expected signature of the callback.

---
**IMPORTANT** Windows is different

On windows the syntax of the binding file macros is slightly different
(as the MSVC++ compiler is broken for variadic macros).
All member function and static function macros need to start with an
underscore and must end with `_<N>` where `N` is the number of arguments
in the macro.

To e.g. bind this member function of class `Foo`:

```cpp
std::string bar(int, float);
```

use:

```cpp
_VRPC_MEMBER_FUNCTION_5(Foo, std::string, bar, int, float)
```
---

## Binding of custom data types

This feature is brought in by the library *JSON for Modern C++*
(https://github.com/nlohmann/json) which is embedded in VRPC (see documentation
there for full details).

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
using ns::Person;

namespace vrpc {
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

Depending on your needs you may also define only `to_json` or only `from_json`
if you are only provide it to C++ or only reading it from C++, respectively.

Once you exposed your custom data-types you are ready to use them as
arguments in the binding macros (see above). They automatically also work within
all STL containers and even as arguments of callback functions!

**IMPORTANT**

Never add the `binding.cpp` as source file for compilation, only tell
the compiler the include path to it (e.g. in *gcc*: use the `-I` option)
