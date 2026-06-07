# API Reference

VRPC is designed to be language-agnostic. Choose your environment below to see the quick-reference guide for exposing and consuming classes.

<tab-group>
<tab data-name="React" data-logo="/assets/logos/react.png">

Find all details on [GitHub](https://github.com/heisenware/vrpc-react).

REACT_API

</tab>

<tab data-name="Node.js" data-logo="/assets/logos/nodejs.png">

Find all details on [GitHub](https://github.com/heisenware/vrpc-js).

JS_API

</tab>

<tab data-name="Python" data-logo="/assets/logos/python.png">

Find all details on [GitHub](https://github.com/heisenware/vrpc-py).

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

Find all details on [GitHub](https://github.com/heisenware/vrpc-hpp).

CPP_API_ADAPTER

---

CPP_API_AGENT

</tab>

<tab data-name="Arduino" data-logo="/assets/logos/arduino.png">

Find all details on [GitHub](https://github.com/heisenware/vrpc-arduino).

ARDUINO_API

</tab>
</tab-group>

---

## Advanced Concepts

### Shared vs. Isolated Instances

When using `client.create()` from a frontend or backend client, you can specify `isIsolated: true`.

- **Shared (`isIsolated: false`):** The instance is advertised on the network. Other clients can use `client.getInstance(name)` to attach to it. Perfect for shared hardware controllers or global state managers.
- **Isolated (`isIsolated: true`):** The instance is invisible to other clients. It is automatically garbage collected by the Agent when the Client that created it disconnects. Perfect for user-specific sessions or temporary computational workers.
