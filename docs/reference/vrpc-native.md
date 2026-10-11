# VrpcNative

<!-- Generated from the JSDoc of vrpc/VrpcNative.js by `npm run build:doc`. Edit the source, not this file. -->

[API reference](README.md) · [Documentation](../README.md)

<a id="VrpcNative"></a>

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

<a id="new_VrpcNative_new"></a>

### new VrpcNative(adapter)
Constructs a local caller object, able to communicate to natively added C++

**Params**

- adapter <code>Object</code> - An adapter object, typically loaded as native addon


* * *

<a id="VrpcNative+getClass"></a>

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

<a id="VrpcNative+delete"></a>

### vrpcNative.delete(proxy) ⇒
Deletes a proxy object and its underlying instance

**Kind**: instance method of [<code>VrpcNative</code>](#VrpcNative)  
**Returns**: True in case of success, false otherwise  
**Params**

- proxy <code>Object</code> - A proxy object


* * *

<a id="VrpcNative+callStatic"></a>

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

<a id="VrpcNative+getAvailableClasses"></a>

### vrpcNative.getAvailableClasses() ⇒ <code>Array.&lt;String&gt;</code>
Retrieves an array of all available classes (names only)

**Kind**: instance method of [<code>VrpcNative</code>](#VrpcNative)  
**Returns**: <code>Array.&lt;String&gt;</code> - Array of class names  

* * *

