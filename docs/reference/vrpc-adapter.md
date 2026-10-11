# VrpcAdapter

<!-- Generated from the JSDoc of vrpc/VrpcAdapter.js by `npm run build:doc`. Edit the source, not this file. -->

[API reference](README.md) · [Documentation](../README.md)

## Classes

<dl>
<dt><a href="#VrpcAdapter">VrpcAdapter</a></dt>
<dd><p>Generates an adapter layer for existing code and enables further VRPC-based
communication.</p>
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
<dt><a href="#Callback">Callback</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Ret">Ret</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a id="VrpcAdapter"></a>

## VrpcAdapter
Generates an adapter layer for existing code and enables further VRPC-based
communication.

**Kind**: global class  

* [VrpcAdapter](#VrpcAdapter)
    * _instance_
        * ["create"](#VrpcAdapter+event_create)
        * ["beforeDelete"](#VrpcAdapter+event_beforeDelete)
        * ["delete"](#VrpcAdapter+event_delete)
        * ["disposeFailed"](#VrpcAdapter+event_disposeFailed)
        * ["releaseFailed"](#VrpcAdapter+event_releaseFailed)
        * ["greetFailed"](#VrpcAdapter+event_greetFailed)
    * _static_
        * [.addPluginPath(dirPath, [maxLevel])](#VrpcAdapter.addPluginPath)
        * [.register(code, [options])](#VrpcAdapter.register)
        * [.registerInstance(obj, options)](#VrpcAdapter.registerInstance)
        * [.create(options)](#VrpcAdapter.create) ⇒ <code>Object</code>
        * [.delete(instance)](#VrpcAdapter.delete) ⇒ <code>Boolean</code>
        * [.getInstance(instance)](#VrpcAdapter.getInstance) ⇒ <code>Object</code>
        * [.getAvailableClasses()](#VrpcAdapter.getAvailableClasses) ⇒ <code>Array.&lt;String&gt;</code>
        * [.getAvailableInstances(className)](#VrpcAdapter.getAvailableInstances) ⇒ <code>Array.&lt;String&gt;</code>
        * [.on(eventName, listener)](#VrpcAdapter.on)


* * *

<a id="VrpcAdapter+event_create"></a>

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

<a id="VrpcAdapter+event_beforeDelete"></a>

### "beforeDelete"
Event 'beforeDelete'

Emitted when a deletion through the agent begins, while the instance can
still be reached

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | The class name of the instance |
| instance | <code>String</code> | The instance name |


* * *

<a id="VrpcAdapter+event_delete"></a>

### "delete"
Event 'delete'

Emitted once an instance was deleted through the agent (a client's delete,
or an isolated instance whose owner went)

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | The class name of the deleted instance |
| instance | <code>String</code> | The instance name |


* * *

<a id="VrpcAdapter+event_disposeFailed"></a>

### "disposeFailed"
Event 'disposeFailed'

Emitted when the dispose method of a deleted instance throws, rejects or
does not settle within VrpcAdapter.DISPOSE_TIMEOUT. The instance is gone
regardless.

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| className | <code>String</code> | The class name of the deleted instance |
| instance | <code>String</code> | The instance name |
| error | <code>Error</code> | What went wrong |


* * *

<a id="VrpcAdapter+event_releaseFailed"></a>

### "releaseFailed"
Event 'releaseFailed'

Emitted when the release of an event registration threw or rejected; the
registration is gone anyway

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| context | <code>String</code> | The instance (or class) of the registration |
| function | <code>String</code> | The event function |
| args | <code>Array.&lt;Any&gt;</code> | Its arguments, without handlers |
| error | <code>Error</code> | What went wrong |


* * *

<a id="VrpcAdapter+event_greetFailed"></a>

### "greetFailed"
Event 'greetFailed'

Emitted when a registration's greeting threw or rejected; the subscriber
stays subscribed

**Kind**: event emitted by [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| context | <code>String</code> | The instance (or class) of the registration |
| function | <code>String</code> | The event function |
| args | <code>Array.&lt;Any&gt;</code> | Its arguments, without handlers |
| error | <code>Error</code> | What went wrong |


* * *

<a id="VrpcAdapter.addPluginPath"></a>

### VrpcAdapter.addPluginPath(dirPath, [maxLevel])
Automatically requires .js files for auto-registration.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- dirPath <code>String</code> - Relative path to start the auto-registration from
- [maxLevel] <code>Number</code> - Maximum search depth (default: unlimited)


* * *

<a id="VrpcAdapter.register"></a>

### VrpcAdapter.register(code, [options])
Registers existing code and makes it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- code <code>Any</code> - Existing code to be registered, can be a class
or function object or a relative path to a module
- [options] <code>Object</code>
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers public
functions: none whose name begins with an underscore, and - when the
JSDoc is read - none tagged `@private` or `@access private`
    - [.withNew] <code>Boolean</code> <code> = true</code> - If true, class will be constructed
using the `new` operator
    - [.schema] <code>Object</code> <code> = </code> - If provided is used to validate ctor
parameters (only works if registered code reflects a single class)
    - [.jsdocPath] <code>String</code> - if provided, parses documentation and
provides it as meta information; a code given by path has its JSDoc read
without

NOTE: This function currently only supports registration of classes (either
when provided as object or when exported on the provided module path)


* * *

<a id="VrpcAdapter.registerInstance"></a>

### VrpcAdapter.registerInstance(obj, options)
Registers an existing instance and make it (remotely) callable

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- obj <code>Object</code> - The instance to be registered
- options <code>Object</code>
    - .className <code>String</code> - Class name of the instance
    - .instance <code>String</code> - Name of the instance
    - [.onlyPublic] <code>Boolean</code> <code> = true</code> - If true, only registers public
functions: none whose name begins with an underscore, and - when the
JSDoc is read - none tagged `@private` or `@access private`
    - [.jsdocPath] <code>String</code> - if provided, parses documentation and
provides it as meta information


* * *

<a id="VrpcAdapter.create"></a>

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

<a id="VrpcAdapter.delete"></a>

### VrpcAdapter.delete(instance) ⇒ <code>Boolean</code>
Deletes an instance: its name is free at once, the adapter takes back
every listener it attached, and the object releases what it runs
through its `[Symbol.asyncDispose]` or `[Symbol.dispose]` method, which
runs in the background here (a remote delete answers once it settled).

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Boolean</code> - True in case of success, false otherwise  
**Params**

- instance <code>String</code> | <code>Object</code> - Instance (name or object itself) to be deleted


* * *

<a id="VrpcAdapter.getInstance"></a>

### VrpcAdapter.getInstance(instance) ⇒ <code>Object</code>
Retrieves an existing instance by name

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Object</code> - The real instance (not a proxy!)  
**Params**

- instance <code>String</code> - Name of the instance to be acquired


* * *

<a id="VrpcAdapter.getAvailableClasses"></a>

### VrpcAdapter.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

<a id="VrpcAdapter.getAvailableInstances"></a>

### VrpcAdapter.getAvailableInstances(className) ⇒ <code>Array.&lt;String&gt;</code>
Provides the names of all currently running instances.

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of instance names  
**Params**

- className <code>String</code> - Name of class to retrieve the instances for


* * *

<a id="VrpcAdapter.on"></a>

### VrpcAdapter.on(eventName, listener)
Listens to an event of the adapter: `create`, `beforeDelete`,
`delete`, `disposeFailed`, `releaseFailed` or `greetFailed`

**Kind**: static method of [<code>VrpcAdapter</code>](#VrpcAdapter)  
**Params**

- eventName <code>String</code> - The event
- listener <code>function</code> - Called with the event's payload


* * *

<a id="MetaData"></a>

## MetaData : <code>Object.&lt;String, Func&gt;</code>
Associates meta data to any function

**Kind**: global typedef  

* * *

<a id="Func"></a>

## Func
**Kind**: global typedef  
**Params**

- description <code>String</code> - Function description
- params [<code>Array.&lt;Param&gt;</code>](#Param) - Array of parameter details in order of signature
- ret [<code>Ret</code>](#Ret) - Object associating further information to return value


* * *

<a id="Param"></a>

## Param : <code>Object</code>
**Kind**: global typedef  
**Params**

- name <code>String</code> - Parameter name
- optional <code>Boolean</code> - Whether parameter is optional
- description <code>String</code> - Parameter description
- [type] <code>String</code> - Parameter type
- [default] <code>Any</code> - The default to be injected when not provided
- [callback] [<code>Callback</code>](#Callback) - The signature of a function-typed
parameter, when a `@callback` typedef of that name documents it


* * *

<a id="Callback"></a>

## Callback : <code>Object</code>
**Kind**: global typedef  
**Params**

- name <code>String</code> - Typedef name (the parameter's type)
- description <code>String</code> - Callback description
- params [<code>Array.&lt;Param&gt;</code>](#Param) - The arguments the function is called with


* * *

<a id="Ret"></a>

## Ret : <code>Object</code>
**Kind**: global typedef  
**Params**

- description <code>String</code> - Return value description
- [type] <code>String</code> - Return value type


* * *

