# API Reference

VRPC is designed to be language-agnostic. Choose your environment below to see the quick-reference guide for exposing and consuming classes.

<tab-group>
<tab data-name="React" data-logo="/assets/logos/react.png">

The `vrpc-react` package provides Context Providers and Hooks to seamlessly integrate VRPC clients into your component tree.

### `<VrpcProvider>`

Wraps your application and manages the underlying MQTT connection.

**Props:**

- `broker` _(string)_: The MQTT broker URL (e.g., `mqtts://broker.hivemq.com:8883`).
- `domain` _(string)_: The namespace for your application.
- `token` _(string, optional)_: Access token for authenticated brokers.
- `username` / `password` _(string, optional)_: Basic auth credentials.
- `options` _(object, optional)_: Advanced `VrpcClient` options (e.g., `timeout`, `bestEffort`).

```jsx
<VrpcProvider
  domain='my-app'
  broker='wss://[broker.hivemq.com:8884/mqtt](https://broker.hivemq.com:8884/mqtt)'
>
  <App />
</VrpcProvider>
```

### `useClient()`

A hook that returns a VRPC client instance scoped to the provider's domain.

**Returns:** `[client, isReady, error]`

- `client` _(VrpcClient)_: The client object to make remote calls. `null` if disconnected.
- `isReady` _(boolean)_: `true` when connected and schema data is synced.
- `error` _(Error)_: Any connection error.

**Client Methods (`client.*`):**

- `create({ agent, className, instance, args, isIsolated })`: Instantiates a remote object and returns a Proxy.
- `getInstance(instanceName)`: Attaches to an existing shared instance and returns a Proxy.
- `callStatic({ agent, className, functionName, args })`: Calls a static function.
- `callAll({ className, functionName, args })`: Broadcasts a static call to all agents running the specified class.
- `on(event, callback)`: Listen to client-level events (e.g., `'agent'`, `'class'`, `'instanceNew'`).

</tab>

<tab data-name="Node.js" data-logo="/assets/logos/nodejs.png">

Node.js is perfect for business logic, database integrations, and coordinating other VRPC agents.

### `VrpcAdapter`

The static registry used to expose JavaScript classes and functions.

**`VrpcAdapter.register(Target, options)`**

- `Target` _(class | string)_: The class to expose, or a string path to a module.
- `options.onlyPublic` _(boolean, default: `true`)_: If true, ignores functions starting with `_`.
- `options.withNew` _(boolean, default: `true`)_: If true, instantiates the class using the `new` keyword.

**`VrpcAdapter.registerInstance(obj, options)`**
Registers an already existing object instead of a class blueprint.

- `obj` _(object)_: The live instance to expose.
- `options.className` _(string)_: The class name to advertise.
- `options.instance` _(string)_: The unique ID for this instance.

### `VrpcAgent`

Connects the exposed code to the broker.

**Constructor Options:**

- `domain` _(string)_: The namespace.
- `agent` _(string)_: A unique name for this agent process.
- `broker` _(string)_: MQTT broker URL.
- `token` _(string)_: Authentication token.
- `bestEffort` _(boolean, default: `true`)_: Uses QoS 0 (faster) if true. If false, uses QoS 1 (guaranteed delivery).

</tab>

<tab data-name="Python" data-logo="/assets/logos/python.png">

The Python implementation relies heavily on `asyncio` for non-blocking execution.

### `VrpcAdapter` & `@Vrpc.public`

In Python, you can register classes directly, or use the `@Vrpc.public` decorator to explicitly mark methods for remote execution.

```python
from vrpc import VrpcAdapter, Vrpc

class DataProcessor:
    @Vrpc.public
    def process_data(self, data: dict) -> dict:
        return {"status": "processed", "data": data}

    def _hidden_helper(self):
        pass # Not exposed

VrpcAdapter.register(DataProcessor)
```

### `VrpcAgent`

Starts the background task to serve requests.

**Methods:**

- `agent = VrpcAgent(**kwargs)`: Accepts `domain`, `agent`, `broker`, `token`.
- `await agent.serve()`: Connects to the broker and blocks to process incoming MQTT messages.
- `await agent.end()`: Gracefully disconnects from the broker and cleans up.

</tab>

<tab data-name="C++" data-logo="/assets/logos/cpp.png">

The C++ agent uses macros and variadic templates to generate bindings at compile-time without requiring IDL files or code generators.

### Registration Macros

Place these macros in your `.cpp` files to expose your classes.

- **`VRPC_CTOR(ClassName, ...Args)`**
  Exposes a constructor.
- **`VRPC_STATIC_FUNCTION(ClassName, ReturnType, FunctionName, ...Args)`**
  Exposes a static method.
- **`VRPC_MEMBER_FUNCTION(ClassName, ReturnType, FunctionName, ...Args)`**
  Exposes an instance method.
- **`VRPC_CONST_MEMBER_FUNCTION(ClassName, ReturnType, FunctionName, ...Args)`**
  Exposes a `const` instance method.

_Example:_

```cpp
VRPC_CTOR(MyClass, int, std::string)
VRPC_MEMBER_FUNCTION(MyClass, bool, doWork, double)
```

### `vrpc::VrpcAgent`

- `vrpc::VrpcAgent::Options`: Struct containing `.domain`, `.agent`, `.broker`, `.token`.
- `vrpc::VrpcAgent::create(options)`: Returns a shared pointer to the agent.
- `agent->serve()`: Connects to the broker and starts the Boost.Asio event loop.

</tab>

<tab data-name="Arduino" data-logo="/assets/logos/arduino.png">

VRPC can run on constrained edge devices to directly bridge hardware events to your cloud or frontend.

### `Vrpc` Namespace

The core Arduino namespace handles connection and loop management.

**`Vrpc::begin(domain, agent, broker, port)`**
Initializes the MQTT connection using the active `WiFiClient`.

**`Vrpc::loop()`**
Must be called inside your main `loop()` to process incoming RPC requests and maintain the keep-alive heartbeat with the broker.

### Hardware Callbacks

You can pass lambda functions from your React frontend directly to your Arduino C++ code!

**C++ Definition:**

```cpp
// Accept a std::function callback
static void onButtonPress(const std::function<void(int)>& callback) {
    // Hardware interrupt logic here...
    callback(buttonPin);
}
VRPC_STATIC_FUNCTION(Hardware, void, onButtonPress, VRPC_CALLBACK(int))
```

**React Frontend Call:**

```javascript
// The frontend passes a JS function to the ESP32!
await hardwareProxy.onButtonPress(pinNumber => {
  console.log(`Hardware button pressed on pin ${pinNumber}!`)
})
```

</tab>
</tab-group>

---

## Advanced Concepts

### Shared vs. Isolated Instances

When using `client.create()` from a frontend or backend client, you can specify `isIsolated: true`.

- **Shared (`isIsolated: false`):** The instance is advertised on the network. Other clients can use `client.getInstance(name)` to attach to it. Perfect for shared hardware controllers or global state managers.
- **Isolated (`isIsolated: true`):** The instance is invisible to other clients. It is automatically garbage collected by the Agent when the Client that created it disconnects. Perfect for user-specific sessions or temporary computational workers.
