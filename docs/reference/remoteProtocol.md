# VRPC Remote protocol

All VRPC agents and clients are MQTT clients to a single logical broker.
They use the MQTT 3.11 standard to realize all RPC functionality.

Instead of being message oriented, VRPC uses a protocol on top of MQTT
fixing the topic as well as the payload structure.

General topic pattern:

```xml
<domain>/<agent>/<class>/<instance>/<method>
```

> **NOTE**
> - if `<method>` refers to a static method `<instance>` must have value `__static__`
> - if `<method>` refers to a global method `<instance>` must have value `__static__` and `<class> ` must have value `__global__`

General RPC **request** payload pattern (here shown for a function called with
two arguments):

```json
{
  "targetId": "<targetId>",
  "method": "<method>",
  "data": {
    "_1": "<first arg>",
    "_2": "<second arg>"
  },
  "id": "<correlationId>",
  "sender": "<sender>"
}
```

General RPC **response** payload pattern:

```json
{
  "targetId": "<targetId>",
  "method": "<method>",
  "data": {
    "_1": "<first arg>",
    "_2": "<second arg>",
    "r": "<return value>",
    "e": "<error message>"
  },
  "id": "<correlationId>",
  "sender": "<sender>"
}
```

> **NOTE 1**
>
> - if `<method>` refers to a member function the `<targetId>` must reflect the corresponding **instance name**
> - if `<method>` refers to a static method the `<targetId>` must reflect the corresponding **class name**
> - if `<method>` refers to a global method the `<targetId>` must have the value `__global__`

> **NOTE 2**
>
> If VRPC is used for language binding use cases (i.e. not remotely), the last
> two properties (`<id>` and `<sender>`) are omitted from the call.

> **NOTE 3**
>
> For all languages supporting function overloading, `<method>` will carry
> the full signature in form of:
>
> ```xml
> <methodName>[-<typename arg1>[<typename arg2>][...]]]
> ```
>
> where `typename` can be one of:
>
> * null
> * object
> * array
> * string
> * boolean
> * number

> **NOTE 4**
>
> In case of an successful RPC call the property `data.e` MUST NOT exist in the
> response message.


## Agent Details

### Initialization Time

1. User configures `<domain>` and `<agent>`

2. VRPC generates an MQTT client ID like so:

    ```
    vrpca<agentInstance>
    ```
    where `<agentInstance>` reflects the first 18 chars of an md5 hash composed
    out of domain and agent.

3. VRPC **publishes** the (retained) agent info message:

    ```xml
    <domain>/<agent>/__info__

    JSON PAYLOAD {
      status: 'online'
      hostname: <hostname>
    }
    ```

4. VRPC iterates all registered classes and **subscribes** to their static
  functions using the following pattern:

    ```xml
    <domain>/<agent>/<class>/__static__/<method>
    ```

5. VRPC then **publishes** a class info message for each registered class:

    ```
    <domain>/<agent>/<class>/__info__

    JSON PAYLOAD {
      "className": "<className>",
      "instances": "[<instance1>, <instance2>, ...]",
      "staticFunctions": "[<function1>, <function2>, ...]",
      "memberFunctions": "[<function1>, <function2>, ...]"
    }
    ```

### Runtime

*  After **receiving** an RPC message on topic:

    ```xml
    <domain>/<agent>/<class>/__static__/__create__
    ```

    VRPC creates and names a new instance, iterates all of its member functions
    and **subscribes** to each one using:

    ```xml
    <domain>/<agent>/<class>/<instance>/<method>
    ```

*  After **receiving** an RPC message on topic

    ```xml
    <domain>/<agent>/<class>/<instance>/<method>
    ```

    VRPC executes the RPC call and then replies to the sender instance
    by **publishing** to the topic that was provided in the
    `<sender>` property.

## Client Details

### Initialization time

1.  User (optionally) configures `<domain>` and `<agent>`, those will be the
    defaults for later remote instances

2.  VRPC generates an MQTT client ID like so:

    ```xml
    vrpcp<random>X<processInfo>
    ```
    where `<random>` are 4 random characters and `<processInfo>` is a 13
    character long string composed of host specific properties (i.e. stays the
    same on the same host)

3.  VRPC then listens for available classes by **subscribing** to

    ```xml
    <domain>/+/+/__info__
    ```

4.  And to RPC responses by **subscribing** to

      ```xml
      <domain>/<host>/<random>
      ```

    which can be regarded as VRPC client ID. This information
    is packed into the `<sender>` property of the RPC payload.

### Runtime

* VRPC **publishes** a single message per RPC request to

  ```xml
  <domain>/<agent>/<class>/<instance>/<method>
  ```

  where `<instance>` is replaced with `__static__` in case of static method
  calls, and `<class>` is replaced with `__global__` in case of global method
  calls.

* In case an argument of the remotely called method is of *function* type
  (i.e. a callback), the corresponding data argument will be a string that
  reads:

  ```xml
  __f__<methodName>-<index>-<event|invokeId>
  ```

  Depending on the callback type (continuous or re-registered) either the
  event name or an invoke id is used as last identifier.


## Adapter Details

With respect to the remote procedure calls the Adapter is a passive component.
Besides registering the to-be-remotified functions, the user does not directly
interact with this component. It however intercepts the regular RPC traffic
in two distinct ways.

### Resolving all VRPC internal functions

Those are the function to manage the lifetime of the remotely created objects:

* `__create__`
* `__delete__`
* `__createNamed__`
* `__getNamed__`

all of them use double underscores both as prefix and as postfix.

### Intercepting promises

The adapter will intercept all remotified functions that return a *promise*.
The original *promise* return value is changed to a string that reads:

```xml
__p__<method>-<invokeId>
```

At the time of promise resolution the adapter will send another RPC response
containing the actual return value and the above mentioned string as `<id>`.
