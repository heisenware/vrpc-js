# VrpcAgent

<!-- Generated from the JSDoc of vrpc/VrpcAgent.js by `npm run build:doc`. Edit the source, not this file. -->

[API reference](README.md) · [Documentation](../README.md)

<a id="VrpcAgent"></a>

## VrpcAgent ⇐ <code>EventEmitter</code>
Agent capable of making existing code available to remote control by clients.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [VrpcAgent](#VrpcAgent) ⇐ <code>EventEmitter</code>
    * [new VrpcAgent(obj)](#new_VrpcAgent_new)
    * _instance_
        * [.serve()](#VrpcAgent+serve) ⇒ <code>Promise</code>
        * [.end([obj], [unregister])](#VrpcAgent+end) ⇒ <code>Promise</code>
        * [.create(options)](#VrpcAgent+create) ⇒ <code>Object</code>
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

<a id="new_VrpcAgent_new"></a>

### new VrpcAgent(obj)
Constructs an agent instance

**Params**

- obj <code>Object</code>
    - [.username] <code>String</code> - MQTT username
    - [.password] <code>String</code> - MQTT password (if no token is provided)
    - [.token] <code>String</code> - Access token
    - [.domain] <code>String</code> <code> = &#x27;vrpc&#x27;</code> - The domain under which the agent-provided code is reachable
    - [.agent] <code>String</code> <code> = &#x27;&lt;user&gt;-&lt;installationId&gt;@&lt;hostname&gt;-&lt;platform&gt;-js&#x27;</code> - This agent's name;
the default is stable for the installation (where this vrpc is installed),
however and from wherever the agent is started
    - [.broker] <code>String</code> <code> = &#x27;mqtts://broker.hivemq.com:8883&#x27;</code> - Broker url in form: `<scheme>://<host>:<port>`
    - [.log] <code>Object</code> <code> = console</code> - Log object (must support debug, info, warn, and error level)
    - [.bestEffort] <code>Boolean</code> <code> = true</code> - If true, messages are sent at QoS 0 (best effort), else at QoS 1
    - [.version] <code>String</code> <code> = &#x27;&#x27;</code> - The (user-defined) version of this agent
    - [.mqttClientId] <code>String</code> <code> = &#x27;&lt;generated()&gt;&#x27;</code> - Explicitly set the mqtt client id.
    - [.tls] <code>Object</code> - TLS settings for a secure broker: `{ ca, rejectUnauthorized }`. Without it the broker's certificate is not verified (the historical behaviour); with `ca` the broker must present a chain the given certificates anchor.

**Example**  
```js
const agent = new Agent({
  domain: 'vrpc'
  agent: 'myAgent'
})
```

* * *

<a id="VrpcAgent+serve"></a>

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
**Returns**: <code>Promise</code> - Resolves once the agent serves - connected, its
request topics subscribed and its info announced - or once it was
explicitly ended before that, never rejects  

* * *

<a id="VrpcAgent+end"></a>

### vrpcAgent.end([obj], [unregister]) ⇒ <code>Promise</code>
Stops the agent

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
**Returns**: <code>Promise</code> - Resolves when disconnected and ended  
**Params**

- [obj] <code>Object</code>
- [unregister] <code>Boolean</code> <code> = false</code> - If true, fully un-registers agent from broker


* * *

<a id="VrpcAgent+create"></a>

### vrpcAgent.create(options) ⇒ <code>Object</code>
Creates a new instance locally

NOTE: The instance must previously be registered by the local VrpcAdapter

**Kind**: instance method of [<code>VrpcAgent</code>](#VrpcAgent)  
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

<a id="VrpcAgent+event_connect"></a>

### "connect"
Event 'connect'

Emitted on successful (re)connection (i.e. connack rc=0).

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sessionPresent | <code>Boolean</code> | A session from a previous connection is already present |


* * *

<a id="VrpcAgent+event_reconnect"></a>

### "reconnect"
Event 'reconnect'

Emitted when a reconnect starts.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a id="VrpcAgent+event_close"></a>

### "close"
Event 'close'

Emitted after a disconnection.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a id="VrpcAgent+event_offline"></a>

### "offline"
Event 'offline'

Emitted when the client goes offline.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a id="VrpcAgent+event_error"></a>

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

<a id="VrpcAgent+event_end"></a>

### "end"
Event 'end'

Emitted when mqtt.Client#end() is called. If a callback was passed to
mqtt.Client#end(), this event is emitted once the callback returns.

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a id="VrpcAgent+event_clientGone"></a>

### "clientGone"
Event 'clientGone'

Emitted when a tracked VRPC client connection ended. Listeners receive
the connection id (unique per VrpcClient instance) and an info object
whose `clientId` is the identity-derived id shared by all connections
of one identity (undefined for clients < 3.8.0).

**Kind**: event emitted by [<code>VrpcAgent</code>](#VrpcAgent)  

* * *

<a id="VrpcAgent.fromCommandline"></a>

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
    - .token <code>String</code> - Access token
    - .broker <code>String</code> - Broker url in form: `<scheme>://<host>:<port>`
    - .version <code>String</code> - The (user-defined) version of this agent

**Example**  
```js
const agent = VrpcAgent.fromCommandline()
```

* * *

