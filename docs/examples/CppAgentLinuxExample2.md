# Example 2 - "At the Bar"

This example shows a more realistic case of a C++ application that
is comprised of header and source files and using more advanced language
data-types and constructs. By going through it, you will hopefully notice
that creating VRPC bindings still remains a trivial task...

---
**NOTE**

In order to follow this example from scratch, first download
the correct C++ agent for your platform from https://vrpc.io/web/download.

Save the tarball in a new directory (e.g.
`vrpc-cpp-agent-example2`), and unpack it using:

```bash
tar -xzf vrpc-cpp-agent-<platform>.tar.gz
```

then rename the resultant directory to `third_party`, i.e.

```bash
mv <platform> third_party
```
Finally create a directory `src` and you are good to go.

If you start with VRPC the first time please see steps A-C before proceeding
with step 1.

---

## STEP A: Create a free VRPC account

If you already have an account, simply skip this step.

If not, quickly create a new one by clicking on "CREATE A NEW ACCOUNT"
under https://app.vrpc.io. It takes less than a minute and the only thing
required is your name and a valid email address.

## STEP B: Create a free domain

If you already have a domain, simply skip this step.

If not, navigate to the domain tab in your VRPC app and click *ADD DOMAIN*,
choose a free domain and hit *Start 30 days trial* button.

## STEP C: Test VRPC installation and connectivity

For any agent to work, you must provide it with a valid domain and agent
token. You get an agent token from your VRPC app under the account tab.

Simply copy the *adminToken* or create a new one (recommended) and use this.

Having that you are ready to test:

```bash
./vrpc-test-agent -a test -d <yourDomain> -t <yourToken>
```

In case of success you should see an output similar to this:

```bash
Domain          : <yourDomain>
Agent ID        : test
Broker URL      : ssl://vrpc.io:8883
------------------
Persistance     :
Clean Session   : 1
Connect Timeout : 10
Keep Alive      : 120
Server Auth     : 0
Connecting to the MQTT server... [OK]
```

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

## STEP 2: Main file

We are going to produce an executable that starts an agent and sits waiting
until it receives remote requests to call functions. Hence, we have to provide
a `main.cpp` file.

```cpp
#include <vrpc.hpp>
#include <vrpc_agent.hpp>
#include "Bar.hpp"

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


int main(int argc, char** argv) {
  auto agent = vrpc::VrpcAgent::from_commandline(argc, argv);
  if (agent) agent->serve();
  return EXIT_SUCCESS;
}
```

As you can see, even complex code can be bound using VRPC macros.


## STEP 3: Compilation

Certainly, you want to use the builtin tools of your IDE or any other
make file generator (such as CMAKE, node-gyp, etc.) you feel familiar with.

You are encouraged to do so! For getting VRPC compiled only make sure you:

- add `third_party/include` to your include folders (`-I` compiler flag)
- add `third_party/lib` to your library folders (`-L` compiler flag)
- use `libvrpc_agent.a` as dependent library for a static build (`-l:` compiler flag)
- or use `vrpc_agent` as dependent library for a dynamic build (`-l` compiler flag)

For getting this example working we quickly write a Makefile by hand, like so:

*Makefile*

```Makefile
TARGET = vrpc-bar-agent
CPPFLAGS = -I./third_party/include -pthread -fPIC -m64 -O3 -std=c++14
LDFLAGS = -pthread -L./third_party/lib
LDLIBS = -l:libvrpc_agent.a

SRCS := $(shell find ./src -name *.cpp)
OBJS := $(addsuffix .o,$(basename $(SRCS)))
DEPS := $(OBJS:.o=.d)

$(TARGET): $(OBJS)
	$(CXX) $(LDFLAGS) $(OBJS) -o $@ $(LOADLIBES) $(LDLIBS)

.PHONY: clean
clean:
	$(RM) $(TARGET) $(OBJS) $(DEPS)

-include $(DEPS)
```

That's already it, after typing
```
make
```
your agent should build and should be immediately ready to use.

Try it by typing:

```bash
./vrpc-bar-agent -a test -d <yourDomain> -t <yourToken>
```

(see steps A-C if you don't know that your domain or your token is)

If you see the line
```
Connecting to the MQTT server... [OK]
```

appearing in your terminal, you made it and your C++ code is remotely callable!
