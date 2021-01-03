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
<dt><a href="#MetaData">MetaData</a> : <code>Object</code></dt>
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

| Param | Type | Description |
| --- | --- | --- |
| dirPath | <code>String</code> | Relative path to start the auto-registration from |
| [maxLevel] | <code>Number</code> | Maximum search depth (default: unlimited) |


* * *

<a name="VrpcAdapter.register"></a>

### VrpcAdapter.register(code, [options])
Registers existing code and makes it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| code | <code>Object</code> \| <code>string</code> |  | Existing code to be registered, can be a class or function object or a relative path to a module |
| [options] | <code>Object</code> |  |  |
| [options.onlyPublic] | <code>Boolean</code> | <code>true</code> | If true, only registers functions that do not begin with an underscore |
| [options.withNew] | <code>Boolean</code> | <code>true</code> | If true, class will be constructed using the `new` operator |
| [options.schema] | <code>Object</code> | <code></code> | If provided is used to validate ctor parameters (only works if registered code reflects a single class) |
| options.jsdocPath | <code>Boolean</code> |  | if provided, parses documentation and provides it as meta information (if the code parameter reflects a path this is automatically taken as default) NOTE: This function currently only supports registration of classes (either when provided as object or when exported on the provided module path) |


* * *

<a name="VrpcAdapter.create"></a>

### VrpcAdapter.create(className, ...args) ⇒ <code>Object</code>
Creates an un-managed, anonymous instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of the class to create an instance of |
| ...args | <code>any</code> | Arguments to provide to the constructor |


* * *

<a name="VrpcAdapter.createNamed"></a>

### VrpcAdapter.createNamed(className, instance, ...args) ⇒ <code>Object</code>
Creates a managed named instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of the class to create an instance of |
| instance | <code>String</code> | Name of the instance |
| ...args | <code>any</code> | Arguments to provide to the constructor |


* * *

<a name="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes a managed instance

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>String</code> | Name of the instance to be deleted |


* * *

<a name="VrpcAdapter.getInstance"></a>

### VrpcAdapter.getInstance(instance) ⇒ <code>Object</code>
Retrieves an existing instance by name

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>String</code> | Name of the instance to be acquired |


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

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to retrieve the instances for |


* * *

<a name="VrpcAdapter.getAvailableMemberFunctions"></a>

### VrpcAdapter.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to provide member functions for |


* * *

<a name="VrpcAdapter.getAvailableStaticFunctions"></a>

### VrpcAdapter.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to provide static functions for |


* * *

<a name="VrpcAdapter.getAvailableMetaData"></a>

### VrpcAdapter.getAvailableMetaData(className) ⇒ [<code>MetaData</code>](#MetaData)
Provides all available meta data of the registered class.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: [<code>MetaData</code>](#MetaData) - Meta Data  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to provide meta data for |


* * *

<a name="VrpcAgent"></a>

## VrpcAgent ⇐ <code>EventEmitter</code>
Agent capable of making existing code available to remote control by clients.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcAgent](#VrpcAgent) ⇐ <code>EventEmitter</code>
    * [new VrpcAgent(obj)](#new_VrpcAgent_new)
    * _instance_
        * [.serve()](#VrpcAgent+serve)
        * [.end([obj], [unregister])](#VrpcAgent+end) ⇒ <code>Promise</code>
    * _static_
        * [.fromCommandline(defaults)](#VrpcAgent.fromCommandline) ⇒ <code>Agent</code>


* * *

<a name="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| obj | <code>Object</code> |  |  |
| obj.domain | <code>String</code> |  | The domain under which the agent-provided code is reachable |
| obj.agent | <code>String</code> |  | This agent's name |
| obj.username | <code>String</code> |  | MQTT username (if no token is used) |
| obj.password | <code>String</code> |  | MQTT password (if no token is provided) |
| obj.token | <code>String</code> |  | Access token as generated by: https://app.vrpc.io |
| [obj.broker] | <code>String</code> | <code>&quot;mqtts://vrpc.io:8883&quot;</code> | Broker url in form: <scheme>://<host>:<port> |
| [obj.log] | <code>Object</code> | <code>console</code> | Log object (must support debug, info, warn, and error level) |
| [obj.bestEffort] | <code>String</code> | <code>false</code> | If true, message will be sent with best effort, i.e. no caching if offline |
| obj.version | <code>String</code> |  | The (custom) version of this agent |

**Example**  
```js
const agent = new Agent({
  domain: 'public.vrpc'
  agent: 'myAgent'
})
```

* * *

<a name="VrpcAgent+serve"></a>

### vrpcAgent.serve()
Starts the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a name="VrpcAgent+end"></a>

### vrpcAgent.end([obj], [unregister]) ⇒ <code>Promise</code>
Stops the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [obj] | <code>Object</code> |  |  |
| [unregister] | <code>Boolean</code> | <code>false</code> | If true, fully un-registers agent from broker |


* * *

<a name="VrpcAgent.fromCommandline"></a>

### VrpcAgent.fromCommandline(defaults) ⇒ <code>Agent</code>
Constructs an agent by parsing command line arguments

**Kind**: static method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Agent</code> - Agent instance  

| Param | Type | Description |
| --- | --- | --- |
| defaults | <code>Object</code> | Allows to specify defaults for the various command line options |
| defaults.domain | <code>String</code> | The domain under which the agent-provided code is reachable |
| defaults.agent | <code>String</code> | This agent's name |
| defaults.username | <code>String</code> | MQTT username (if no token is used) |
| defaults.password | <code>String</code> | MQTT password (if no token is provided) |
| defaults.token | <code>String</code> | Access token as generated by: https://app.vrpc.io |
| defaults.broker | <code>String</code> | Broker url in form: <scheme>://<host>:<port> |
| defaults.version | <code>String</code> | The (custom) version of this agent |

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

| Param | Type | Description |
| --- | --- | --- |
| adapter | <code>Object</code> | An adapter object, typically loaded as native addon |


* * *

<a name="VrpcLocal+create"></a>

### vrpcLocal.create(className, ...args) ⇒ <code>Object</code>
Creates an instance of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Object</code> - Proxy to the created instance  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of the class to create an instance of |
| ...args | <code>Any</code> | Arguments to provide to the constructor |


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

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to retrieve the instances for |


* * *

<a name="VrpcLocal+getAvailableMemberFunctions"></a>

### vrpcLocal.getAvailableMemberFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available member functions of the specified class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of member function names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to provide member functions for |


* * *

<a name="VrpcLocal+getAvailableStaticFunctions"></a>

### vrpcLocal.getAvailableStaticFunctions(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides all available static functions of a registered class.

**Kind**: instance method of [<code>VrpcLocal</code>](#VrpcLocal)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of static function names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Name of class to provide static functions for |


* * *

<a name="VrpcRemote"></a>

## VrpcRemote ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcRemote](#VrpcRemote) ⇐ <code>EventEmitter</code>
    * [new VrpcRemote(obj)](#new_VrpcRemote_new)
    * [.connect()](#VrpcRemote+connect) ⇒ <code>Promise</code>
    * [.create(obj)](#VrpcRemote+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcRemote+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcRemote+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(obj)](#VrpcRemote+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(obj)](#VrpcRemote+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getAvailabilities()](#VrpcRemote+getAvailabilities) ⇒ <code>Object</code>
    * [.getAvailableDomains()](#VrpcRemote+getAvailableDomains) ⇒ <code>Array</code>
    * [.getAvailableAgents([domain])](#VrpcRemote+getAvailableAgents) ⇒ <code>Array</code>
    * [.getAvailableClasses([agent], [domain])](#VrpcRemote+getAvailableClasses) ⇒ <code>Array</code>
    * [.getAvailableInstances(className, [agent], [domain])](#VrpcRemote+getAvailableInstances) ⇒ <code>Array</code>
    * [.getAvailableMemberFunctions(className, [agent], [domain])](#VrpcRemote+getAvailableMemberFunctions) ⇒ <code>Array</code>
    * [.getAvailableStaticFunctions(className, [agent], [domain])](#VrpcRemote+getAvailableStaticFunctions) ⇒ <code>Array</code>
    * [.reconnectWithToken(token, [options], options,domain)](#VrpcRemote+reconnectWithToken) ⇒ <code>Promise</code>
    * [.end()](#VrpcRemote+end) ⇒ <code>Promise</code>
    * ["agent" (info)](#VrpcRemote+event_agent)
    * ["class" (info)](#VrpcRemote+event_class)
    * ["instanceNew" (addedInstances, info)](#VrpcRemote+event_instanceNew)
    * ["instanceGone" (removedInstances, info)](#VrpcRemote+event_instanceGone)
    * ["class"](#VrpcRemote+event_class)
    * ["reconnect"](#VrpcRemote+event_reconnect)
    * ["close"](#VrpcRemote+event_close)
    * ["offline"](#VrpcRemote+event_offline)
    * ["error"](#VrpcRemote+event_error)
    * ["end"](#VrpcRemote+event_end)


* * *

<a name="new_VrpcRemote_new"></a>

### new VrpcRemote(obj)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| obj | <code>Object</code> |  |  |
| obj.token | <code>String</code> |  | Access token as generated by: https://app.vrpc.io |
| obj.username | <code>String</code> |  | MQTT username (if no token is used) |
| obj.password | <code>String</code> |  | MQTT password (if no token is provided) |
| [obj.domain] | <code>String</code> | <code>&quot;*&quot;</code> | Sets default domain |
| [obj.agent] | <code>String</code> | <code>&quot;*&quot;</code> | Sets default agent |
| [obj.broker] | <code>String</code> | <code>&quot;mqtts://vrpc.io:8883&quot;</code> | Broker url in form: \<scheme\>://\<host\>:\<port\> |
| [obj.timeout] | <code>Number</code> | <code>6000</code> | Maximum time in ms to wait for a RPC answer |
| [obj.log] | <code>Object</code> | <code>console</code> | Log object (must support debug, info, warn, and error level) |
| [obj.bestEffort] | <code>String</code> | <code>false</code> | If true, message will be sent with best effort, i.e. no caching if offline |


* * *

<a name="VrpcRemote+connect"></a>

### vrpcRemote.connect() ⇒ <code>Promise</code>
Actually connects to the MQTT broker

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Resolves promise when connected  

* * *

<a name="VrpcRemote+create"></a>

### vrpcRemote.create(obj) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Creates a new remote instance.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Object reflecting a proxy to the original one handled by the agent  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> |  |
| obj.className | <code>String</code> | Name of the class which should be instantiated |
| [obj.instance] | <code>String</code> | Name of the created instance. If not provided an (invisible) id will be generated |
| [obj.args] | <code>Array</code> | Positional arguments for the constructor call |
| [obj.agent] | <code>String</code> | Agent name. If not provided class default is used |
| [obj.domain] | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+getInstance"></a>

### vrpcRemote.getInstance(instance, [options]) ⇒ <code>Promise.&lt;Proxy&gt;</code>
Get a remotely existing instance.

Either provide a string only, then VRPC tries to find the instance using
client information, or additionally provide an object with explicit meta
data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Proxy&gt;</code> - Proxy object reflecting the remotely existing instance  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>String</code> | The instance to be retrieved |
| [options] | <code>Object</code> | Explicitly define domain, agent and class |
| options.className | <code>String</code> | Name of the instance's class |
| options.agent | <code>String</code> | Agent name. If not provided class default is used |
| options.domain | <code>String</code> | Domain name. If not provided class default is used |
| options.noWait | <code>bool</code> | If true immediately fail if instance could not be found in local cache |


* * *

<a name="VrpcRemote+delete"></a>

### vrpcRemote.delete(instance, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Delete a remotely existing instance

Either provide a string only, then VRPC tries to find the instance using
client information, or provide an object with explicit meta data.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if successful, false otherwise  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>String</code> | The instance to be deleted |
| [options] | <code>Object</code> | Explicitly define domain, agent and class |
| options.className | <code>String</code> | Name of the instance's class |
| options.agent | <code>String</code> | Agent name. If not provided class default is used |
| options.domain | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+callStatic"></a>

### vrpcRemote.callStatic(obj) ⇒ <code>Promise.&lt;Any&gt;</code>
Calls a static function on a remote class

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Any&gt;</code> - Return value of the remotely called function  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> |  |
| obj.className | <code>String</code> | Name of the static function's class |
| obj.functionName | <code>String</code> | Name of the static function to be called |
| [obj.args] | <code>Array</code> | Positional arguments of the static function call |
| [obj.agent] | <code>String</code> | Agent name. If not provided class default is used |
| [obj.domain] | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+callAll"></a>

### vrpcRemote.callAll(obj) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects { id, val, err } carrying the instance id, the return value and potential errors  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> |  |
| obj.className | <code>String</code> | Name of the static function's class |
| [obj.args] | <code>Array</code> | Positional arguments of the static function call |
| [obj.agent] | <code>String</code> | Agent name. If not provided class default is used |
| [obj.domain] | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+getAvailabilities"></a>

### vrpcRemote.getAvailabilities() ⇒ <code>Object</code>
Retrieves all domains, agents, instances, classes, member and static
functions potentially available for remote control.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Object</code> - Object with structure:
<domain>.agents.<agent>.classes.<className>.instances: []
<domain>.agents.<agent>.classes.<className>.memberFunctions: []
<domain>.agents.<agent>.classes.<className>.staticFunctions: []
<domain>.agents.<agent>.status: 'offline'|'online'
<domain>.agents.<agent>.hostname: <hostname>  

* * *

<a name="VrpcRemote+getAvailableDomains"></a>

### vrpcRemote.getAvailableDomains() ⇒ <code>Array</code>
Retrieves all domains on which agents can be remote controlled

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of domain names  

* * *

<a name="VrpcRemote+getAvailableAgents"></a>

### vrpcRemote.getAvailableAgents([domain]) ⇒ <code>Array</code>
Retrieves all available agents on specific domain.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of agent names.  

| Param | Type | Description |
| --- | --- | --- |
| [domain] | <code>String</code> | Domain name. If not provided class default is used. |


* * *

<a name="VrpcRemote+getAvailableClasses"></a>

### vrpcRemote.getAvailableClasses([agent], [domain]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent and domain.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of class names.  

| Param | Type | Description |
| --- | --- | --- |
| [agent] | <code>String</code> | Agent name. If not provided class default is used. |
| [domain] | <code>String</code> | Domain name. If not provided class default is used. |


* * *

<a name="VrpcRemote+getAvailableInstances"></a>

### vrpcRemote.getAvailableInstances(className, [agent], [domain]) ⇒ <code>Array</code>
Retrieves all (named) instances on specific class, agent and domain.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of instance names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Class name |
| [agent] | <code>String</code> | Agent name. If not provided class default is used |
| [domain] | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+getAvailableMemberFunctions"></a>

### vrpcRemote.getAvailableMemberFunctions(className, [agent], [domain]) ⇒ <code>Array</code>
Retrieves all member functions of specific class, agent and domain.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of member function names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Class name |
| [agent] | <code>String</code> | Agent name. If not provided class default is used |
| [domain] | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+getAvailableStaticFunctions"></a>

### vrpcRemote.getAvailableStaticFunctions(className, [agent], [domain]) ⇒ <code>Array</code>
Retrieves all static functions of specific class, agent and domain.

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Array</code> - Array of static function names  

| Param | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | Class name |
| [agent] | <code>String</code> | Agent name. If not provided class default is used |
| [domain] | <code>String</code> | Domain name. If not provided class default is used |


* * *

<a name="VrpcRemote+reconnectWithToken"></a>

### vrpcRemote.reconnectWithToken(token, [options], options,domain) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcRemote</code>](#VrpcRemote)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>String</code> | Access token as generated by: https://app.vrpc.io |
| [options] | <code>Object</code> |  |
| options.agent | <code>String</code> | Agent name. If not provided class default is used |
| options,domain | <code>String</code> | Domain name. If not provided class default is used |


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

| Param | Type | Description |
| --- | --- | --- |
| info | <code>Object</code> |  |
| info.domain | <code>String</code> | Domain name |
| info.agent | <code>String</code> | Agent name |
| info.status | <code>String</code> | Agent status, can be 'offline' or 'online' |
| info.hostname | <code>String</code> | Name of the host running the agent |
| info.version | <code>String</code> | User-defined version of the agent |


* * *

<a name="VrpcRemote+event_class"></a>

### "class" (info)
Event 'class'

Emitted whenever a class is added or removed, or when instances
or functions of this class have changed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

| Param | Type | Description |
| --- | --- | --- |
| info | <code>Object</code> |  |
| info.domain | <code>String</code> | Domain name |
| info.agent | <code>String</code> | Agent name |
| info.className | <code>String</code> | Class name |
| info.instances | <code>Array.&lt;String&gt;</code> | Array of named instances |
| info.memberFunctions | <code>Array.&lt;String&gt;</code> | Array of member functions |
| info.staticFunctions | <code>Array.&lt;String&gt;</code> | Array of static functions |
| info.meta | [<code>MetaData</code>](#MetaData) | Object associating further information to functions |


* * *

<a name="VrpcRemote+event_instanceNew"></a>

### "instanceNew" (addedInstances, info)
Event 'instanceNew'

Emitted whenever a new instance was created.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

| Param | Type | Description |
| --- | --- | --- |
| addedInstances | <code>Array.&lt;String&gt;</code> | An array of newly added instances |
| info | <code>Object</code> |  |
| info.domain | <code>String</code> | Domain name |
| info.agent | <code>String</code> | Agent name |
| info.className | <code>String</code> | Class name |


* * *

<a name="VrpcRemote+event_instanceGone"></a>

### "instanceGone" (removedInstances, info)
Event 'instanceGone'

Emitted whenever a new instance was removed.

**Kind**: event emitted by [<code>VrpcRemote</code>](#VrpcRemote)  

| Param | Type | Description |
| --- | --- | --- |
| removedInstances | <code>Array.&lt;String&gt;</code> | An array of removed instances |
| info | <code>Object</code> |  |
| info.domain | <code>String</code> | Domain name |
| info.agent | <code>String</code> | Agent name |
| info.className | <code>String</code> | Class name |


* * *

<a name="VrpcRemote+event_class"></a>

### "class"
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

## MetaData : <code>Object</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| MetaData.[function].description | <code>String</code> | Function description |
| MetaData.[function].params | <code>Object</code> | Object associating further information to parameters |
| MetaData.[function].ret | <code>Object</code> | Object associating further information to return value |
| MetaData.[function].params.[parameter].name | <code>String</code> | Parameter name |
| MetaData.[function].params.[parameter].description | <code>String</code> | Parameter description |
| MetaData.[function].params.[parameter].type | <code>String</code> | Parameter type |
| MetaData.[function].params.[parameter].optional | <code>Boolean</code> | Whether parameter is optional |
| MetaData.[function].ret.description | <code>String</code> | Return value description |
| MetaData.[function].ret.type | <code>String</code> | Return value type |


* * *

