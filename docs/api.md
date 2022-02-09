## Classes

<dl>
<dt><a href="#VrpcAdapter">VrpcAdapter</a></dt>
<dd><p>Generates an adapter layer for existing code and enables further VRPC-based
communication.</p>
</dd>
<dt><a href="#VrpcAgent">VrpcAgent</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Agent capable of making existing code available to remote control by clients.</p>
</dd>
<dt><a href="#VrpcClient">VrpcClient</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.</p>
</dd>
<dt><a href="#VrpcNative">VrpcNative</a></dt>
<dd><p>Client capable of creating proxy classes and objects to locally call
functions as provided through native addons.</p>
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
    * _instance_
        * ["create"](#VrpcAdapter+event_create)
        * ["delete"](#VrpcAdapter+event_delete)
    * _static_
        * [.addPluginPath(dirPath, [maxLevel])](#VrpcAdapter.addPluginPath)
        * [.register(code, [options])](#VrpcAdapter.register)
        * [.registerInstance(obj, options)](#VrpcAdapter.registerInstance)
        * [.create(options)](#VrpcAdapter.create) ⇒ <code>Object</code>
        * [.delete(instance)](#VrpcAdapter.delete) ⇒ <code>Boolean</code>
        * [.getInstance(instance)](#VrpcAdapter.getInstance) ⇒ <code>Object</code>
        * [.getAvailableClasses()](#VrpcAdapter.getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
        * [.getAvailableInstances(className)](#VrpcAdapter.getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>


* * *

<a name="VrpcAdapter+event_create"></a>

### "create"
Event 'create'

Emitted on creation of shared instance

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | The class name of the create instance |
| instance | <code>String</code> | The instance name |
| args | <code>Array.&lt;Any&gt;</code> | The constructor arguments |


* * *

<a name="VrpcAdapter+event_delete"></a>

### "delete"
Event 'delete'

Emitted on deletion of shared instance

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | The class name of the deleted instance |
| instance | <code>String</code> | The instance name |


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
    - .jsdocPath <code>String</code> - if provided, parses documentation and
provides it as meta information

NOTE: This function currently only supports registration of classes (either
when provided as object or when exported on the provided module path)


* * *

<a name="VrpcAdapter.registerInstance"></a>

### VrpcAdapter.registerInstance(obj, options)
Registers an existing instance and make it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- obj <code>Object</code> - The instance to be registered
- options <code>Object</code>
    - .className <code>String</code> - Class name of the instance
    - .instance <code>String</code> - Name of the instance
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers
functions that do not begin with an underscore
    - [.jsdocPath] <code>String</code> - if provided, parses documentation and
provides it as meta information


* * *

<a name="VrpcAdapter.create"></a>

### VrpcAdapter.create(options) ⇒ <code>Object</code>
Creates a new instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class which should be
instantiated
    - [.instance] <code>String</code> - Name of the created instance. If not
provided an id will be generated
    - [.args] <code>Array</code> - Positional arguments for the constructor call
    - [.isIsolated] <code>bool</code> <code> = false</code> - If true the created instance will
be visible only to the client who created it


* * *

<a name="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes an instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  
**Params**

- instance <code>String</code> | <code>Object</code> - Instance (name or object itself) to be deleted


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
        * ["clientGone"](#VrpcAgent+event_clientGone)
    * _static_
        * [.fromCommandline(defaults)](#VrpcAgent.fromCommandline) ⇒ <code>Agent</code>


* * *

<a name="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance

**Params**

- obj <code>Object</code>
    - [.username] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;pathId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - MQTT username
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token
    - [.domain] <code>String</code> <code> = &#x27;vrpc&#x27;</code> - The domain under which the agent-provided code is reachable
    - [.agent] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;pathId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - This agent's name
    - [.broker] <code>String</code> <code> = &#x27;mqtts://vrpc.io:8883&#x27;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>String</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline
    - [.version] <code>String</code> <code> = &#x27;&#x27;</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = new Agent({
  domain: 'vrpc'
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

<a name="VrpcAgent+event_clientGone"></a>

### "clientGone"
Event 'clientGone'

Emitted when a tracked VRPC client exited.

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
    - .version <code>String</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = VrpcAgent.fromCommandline()
```

* * *

<a name="VrpcClient"></a>

## VrpcClient ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcClient](#VrpcClient) ⇐ <code>EventEmitter</code>
    * [new VrpcClient(options)](#new_VrpcClient_new)
    * [.getClientId()](#VrpcClient+getClientId) ⇒ <code>String</code>
    * [.connect()](#VrpcClient+connect) ⇒ <code>Promise</code>
    * [.create(options)](#VrpcClient+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcClient+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcClient+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(options)](#VrpcClient+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(options)](#VrpcClient+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getSystemInformation()](#VrpcClient+getSystemInformation) ⇒ <code>Object</code>
    * [.getAvailableAgents([options])](#VrpcClient+getAvailableAgents) ⇒ <code>Array</code>
    * [.getAvailableClasses([options])](#VrpcClient+getAvailableClasses) ⇒ <code>Array</code>
    * [.getAvailableInstances([options])](#VrpcClient+getAvailableInstances) ⇒ <code>Array</code>
    * [.getAvailableMemberFunctions([options])](#VrpcClient+getAvailableMemberFunctions) ⇒ <code>Array</code>
    * [.getAvailableStaticFunctions([options])](#VrpcClient+getAvailableStaticFunctions) ⇒ <code>Array</code>
    * [.reconnectWithToken(token, [options])](#VrpcClient+reconnectWithToken) ⇒ <code>Promise</code>
    * [.unregisterAgent(agent)](#VrpcClient+unregisterAgent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.end()](#VrpcClient+end) ⇒ <code>Promise</code>
    * ["agent" (info)](#VrpcClient+event_agent)
    * ["class" (info)](#VrpcClient+event_class)
    * ["instanceNew" (addedInstances, info)](#VrpcClient+event_instanceNew)
    * ["instanceGone" (removedInstances, info)](#VrpcClient+event_instanceGone)
    * ["connect"](#VrpcClient+event_connect)
    * ["reconnect"](#VrpcClient+event_reconnect)
    * ["close"](#VrpcClient+event_close)
    * ["offline"](#VrpcClient+event_offline)
    * ["error"](#VrpcClient+event_error)
    * ["end"](#VrpcClient+event_end)


* * *

<a name="new_VrpcClient_new"></a>

### new VrpcClient(options)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.

**Params**

- options <code>Object</code>
    - [.username] <code>String</code> <code> = &#x27;&lt;user&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - MQTT username
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token
    - .domain <code>String</code> - Sets the domain
    - [.agent] <code>String</code> <code> = &quot;*&quot;</code> - Sets default agent
    - [.broker] <code>String</code> <code> = &quot;mqtts://vrpc.io:8883&quot;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.timeout] <code>Number</code> <code> = 6000</code> - Maximum time in ms to wait for a RPC answer
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = false</code> - If true, message will be sent with best effort, i.e. no caching if offline

**Example**  
```js
const client = new VrpcClient({
  domain: 'vrpc',
  broker: 'mqtt://vrpc.io'
})
```

* * *

<a name="VrpcClient+getClientId"></a>

### vrpcClient.getClientId() ⇒ <code>String</code>
Provides a unique id for this client instance

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>String</code> - clientId  

* * *

<a name="VrpcClient+connect"></a>

### vrpcClient.connect() ⇒ <code>Promise</code>
Actually connects to the MQTT broker.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
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

<a name="VrpcClient+create"></a>

### vrpcClient.create(options) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Creates a new remote instance and provides a proxy to it.

Remote instances can be "shared" or "isolated". Shared instances are
visible and re-attachable across clients as long as they are not
explicitly deleted. Life-cycle changes of shared instances are available
under the `class`, `instanceNew`, and `instanceGone` events. A shared
instance is created by default (`isIsolated: false`).

When the `isIsolated` option is true, the remote instance stays invisible
to other clients and the corresponding proxy object is the only way to
issue commands.

**NOTE** When creating an instance that already exists, the new proxy will
simply attach to (and not re-create) it - just like `getInstance()` was
called.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Object reflecting a proxy to the original object
which is handled by the agent  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class which should be
instantiated
    - [.instance] <code>String</code> - Name of the created instance. If not
provided an id will be generated
    - [.args] <code>Array</code> - Positional arguments for the constructor call
    - [.agent] <code>String</code> - Agent name. If not provided class default
is used
    - [.cacheProxy] <code>bool</code> <code> = false</code> - If true the proxy object for a
given instance is cached and (re-)used in subsequent calls
    - [.isIsolated] <code>bool</code> <code> = false</code> - If true the created proxy will be
visible only to the client who created it

**Example**  
```js
// create isolated instance
const proxy1 = await client.create({
  className: 'Foo',
  instance: 'myPersonalInstance',
  isIsolated: true
})
// create shared instance
const proxy2 = await client.create({
  className: 'Foo',
  instance: 'aSharedFooInstance'
})
// create shared instance providing three constructor arguments
const proxy3 = await client.create({
  className: 'Bar',
  instance: 'mySharedBarInstance',
  args: [42, "second argument", { some: 'option' }]
})
```

* * *

<a name="VrpcClient+getInstance"></a>

### vrpcClient.getInstance(instance, [options]) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Get a remotely existing instance.

Either provide a string only, then VRPC tries to find the instance using
client information, or additionally provide an object with explicit meta
data.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Proxy object reflecting the remotely existing instance  
**Params**

- instance <code>String</code> - The instance to be retrieved
- [options] <code>Object</code> - Explicitly define agent and class
    - [.className] <code>String</code> - Name of the instance's class
    - [.agent] <code>String</code> - Agent name. If not provided class default is used as priority hit
    - [.noWait] <code>bool</code> <code> = false</code> - If true immediately fail if instance could not be found in local cache


* * *

<a name="VrpcClient+delete"></a>

### vrpcClient.delete(instance, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Delete a remotely existing instance

Either provide a string only, then VRPC tries to find the instance using
client information, or provide an object with explicit meta data.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if successful, false otherwise  
**Params**

- instance <code>String</code> - The instance to be deleted
- [options] <code>Object</code> - Explicitly define agent and class
    - .className <code>String</code> - Name of the instance's class
    - .agent <code>String</code> - Agent name. If not provided class default is used as priority hit


* * *

<a name="VrpcClient+callStatic"></a>

### vrpcClient.callStatic(options) ⇒ <code>Promise.&lt;Any&gt;</code>
Calls a static function on a remote class

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Any&gt;</code> - Return value of the remotely called function  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - .functionName <code>String</code> - Name of the static function to be called
    - [.args] <code>Array</code> - Positional arguments of the static function call
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcClient+callAll"></a>

### vrpcClient.callAll(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result. It as well allows for batch event and callback
registrations. In this case the instanceId of the emitter is injected as
first argument of any event callback.

NOTE: When no agent was specified as class default and no agent is
specified when calling this function, callAll will act on the requested
class across all available agents. The same is true when explicitly using a
wildcard (*) as agent value.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects `{ id, val, err }`
carrying the instance id, the return value and potential errors  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the static function's class
    - [.args] <code>Array</code> - Positional arguments of the static function
call
    - [.agent] <code>String</code> - Agent name. If not provided class default
is used


* * *

<a name="VrpcClient+getSystemInformation"></a>

### vrpcClient.getSystemInformation() ⇒ <code>Object</code>
Retrieves all information about the currently available components.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
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

<a name="VrpcClient+getAvailableAgents"></a>

### vrpcClient.getAvailableAgents([options]) ⇒ <code>Array</code>
Retrieves all available agents.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of agent names.  
**Params**

- [options] <code>Object</code>
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online agents


* * *

<a name="VrpcClient+getAvailableClasses"></a>

### vrpcClient.getAvailableClasses([options]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of class names.  
**Params**

- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used.
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcClient+getAvailableInstances"></a>

### vrpcClient.getAvailableInstances([options]) ⇒ <code>Array</code>
Retrieves all (shared) instances on specific class and agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of instance names  
**Params**

- [options] <code>Object</code>
    - .className <code>String</code> - Class name
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcClient+getAvailableMemberFunctions"></a>

### vrpcClient.getAvailableMemberFunctions([options]) ⇒ <code>Array</code>
Retrieves all member functions of specific class and agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of member function names  
**Params**

- [options] <code>Object</code>
    - .className <code>String</code> - Class name
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcClient+getAvailableStaticFunctions"></a>

### vrpcClient.getAvailableStaticFunctions([options]) ⇒ <code>Array</code>
Retrieves all static functions of specific class and agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of static function names  
**Params**

- [options] <code>Object</code>
    - .className <code>String</code> - Class name
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a name="VrpcClient+reconnectWithToken"></a>

### vrpcClient.reconnectWithToken(token, [options]) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  
**Params**

- token <code>String</code> - Access token as generated by: https://app.vrpc.io
- [options] <code>Object</code>
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a name="VrpcClient+unregisterAgent"></a>

### vrpcClient.unregisterAgent(agent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Unregisters (= removal of persisted information) an offline agent

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Resolves to true in case of success, false otherwise  
**Params**

- agent - The agent to be unregistered


* * *

<a name="VrpcClient+end"></a>

### vrpcClient.end() ⇒ <code>Promise</code>
Ends the connection to the broker

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise</code> - Resolves when ended  

* * *

<a name="VrpcClient+event_agent"></a>

### "agent" (info)
Event 'agent'

This event is fired whenever an agent is added or removed, or whenever
an agent changes its status (switches between online or offline).

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .status <code>String</code> - Agent status, can be 'offline' or 'online'
    - .hostname <code>String</code> - Name of the host running the agent
    - .version <code>String</code> - User-defined version of the agent


* * *

<a name="VrpcClient+event_class"></a>

### "class" (info)
Event 'class'

Emitted whenever a class is added or removed, or when instances
or functions of this class have changed.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name
    - .instances <code>Array.&lt;String&gt;</code> - Array of instances
    - .memberFunctions <code>Array.&lt;String&gt;</code> - Array of member functions
    - .staticFunctions <code>Array.&lt;String&gt;</code> - Array of static functions
    - .meta [<code>MetaData</code>](#MetaData) - Object associating further information to functions


* * *

<a name="VrpcClient+event_instanceNew"></a>

### "instanceNew" (addedInstances, info)
Event 'instanceNew'

Emitted whenever a new instance was created.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- addedInstances <code>Array.&lt;String&gt;</code> - An array of newly added instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcClient+event_instanceGone"></a>

### "instanceGone" (removedInstances, info)
Event 'instanceGone'

Emitted whenever a new instance was removed.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- removedInstances <code>Array.&lt;String&gt;</code> - An array of removed instances
- info <code>Object</code>
    - .domain <code>String</code> - Domain name
    - .agent <code>String</code> - Agent name
    - .className <code>String</code> - Class name


* * *

<a name="VrpcClient+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a name="VrpcClient+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a name="VrpcClient+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a name="VrpcClient+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a name="VrpcClient+event_error"></a>

### "error"
Event 'error'

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs. The following TLS errors will be emitted as an error
event:

- ECONNREFUSED
- ECONNRESET
- EADDRINUSE
- ENOTFOUND

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a name="VrpcClient+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a name="VrpcNative"></a>

## VrpcNative
Client capable of creating proxy classes and objects to locally call
functions as provided through native addons.

**Kind**: global class  

* [VrpcNative](#VrpcNative)
    * [new VrpcNative(adapter)](#new_VrpcNative_new)
    * [.getClass(className)](#VrpcNative+getClass) ⇒
    * [.delete(proxy)](#VrpcNative+delete) ⇒
    * [.callStatic(className, functionName, ...args)](#VrpcNative+callStatic) ⇒
    * [.getAvailableClasses()](#VrpcNative+getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>


* * *

<a name="new_VrpcNative_new"></a>

### new VrpcNative(adapter)
Constructs a local caller object, able to communicate to natively added C++

**Params**

- adapter <code>Object</code> - An adapter object, typically loaded as native addon


* * *

<a name="VrpcNative+getClass"></a>

### vrpcNative.getClass(className) ⇒
Provides a proxy class to an existing one in the native addon

You can use the returned class in the usual way. Static function calls
are forwarded to the native addon, as are any instantiations and member
function calls.

**Kind**: instance method of [<code>VrpcNative</code>](#VrpcNative)  
**Returns**: Proxy Class  
**Params**

- className <code>String</code> - The name of the class


* * *

<a name="VrpcNative+delete"></a>

### vrpcNative.delete(proxy) ⇒
Deletes a proxy object and its underlying instance

**Kind**: instance method of [<code>VrpcNative</code>](#VrpcNative)  
**Returns**: True in case of success, false otherwise  
**Params**

- proxy <code>Object</code> - A proxy object


* * *

<a name="VrpcNative+callStatic"></a>

### vrpcNative.callStatic(className, functionName, ...args) ⇒
Secondary option to call a static function (when creation of a proxy class
seems to be too much overhead)

**Kind**: instance method of [<code>VrpcNative</code>](#VrpcNative)  
**Returns**: The output of the underlying static function  
**Params**

- className <code>String</code> - The class on which the static function should be called
- functionName <code>String</code> - Name of the static function
- ...args <code>any</code> - The function arguments


* * *

<a name="VrpcNative+getAvailableClasses"></a>

### vrpcNative.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: instance method of [<code>VrpcNative</code>](#VrpcNative)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

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

