# VRPC Remote Protocol

All VRPC agents and clients are MQTT clients to a single logical broker.
They use the MQTT 3.11 standard to realize all RPC functionality.

Instead of being message oriented, VRPC uses a protocol on top of MQTT
fixing the topic as well as the payload structure.

General topic pattern:

```xml
<domain>/<agent>/<class>/<instance>/<function>
```

> **NOTE**
>
> - if `<function>` refers to a **static** method `<instance>` must have value
>   `__static__`
> - if `<function>` refers to a **global** method `<class>` must have value
>   `__global__` **and** `<instance>` must have value `__static__`

General RPC **request** payload pattern:

```json
{
  "c": "<context>",
  "f": "<function>",
  "a": ["<arguments>"],
  "i": "<correlationId>",
  "s": "<sender>"
}
```

General RPC **response** payload pattern:

```json
{
  "c": "<context>",
  "f": "<function>",
  "a": ["<arguments>"],
  "r": "<return value>",
  "e": "<error message>",
  "i": "<correlationId>",
  "s": "<sender>"
}
```

> **NOTE 1**
>
>- if `<function>` refers to a member function the `<context>` must reflect the
>  corresponding **instance name**
>- if `<function>` refers to a static function the `<context>` must reflect the
>  corresponding **class name**
>- if `<function>` refers to a global function the `<context>` must have the value
>  `__global__`
>
> **NOTE 2**
>
> If VRPC is used for language embedding use cases (i.e. not remotely), the last
> two properties `i` (correlationId) and `s` (sender) are omitted from the call.
>
> **NOTE 3**
>
> For all languages supporting function overloading, `<method>` must carry
> the full signature in form of:
>
> ```xml
> <methodName>[-<typename arg1>[<typename arg2>][...]]]
> ```
>
> where `typename` can be one of:
>
> - null
> - object
> - array
> - string
> - boolean
> - number
>
> **NOTE 4**
>
> In case of an successful RPC call the property `e` MUST NOT exist in the
> response message.

## Agent Details

### Initialization Time

1. User configures `<domain>` and `<agent>`

2. VRPC generates an MQTT client ID like so:

    ```xml
    vrpca<agentInstance>X<random>
    ```

    where `<agentInstance>` reflects the first 13 chars of an md5 hash composed
    out of domain and agent and random being composed of 4 chars.

3. VRPC **publishes** the (retained) agent info message:

    ```xml
    <domain>/<agent>/__agentInfo__

    JSON PAYLOAD {
      "status": "online"
      "hostname": <hostname>
      "version": <userAgentVersion>
    }
    ```

4. VRPC iterates all registered classes and **subscribes** to their static
  functions using the following pattern:

    ```xml
    <domain>/<agent>/<class>/__static__/<method>
    ```

5. VRPC then **publishes** a class info message for each registered class:

    ```xml
    <domain>/<agent>/<class>/__classInfo__

    JSON PAYLOAD {
      "className": <className>,
      "instances": [<instance1>, <instance2>, ...],
      "staticFunctions": [<function1>, <function2>, ...],
      "memberFunctions": [<function1>, <function2>, ...],
      "meta": {
        <function1>: { description, params, ret }
        <function2>: { description, params, ret }
      }
    }
    ```

    > **NOTE**
    >
    > The `meta` property is optional and only available if meta information
    > could be acquired from the adapted code (e.g. js-doc like comments)
    > When available, not all functions may be listed, those without meta
    > information are skipped.

### Runtime

- After **receiving** an RPC message on topic:

    ```xml
    <domain>/<agent>/<class>/__static__/__createIsolated__
    ```

    VRPC creates and names a new instance, iterates all of its member functions
    and **subscribes** to each one using:

    ```xml
    <domain>/<agent>/<class>/<instance>/<method>
    ```

- After **receiving** an RPC message on topic

    ```xml
    <domain>/<agent>/<class>/<instance>/<method>
    ```

    VRPC executes the RPC call and then replies to the sender instance
    by **publishing** to the topic that was provided in the
    `<sender>` property.

### Destruction Time

Either by explicitly calling the `end()` function or by MQTT last will
VRPC **publishes** the (retained) agent info message:

  ```xml
  <domain>/<agent>/__agentInfo__

  JSON PAYLOAD {
    status: 'offline'
    hostname: <hostname>
    version: <userAgentVersion>
  }
  ```

## Client Details

### Initialization time

1. User (optionally) configures `<domain>` and `<agent>`, those will be the
  defaults for later remote instances

2. VRPC generates an MQTT client ID like so:

    ```xml
    vrpcc<random>X<processInfo>
    ```

    where `<random>` are 4 random characters and `<processInfo>` is a 13
    character long string composed of host specific properties (i.e. stays the
    same on the same host)

3. VRPC then listens for available agents and classes by **subscribing** to

    ```xml
    <domain>/<agent>/__agentInfo__
    ```

    and

    ```xml
    <domain>/<agent>/+/__classInfo__
    ```

4. Finally, VRPC listens to RPC responses by **subscribing** to

      ```xml
      <domain>/<host>/<random>
      ```

    which can be regarded as VRPC client ID. This information
    is packed into the `<sender>` property of the RPC payload.

### Runtime

- VRPC **publishes** a single message per RPC request to

  ```xml
  <domain>/<agent>/<class>/<instance>/<method>
  ```

  where `<instance>` is replaced with `__static__` in case of static method
  calls, and `<class>` is replaced with `__global__` in case of global method
  calls.

- In case an argument of the remotely called method is of *function* type
  (i.e. a callback), the corresponding data argument will be a string that
  reads:

  ```xml
  __f__<methodName>-<index>-<event|invokeId>
  ```

  Depending on the callback type (continuous or re-registered) either the
  event name or an invoke id is used as last identifier.

### Destruction Time

Either by explicitly calling the `end()` function or by MQTT last will
VRPC **publishes** the (non-retained) client info message:

  ```xml
  <domain>/<host>/<random>/__clientInfo__

  JSON PAYLOAD {
    status: 'offline'
  }
  ```

## Adapter Details

With respect to the remote procedure calls the Adapter is a passive component.
Besides registering the to-be-remotified functions, the user does not directly
interact with this component. It however intercepts the regular RPC traffic
in two distinct ways.

### Resolving all VRPC internal functions

Those are the function to manage the lifetime of the remotely created objects:

* `__createShared__`
* `__createIsolated__`
* `__callAll__`
* `__delete__`

all of them use double underscores both as prefix and as postfix.

### Intercepting promises

The adapter will intercept all remotified functions that return a *promise*.
The original *promise* return value is changed to a string that reads:

```xml
__p__<method>-<invokeId>
```

At the time of promise resolution the adapter will send another RPC response
containing the actual return value and the above mentioned string as `<id>`.
