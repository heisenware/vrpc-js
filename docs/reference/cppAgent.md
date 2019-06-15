# C++ Agent

- Defined in header `<vrpc_agent.hpp>`
- Provides class: `vrpc::VrpcAgent`

The `vrpc::VrpcAgent` establishes a connection to an MQTT broker and makes
all classes and function that are bound through an `binding.cpp` file (see above)
remotely available.

## Typedefs

```cpp
typedef std::function<void (std::string topic, std::string payload)> MessageCallback;
```

## Options Struct

---

`struct vrpc::VrpcAgent::Options`

---

Simple struct holding configuration options needed for `VrpcAgent` construction.

```cpp
struct Options {
  std::string domain;
  std::string agent;
  std::string token;
  // All parameters below are advanced settings and only configurable
  // in the (non-free) vrpc-agent-pro
  std::string plugin;
  std::string user_name;
  std::string password;
  std::string persistence_directory;
  std::string trust_store;
  std::string key_store;
  std::string private_key;
  std::string private_key_password;
  std::string enabled_cipher_suites;
  std::string broker = "ssl://vrpc.io:8883";
  int32_t connect_timeout = 10;
  int32_t keep_alive_interval = 120;
  bool clean_session = true;
  bool enable_server_cert_auth = false;
};
```

## Static functions

---

`std::shared_ptr<vrpc::VrpcAgent> vrpc::VrpcAgent::create( const Options& options );`

---

Creates a VrpcAgent instance from provided options.

### Parameters

**options** - Option object providing configuration information

### Return Value

Shared pointer to an VrpcAgent instance.


---

`std::shared_ptr<vrpc::VrpcAgent> vrpc::VrpcAgent::from_commandline( int argc, char** argv );`

---

Creates a VrpcAgent instance from commandline parameters. The corresponding
arguments of the `main` function can simply be handed over.


### Parameters

**argc** - Argument count

**argv** - Array of argument values

### Return Value

Shared pointer to an VrpcAgent instance. Will be a null pointer in case
of wrong commandline arguments or if the help function was triggered.

## Member functions

---

`void serve()`

---

Tries to establish a connection to the configured MQTT broker (bound to vrpc.io
in the community edition) and if successful starts an underlying event-loop.

If not successful, `serve` tries re-connecting to the broker.

**NOTE**: This function is blocking, but can be continued by the signals`SIGINT`,
`SIGTERM` or `SIGSEV`, which stop the event-loop.

---

`void async( const std::function<void ()>& callback )`

---

Places any function for immediate execution on VrpcAgent's event-loop.

**NOTE**: In a single-thread environment you have to use this function before
calling `serve()`. The registered callbacks will be executed once a connection
to the broker could be established (i.e. the event-loop is started).

### Parameters


**callback** - Function callback to be executed on the internal event-loop

---

`void publish( const std::string& topic, const std::string& payload, int32_t qos, bool retained );`

---

Publishes a message to the broker.

### Parameters

**topic** - The topic name

**payload** - The message's payload as std::string

**qos** - The quality of service for the message transport (1, 2 or 3)

**retained** - A flag indicating whether a message should be retained

---

`void subscribe( const std::string& topic, int32_t qos, const VrpcAgent::MessageCallback& callback );`

---

Subscribe to messages on the specified topic.

### Parameters

**topic** - The topic name

**qos** - The quality of service for the message transport (1, 2 or 3)

**callback** - Message callback, providing topic and message payload as string


## Example

```cpp
#include <vrpc.hpp>
#include <vrpc_agent.hpp>

// Names all functions that should be remotely callable
#include <binding.cpp>

int main(int argc, char** argv) {
  auto agent = VrpcAgent::from_commandline(argc, argv);
  if (agent) agent->serve();
  return EXIT_SUCCESS;
}
```
