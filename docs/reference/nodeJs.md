# API reference documentation for Node.js

## Classes

<dl>
<dt><a href="#VrpcAdapter">VrpcAdapter</a></dt>
<dd><p>Generates an adapter layer for existing code and enables further VRPC-based
communication.</p>
</dd>
<dt><a href="#VrpcAgent">VrpcAgent</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Agent capable of making existing code available to remote control by clients.</p>
</dd>
<dt><a href="#VrpcLocal">VrpcLocal</a></dt>
<dd><p>Client capable of creating proxy objects and locally calling
functions as provided through native addons.</p>
</dd>
<dt><a href="#VrpcRemote">VrpcRemote</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MetaData">MetaData</a> : <code>Object.&lt;String, Func&gt;</code></dt>
<dd><p>Associates meta data to any function</p>
</dd>
<dt><a href="#Func">Func</a></dt>
<dd></dd>
<dt><a href="#Param">Param</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Ret">Ret</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="VrpcAdapter"></a>

## VrpcAdapter
Generates an adapter layer for existing code and enables further VRPC-based
communication.

**Kind**: global class  

* [VrpcAdapter](#VrpcAdapter)
    * [.addPluginPath(dirPath, [maxLevel])](#VrpcAdapter.addPluginPath)
    * [.register(code, [options])](#VrpcAdapter.register)
    * [.create(className, ...args)](#VrpcAdapter.create) ⇒ <code>Object</code>
    * [.createNamed(className, instance, ...args)](#VrpcAdapter.createNamed) ⇒ <code>Object</code>
    * [.delete(instance)](#VrpcAdapter.delete) ⇒ <code>Boolean</code>
    * [.getInstance(instance)](#VrpcAdapter.getInstance) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcAdapter.getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcAdapter.getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcAdapter.getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcAdapter.getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMetaData(className)](#VrpcAdapter.getAvailableMetaData) ⇒ [<code>MetaData</code>](#MetaData)


* * *

<a name="VrpcAdapter.addPluginPath"></a>

### VrpcAdapter.addPluginPath(dirPath, [maxLevel])
Automatically requires .js files for auto-registration.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- dirPath <code>String</code> - Relative path to start the auto-registration from
- [maxLevel] <code>Number</code> - Maximum search depth (default: unlimited)


* * *

<a name="VrpcAdapter.register"></a>

### VrpcAdapter.register(code, [options])
Registers existing code and makes it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- code <code>Any</code> - Existing code to be registered, can be a class
or function object or a relative path to a module
- [options] <code>Object</code>
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers
functions that do not begin with an underscore
    - [.withNew] <code>Boolean</code> <code> = true</code> - If true, class will be constructed
using the `new` operator
    - [.schema] <code>Object</code> <code> = </code> - If provided is used to validate ctor
parameters (only works if registered code reflects a single class)
    - .jsdocPath <code>Boolean</code> - if provided, parses documentation and
provides it as meta information

NOTE: This function currently only supports registration of classes (either
when provided as object or when exported on the provided module path)


* * *

<a name="VrpcAdapter.create"></a>

### VrpcAdapter.create(className, ...args) ⇒ <code>Object</code>
Creates an un-managed, anonymous instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.createNamed"></a>

### VrpcAdapter.createNamed(className, instance, ...args) ⇒ <code>Object</code>
Creates a managed named instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- instance <code>String</code> - Name of the instance
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes a managed instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  
**Params**

- instance <code>String</code> - Name of the instance to be deleted


* * *

<a name="VrpcAdapter.getInstance"></a>

### VrpcAdapter.getInstance(instance) ⇒ <code>Object</code>
Retrieves an existing instance by name

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- instance <code>String</code> - Name of the instance to be acquired


* * *

<a name="VrpcAdapter.getAvailableClasses"></a>

### VrpcAdapter.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcAdapter.getAvailableInstances"></a>

### VrpcAdapter.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcAdapter.getAvailableMemberFunctions"></a>

### VrpcAdapter.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcAdapter.getAvailableStaticFunctions"></a>

### VrpcAdapter.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcAdapter.getAvailableMetaData"></a>

### VrpcAdapter.getAvailableMetaData(className) ⇒ [<code>MetaData</code>](#MetaData)
Provides all available meta data of the registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: [<code>MetaData</code>](#MetaData) - Meta Data  
**Params**

- className <code>String</code> - Name of class to provide meta data for


* * *

<a name="VrpcAgent"></a>

## VrpcAgent ⇐ <code>EventEmitter</code>
Agent capable of making existing code available to remote control by clients.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcAgent](#VrpcAgent) ⇐ <code>EventEmitter</code>
    * [new VrpcAgent(obj)](#new_VrpcAgent_new)
    * _instance_
        * [.serve()](#VrpcAgent+serve) ⇒ <code>Promise</code>
        * [.end([obj], [unregister])](#VrpcAgent+end) ⇒ <code>Promise</code>
        * [._clearPersistedSession()](#VrpcAgent+_clearPersistedSession) ⇒ <code>Boolean</code>
        * ["connect"](#VrpcAgent+event_connect)
        * ["reconnect"](#VrpcAgent+event_reconnect)
        * ["close"](#VrpcAgent+event_close)
        * ["offline"](#VrpcAgent+event_offline)
        * ["error"](#VrpcAgent+event_error)
        * ["end"](#VrpcAgent+event_end)
    * _static_
        * [.fromCommandline(defaults)](#VrpcAgent.fromCommandline) ⇒ <code>Agent</code>


* * *

<a name="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance

**Params**

- obj <code>Object</code>
    - [.username] <code>String</code> - MQTT username (if no token is used)
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token as generated by: https://app.vrpc.io (only optional when using default domain and broker)
    - [.domain] <code>String</code> <code> = &#x27;public.vrpc&#x27;</code> - The domain under which the agent-provided code is reachable
    - [.agent] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;pathId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - This agent's name
    - [.broker] <code>String</code> <code> = &#x27;mqtts://vrpc.io:8883&#x27;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>String</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline
    - [.version] <code>String</code> <code> = &#x27;&#x27;</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = new Agent({
  domain: 'public.vrpc'
  agent: 'myAgent'
})
```

* * *

<a name="VrpcAgent+serve"></a>

### vrpcAgent.serve() ⇒ <code>Promise</code>
Starts the agent

The returned promise will only resolve once the agent is connected to the
broker. If the connection can't be established it will try connecting
forever. You may want to listen to the 'offline' (initial connect attempt
failed) or 'reconnect' (any further fail) event and call `agent.end()` to
stop trying to connect and resolve the returned promise.

If the connection could not be established because of authorization
failure, the 'error' event will be emitted.

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves once connected or explicitly ended, never
rejects  

* * *

<a name="VrpcAgent+end"></a>

### vrpcAgent.end([obj], [unregister]) ⇒ <code>Promise</code>
Stops the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves when disconnected and ended  
**Params**

- [obj] <code>Object</code>
- [unregister] <code>Boolean</code> <code> = false</code> - If true, fully un-registers agent from broker


* * *

<a name="VrpcAgent+_clearPersistedSession"></a>

### vrpcAgent.\_clearPersistedSession() ⇒ <code>Boolean</code>
**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Boolean</code> - true if `agent.end()` was explicitly called  

* * *

<a name="VrpcAgent+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcAgent+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent.fromCommandline"></a>

### VrpcAgent.fromCommandline(defaults) ⇒ <code>Agent</code>
Constructs an agent by parsing command line arguments

**Kind**: static method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Agent</code> - Agent instance  
**Params**

- defaults <code>Object</code> - Allows to specify defaults for the various command line options
    - .domain <code>String</code> - The domain under which the agent-provided code is reachable
    - .agent <code>String</code> - This agent's name
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .broker <code>String</code> - Broker url in form: `<scheme>://<host>:<port>`
    - .version <code>String</code> - The (custom) version of this agent

**Example**  
```js
const agent = VrpcAgent.fromCommandline()
```

* * *

<a name="VrpcLocal"></a>

## VrpcLocal
Client capable of creating proxy objects and locally calling
functions as provided through native addons.

**Kind**: global class  

* [VrpcLocal](#VrpcLocal)
    * [new VrpcLocal(adapter)](#new_VrpcLocal_new)
    * [.create(className, ...args)](#VrpcLocal+create) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcLocal+getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcLocal+getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcLocal+getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcLocal+getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>


* * *

<a name="new_VrpcLocal_new"></a>

### new VrpcLocal(adapter)
**Params**

- adapter <code>Object</code> - An adapter object, typically loaded as native addon


* * *

<a name="VrpcLocal+create"></a>

### vrpcLocal.create(className, ...args) ⇒ <code>Object</code>
Creates an instance of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Object</code> - Proxy to the created instance  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>Any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcLocal+getAvailableClasses"></a>

### vrpcLocal.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcLocal+getAvailableInstances"></a>

### vrpcLocal.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcLocal+getAvailableMemberFunctions"></a>

### vrpcLocal.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcLocal+getAvailableStaticFunctions"></a>

### vrpcLocal.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcRemote"></a>

## VrpcRemote ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcRemote](#VrpcRemote) ⇐ <code>EventEmitter</code>
    * [new VrpcRemote(options)](#new_VrpcRemote_new)
    * [.connect()](#VrpcRemote+connect) ⇒ <code>Promise</code>
    * [.create(options)](#VrpcRemote+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcRemote+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcRemote+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(options)](#VrpcRemote+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(options)](#VrpcRemote+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * ~~[.getAvailabilities()](#VrpcRemote+getAvailabilities) ⇒ <code>Object</code>~~
    * [.getSystemInformation()](#VrpcRemote+getSystemInformation) ⇒ <code>Object</code>
    * ~~[.getAvailableDomains()](#VrpcRemote+getAvailableDomains) ⇒ <code>Array</code>~~
    * [.getAvailableAgents([options])](#VrpcRemote+getAvailableAgents) ⇒ <code>Array</code>
    * [.getAvailableClasses([options])](#VrpcRemote+getAvailableClasses) ⇒ <code>Array</code>
    * [.getAvailableInstances(className, [options])](#VrpcRemote+getAvailableInstances) ⇒ <code>Array</code>
    * [.getAvailableMemberFunctions(className, [options])](#VrpcRemote+getAvailableMemberFunctions) ⇒ <code>Array</code>
    * [.getAvailableStaticFunctions(className, [options])](#VrpcRemote+getAvailableStaticFunctions) ⇒ <code>Array</code>
    * [.reconnectWithToken(token, [options])](#VrpcRemote+reconnectWithToken) ⇒ <code>Promise</code>
    * [.unregisterAgent(agent)](#VrpcRemote+unregisterAgent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.end()](#VrpcRemote+end) ⇒ <code>Promise</code>
    * ["agent" (info)](#VrpcRemote+event_agent)
    * ["class" (info)](#VrpcRemote+event_class)
    * ["instanceNew" (addedInstances, info)](#VrpcRemote+event_instanceNew)
    * ["instanceGone" (removedInstances, info)](#VrpcRemote+event_instanceGone)
    * ["connect"](#VrpcRemote+event_connect)
    * ["reconnect"](#VrpcRemote+event_reconnect)
    * ["close"](#VrpcRemote+event_close)
    * ["offline"](#VrpcRemote+event_offline)
    * ["error"](#VrpcRemote+event_error)
    * ["end"](#VrpcRemote+event_end)


* * *

<a name="new_VrpcRemote_new"></a>

### new VrpcRemote(options)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.

**Params**

- options <code>Object</code>
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .domain <code>String</code> - Sets the domain
    - [.agent] <code>String</code> <code> = &quot;*&quot;</code> - Sets default agent
    - [.broker] <code>String</code> <code> = &quot;mqtts://vrpc.io:8883&quot;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.timeout] <code>Number</code> <code> = 6000</code> - Maximum time in ms to wait for a RPC answer
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline

**Example**  
```js
const client = new VrpcRemote({
  domain: 'public.vrpc',
  broker: 'mqtt://vrpc.io'
})
```

* * *

<a name="VrpcRemote+connect"></a>

### vrpcRemote.connect() ⇒ <code>Promise</code>
Actually connects to the MQTT broker.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves once connected within [timeout], rejects otherwise  
**Emits**: <code>event:connected</code>  
**Example**  
```js
try {
  await client.connect()
} catch (err) {
  console.error(`Could not connect because: ${err.message}`)
}
```

* * *

<a name="VrpcRemote+create"></a>

### vrpcRemote.create(options) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Creates a new remote instance and provides a proxy to it.

Remote instances can be "named" or "anonymous". Named instances are
shareable and re-attachable across clients as long as they are not
explicitly deleted. Life-cycle changes of named instances are available
under the `class`, `instanceNew`, and `instanceGone` events. A named
instance is created when specifying the `instance` option.

When the `instance` option is not provided, the created proxy is the only
object capable of issuing remote function calls. The remote instance stays
invisible to other clients.

**NOTE** When creating a named instance that already exists, the new proxy will
simply attach to (and not re-create) it - just like `getInstance()` was
called.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Object reflecting a proxy to the original one
handled by the agent  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class which should be
instantiated
    - [.instance] <code>String</code> - Name of the created instance. If not
provided an (invisible) id will be generated
    - [.args] <code>Array</code> - Positional arguments for the constructor call
    - [.agent] <code>String</code> - Agent name. If not provided class default
is used

**Example**  
```js
// create anonymous instance
const proxy1 = await client.create({
  className: 'Foo'
})
// create named instance
const proxy2 = await client.create({
  className: 'Foo',
  instance: 'myFooInstance'
})
// create named instance providing three constructor arguments
const proxy3 = await client.create({
  className: 'Bar',
  instance: 'myBarInstance',
  args: [42, "second argument", { some: 'option' }]
})
```

* * *

<a name="VrpcRemote+getInstance"></a>

### vrpcRemote.getInstance(instance, [options]) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Get a remotely existing instance.

Either provide a string only, then VRPC tries to find the instance using
client information, or additionally provide an object with explicit meta
data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Proxy object reflecting the remotely existing instance  
**Params**

- instance <code>String</code> - The instance to be retrieved
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used
    - .noWait <code>bool</code> - If true immediately fail if instance could not be found in local cache


* * *

<a name="VrpcRemote+delete"></a>

### vrpcRemote.delete(instance, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Delete a remotely existing instance

Either provide a string only, then VRPC tries to find the instance using
client information, or provide an object with explicit meta data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if successful, false otherwise  
**Params**

- instance <code>String</code> - The instance to be deleted
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callStatic"></a>

### vrpcRemote.callStatic(options) ⇒ <code>Promise.&lt;Any&gt;</code>
Calls a static function on a remote class

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Any&gt;</code> - Return value of the remotely called function  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - .functionName <code>String</code> - Name of the static function to be called
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callAll"></a>

### vrpcRemote.callAll(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result.

NOTE: When no agent was specified as class default and no agent is
specified when calling this function, callAll will act on the requested
class across all available agents. The same is true when explicitly using
a wildcard (*) as agent value.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects `{ id, val, err }` carrying
the instance id, the return value and potential errors  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+getAvailabilities"></a>

### ~~vrpcRemote.getAvailabilities() ⇒ <code>Object</code>~~
***Deprecated***

Retrieves all agents, instances, classes, member and static
functions potentially available for remote control.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [domain].agents[agent].status: string, // 'offline' or 'online'
  [domain].agents[agent].hostname: string,
  [domain].agents[agent].version: string,
  [domain].agents[agent].classes[className].instances: string[],
  [domain].agents[agent].classes[className].memberFunctions: string[],
  [domain].agents[agent].classes[className].staticFunctions: string[],
  [domain].agents[agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getSystemInformation"></a>

### vrpcRemote.getSystemInformation() ⇒ <code>Object</code>
Retrieves all information about the currently available components.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [agent].status: string, // 'offline' or 'online'
  [agent].hostname: string,
  [agent].version: string,
  [agent].classes[className].instances: string[],
  [agent].classes[className].memberFunctions: string[],
  [agent].classes[className].staticFunctions: string[],
  [agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getAvailableDomains"></a>

### ~~vrpcRemote.getAvailableDomains() ⇒ <code>Array</code>~~
***Deprecated***

Retrieves all domains on which agents can be remote controlled

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of domain names  

* * *

<a name="VrpcRemote+getAvailableAgents"></a>

### vrpcRemote.getAvailableAgents([options]) ⇒ <code>Array</code>
Retrieves all available agents.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of agent names.  
**Params**

- [options] <code>Object</code>
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online agents


* * *

<a name="VrpcRemote+getAvailableClasses"></a>

### vrpcRemote.getAvailableClasses([options]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of class names.  
**Params**

- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used.
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableInstances"></a>

### vrpcRemote.getAvailableInstances(className, [options]) ⇒ <code>Array</code>
Retrieves all (named) instances on specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of instance names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableMemberFunctions"></a>

### vrpcRemote.getAvailableMemberFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all member functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of member function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableStaticFunctions"></a>

### vrpcRemote.getAvailableStaticFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all static functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of static function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+reconnectWithToken"></a>

### vrpcRemote.reconnectWithToken(token, [options]) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  
**Params**

- token <code>String</code> - Access token as generated by: https://app.vrpc.io
- [options] <code>Object</code>
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+unregisterAgent"></a>

### vrpcRemote.unregisterAgent(agent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Unregisters (= removal of persisted information) an offline agent

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Resolves to true in case of success, false otherwise  
**Params**

- agent - The agent to be unregistered


* * *

<a name="VrpcRemote+end"></a>

### vrpcRemote.end() ⇒ <code>Promise</code>
Ends the connection to the broker

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves when ended  

* * *

<a name="VrpcRemote+event_agent"></a>

### "agent" (info)
Event 'agent'

This event is fired whenever an agent is added or removed, or whenever
an agent changes its status (switches between online or offline).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .status <code>String</code> - Agent status, can be 'offline' or 'online'
    - .hostname <code>String</code> - Name of the host running the agent
    - .version <code>String</code> - User-defined version of the agent


* * *

<a name="VrpcRemote+event_class"></a>

### "class" (info)
Event 'class'

Emitted whenever a class is added or removed, or when instances
or functions of this class have changed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name
    - .instances <code>Array.&lt;String&gt;</code> - Array of named instances
    - .memberFunctions <code>Array.&lt;String&gt;</code> - Array of member functions
    - .staticFunctions <code>Array.&lt;String&gt;</code> - Array of static functions
    - .meta [<code>MetaData</code>](#MetaData) - Object associating further information to functions


* * *

<a name="VrpcRemote+event_instanceNew"></a>

### "instanceNew" (addedInstances, info)
Event 'instanceNew'

Emitted whenever a new instance was created.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- addedInstances <code>Array.&lt;String&gt;</code> - An array of newly added instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_instanceGone"></a>

### "instanceGone" (removedInstances, info)
Event 'instanceGone'

Emitted whenever a new instance was removed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- removedInstances <code>Array.&lt;String&gt;</code> - An array of removed instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcRemote+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="MetaData"></a>

## MetaData : <code>Object.&lt;String, Func&gt;</code>
Associates meta data to any function

**Kind**: global typedef  

* * *

<a name="Func"></a>

## Func
**Kind**: global typedef  
**Params**

- description <code>String</code> - Function description
- params [<code>Array.&lt;Param&gt;</code>](#Param) - Array of parameter details in order of signature
- ret [<code>Ret</code>](#Ret) - Object associating further information to return value


* * *

<a name="Param"></a>

## Param : <code>Object</code>
**Kind**: global typedef  
**Params**

- name <code>String</code> - Parameter name
- optional <code>Boolean</code> - Whether parameter is optional
- description <code>String</code> - Parameter description
- [type] <code>String</code> - Parameter type
- [default] <code>Any</code> - The default to be injected when not provided


* * *

<a name="Ret"></a>

## Ret : <code>Object</code>
**Kind**: global typedef  
**Params**

- description <code>String</code> - Return value description
- [type] <code>String</code> - Return value type


* * *

## Classes

<dl>
<dt><a href="#VrpcAdapter">VrpcAdapter</a></dt>
<dd><p>Generates an adapter layer for existing code and enables further VRPC-based
communication.</p>
</dd>
<dt><a href="#VrpcAgent">VrpcAgent</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Agent capable of making existing code available to remote control by clients.</p>
</dd>
<dt><a href="#VrpcLocal">VrpcLocal</a></dt>
<dd><p>Client capable of creating proxy objects and locally calling
functions as provided through native addons.</p>
</dd>
<dt><a href="#VrpcRemote">VrpcRemote</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MetaData">MetaData</a> : <code>Object.&lt;String, Func&gt;</code></dt>
<dd><p>Associates meta data to any function</p>
</dd>
<dt><a href="#Func">Func</a></dt>
<dd></dd>
<dt><a href="#Param">Param</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Ret">Ret</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="VrpcAdapter"></a>

## VrpcAdapter
Generates an adapter layer for existing code and enables further VRPC-based
communication.

**Kind**: global class  

* [VrpcAdapter](#VrpcAdapter)
    * [.addPluginPath(dirPath, [maxLevel])](#VrpcAdapter.addPluginPath)
    * [.register(code, [options])](#VrpcAdapter.register)
    * [.create(className, ...args)](#VrpcAdapter.create) ⇒ <code>Object</code>
    * [.createNamed(className, instance, ...args)](#VrpcAdapter.createNamed) ⇒ <code>Object</code>
    * [.delete(instance)](#VrpcAdapter.delete) ⇒ <code>Boolean</code>
    * [.getInstance(instance)](#VrpcAdapter.getInstance) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcAdapter.getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcAdapter.getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcAdapter.getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcAdapter.getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMetaData(className)](#VrpcAdapter.getAvailableMetaData) ⇒ [<code>MetaData</code>](#MetaData)


* * *

<a name="VrpcAdapter.addPluginPath"></a>

### VrpcAdapter.addPluginPath(dirPath, [maxLevel])
Automatically requires .js files for auto-registration.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- dirPath <code>String</code> - Relative path to start the auto-registration from
- [maxLevel] <code>Number</code> - Maximum search depth (default: unlimited)


* * *

<a name="VrpcAdapter.register"></a>

### VrpcAdapter.register(code, [options])
Registers existing code and makes it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- code <code>Any</code> - Existing code to be registered, can be a class
or function object or a relative path to a module
- [options] <code>Object</code>
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers
functions that do not begin with an underscore
    - [.withNew] <code>Boolean</code> <code> = true</code> - If true, class will be constructed
using the `new` operator
    - [.schema] <code>Object</code> <code> = </code> - If provided is used to validate ctor
parameters (only works if registered code reflects a single class)
    - .jsdocPath <code>Boolean</code> - if provided, parses documentation and
provides it as meta information

NOTE: This function currently only supports registration of classes (either
when provided as object or when exported on the provided module path)


* * *

<a name="VrpcAdapter.create"></a>

### VrpcAdapter.create(className, ...args) ⇒ <code>Object</code>
Creates an un-managed, anonymous instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.createNamed"></a>

### VrpcAdapter.createNamed(className, instance, ...args) ⇒ <code>Object</code>
Creates a managed named instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- instance <code>String</code> - Name of the instance
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes a managed instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  
**Params**

- instance <code>String</code> - Name of the instance to be deleted


* * *

<a name="VrpcAdapter.getInstance"></a>

### VrpcAdapter.getInstance(instance) ⇒ <code>Object</code>
Retrieves an existing instance by name

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- instance <code>String</code> - Name of the instance to be acquired


* * *

<a name="VrpcAdapter.getAvailableClasses"></a>

### VrpcAdapter.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcAdapter.getAvailableInstances"></a>

### VrpcAdapter.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcAdapter.getAvailableMemberFunctions"></a>

### VrpcAdapter.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcAdapter.getAvailableStaticFunctions"></a>

### VrpcAdapter.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcAdapter.getAvailableMetaData"></a>

### VrpcAdapter.getAvailableMetaData(className) ⇒ [<code>MetaData</code>](#MetaData)
Provides all available meta data of the registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: [<code>MetaData</code>](#MetaData) - Meta Data  
**Params**

- className <code>String</code> - Name of class to provide meta data for


* * *

<a name="VrpcAgent"></a>

## VrpcAgent ⇐ <code>EventEmitter</code>
Agent capable of making existing code available to remote control by clients.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcAgent](#VrpcAgent) ⇐ <code>EventEmitter</code>
    * [new VrpcAgent(obj)](#new_VrpcAgent_new)
    * _instance_
        * [.serve()](#VrpcAgent+serve) ⇒ <code>Promise</code>
        * [.end([obj], [unregister])](#VrpcAgent+end) ⇒ <code>Promise</code>
        * [._clearPersistedSession()](#VrpcAgent+_clearPersistedSession) ⇒ <code>Boolean</code>
        * ["connect"](#VrpcAgent+event_connect)
        * ["reconnect"](#VrpcAgent+event_reconnect)
        * ["close"](#VrpcAgent+event_close)
        * ["offline"](#VrpcAgent+event_offline)
        * ["error"](#VrpcAgent+event_error)
        * ["end"](#VrpcAgent+event_end)
    * _static_
        * [.fromCommandline(defaults)](#VrpcAgent.fromCommandline) ⇒ <code>Agent</code>


* * *

<a name="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance

**Params**

- obj <code>Object</code>
    - [.username] <code>String</code> - MQTT username (if no token is used)
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token as generated by: https://app.vrpc.io (only optional when using default domain and broker)
    - [.domain] <code>String</code> <code> = &#x27;public.vrpc&#x27;</code> - The domain under which the agent-provided code is reachable
    - [.agent] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;pathId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - This agent's name
    - [.broker] <code>String</code> <code> = &#x27;mqtts://vrpc.io:8883&#x27;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>String</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline
    - [.version] <code>String</code> <code> = &#x27;&#x27;</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = new Agent({
  domain: 'public.vrpc'
  agent: 'myAgent'
})
```

* * *

<a name="VrpcAgent+serve"></a>

### vrpcAgent.serve() ⇒ <code>Promise</code>
Starts the agent

The returned promise will only resolve once the agent is connected to the
broker. If the connection can't be established it will try connecting
forever. You may want to listen to the 'offline' (initial connect attempt
failed) or 'reconnect' (any further fail) event and call `agent.end()` to
stop trying to connect and resolve the returned promise.

If the connection could not be established because of authorization
failure, the 'error' event will be emitted.

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves once connected or explicitly ended, never
rejects  

* * *

<a name="VrpcAgent+end"></a>

### vrpcAgent.end([obj], [unregister]) ⇒ <code>Promise</code>
Stops the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves when disconnected and ended  
**Params**

- [obj] <code>Object</code>
- [unregister] <code>Boolean</code> <code> = false</code> - If true, fully un-registers agent from broker


* * *

<a name="VrpcAgent+_clearPersistedSession"></a>

### vrpcAgent.\_clearPersistedSession() ⇒ <code>Boolean</code>
**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Boolean</code> - true if `agent.end()` was explicitly called  

* * *

<a name="VrpcAgent+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcAgent+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent.fromCommandline"></a>

### VrpcAgent.fromCommandline(defaults) ⇒ <code>Agent</code>
Constructs an agent by parsing command line arguments

**Kind**: static method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Agent</code> - Agent instance  
**Params**

- defaults <code>Object</code> - Allows to specify defaults for the various command line options
    - .domain <code>String</code> - The domain under which the agent-provided code is reachable
    - .agent <code>String</code> - This agent's name
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .broker <code>String</code> - Broker url in form: `<scheme>://<host>:<port>`
    - .version <code>String</code> - The (custom) version of this agent

**Example**  
```js
const agent = VrpcAgent.fromCommandline()
```

* * *

<a name="VrpcLocal"></a>

## VrpcLocal
Client capable of creating proxy objects and locally calling
functions as provided through native addons.

**Kind**: global class  

* [VrpcLocal](#VrpcLocal)
    * [new VrpcLocal(adapter)](#new_VrpcLocal_new)
    * [.create(className, ...args)](#VrpcLocal+create) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcLocal+getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcLocal+getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcLocal+getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcLocal+getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>


* * *

<a name="new_VrpcLocal_new"></a>

### new VrpcLocal(adapter)
**Params**

- adapter <code>Object</code> - An adapter object, typically loaded as native addon


* * *

<a name="VrpcLocal+create"></a>

### vrpcLocal.create(className, ...args) ⇒ <code>Object</code>
Creates an instance of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Object</code> - Proxy to the created instance  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>Any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcLocal+getAvailableClasses"></a>

### vrpcLocal.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcLocal+getAvailableInstances"></a>

### vrpcLocal.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcLocal+getAvailableMemberFunctions"></a>

### vrpcLocal.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcLocal+getAvailableStaticFunctions"></a>

### vrpcLocal.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcRemote"></a>

## VrpcRemote ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcRemote](#VrpcRemote) ⇐ <code>EventEmitter</code>
    * [new VrpcRemote(options)](#new_VrpcRemote_new)
    * [.connect()](#VrpcRemote+connect) ⇒ <code>Promise</code>
    * [.create(options)](#VrpcRemote+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcRemote+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcRemote+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(options)](#VrpcRemote+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(options)](#VrpcRemote+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * ~~[.getAvailabilities()](#VrpcRemote+getAvailabilities) ⇒ <code>Object</code>~~
    * [.getSystemInformation()](#VrpcRemote+getSystemInformation) ⇒ <code>Object</code>
    * ~~[.getAvailableDomains()](#VrpcRemote+getAvailableDomains) ⇒ <code>Array</code>~~
    * [.getAvailableAgents([options])](#VrpcRemote+getAvailableAgents) ⇒ <code>Array</code>
    * [.getAvailableClasses([options])](#VrpcRemote+getAvailableClasses) ⇒ <code>Array</code>
    * [.getAvailableInstances(className, [options])](#VrpcRemote+getAvailableInstances) ⇒ <code>Array</code>
    * [.getAvailableMemberFunctions(className, [options])](#VrpcRemote+getAvailableMemberFunctions) ⇒ <code>Array</code>
    * [.getAvailableStaticFunctions(className, [options])](#VrpcRemote+getAvailableStaticFunctions) ⇒ <code>Array</code>
    * [.reconnectWithToken(token, [options])](#VrpcRemote+reconnectWithToken) ⇒ <code>Promise</code>
    * [.unregisterAgent(agent)](#VrpcRemote+unregisterAgent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.end()](#VrpcRemote+end) ⇒ <code>Promise</code>
    * ["agent" (info)](#VrpcRemote+event_agent)
    * ["class" (info)](#VrpcRemote+event_class)
    * ["instanceNew" (addedInstances, info)](#VrpcRemote+event_instanceNew)
    * ["instanceGone" (removedInstances, info)](#VrpcRemote+event_instanceGone)
    * ["connect"](#VrpcRemote+event_connect)
    * ["reconnect"](#VrpcRemote+event_reconnect)
    * ["close"](#VrpcRemote+event_close)
    * ["offline"](#VrpcRemote+event_offline)
    * ["error"](#VrpcRemote+event_error)
    * ["end"](#VrpcRemote+event_end)


* * *

<a name="new_VrpcRemote_new"></a>

### new VrpcRemote(options)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.

**Params**

- options <code>Object</code>
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .domain <code>String</code> - Sets the domain
    - [.agent] <code>String</code> <code> = &quot;*&quot;</code> - Sets default agent
    - [.broker] <code>String</code> <code> = &quot;mqtts://vrpc.io:8883&quot;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.timeout] <code>Number</code> <code> = 6000</code> - Maximum time in ms to wait for a RPC answer
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline

**Example**  
```js
const client = new VrpcRemote({
  domain: 'public.vrpc',
  broker: 'mqtt://vrpc.io'
})
```

* * *

<a name="VrpcRemote+connect"></a>

### vrpcRemote.connect() ⇒ <code>Promise</code>
Actually connects to the MQTT broker.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves once connected within [timeout], rejects otherwise  
**Emits**: <code>event:connected</code>  
**Example**  
```js
try {
  await client.connect()
} catch (err) {
  console.error(`Could not connect because: ${err.message}`)
}
```

* * *

<a name="VrpcRemote+create"></a>

### vrpcRemote.create(options) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Creates a new remote instance and provides a proxy to it.

Remote instances can be "named" or "anonymous". Named instances are
shareable and re-attachable across clients as long as they are not
explicitly deleted. Life-cycle changes of named instances are available
under the `class`, `instanceNew`, and `instanceGone` events. A named
instance is created when specifying the `instance` option.

When the `instance` option is not provided, the created proxy is the only
object capable of issuing remote function calls. The remote instance stays
invisible to other clients.

**NOTE** When creating a named instance that already exists, the new proxy will
simply attach to (and not re-create) it - just like `getInstance()` was
called.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Object reflecting a proxy to the original one
handled by the agent  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class which should be
instantiated
    - [.instance] <code>String</code> - Name of the created instance. If not
provided an (invisible) id will be generated
    - [.args] <code>Array</code> - Positional arguments for the constructor call
    - [.agent] <code>String</code> - Agent name. If not provided class default
is used

**Example**  
```js
// create anonymous instance
const proxy1 = await client.create({
  className: 'Foo'
})
// create named instance
const proxy2 = await client.create({
  className: 'Foo',
  instance: 'myFooInstance'
})
// create named instance providing three constructor arguments
const proxy3 = await client.create({
  className: 'Bar',
  instance: 'myBarInstance',
  args: [42, "second argument", { some: 'option' }]
})
```

* * *

<a name="VrpcRemote+getInstance"></a>

### vrpcRemote.getInstance(instance, [options]) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Get a remotely existing instance.

Either provide a string only, then VRPC tries to find the instance using
client information, or additionally provide an object with explicit meta
data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Proxy object reflecting the remotely existing instance  
**Params**

- instance <code>String</code> - The instance to be retrieved
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used
    - .noWait <code>bool</code> - If true immediately fail if instance could not be found in local cache


* * *

<a name="VrpcRemote+delete"></a>

### vrpcRemote.delete(instance, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Delete a remotely existing instance

Either provide a string only, then VRPC tries to find the instance using
client information, or provide an object with explicit meta data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if successful, false otherwise  
**Params**

- instance <code>String</code> - The instance to be deleted
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callStatic"></a>

### vrpcRemote.callStatic(options) ⇒ <code>Promise.&lt;Any&gt;</code>
Calls a static function on a remote class

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Any&gt;</code> - Return value of the remotely called function  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - .functionName <code>String</code> - Name of the static function to be called
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callAll"></a>

### vrpcRemote.callAll(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result.

NOTE: When no agent was specified as class default and no agent is
specified when calling this function, callAll will act on the requested
class across all available agents. The same is true when explicitly using
a wildcard (*) as agent value.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects `{ id, val, err }` carrying
the instance id, the return value and potential errors  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+getAvailabilities"></a>

### ~~vrpcRemote.getAvailabilities() ⇒ <code>Object</code>~~
***Deprecated***

Retrieves all agents, instances, classes, member and static
functions potentially available for remote control.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [domain].agents[agent].status: string, // 'offline' or 'online'
  [domain].agents[agent].hostname: string,
  [domain].agents[agent].version: string,
  [domain].agents[agent].classes[className].instances: string[],
  [domain].agents[agent].classes[className].memberFunctions: string[],
  [domain].agents[agent].classes[className].staticFunctions: string[],
  [domain].agents[agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getSystemInformation"></a>

### vrpcRemote.getSystemInformation() ⇒ <code>Object</code>
Retrieves all information about the currently available components.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [agent].status: string, // 'offline' or 'online'
  [agent].hostname: string,
  [agent].version: string,
  [agent].classes[className].instances: string[],
  [agent].classes[className].memberFunctions: string[],
  [agent].classes[className].staticFunctions: string[],
  [agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getAvailableDomains"></a>

### ~~vrpcRemote.getAvailableDomains() ⇒ <code>Array</code>~~
***Deprecated***

Retrieves all domains on which agents can be remote controlled

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of domain names  

* * *

<a name="VrpcRemote+getAvailableAgents"></a>

### vrpcRemote.getAvailableAgents([options]) ⇒ <code>Array</code>
Retrieves all available agents.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of agent names.  
**Params**

- [options] <code>Object</code>
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online agents


* * *

<a name="VrpcRemote+getAvailableClasses"></a>

### vrpcRemote.getAvailableClasses([options]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of class names.  
**Params**

- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used.
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableInstances"></a>

### vrpcRemote.getAvailableInstances(className, [options]) ⇒ <code>Array</code>
Retrieves all (named) instances on specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of instance names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableMemberFunctions"></a>

### vrpcRemote.getAvailableMemberFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all member functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of member function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableStaticFunctions"></a>

### vrpcRemote.getAvailableStaticFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all static functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of static function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+reconnectWithToken"></a>

### vrpcRemote.reconnectWithToken(token, [options]) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  
**Params**

- token <code>String</code> - Access token as generated by: https://app.vrpc.io
- [options] <code>Object</code>
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+unregisterAgent"></a>

### vrpcRemote.unregisterAgent(agent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Unregisters (= removal of persisted information) an offline agent

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Resolves to true in case of success, false otherwise  
**Params**

- agent - The agent to be unregistered


* * *

<a name="VrpcRemote+end"></a>

### vrpcRemote.end() ⇒ <code>Promise</code>
Ends the connection to the broker

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves when ended  

* * *

<a name="VrpcRemote+event_agent"></a>

### "agent" (info)
Event 'agent'

This event is fired whenever an agent is added or removed, or whenever
an agent changes its status (switches between online or offline).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .status <code>String</code> - Agent status, can be 'offline' or 'online'
    - .hostname <code>String</code> - Name of the host running the agent
    - .version <code>String</code> - User-defined version of the agent


* * *

<a name="VrpcRemote+event_class"></a>

### "class" (info)
Event 'class'

Emitted whenever a class is added or removed, or when instances
or functions of this class have changed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name
    - .instances <code>Array.&lt;String&gt;</code> - Array of named instances
    - .memberFunctions <code>Array.&lt;String&gt;</code> - Array of member functions
    - .staticFunctions <code>Array.&lt;String&gt;</code> - Array of static functions
    - .meta [<code>MetaData</code>](#MetaData) - Object associating further information to functions


* * *

<a name="VrpcRemote+event_instanceNew"></a>

### "instanceNew" (addedInstances, info)
Event 'instanceNew'

Emitted whenever a new instance was created.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- addedInstances <code>Array.&lt;String&gt;</code> - An array of newly added instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_instanceGone"></a>

### "instanceGone" (removedInstances, info)
Event 'instanceGone'

Emitted whenever a new instance was removed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- removedInstances <code>Array.&lt;String&gt;</code> - An array of removed instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcRemote+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="MetaData"></a>

## MetaData : <code>Object.&lt;String, Func&gt;</code>
Associates meta data to any function

**Kind**: global typedef  

* * *

<a name="Func"></a>

## Func
**Kind**: global typedef  
**Params**

- description <code>String</code> - Function description
- params [<code>Array.&lt;Param&gt;</code>](#Param) - Array of parameter details in order of signature
- ret [<code>Ret</code>](#Ret) - Object associating further information to return value


* * *

<a name="Param"></a>

## Param : <code>Object</code>
**Kind**: global typedef  
**Params**

- name <code>String</code> - Parameter name
- optional <code>Boolean</code> - Whether parameter is optional
- description <code>String</code> - Parameter description
- [type] <code>String</code> - Parameter type
- [default] <code>Any</code> - The default to be injected when not provided


* * *

<a name="Ret"></a>

## Ret : <code>Object</code>
**Kind**: global typedef  
**Params**

- description <code>String</code> - Return value description
- [type] <code>String</code> - Return value type


* * *

## Classes

<dl>
<dt><a href="#VrpcAdapter">VrpcAdapter</a></dt>
<dd><p>Generates an adapter layer for existing code and enables further VRPC-based
communication.</p>
</dd>
<dt><a href="#VrpcAgent">VrpcAgent</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Agent capable of making existing code available to remote control by clients.</p>
</dd>
<dt><a href="#VrpcLocal">VrpcLocal</a></dt>
<dd><p>Client capable of creating proxy objects and locally calling
functions as provided through native addons.</p>
</dd>
<dt><a href="#VrpcRemote">VrpcRemote</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MetaData">MetaData</a> : <code>Object.&lt;String, Func&gt;</code></dt>
<dd><p>Associates meta data to any function</p>
</dd>
<dt><a href="#Func">Func</a></dt>
<dd></dd>
<dt><a href="#Param">Param</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Ret">Ret</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="VrpcAdapter"></a>

## VrpcAdapter
Generates an adapter layer for existing code and enables further VRPC-based
communication.

**Kind**: global class  

* [VrpcAdapter](#VrpcAdapter)
    * [.addPluginPath(dirPath, [maxLevel])](#VrpcAdapter.addPluginPath)
    * [.register(code, [options])](#VrpcAdapter.register)
    * [.create(className, ...args)](#VrpcAdapter.create) ⇒ <code>Object</code>
    * [.createNamed(className, instance, ...args)](#VrpcAdapter.createNamed) ⇒ <code>Object</code>
    * [.delete(instance)](#VrpcAdapter.delete) ⇒ <code>Boolean</code>
    * [.getInstance(instance)](#VrpcAdapter.getInstance) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcAdapter.getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcAdapter.getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcAdapter.getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcAdapter.getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMetaData(className)](#VrpcAdapter.getAvailableMetaData) ⇒ [<code>MetaData</code>](#MetaData)


* * *

<a name="VrpcAdapter.addPluginPath"></a>

### VrpcAdapter.addPluginPath(dirPath, [maxLevel])
Automatically requires .js files for auto-registration.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- dirPath <code>String</code> - Relative path to start the auto-registration from
- [maxLevel] <code>Number</code> - Maximum search depth (default: unlimited)


* * *

<a name="VrpcAdapter.register"></a>

### VrpcAdapter.register(code, [options])
Registers existing code and makes it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- code <code>Any</code> - Existing code to be registered, can be a class
or function object or a relative path to a module
- [options] <code>Object</code>
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers
functions that do not begin with an underscore
    - [.withNew] <code>Boolean</code> <code> = true</code> - If true, class will be constructed
using the `new` operator
    - [.schema] <code>Object</code> <code> = </code> - If provided is used to validate ctor
parameters (only works if registered code reflects a single class)
    - .jsdocPath <code>Boolean</code> - if provided, parses documentation and
provides it as meta information

NOTE: This function currently only supports registration of classes (either
when provided as object or when exported on the provided module path)


* * *

<a name="VrpcAdapter.create"></a>

### VrpcAdapter.create(className, ...args) ⇒ <code>Object</code>
Creates an un-managed, anonymous instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.createNamed"></a>

### VrpcAdapter.createNamed(className, instance, ...args) ⇒ <code>Object</code>
Creates a managed named instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- instance <code>String</code> - Name of the instance
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes a managed instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  
**Params**

- instance <code>String</code> - Name of the instance to be deleted


* * *

<a name="VrpcAdapter.getInstance"></a>

### VrpcAdapter.getInstance(instance) ⇒ <code>Object</code>
Retrieves an existing instance by name

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- instance <code>String</code> - Name of the instance to be acquired


* * *

<a name="VrpcAdapter.getAvailableClasses"></a>

### VrpcAdapter.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcAdapter.getAvailableInstances"></a>

### VrpcAdapter.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcAdapter.getAvailableMemberFunctions"></a>

### VrpcAdapter.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcAdapter.getAvailableStaticFunctions"></a>

### VrpcAdapter.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcAdapter.getAvailableMetaData"></a>

### VrpcAdapter.getAvailableMetaData(className) ⇒ [<code>MetaData</code>](#MetaData)
Provides all available meta data of the registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: [<code>MetaData</code>](#MetaData) - Meta Data  
**Params**

- className <code>String</code> - Name of class to provide meta data for


* * *

<a name="VrpcAgent"></a>

## VrpcAgent ⇐ <code>EventEmitter</code>
Agent capable of making existing code available to remote control by clients.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcAgent](#VrpcAgent) ⇐ <code>EventEmitter</code>
    * [new VrpcAgent(obj)](#new_VrpcAgent_new)
    * _instance_
        * [.serve()](#VrpcAgent+serve) ⇒ <code>Promise</code>
        * [.end([obj], [unregister])](#VrpcAgent+end) ⇒ <code>Promise</code>
        * [._clearPersistedSession()](#VrpcAgent+_clearPersistedSession) ⇒ <code>Boolean</code>
        * ["connect"](#VrpcAgent+event_connect)
        * ["reconnect"](#VrpcAgent+event_reconnect)
        * ["close"](#VrpcAgent+event_close)
        * ["offline"](#VrpcAgent+event_offline)
        * ["error"](#VrpcAgent+event_error)
        * ["end"](#VrpcAgent+event_end)
    * _static_
        * [.fromCommandline(defaults)](#VrpcAgent.fromCommandline) ⇒ <code>Agent</code>


* * *

<a name="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance

**Params**

- obj <code>Object</code>
    - [.username] <code>String</code> - MQTT username (if no token is used)
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token as generated by: https://app.vrpc.io (only optional when using default domain and broker)
    - [.domain] <code>String</code> <code> = &#x27;public.vrpc&#x27;</code> - The domain under which the agent-provided code is reachable
    - [.agent] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;pathId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - This agent's name
    - [.broker] <code>String</code> <code> = &#x27;mqtts://vrpc.io:8883&#x27;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>String</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline
    - [.version] <code>String</code> <code> = &#x27;&#x27;</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = new Agent({
  domain: 'public.vrpc'
  agent: 'myAgent'
})
```

* * *

<a name="VrpcAgent+serve"></a>

### vrpcAgent.serve() ⇒ <code>Promise</code>
Starts the agent

The returned promise will only resolve once the agent is connected to the
broker. If the connection can't be established it will try connecting
forever. You may want to listen to the 'offline' (initial connect attempt
failed) or 'reconnect' (any further fail) event and call `agent.end()` to
stop trying to connect and resolve the returned promise.

If the connection could not be established because of authorization
failure, the 'error' event will be emitted.

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves once connected or explicitly ended, never
rejects  

* * *

<a name="VrpcAgent+end"></a>

### vrpcAgent.end([obj], [unregister]) ⇒ <code>Promise</code>
Stops the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves when disconnected and ended  
**Params**

- [obj] <code>Object</code>
- [unregister] <code>Boolean</code> <code> = false</code> - If true, fully un-registers agent from broker


* * *

<a name="VrpcAgent+_clearPersistedSession"></a>

### vrpcAgent.\_clearPersistedSession() ⇒ <code>Boolean</code>
**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Boolean</code> - true if `agent.end()` was explicitly called  

* * *

<a name="VrpcAgent+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcAgent+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent.fromCommandline"></a>

### VrpcAgent.fromCommandline(defaults) ⇒ <code>Agent</code>
Constructs an agent by parsing command line arguments

**Kind**: static method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Agent</code> - Agent instance  
**Params**

- defaults <code>Object</code> - Allows to specify defaults for the various command line options
    - .domain <code>String</code> - The domain under which the agent-provided code is reachable
    - .agent <code>String</code> - This agent's name
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .broker <code>String</code> - Broker url in form: `<scheme>://<host>:<port>`
    - .version <code>String</code> - The (custom) version of this agent

**Example**  
```js
const agent = VrpcAgent.fromCommandline()
```

* * *

<a name="VrpcLocal"></a>

## VrpcLocal
Client capable of creating proxy objects and locally calling
functions as provided through native addons.

**Kind**: global class  

* [VrpcLocal](#VrpcLocal)
    * [new VrpcLocal(adapter)](#new_VrpcLocal_new)
    * [.create(className, ...args)](#VrpcLocal+create) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcLocal+getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcLocal+getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcLocal+getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcLocal+getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>


* * *

<a name="new_VrpcLocal_new"></a>

### new VrpcLocal(adapter)
**Params**

- adapter <code>Object</code> - An adapter object, typically loaded as native addon


* * *

<a name="VrpcLocal+create"></a>

### vrpcLocal.create(className, ...args) ⇒ <code>Object</code>
Creates an instance of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Object</code> - Proxy to the created instance  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>Any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcLocal+getAvailableClasses"></a>

### vrpcLocal.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcLocal+getAvailableInstances"></a>

### vrpcLocal.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcLocal+getAvailableMemberFunctions"></a>

### vrpcLocal.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcLocal+getAvailableStaticFunctions"></a>

### vrpcLocal.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcRemote"></a>

## VrpcRemote ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcRemote](#VrpcRemote) ⇐ <code>EventEmitter</code>
    * [new VrpcRemote(options)](#new_VrpcRemote_new)
    * [.connect()](#VrpcRemote+connect) ⇒ <code>Promise</code>
    * [.create(options)](#VrpcRemote+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcRemote+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcRemote+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(options)](#VrpcRemote+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(options)](#VrpcRemote+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * ~~[.getAvailabilities()](#VrpcRemote+getAvailabilities) ⇒ <code>Object</code>~~
    * [.getSystemInformation()](#VrpcRemote+getSystemInformation) ⇒ <code>Object</code>
    * ~~[.getAvailableDomains()](#VrpcRemote+getAvailableDomains) ⇒ <code>Array</code>~~
    * [.getAvailableAgents([options])](#VrpcRemote+getAvailableAgents) ⇒ <code>Array</code>
    * [.getAvailableClasses([options])](#VrpcRemote+getAvailableClasses) ⇒ <code>Array</code>
    * [.getAvailableInstances(className, [options])](#VrpcRemote+getAvailableInstances) ⇒ <code>Array</code>
    * [.getAvailableMemberFunctions(className, [options])](#VrpcRemote+getAvailableMemberFunctions) ⇒ <code>Array</code>
    * [.getAvailableStaticFunctions(className, [options])](#VrpcRemote+getAvailableStaticFunctions) ⇒ <code>Array</code>
    * [.reconnectWithToken(token, [options])](#VrpcRemote+reconnectWithToken) ⇒ <code>Promise</code>
    * [.unregisterAgent(agent)](#VrpcRemote+unregisterAgent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.end()](#VrpcRemote+end) ⇒ <code>Promise</code>
    * ["agent" (info)](#VrpcRemote+event_agent)
    * ["class" (info)](#VrpcRemote+event_class)
    * ["instanceNew" (addedInstances, info)](#VrpcRemote+event_instanceNew)
    * ["instanceGone" (removedInstances, info)](#VrpcRemote+event_instanceGone)
    * ["connect"](#VrpcRemote+event_connect)
    * ["reconnect"](#VrpcRemote+event_reconnect)
    * ["close"](#VrpcRemote+event_close)
    * ["offline"](#VrpcRemote+event_offline)
    * ["error"](#VrpcRemote+event_error)
    * ["end"](#VrpcRemote+event_end)


* * *

<a name="new_VrpcRemote_new"></a>

### new VrpcRemote(options)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.

**Params**

- options <code>Object</code>
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .domain <code>String</code> - Sets the domain
    - [.agent] <code>String</code> <code> = &quot;*&quot;</code> - Sets default agent
    - [.broker] <code>String</code> <code> = &quot;mqtts://vrpc.io:8883&quot;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.timeout] <code>Number</code> <code> = 6000</code> - Maximum time in ms to wait for a RPC answer
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline

**Example**  
```js
const client = new VrpcRemote({
  domain: 'public.vrpc',
  broker: 'mqtt://vrpc.io'
})
```

* * *

<a name="VrpcRemote+connect"></a>

### vrpcRemote.connect() ⇒ <code>Promise</code>
Actually connects to the MQTT broker.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves once connected within [timeout], rejects otherwise  
**Emits**: <code>event:connected</code>  
**Example**  
```js
try {
  await client.connect()
} catch (err) {
  console.error(`Could not connect because: ${err.message}`)
}
```

* * *

<a name="VrpcRemote+create"></a>

### vrpcRemote.create(options) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Creates a new remote instance and provides a proxy to it.

Remote instances can be "named" or "anonymous". Named instances are
shareable and re-attachable across clients as long as they are not
explicitly deleted. Life-cycle changes of named instances are available
under the `class`, `instanceNew`, and `instanceGone` events. A named
instance is created when specifying the `instance` option.

When the `instance` option is not provided, the created proxy is the only
object capable of issuing remote function calls. The remote instance stays
invisible to other clients.

**NOTE** When creating a named instance that already exists, the new proxy will
simply attach to (and not re-create) it - just like `getInstance()` was
called.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Object reflecting a proxy to the original one
handled by the agent  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class which should be
instantiated
    - [.instance] <code>String</code> - Name of the created instance. If not
provided an (invisible) id will be generated
    - [.args] <code>Array</code> - Positional arguments for the constructor call
    - [.agent] <code>String</code> - Agent name. If not provided class default
is used

**Example**  
```js
// create anonymous instance
const proxy1 = await client.create({
  className: 'Foo'
})
// create named instance
const proxy2 = await client.create({
  className: 'Foo',
  instance: 'myFooInstance'
})
// create named instance providing three constructor arguments
const proxy3 = await client.create({
  className: 'Bar',
  instance: 'myBarInstance',
  args: [42, "second argument", { some: 'option' }]
})
```

* * *

<a name="VrpcRemote+getInstance"></a>

### vrpcRemote.getInstance(instance, [options]) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Get a remotely existing instance.

Either provide a string only, then VRPC tries to find the instance using
client information, or additionally provide an object with explicit meta
data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Proxy object reflecting the remotely existing instance  
**Params**

- instance <code>String</code> - The instance to be retrieved
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used
    - .noWait <code>bool</code> - If true immediately fail if instance could not be found in local cache


* * *

<a name="VrpcRemote+delete"></a>

### vrpcRemote.delete(instance, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Delete a remotely existing instance

Either provide a string only, then VRPC tries to find the instance using
client information, or provide an object with explicit meta data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if successful, false otherwise  
**Params**

- instance <code>String</code> - The instance to be deleted
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callStatic"></a>

### vrpcRemote.callStatic(options) ⇒ <code>Promise.&lt;Any&gt;</code>
Calls a static function on a remote class

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Any&gt;</code> - Return value of the remotely called function  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - .functionName <code>String</code> - Name of the static function to be called
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callAll"></a>

### vrpcRemote.callAll(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result.

NOTE: When no agent was specified as class default and no agent is
specified when calling this function, callAll will act on the requested
class across all available agents. The same is true when explicitly using
a wildcard (*) as agent value.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects `{ id, val, err }` carrying
the instance id, the return value and potential errors  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+getAvailabilities"></a>

### ~~vrpcRemote.getAvailabilities() ⇒ <code>Object</code>~~
***Deprecated***

Retrieves all agents, instances, classes, member and static
functions potentially available for remote control.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [domain].agents[agent].status: string, // 'offline' or 'online'
  [domain].agents[agent].hostname: string,
  [domain].agents[agent].version: string,
  [domain].agents[agent].classes[className].instances: string[],
  [domain].agents[agent].classes[className].memberFunctions: string[],
  [domain].agents[agent].classes[className].staticFunctions: string[],
  [domain].agents[agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getSystemInformation"></a>

### vrpcRemote.getSystemInformation() ⇒ <code>Object</code>
Retrieves all information about the currently available components.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [agent].status: string, // 'offline' or 'online'
  [agent].hostname: string,
  [agent].version: string,
  [agent].classes[className].instances: string[],
  [agent].classes[className].memberFunctions: string[],
  [agent].classes[className].staticFunctions: string[],
  [agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getAvailableDomains"></a>

### ~~vrpcRemote.getAvailableDomains() ⇒ <code>Array</code>~~
***Deprecated***

Retrieves all domains on which agents can be remote controlled

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of domain names  

* * *

<a name="VrpcRemote+getAvailableAgents"></a>

### vrpcRemote.getAvailableAgents([options]) ⇒ <code>Array</code>
Retrieves all available agents.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of agent names.  
**Params**

- [options] <code>Object</code>
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online agents


* * *

<a name="VrpcRemote+getAvailableClasses"></a>

### vrpcRemote.getAvailableClasses([options]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of class names.  
**Params**

- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used.
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableInstances"></a>

### vrpcRemote.getAvailableInstances(className, [options]) ⇒ <code>Array</code>
Retrieves all (named) instances on specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of instance names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableMemberFunctions"></a>

### vrpcRemote.getAvailableMemberFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all member functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of member function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableStaticFunctions"></a>

### vrpcRemote.getAvailableStaticFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all static functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of static function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+reconnectWithToken"></a>

### vrpcRemote.reconnectWithToken(token, [options]) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  
**Params**

- token <code>String</code> - Access token as generated by: https://app.vrpc.io
- [options] <code>Object</code>
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+unregisterAgent"></a>

### vrpcRemote.unregisterAgent(agent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Unregisters (= removal of persisted information) an offline agent

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Resolves to true in case of success, false otherwise  
**Params**

- agent - The agent to be unregistered


* * *

<a name="VrpcRemote+end"></a>

### vrpcRemote.end() ⇒ <code>Promise</code>
Ends the connection to the broker

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves when ended  

* * *

<a name="VrpcRemote+event_agent"></a>

### "agent" (info)
Event 'agent'

This event is fired whenever an agent is added or removed, or whenever
an agent changes its status (switches between online or offline).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .status <code>String</code> - Agent status, can be 'offline' or 'online'
    - .hostname <code>String</code> - Name of the host running the agent
    - .version <code>String</code> - User-defined version of the agent


* * *

<a name="VrpcRemote+event_class"></a>

### "class" (info)
Event 'class'

Emitted whenever a class is added or removed, or when instances
or functions of this class have changed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name
    - .instances <code>Array.&lt;String&gt;</code> - Array of named instances
    - .memberFunctions <code>Array.&lt;String&gt;</code> - Array of member functions
    - .staticFunctions <code>Array.&lt;String&gt;</code> - Array of static functions
    - .meta [<code>MetaData</code>](#MetaData) - Object associating further information to functions


* * *

<a name="VrpcRemote+event_instanceNew"></a>

### "instanceNew" (addedInstances, info)
Event 'instanceNew'

Emitted whenever a new instance was created.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- addedInstances <code>Array.&lt;String&gt;</code> - An array of newly added instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_instanceGone"></a>

### "instanceGone" (removedInstances, info)
Event 'instanceGone'

Emitted whenever a new instance was removed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- removedInstances <code>Array.&lt;String&gt;</code> - An array of removed instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcRemote+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="MetaData"></a>

## MetaData : <code>Object.&lt;String, Func&gt;</code>
Associates meta data to any function

**Kind**: global typedef  

* * *

<a name="Func"></a>

## Func
**Kind**: global typedef  
**Params**

- description <code>String</code> - Function description
- params [<code>Array.&lt;Param&gt;</code>](#Param) - Array of parameter details in order of signature
- ret [<code>Ret</code>](#Ret) - Object associating further information to return value


* * *

<a name="Param"></a>

## Param : <code>Object</code>
**Kind**: global typedef  
**Params**

- name <code>String</code> - Parameter name
- optional <code>Boolean</code> - Whether parameter is optional
- description <code>String</code> - Parameter description
- [type] <code>String</code> - Parameter type
- [default] <code>Any</code> - The default to be injected when not provided


* * *

<a name="Ret"></a>

## Ret : <code>Object</code>
**Kind**: global typedef  
**Params**

- description <code>String</code> - Return value description
- [type] <code>String</code> - Return value type


* * *

## Classes

<dl>
<dt><a href="#VrpcAdapter">VrpcAdapter</a></dt>
<dd><p>Generates an adapter layer for existing code and enables further VRPC-based
communication.</p>
</dd>
<dt><a href="#VrpcAgent">VrpcAgent</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Agent capable of making existing code available to remote control by clients.</p>
</dd>
<dt><a href="#VrpcLocal">VrpcLocal</a></dt>
<dd><p>Client capable of creating proxy objects and locally calling
functions as provided through native addons.</p>
</dd>
<dt><a href="#VrpcRemote">VrpcRemote</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MetaData">MetaData</a> : <code>Object.&lt;String, Func&gt;</code></dt>
<dd><p>Associates meta data to any function</p>
</dd>
<dt><a href="#Func">Func</a></dt>
<dd></dd>
<dt><a href="#Param">Param</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Ret">Ret</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="VrpcAdapter"></a>

## VrpcAdapter
Generates an adapter layer for existing code and enables further VRPC-based
communication.

**Kind**: global class  

* [VrpcAdapter](#VrpcAdapter)
    * [.addPluginPath(dirPath, [maxLevel])](#VrpcAdapter.addPluginPath)
    * [.register(code, [options])](#VrpcAdapter.register)
    * [.create(className, ...args)](#VrpcAdapter.create) ⇒ <code>Object</code>
    * [.createNamed(className, instance, ...args)](#VrpcAdapter.createNamed) ⇒ <code>Object</code>
    * [.delete(instance)](#VrpcAdapter.delete) ⇒ <code>Boolean</code>
    * [.getInstance(instance)](#VrpcAdapter.getInstance) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcAdapter.getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcAdapter.getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcAdapter.getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcAdapter.getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMetaData(className)](#VrpcAdapter.getAvailableMetaData) ⇒ [<code>MetaData</code>](#MetaData)


* * *

<a name="VrpcAdapter.addPluginPath"></a>

### VrpcAdapter.addPluginPath(dirPath, [maxLevel])
Automatically requires .js files for auto-registration.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- dirPath <code>String</code> - Relative path to start the auto-registration from
- [maxLevel] <code>Number</code> - Maximum search depth (default: unlimited)


* * *

<a name="VrpcAdapter.register"></a>

### VrpcAdapter.register(code, [options])
Registers existing code and makes it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- code <code>Any</code> - Existing code to be registered, can be a class
or function object or a relative path to a module
- [options] <code>Object</code>
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers
functions that do not begin with an underscore
    - [.withNew] <code>Boolean</code> <code> = true</code> - If true, class will be constructed
using the `new` operator
    - [.schema] <code>Object</code> <code> = </code> - If provided is used to validate ctor
parameters (only works if registered code reflects a single class)
    - .jsdocPath <code>Boolean</code> - if provided, parses documentation and
provides it as meta information

NOTE: This function currently only supports registration of classes (either
when provided as object or when exported on the provided module path)


* * *

<a name="VrpcAdapter.create"></a>

### VrpcAdapter.create(className, ...args) ⇒ <code>Object</code>
Creates an un-managed, anonymous instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.createNamed"></a>

### VrpcAdapter.createNamed(className, instance, ...args) ⇒ <code>Object</code>
Creates a managed named instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- instance <code>String</code> - Name of the instance
- ...args <code>any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes a managed instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  
**Params**

- instance <code>String</code> - Name of the instance to be deleted


* * *

<a name="VrpcAdapter.getInstance"></a>

### VrpcAdapter.getInstance(instance) ⇒ <code>Object</code>
Retrieves an existing instance by name

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- instance <code>String</code> - Name of the instance to be acquired


* * *

<a name="VrpcAdapter.getAvailableClasses"></a>

### VrpcAdapter.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcAdapter.getAvailableInstances"></a>

### VrpcAdapter.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcAdapter.getAvailableMemberFunctions"></a>

### VrpcAdapter.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcAdapter.getAvailableStaticFunctions"></a>

### VrpcAdapter.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcAdapter.getAvailableMetaData"></a>

### VrpcAdapter.getAvailableMetaData(className) ⇒ [<code>MetaData</code>](#MetaData)
Provides all available meta data of the registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: [<code>MetaData</code>](#MetaData) - Meta Data  
**Params**

- className <code>String</code> - Name of class to provide meta data for


* * *

<a name="VrpcAgent"></a>

## VrpcAgent ⇐ <code>EventEmitter</code>
Agent capable of making existing code available to remote control by clients.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcAgent](#VrpcAgent) ⇐ <code>EventEmitter</code>
    * [new VrpcAgent(obj)](#new_VrpcAgent_new)
    * _instance_
        * [.serve()](#VrpcAgent+serve) ⇒ <code>Promise</code>
        * [.end([obj], [unregister])](#VrpcAgent+end) ⇒ <code>Promise</code>
        * [._clearPersistedSession()](#VrpcAgent+_clearPersistedSession) ⇒ <code>Boolean</code>
        * ["connect"](#VrpcAgent+event_connect)
        * ["reconnect"](#VrpcAgent+event_reconnect)
        * ["close"](#VrpcAgent+event_close)
        * ["offline"](#VrpcAgent+event_offline)
        * ["error"](#VrpcAgent+event_error)
        * ["end"](#VrpcAgent+event_end)
    * _static_
        * [.fromCommandline(defaults)](#VrpcAgent.fromCommandline) ⇒ <code>Agent</code>


* * *

<a name="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance

**Params**

- obj <code>Object</code>
    - [.username] <code>String</code> - MQTT username (if no token is used)
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token as generated by: https://app.vrpc.io (only optional when using default domain and broker)
    - [.domain] <code>String</code> <code> = &#x27;public.vrpc&#x27;</code> - The domain under which the agent-provided code is reachable
    - [.agent] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;pathId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - This agent's name
    - [.broker] <code>String</code> <code> = &#x27;mqtts://vrpc.io:8883&#x27;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>String</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline
    - [.version] <code>String</code> <code> = &#x27;&#x27;</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = new Agent({
  domain: 'public.vrpc'
  agent: 'myAgent'
})
```

* * *

<a name="VrpcAgent+serve"></a>

### vrpcAgent.serve() ⇒ <code>Promise</code>
Starts the agent

The returned promise will only resolve once the agent is connected to the
broker. If the connection can't be established it will try connecting
forever. You may want to listen to the 'offline' (initial connect attempt
failed) or 'reconnect' (any further fail) event and call `agent.end()` to
stop trying to connect and resolve the returned promise.

If the connection could not be established because of authorization
failure, the 'error' event will be emitted.

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves once connected or explicitly ended, never
rejects  

* * *

<a name="VrpcAgent+end"></a>

### vrpcAgent.end([obj], [unregister]) ⇒ <code>Promise</code>
Stops the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves when disconnected and ended  
**Params**

- [obj] <code>Object</code>
- [unregister] <code>Boolean</code> <code> = false</code> - If true, fully un-registers agent from broker


* * *

<a name="VrpcAgent+_clearPersistedSession"></a>

### vrpcAgent.\_clearPersistedSession() ⇒ <code>Boolean</code>
**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Boolean</code> - true if `agent.end()` was explicitly called  

* * *

<a name="VrpcAgent+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcAgent+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent.fromCommandline"></a>

### VrpcAgent.fromCommandline(defaults) ⇒ <code>Agent</code>
Constructs an agent by parsing command line arguments

**Kind**: static method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Agent</code> - Agent instance  
**Params**

- defaults <code>Object</code> - Allows to specify defaults for the various command line options
    - .domain <code>String</code> - The domain under which the agent-provided code is reachable
    - .agent <code>String</code> - This agent's name
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .broker <code>String</code> - Broker url in form: `<scheme>://<host>:<port>`
    - .version <code>String</code> - The (custom) version of this agent

**Example**  
```js
const agent = VrpcAgent.fromCommandline()
```

* * *

<a name="VrpcLocal"></a>

## VrpcLocal
Client capable of creating proxy objects and locally calling
functions as provided through native addons.

**Kind**: global class  

* [VrpcLocal](#VrpcLocal)
    * [new VrpcLocal(adapter)](#new_VrpcLocal_new)
    * [.create(className, ...args)](#VrpcLocal+create) ⇒ <code>Object</code>
    * [.getAvailableClasses()](#VrpcLocal+getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableInstances(className)](#VrpcLocal+getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableMemberFunctions(className)](#VrpcLocal+getAvailableMemberFunctions) ⇒ <code>Array.&lt;String&gt;</code>
    * [.getAvailableStaticFunctions(className)](#VrpcLocal+getAvailableStaticFunctions) ⇒ <code>Array.&lt;String&gt;</code>


* * *

<a name="new_VrpcLocal_new"></a>

### new VrpcLocal(adapter)
**Params**

- adapter <code>Object</code> - An adapter object, typically loaded as native addon


* * *

<a name="VrpcLocal+create"></a>

### vrpcLocal.create(className, ...args) ⇒ <code>Object</code>
Creates an instance of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Object</code> - Proxy to the created instance  
**Params**

- className <code>String</code> - Name of the class to create an instance of
- ...args <code>Any</code> - Arguments to provide to the constructor


* * *

<a name="VrpcLocal+getAvailableClasses"></a>

### vrpcLocal.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a name="VrpcLocal+getAvailableInstances"></a>

### vrpcLocal.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a name="VrpcLocal+getAvailableMemberFunctions"></a>

### vrpcLocal.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  
**Params**

- className <code>String</code> - Name of class to provide member functions for


* * *

<a name="VrpcLocal+getAvailableStaticFunctions"></a>

### vrpcLocal.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  
**Params**

- className <code>String</code> - Name of class to provide static functions for


* * *

<a name="VrpcRemote"></a>

## VrpcRemote ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcRemote](#VrpcRemote) ⇐ <code>EventEmitter</code>
    * [new VrpcRemote(options)](#new_VrpcRemote_new)
    * [.connect()](#VrpcRemote+connect) ⇒ <code>Promise</code>
    * [.create(options)](#VrpcRemote+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcRemote+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcRemote+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(options)](#VrpcRemote+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(options)](#VrpcRemote+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * ~~[.getAvailabilities()](#VrpcRemote+getAvailabilities) ⇒ <code>Object</code>~~
    * [.getSystemInformation()](#VrpcRemote+getSystemInformation) ⇒ <code>Object</code>
    * ~~[.getAvailableDomains()](#VrpcRemote+getAvailableDomains) ⇒ <code>Array</code>~~
    * [.getAvailableAgents([options])](#VrpcRemote+getAvailableAgents) ⇒ <code>Array</code>
    * [.getAvailableClasses([options])](#VrpcRemote+getAvailableClasses) ⇒ <code>Array</code>
    * [.getAvailableInstances(className, [options])](#VrpcRemote+getAvailableInstances) ⇒ <code>Array</code>
    * [.getAvailableMemberFunctions(className, [options])](#VrpcRemote+getAvailableMemberFunctions) ⇒ <code>Array</code>
    * [.getAvailableStaticFunctions(className, [options])](#VrpcRemote+getAvailableStaticFunctions) ⇒ <code>Array</code>
    * [.reconnectWithToken(token, [options])](#VrpcRemote+reconnectWithToken) ⇒ <code>Promise</code>
    * [.unregisterAgent(agent)](#VrpcRemote+unregisterAgent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.end()](#VrpcRemote+end) ⇒ <code>Promise</code>
    * ["agent" (info)](#VrpcRemote+event_agent)
    * ["class" (info)](#VrpcRemote+event_class)
    * ["instanceNew" (addedInstances, info)](#VrpcRemote+event_instanceNew)
    * ["instanceGone" (removedInstances, info)](#VrpcRemote+event_instanceGone)
    * ["connect"](#VrpcRemote+event_connect)
    * ["reconnect"](#VrpcRemote+event_reconnect)
    * ["close"](#VrpcRemote+event_close)
    * ["offline"](#VrpcRemote+event_offline)
    * ["error"](#VrpcRemote+event_error)
    * ["end"](#VrpcRemote+event_end)


* * *

<a name="new_VrpcRemote_new"></a>

### new VrpcRemote(options)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.

**Params**

- options <code>Object</code>
    - .token <code>String</code> - Access token as generated by: https://app.vrpc.io
    - .username <code>String</code> - MQTT username (if no token is used)
    - .password <code>String</code> - MQTT password (if no token is provided)
    - .domain <code>String</code> - Sets the domain
    - [.agent] <code>String</code> <code> = &quot;*&quot;</code> - Sets default agent
    - [.broker] <code>String</code> <code> = &quot;mqtts://vrpc.io:8883&quot;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.timeout] <code>Number</code> <code> = 6000</code> - Maximum time in ms to wait for a RPC answer
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline

**Example**  
```js
const client = new VrpcRemote({
  domain: 'public.vrpc',
  broker: 'mqtt://vrpc.io'
})
```

* * *

<a name="VrpcRemote+connect"></a>

### vrpcRemote.connect() ⇒ <code>Promise</code>
Actually connects to the MQTT broker.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves once connected within [timeout], rejects otherwise  
**Emits**: <code>event:connected</code>  
**Example**  
```js
try {
  await client.connect()
} catch (err) {
  console.error(`Could not connect because: ${err.message}`)
}
```

* * *

<a name="VrpcRemote+create"></a>

### vrpcRemote.create(options) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Creates a new remote instance and provides a proxy to it.

Remote instances can be "named" or "anonymous". Named instances are
shareable and re-attachable across clients as long as they are not
explicitly deleted. Life-cycle changes of named instances are available
under the `class`, `instanceNew`, and `instanceGone` events. A named
instance is created when specifying the `instance` option.

When the `instance` option is not provided, the created proxy is the only
object capable of issuing remote function calls. The remote instance stays
invisible to other clients.

**NOTE** When creating a named instance that already exists, the new proxy will
simply attach to (and not re-create) it - just like `getInstance()` was
called.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Object reflecting a proxy to the original one
handled by the agent  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class which should be
instantiated
    - [.instance] <code>String</code> - Name of the created instance. If not
provided an (invisible) id will be generated
    - [.args] <code>Array</code> - Positional arguments for the constructor call
    - [.agent] <code>String</code> - Agent name. If not provided class default
is used

**Example**  
```js
// create anonymous instance
const proxy1 = await client.create({
  className: 'Foo'
})
// create named instance
const proxy2 = await client.create({
  className: 'Foo',
  instance: 'myFooInstance'
})
// create named instance providing three constructor arguments
const proxy3 = await client.create({
  className: 'Bar',
  instance: 'myBarInstance',
  args: [42, "second argument", { some: 'option' }]
})
```

* * *

<a name="VrpcRemote+getInstance"></a>

### vrpcRemote.getInstance(instance, [options]) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Get a remotely existing instance.

Either provide a string only, then VRPC tries to find the instance using
client information, or additionally provide an object with explicit meta
data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Proxy object reflecting the remotely existing instance  
**Params**

- instance <code>String</code> - The instance to be retrieved
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used
    - .noWait <code>bool</code> - If true immediately fail if instance could not be found in local cache


* * *

<a name="VrpcRemote+delete"></a>

### vrpcRemote.delete(instance, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Delete a remotely existing instance

Either provide a string only, then VRPC tries to find the instance using
client information, or provide an object with explicit meta data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if successful, false otherwise  
**Params**

- instance <code>String</code> - The instance to be deleted
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callStatic"></a>

### vrpcRemote.callStatic(options) ⇒ <code>Promise.&lt;Any&gt;</code>
Calls a static function on a remote class

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Any&gt;</code> - Return value of the remotely called function  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - .functionName <code>String</code> - Name of the static function to be called
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+callAll"></a>

### vrpcRemote.callAll(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result.

NOTE: When no agent was specified as class default and no agent is
specified when calling this function, callAll will act on the requested
class across all available agents. The same is true when explicitly using
a wildcard (*) as agent value.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects `{ id, val, err }` carrying
the instance id, the return value and potential errors  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+getAvailabilities"></a>

### ~~vrpcRemote.getAvailabilities() ⇒ <code>Object</code>~~
***Deprecated***

Retrieves all agents, instances, classes, member and static
functions potentially available for remote control.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [domain].agents[agent].status: string, // 'offline' or 'online'
  [domain].agents[agent].hostname: string,
  [domain].agents[agent].version: string,
  [domain].agents[agent].classes[className].instances: string[],
  [domain].agents[agent].classes[className].memberFunctions: string[],
  [domain].agents[agent].classes[className].staticFunctions: string[],
  [domain].agents[agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getSystemInformation"></a>

### vrpcRemote.getSystemInformation() ⇒ <code>Object</code>
Retrieves all information about the currently available components.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - SystemInformation
```ts
type SystemInformation = {
  [agent].status: string, // 'offline' or 'online'
  [agent].hostname: string,
  [agent].version: string,
  [agent].classes[className].instances: string[],
  [agent].classes[className].memberFunctions: string[],
  [agent].classes[className].staticFunctions: string[],
  [agent].classes[className].meta?: MetaData
}
```  

* * *

<a name="VrpcRemote+getAvailableDomains"></a>

### ~~vrpcRemote.getAvailableDomains() ⇒ <code>Array</code>~~
***Deprecated***

Retrieves all domains on which agents can be remote controlled

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of domain names  

* * *

<a name="VrpcRemote+getAvailableAgents"></a>

### vrpcRemote.getAvailableAgents([options]) ⇒ <code>Array</code>
Retrieves all available agents.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of agent names.  
**Params**

- [options] <code>Object</code>
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online agents


* * *

<a name="VrpcRemote+getAvailableClasses"></a>

### vrpcRemote.getAvailableClasses([options]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of class names.  
**Params**

- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used.
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableInstances"></a>

### vrpcRemote.getAvailableInstances(className, [options]) ⇒ <code>Array</code>
Retrieves all (named) instances on specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of instance names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableMemberFunctions"></a>

### vrpcRemote.getAvailableMemberFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all member functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of member function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+getAvailableStaticFunctions"></a>

### vrpcRemote.getAvailableStaticFunctions(className, [options]) ⇒ <code>Array</code>
Retrieves all static functions of specific class and agent.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of static function names  
**Params**

- className <code>String</code> - Class name
- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcRemote+reconnectWithToken"></a>

### vrpcRemote.reconnectWithToken(token, [options]) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  
**Params**

- token <code>String</code> - Access token as generated by: https://app.vrpc.io
- [options] <code>Object</code>
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcRemote+unregisterAgent"></a>

### vrpcRemote.unregisterAgent(agent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Unregisters (= removal of persisted information) an offline agent

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Resolves to true in case of success, false otherwise  
**Params**

- agent - The agent to be unregistered


* * *

<a name="VrpcRemote+end"></a>

### vrpcRemote.end() ⇒ <code>Promise</code>
Ends the connection to the broker

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves when ended  

* * *

<a name="VrpcRemote+event_agent"></a>

### "agent" (info)
Event 'agent'

This event is fired whenever an agent is added or removed, or whenever
an agent changes its status (switches between online or offline).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .status <code>String</code> - Agent status, can be 'offline' or 'online'
    - .hostname <code>String</code> - Name of the host running the agent
    - .version <code>String</code> - User-defined version of the agent


* * *

<a name="VrpcRemote+event_class"></a>

### "class" (info)
Event 'class'

Emitted whenever a class is added or removed, or when instances
or functions of this class have changed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name
    - .instances <code>Array.&lt;String&gt;</code> - Array of named instances
    - .memberFunctions <code>Array.&lt;String&gt;</code> - Array of member functions
    - .staticFunctions <code>Array.&lt;String&gt;</code> - Array of static functions
    - .meta [<code>MetaData</code>](#MetaData) - Object associating further information to functions


* * *

<a name="VrpcRemote+event_instanceNew"></a>

### "instanceNew" (addedInstances, info)
Event 'instanceNew'

Emitted whenever a new instance was created.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- addedInstances <code>Array.&lt;String&gt;</code> - An array of newly added instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_instanceGone"></a>

### "instanceGone" (removedInstances, info)
Event 'instanceGone'

Emitted whenever a new instance was removed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Params**

- removedInstances <code>Array.&lt;String&gt;</code> - An array of removed instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcRemote+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcRemote+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="VrpcRemote+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

* * *

<a name="MetaData"></a>

## MetaData : <code>Object.&lt;String, Func&gt;</code>
Associates meta data to any function

**Kind**: global typedef  

* * *

<a name="Func"></a>

## Func
**Kind**: global typedef  
**Params**

- description <code>String</code> - Function description
- params [<code>Array.&lt;Param&gt;</code>](#Param) - Array of parameter details in order of signature
- ret [<code>Ret</code>](#Ret) - Object associating further information to return value


* * *

<a name="Param"></a>

## Param : <code>Object</code>
**Kind**: global typedef  
**Params**

- name <code>String</code> - Parameter name
- optional <code>Boolean</code> - Whether parameter is optional
- description <code>String</code> - Parameter description
- [type] <code>String</code> - Parameter type
- [default] <code>Any</code> - The default to be injected when not provided


* * *

<a name="Ret"></a>

## Ret : <code>Object</code>
**Kind**: global typedef  
**Params**

- description <code>String</code> - Return value description
- [type] <code>String</code> - Return value type


* * *

