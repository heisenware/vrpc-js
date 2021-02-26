# Example 2 - "At the Bar"

This example shows a more realistic case of a C++ application that
is comprised of header and source files and using more advanced language
data-types and constructs. By going through it, you will hopefully notice
that creating VRPC bindings still remains a trivial task...

> **NOTE**
>
>
> In order to follow this example from scratch, first download
> the correct C++ agent for your platform from [vrpc.io](https://vrpc.io/download).
>
> Save the tarball in a new directory (e.g.
> `vrpc-cpp-agent-example2`), and unpack it using:
>
> ```bash
> tar -xzf vrpc-cpp-agent-<platform>.tar.gz
> ```
>
> then rename the resultant directory to `third_party`, i.e.
>
> ```bash
> mv <platform> third_party
> ```
>
> Finally create a directory `src` and you are good to go.

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

## STEP 2: Main file

We are going to produce an executable that starts an agent and sits waiting
until it receives remote requests to call functions. Hence, we have to provide
a `main.cpp` file.

*src/main.cpp*

```cpp
#include <vrpc.hpp>
#include <vrpc_agent.hpp>
#include "Bar.hpp"

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

}  // namespace vrpc

int main(int argc, char** argv) {
  auto agent = vrpc::VrpcAgent::from_commandline(argc, argv);
  if (agent)
    agent->serve();
  return EXIT_SUCCESS;
}
```

As you can see, even complex code can be bound using VRPC macros.

Note the usage of `VRPC_MEMBER_FUNCTION_X`, which allows you to put meta
information to the bound functions.

While this is really helpful for others to use your API (as its shown in the
browser "intellisensly"), this is the only way to propagate C++ default
arguments to remote clients.

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

```bash
make
```

your agent should build and be ready to use.

> **NOTE**
>
> If you copied the code directly from the browser make sure your IDE
> inserts tabs and not spaces (as Makefiles need tabs).

Try it by simply running the executable in an all-default setting (using the
vrpc.io broker and the free `public.vrpc` domain):

```bash
./vrpc-bar-agent
```

Once you see the line

```bash
Connecting to the MQTT server... [OK]
```

appearing in your terminal, you made it and your C++ code is remotely callable!

Convince yourself and point your browser to
[live.vrpc.io](https://live.vrpc.io). Log in using `public.vrpc` as domain name
and leave the token empty. You should see your agent online (it uses your user-,
host- and platform name).

Or call your code from another piece of code written in e.g. Javascript. Just
follow the `NodeClientExample`.

> **NOTE**
>
> As you are using the free but public `public.vrpc` domain your code
> may be executed by anyone that uses your agent name.
> While convenient for quick testing or examples like this, it's obviously
> not an option for production settings. Please refer to the optional steps A-C
> if you want to make the communication between your agents and clients private.

## Optional steps to make your communication private

### STEP A: Create a free VRPC account

If you already have an account, simply skip this step.

If not, quickly create a new one by clicking on "CREATE NEW ACCOUNT" using the
[VRPC App](https://app.vrpc.io). It takes less than a minute and the only thing
required is your name and a valid email address.

### STEP B: Create a free domain

If you already have a domain, simply skip this step.

If not, navigate to the `Domains` tab in your VRPC app and click *ADD DOMAIN*,
choose a free domain and hit *Start 30 days trial* button.

### STEP C: Test VRPC installation and connectivity

For any agent to work, you must provide it with a valid domain and access
token. You get an access token from your VRPC app using the `Access Control` tab.

Simply copy the *defaultAgentToken* or create a new one and use this.

Having that you are ready to make the communication to your agent private:

```bash
./vrpc-test-agent -d <yourDomain> -t <yourToken>
```

In case of success you should see an output similar to this:

```bash
Domain          : <yourDomain>
Agent ID        : <yourAgent>
Broker URL      : ssl://vrpc.io:8883
------------------
Persistance     :
Clean Session   : 1
Connect Timeout : 10
Keep Alive      : 120
Server Auth     : 0
Connecting to the MQTT server... [OK]
```

Now, your agent code runs under your private domain and anyone wanting to
communicate to it needs to be in the same domain and having a valid access
token to do so. Using the [VRPC App](https://app.vrpc.io) you may even generate access tokens
with detailed access rights down to a per-function level.
