# VrpcPersistor

<!-- Generated from the JSDoc of vrpc/VrpcPersistor.js by `npm run build:doc`. Edit the source, not this file. -->

[API reference](README.md) · [Documentation](../README.md)

<a id="VrpcPersistor"></a>

## VrpcPersistor
Provides a persistence layer for VRPC instances.

This class automatically saves the constructor arguments of newly created
shared instances and re-creates them when the application restarts. It also
listens for an 'update' event on instances to persist their state after
creation (the event's payload is used as the single constructor argument
upon restoration). Isolated instances belong to the connection that
created them and are never persisted.

A record that cannot be restored is never deleted: it is quarantined
(marked with the error, kept on disk), retried once per start so it heals
by itself once the cause is fixed, and can be inspected (`status`), retried
(`retry`) or removed on purpose (`forget`).

**Kind**: global class  
**Requires**: <code>module:@heisenware/storage</code>  

* [VrpcPersistor](#VrpcPersistor)
    * [new VrpcPersistor(options)](#new_VrpcPersistor_new)
    * [.restore()](#VrpcPersistor+restore) ⇒ <code>Promise.&lt;{restored: Array.&lt;string&gt;, quarantined: Array.&lt;{instance: string, className: string, error: string, attempts: number, since: string}&gt;}&gt;</code>
    * [.status()](#VrpcPersistor+status) ⇒ <code>Promise.&lt;{dir: string, instances: Array.&lt;{instance: string, className: string, restoreError: (object\|null)}&gt;}&gt;</code>
    * [.retry(id)](#VrpcPersistor+retry) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.forget(id)](#VrpcPersistor+forget) ⇒ <code>Promise.&lt;boolean&gt;</code>


* * *

<a id="new_VrpcPersistor_new"></a>

### new VrpcPersistor(options)
Creates an instance of VrpcPersistor.

**Params**

- options <code>object</code> - Configuration options for the persistor.
    - .agentInstance <code>VrpcAgent</code> - The VRPC agent whose instances should be persisted.
    - [.dir] <code>string</code> - Optional directory for storage. Defaults to a path derived from the agent's name.
    - [.log] <code>object</code> - Optional logger object (e.g. console) with info, warn, and error methods.
    - [.retries] <code>number</code> <code> = 5</code> - How often a record that fails on a fresh restore is retried before it is quarantined.
    - [.retryDelay] <code>number</code> <code> = 1000</code> - Milliseconds between retries, multiplied by the attempt number.


* * *

<a id="VrpcPersistor+restore"></a>

### vrpcPersistor.restore() ⇒ <code>Promise.&lt;{restored: Array.&lt;string&gt;, quarantined: Array.&lt;{instance: string, className: string, error: string, attempts: number, since: string}&gt;}&gt;</code>
Restores all persisted instances from storage.

A record seen for the first time is retried with a growing delay; a
record that still fails is quarantined: it stays on disk, marked with
the error and the number of attempts. A quarantined record gets one
attempt per restore, so it heals on the next start once its cause is
fixed, and never turns a start into a retry storm.

**Kind**: instance method of [<code>VrpcPersistor</code>](#VrpcPersistor)  

* * *

<a id="VrpcPersistor+status"></a>

### vrpcPersistor.status() ⇒ <code>Promise.&lt;{dir: string, instances: Array.&lt;{instance: string, className: string, restoreError: (object\|null)}&gt;}&gt;</code>
Lists every persisted record with its quarantine mark, if any.

**Kind**: instance method of [<code>VrpcPersistor</code>](#VrpcPersistor)  

* * *

<a id="VrpcPersistor+retry"></a>

### vrpcPersistor.retry(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Attempts one more time to restore a persisted instance (quarantined or
not). A success clears the quarantine mark, a failure updates it.

**Kind**: instance method of [<code>VrpcPersistor</code>](#VrpcPersistor)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - true when the instance exists afterwards  
**Params**

- id <code>string</code> - The instance id


* * *

<a id="VrpcPersistor+forget"></a>

### vrpcPersistor.forget(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Removes a persisted record on purpose, the only way a record leaves the
storage other than the deletion of a live instance.

**Kind**: instance method of [<code>VrpcPersistor</code>](#VrpcPersistor)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - true  
**Params**

- id <code>string</code> - The instance id


* * *

