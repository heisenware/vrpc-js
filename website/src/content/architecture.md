# Architecture & Concepts

At its core, VRPC is an asynchronous, message-driven Remote Procedure Call (RPC) framework. It abstracts away the complexity of network transports, data serialization, and state management so you can focus entirely on your code.

VRPC relies on a decentralized, publish/subscribe architecture.

## The Triad: Agent, Broker, and Client

Every VRPC ecosystem consists of three distinct actors:

### 1. The Agent (Backend/Edge)

The Agent is the process that actually executes your code. It wraps your native classes (C++, Python, Node.js, Arduino) and makes them accessible.

- **The Adapter (`VrpcAdapter`):** The internal registry. It uses reflection (in Python/JS) or compile-time macros (in C++) to extract method signatures and docstrings, creating a map of callable functions.
- **The Agent (`VrpcAgent`):** The network layer. It connects to the MQTT broker, publishes the schema of available classes, and routes incoming RPC requests to the Adapter.

### 2. The Broker (The Network)

VRPC uses **MQTT** as its transport layer.

- **Why MQTT?** MQTT is lightweight, exceptionally fast, and allows both Agents and Clients to make _outbound_ connections. This completely eliminates the need for port-forwarding, firewall punching, or reverse proxies.
- **Topic Routing:** VRPC constructs highly specific MQTT topics (e.g., `<domain>/<agent>/<class>/<instance>/<method>`). This allows the broker to efficiently route messages exactly where they need to go without waking up idle agents.

### 3. The Client (Frontend/Consumer)

The Client (`VrpcClient` / `useClient`) lives in your frontend or consumer microservice.

- **Dynamic Proxies:** The Client dynamically constructs proxy objects based on the schema published by the Agent.
- **Seamless Await:** When you call a method on a proxy, the Client packs the arguments into a JSON payload, publishes it via MQTT, and returns a Promise that resolves when the Agent replies.

---

## Instance Lifecycles

Unlike stateless REST APIs, VRPC fully supports stateful, object-oriented programming. You can instantiate classes remotely. VRPC offers two lifecycle models for these instances:

### Shared Instances

When a Client creates a **Shared Instance**, that object is registered in the Agent's global memory.

- It becomes visible to _all_ other connected clients.
- Multiple React frontends can attach to the same shared C++ hardware controller, call its methods, and listen to its events simultaneously.
- Shared instances must be explicitly deleted (`client.delete()`).

### Isolated Instances

When a Client creates an **Isolated Instance**, it is strictly bound to the lifetime of the Client that created it.

- It is completely invisible to other clients.
- **Automatic Garbage Collection:** Through a heartbeat mechanism (`__clientInfo__`), the Agent monitors the Client's connection status. If a user closes their browser tab, the Client disconnects, and the Agent automatically deletes all isolated instances associated with that session to prevent memory leaks.

---

## The Magic: Events & Callbacks

Traditional RPC frameworks handle request/response well, but fall apart when the backend needs to stream events or execute callbacks. VRPC handles this transparently.

If you pass a callback function or an `EventEmitter` to a remote method, VRPC does not try to serialize the function itself. Instead, it does the following:

1. The Client generates a unique ID for the callback.
2. The Client subscribes to a temporary, private MQTT topic using that ID.
3. The Agent replaces the callback argument with a native wrapper function.
4. When the native C++ or Python code invokes the wrapper, the Agent catches it and publishes the arguments to the temporary MQTT topic.
5. The Client receives the message and triggers your original JavaScript callback.

To the developer, it feels exactly like passing a local function:

```javascript
// React Frontend calling an ESP32 hardware method
await hardwareProxy.monitorTemperature(temp => {
  console.log(`Live Temperature: ${temp}°C`)
})
```

---

## Anatomy of a VRPC Message

If you were to inspect the MQTT traffic during a VRPC call, you would see incredibly compact JSON payloads. VRPC deliberately uses single-letter keys to minimize bandwidth, making it ideal for constrained IoT networks.

**Request Payload:**

```json
{
  "c": "visitor-esp32", // Context (Instance ID or Class Name)
  "f": "blink", // Function Name
  "a": [5], // Arguments Array
  "i": "client123-invoke42", // Unique Invocation ID
  "s": "vrpc/machine1/client", // Sender's return topic
  "v": 3 // Protocol Version
}
```

**Response Payload:**

```json
{
  "r": "Blinked 5 times successfully.", // Return value
  "i": "client123-invoke42", // Matching Invocation ID
  "v": 3
}
```

If an exception is thrown natively in C++ or Python, the `"r"` (return) key is replaced with an `"e"` (error) key, and the Client's Promise will instantly reject with the native error message.
