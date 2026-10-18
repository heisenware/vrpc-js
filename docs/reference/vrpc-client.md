# VrpcClient

<!-- Generated from the JSDoc of vrpc/VrpcClient.js by `npm run build:doc`. Edit the source, not this file. -->

[API reference](README.md) · [Documentation](../README.md)

<a id="VrpcClient"></a>

## VrpcClient ⇐ <code>EventEmitter</code>
Client capable of creating proxy objects and remotely calling
functions as provided through one or more (distributed) agents.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcClient](#VrpcClient) ⇐ <code>EventEmitter</code>
    * [new VrpcClient(options)](#new_VrpcClient_new)
    * [.getClientId()](#VrpcClient+getClientId) ⇒ <code>String</code>
    * [.getConnectionId()](#VrpcClient+getConnectionId) ⇒ <code>String</code>
    * [.connect([options])](#VrpcClient+connect) ⇒ <code>Promise</code>
    * [.updateCredentials(credentials)](#VrpcClient+updateCredentials)
    * [.create(options)](#VrpcClient+create) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.getInstance(instance, [options])](#VrpcClient+getInstance) ⇒ <code>Promise.&lt;Proxy&gt;</code>
    * [.delete(instance, [options])](#VrpcClient+delete) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.callStatic(options)](#VrpcClient+callStatic) ⇒ <code>Promise.&lt;Any&gt;</code>
    * [.callAll(options)](#VrpcClient+callAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.unsubscribe(target, [options])](#VrpcClient+unsubscribe) ⇒ <code>Promise.&lt;Boolean&gt;</code>
    * [.getSubscriptions([filter])](#VrpcClient+getSubscriptions) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.setSubscriberLabel(callback, label)](#VrpcClient+setSubscriberLabel)
    * [.getRegistrations(options)](#VrpcClient+getRegistrations) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.endRegistration(options)](#VrpcClient+endRegistration) ⇒ <code>Promise.&lt;Boolean&gt;</code>
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
    * ["ended" (id, reason, by, info)](#VrpcClient+event_ended)
    * ["undelivered" (id, error, info)](#VrpcClient+event_undelivered)
    * ["lost" (id, reason, info)](#VrpcClient+event_lost)
    * ["healed" (id, info)](#VrpcClient+event_healed)
    * ["connect"](#VrpcClient+event_connect)
    * ["reconnect"](#VrpcClient+event_reconnect)
    * ["close"](#VrpcClient+event_close)
    * ["offline"](#VrpcClient+event_offline)
    * ["error"](#VrpcClient+event_error)
    * ["end"](#VrpcClient+event_end)


* * *

<a id="new_VrpcClient_new"></a>

### new VrpcClient(options)
Constructs a remote client, able to communicate with any distributed agents

NOTE: Each instance creates its own physical connection to the broker.

**Params**

- options <code>Object</code>
    - [.username] <code>String</code> - MQTT username
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token
    - .domain <code>String</code> - Sets the domain
    - [.agent] <code>String</code> <code> = &quot;*&quot;</code> - Sets default agent
    - [.broker] <code>String</code> <code> = &quot;mqtts://broker.hivemq.com:8883&quot;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.timeout] <code>Number</code> <code> = 12000</code> - Maximum time in ms to wait for a RPC answer
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = true</code> - If true, message will be sent with best effort, i.e. no caching if offline
    - [.mqttClientId] <code>String</code> <code> = &#x27;&lt;generated()&gt;&#x27;</code> - Explicitly sets the mqtt client id
    - [.identity] <code>String</code> - Explicitly sets a vrpc client identity
    - [.keepalive] <code>String</code> - Sets the MQTT keepalive interval (in seconds). In browsers the ping runs on a Web Worker timer, so a hidden tab keeps its session
    - [.requiresSchema] <code>Boolean</code> <code> = false</code> - If true, any available schema information is shipped
    - [.nosideeffects] <code>Boolean</code> <code> = false</code> - If true, the client only observes: it sends no request for a function the class info does not declare free of side effects (protocol, section 16.3) - such a call, a `callAll` and an `unregisterAgent` reject at once, before anything reaches the broker. Implies `requiresSchema`
    - [.tls] <code>Object</code> - TLS settings for a secure broker: `{ ca, rejectUnauthorized }`. Without it the broker's certificate is not verified (the historical behaviour); with `ca` the broker must present a chain the given certificates anchor.

**Example**  
```js
const client = new VrpcClient({
  domain: 'vrpc',
  broker: 'mqtts://broker.hivemq.com:8883'
})
```

* * *

<a id="VrpcClient+getClientId"></a>

### vrpcClient.getClientId() ⇒ <code>String</code>
Provides the identity-derived id of this client

Every client constructed with the same domain, host and identity
reports the same client id: it names the principal, not the
connection. Agents receive it as `clientId` in the presence messages
and can group the connections (e.g. browser tabs) of one identity by
it. See getConnectionId() for the id that is unique per instance.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>String</code> - clientId  

* * *

<a id="VrpcClient+getConnectionId"></a>

### vrpcClient.getConnectionId() ⇒ <code>String</code>
Provides the unique id of this connection

Unique per VrpcClient instance: two clients sharing one identity still
have distinct connection ids. Agents key all their bookkeeping by it
(response routing, event listeners, isolated instances, presence), so
one connection ending never disturbs the others of the same identity.

It reads `<domain>/<mqttClientId>/<secret>`: the mqtt client id is
what the broker knows this connection by, so a broker can confine the
client to its own topics, and the secret is random per connection, so
nobody who cannot read those topics can impersonate the connection
towards an agent. Treat it as a credential: do not log or share it.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>String</code> - connectionId  

* * *

<a id="VrpcClient+connect"></a>

### vrpcClient.connect([options]) ⇒ <code>Promise</code>
Actually connects to the MQTT broker.

A refused connection is retried with a growing wait (doubling up to
30 s, back to the start once connected), and every refusal is emitted
as 'error', so a caller can renew its credentials (see
updateCredentials).

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise</code> - Resolves once connected within [timeout], rejects otherwise  
**Emits**: <code>event:connected</code>  
**Params**

- [options] <code>Object</code>
    - [.keepTrying] <code>Boolean</code> <code> = false</code> - If true, a connection that
is not made within [timeout] still rejects the returned promise, but
keeps trying until end() and emits 'connect' once it stands, and a
further connect({ keepTrying: true }) while it is trying waits for it
instead of opening a second connection. If false (the default), nothing
changes: the client gives up at the timeout and must be connected again.

**Example**  
```js
try {
  await client.connect()
} catch (err) {
  console.error(`Could not connect because: ${err.message}`)
}
```

* * *

<a id="VrpcClient+updateCredentials"></a>

### vrpcClient.updateCredentials(credentials)
Replaces the credentials the connection logs in with

The broker checks credentials when a connection is made: a live
connection carries on undisturbed, and the next one - after a network
loss, a broker restart - logs in with these. A connection that is
being refused right now tries again with them within a second,
instead of waiting out its back-off.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- credentials <code>Object</code> - Only the given fields change
    - [.username] <code>String</code> - MQTT username
    - [.password] <code>String</code> - MQTT password (if no token is used)
    - [.token] <code>String</code> - Access token


* * *

<a id="VrpcClient+create"></a>

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

<a id="VrpcClient+getInstance"></a>

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

<a id="VrpcClient+delete"></a>

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

<a id="VrpcClient+callStatic"></a>

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

<a id="VrpcClient+callAll"></a>

### vrpcClient.callAll(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Calls the same function on all instances of a given class and returns an
aggregated result. It as well allows for batch event and callback
registrations. In this case the instanceId of the emitter is injected as
first argument of any event callback.

`instances` selects the instances: a name pattern (`line-*`, where `*`
matches any run of characters) or a list of names and patterns. The
agent calls the selected ones only and answers for those - one request,
however many instances. An agent that does not select instances
(before protocol 4) gets one call per selected instance instead; a
subscription cannot be split like that and is refused there.

`agent` may name several agents as well: a pattern (`edge-*`, `*` by
default) asks every online agent that offers the class and matches, a
list asks each agent listed. They are asked all at once, and every
entry names its agent; an agent that fails as a whole answers an error
for each of its instances the client knows - or one entry with the
error alone when it knows none - and the other agents' answers stand.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - An array of objects `{ id, val }` or
`{ id, err }` carrying the instance id and its return value or error,
and `agent` when the call addressed several agents  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Name of the class
    - .functionName <code>String</code> - Name of the member function
    - [.args] <code>Array</code> - Positional arguments of the call
    - [.agent] <code>String</code> | <code>Array.&lt;String&gt;</code> - Agent name, pattern or
list of names. If not provided class default is used
    - [.instances] <code>String</code> | <code>Array.&lt;String&gt;</code> - The instances to call:
a name pattern, or a list of names and patterns (all if not provided)


* * *

<a id="VrpcClient+unsubscribe"></a>

### vrpcClient.unsubscribe(target, [options]) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Withdraws subscriptions.

A subscription is what an event function call (or `on`) declared with a
callback: one per target, function, arguments and callback, named by
its subscription id (see getSubscriptions). Withdrawing it stops its events at once, and
every agent holding it is told by id - however it was declared (a proxy,
callStatic, callAll on one agent or on all of them). The agent releases
the registration when the last subscription leaves.

With `instance`, only what is held on that instance is withdrawn: a
subscription declared there ends, and a callAll subscription - one id
on every instance of its class - stops at that instance alone while
the others keep delivering. The client remembers such a withdrawal and
applies it again after its own reconnect, until the subscription is
declared anew (a declaration names what is wanted now).

Agents before protocol 4 cannot withdraw by id: an `on` subscription is
removed there as before (removeListener), an `on<Name>` one through its
`off<Name>` twin when the class has one; anything else ends locally
(a callAll subscription withdrawn at one instance stops delivering its
events there).

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - true if anything was withdrawn  
**Params**

- target <code>String</code> | <code>Array.&lt;String&gt;</code> | <code>function</code> | <code>Object</code> - A subscription id
(or several), a callback (all its subscriptions), or an
`{ emitter, event }` contract (all of its subscriptions)
- [options] <code>Object</code>
    - [.instance] <code>String</code> - Withdraw at this instance only


* * *

<a id="VrpcClient+getSubscriptions"></a>

### vrpcClient.getSubscriptions([filter]) ⇒ <code>Array.&lt;Object&gt;</code>
Lists the subscriptions this client holds.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array.&lt;Object&gt;</code> - `{ id, agent, className, instance,
functionName, event, callAll, confirmed, lost }` per subscription;
`confirmed` once a protocol-4 agent answered that it holds it, `lost`
while its agent is offline (it is declared again once the agent is back)  
**Params**

- [filter] <code>Object</code>
    - [.callback] <code>function</code> | <code>Object</code> - Only the subscriptions of this
callback, or of this `{ emitter, event }` contract


* * *

<a id="VrpcClient+setSubscriberLabel"></a>

### vrpcClient.setSubscriberLabel(callback, label)
Gives the subscriptions of a callback a label, which agents list with
their registrations (`__registrations__`), e.g. who listens.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- callback <code>function</code> | <code>Object</code> - The callback, or an `{ emitter, event }`
contract (labelled before or after it subscribes)
- label <code>String</code> - The label (sent with every declaration)


* * *

<a id="VrpcClient+getRegistrations"></a>

### vrpcClient.getRegistrations(options) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Lists the registrations of an instance (or, without an instance, the
static ones of a class): function, arguments, subscriptions with their
labels, events and events per second. Needs a protocol-4 agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - The registrations  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Class name
    - [.instance] <code>String</code> - Instance name
    - [.agent] <code>String</code> - Agent name. If not provided class default is used


* * *

<a id="VrpcClient+endRegistration"></a>

### vrpcClient.endRegistration(options) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Ends a registration for all its subscriptions; each subscriber learns
that it ended and by whom ('ended' event). Needs a protocol-4 agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Whether such a registration existed  
**Params**

- options <code>Object</code>
    - .className <code>String</code> - Class name
    - [.instance] <code>String</code> - Instance name (static registration without)
    - [.agent] <code>String</code> - Agent name. If not provided class default is used
    - .functionName <code>String</code> - The event function
    - [.args] <code>Array</code> - Its arguments without the handlers, as listed
    - [.by] <code>String</code> - Who ends it, told to every subscriber


* * *

<a id="VrpcClient+getSystemInformation"></a>

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

<a id="VrpcClient+getAvailableAgents"></a>

### vrpcClient.getAvailableAgents([options]) ⇒ <code>Array</code>
Retrieves all available agents.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of agent names.  
**Params**

- [options] <code>Object</code>
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online agents


* * *

<a id="VrpcClient+getAvailableClasses"></a>

### vrpcClient.getAvailableClasses([options]) ⇒ <code>Array</code>
Retrieves all available classes on specific agent.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Array</code> - Array of class names.  
**Params**

- [options] <code>Object</code>
    - [.agent] <code>String</code> - Agent name. If not provided class default is used.
    - [.mustBeOnline] <code>Boolean</code> <code> = true</code> - Only retrieve currently online classes


* * *

<a id="VrpcClient+getAvailableInstances"></a>

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

<a id="VrpcClient+getAvailableMemberFunctions"></a>

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

<a id="VrpcClient+getAvailableStaticFunctions"></a>

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

<a id="VrpcClient+reconnectWithToken"></a>

### vrpcClient.reconnectWithToken(token, [options]) ⇒ <code>Promise</code>
Reconnects to the broker by using a different token

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise</code> - Promise that resolves once re-connected  
**Params**

- token <code>String</code> - Access token
- [options] <code>Object</code>
    - .agent <code>String</code> - Agent name. If not provided class default is used


* * *

<a id="VrpcClient+unregisterAgent"></a>

### vrpcClient.unregisterAgent(agent) ⇒ <code>Promise.&lt;Boolean&gt;</code>
Unregisters (= removal of persisted information) an offline agent. A
client that only observes (`nosideeffects`) may not.

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise.&lt;Boolean&gt;</code> - Resolves to true in case of success, false otherwise  
**Params**

- agent - The agent to be unregistered


* * *

<a id="VrpcClient+end"></a>

### vrpcClient.end() ⇒ <code>Promise</code>
Ends the connection to the broker

**Kind**: instance method of [<code>VrpcClient</code>](#VrpcClient)  
**Returns**: <code>Promise</code> - Resolves when ended  

* * *

<a id="VrpcClient+event_agent"></a>

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

<a id="VrpcClient+event_class"></a>

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
    - .meta <code>MetaData</code> - Object associating further information to functions


* * *

<a id="VrpcClient+event_instanceNew"></a>

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

<a id="VrpcClient+event_instanceGone"></a>

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

<a id="VrpcClient+event_ended"></a>

### "ended" (id, reason, by, info)
Event 'ended'

Emitted when a registration a subscription held ended for a reason the
subscriber did not cause: its source ended it, or a member did
(`endRegistration`). The subscription is gone; it never reaches the
callback. A callAll subscription lives on at its other instances.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- id <code>String</code> - The subscription id
- reason <code>String</code> - Why it ended (an error message when it failed)
- by <code>String</code> | <code>null</code> - Who ended it (`'source'`, or what the member said)
- info <code>Object</code> - The subscription (agent, className, instance,
functionName, event, callAll), `context` (the instance or class) and
`failed`


* * *

<a id="VrpcClient+event_undelivered"></a>

### "undelivered" (id, error, info)
Event 'undelivered'

Emitted instead of an event, or a one-shot callback, whose arguments the
agent could not encode as JSON (a BigInt, say). The callback is not
called for it; a subscription stays and receives the next event. Agents
before protocol 4 drop such events without telling.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- id <code>String</code> - The subscription id, or the one-shot callback's id
- error <code>Object</code> - What the agent says, `{ message }`
- info <code>Object</code> - The subscription (agent, className, instance,
functionName, event, callAll), or for a one-shot callback its agent,
className, instance and functionName


* * *

<a id="VrpcClient+event_lost"></a>

### "lost" (id, reason, info)
Event 'lost'

Emitted when a subscription is lost: its agent went offline
(`'agentOffline'`), its instance went away (`'instanceGone'`), or a
declaration again failed (the error's message). A subscription on an agent
of protocol 4 that went offline is declared again once the agent is back
('healed'); every other lost subscription is gone, and declaring it again
is the consumer's.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- id <code>String</code> - The subscription id
- reason <code>String</code> - `'agentOffline'`, `'instanceGone'` or an error message
- info <code>Object</code> - The subscription (agent, className, instance,
functionName, event, callAll)


* * *

<a id="VrpcClient+event_healed"></a>

### "healed" (id, info)
Event 'healed'

Emitted when a subscription lost with its agent is back: the agent serves
again and holds it.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Params**

- id <code>String</code> - The subscription id
- info <code>Object</code> - The subscription (agent, className, instance,
functionName, event, callAll)


* * *

<a id="VrpcClient+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a id="VrpcClient+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a id="VrpcClient+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a id="VrpcClient+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

<a id="VrpcClient+event_error"></a>

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

<a id="VrpcClient+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcClient</code>](#VrpcClient)  

* * *

