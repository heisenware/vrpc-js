# Table of Contents

* [VrpcLocal](#VrpcLocal)
  * [VrpcLocal](#VrpcLocal.VrpcLocal)
    * [\_\_init\_\_](#VrpcLocal.VrpcLocal.__init__)
    * [create](#VrpcLocal.VrpcLocal.create)
    * [call\_static](#VrpcLocal.VrpcLocal.call_static)

<a name="VrpcLocal"></a>
# VrpcLocal

<a name="VrpcLocal.VrpcLocal"></a>
## VrpcLocal Objects

```python
class VrpcLocal(object)
```

Client capable of calling functions as provided by native modules.

<a name="VrpcLocal.VrpcLocal.__init__"></a>
#### \_\_init\_\_

```python
 | __init__(module=None)
```

Constructs an instance of a local client.

**Arguments**:

- `module` _obj_ - A module object, typically loaded as native addon
  

**Todo**:

  * Existing code reflects only an initial, minimal implementation
  * Still missing: availability functions, deletion, meta data, etc.
  * More sophisticated handling of potential threading in loaded addon

<a name="VrpcLocal.VrpcLocal.create"></a>
#### create

```python
 | create(class_name, *args)
```

Creates an instance of the specified class.

**Arguments**:

- `class_name` _str_ - Name of the class to create an instance of
  *args Variable number of arguments to provide to the constructor
  

**Returns**:

  Proxy to the created instance

<a name="VrpcLocal.VrpcLocal.call_static"></a>
#### call\_static

```python
 | call_static(class_name, function_name, *args)
```

Calls a static function as made available through the native addon.

**Arguments**:

- `class_name` _str_ - Name of the static function's class
- `function_name` _str_ - Name of the static function to be called
- `*args` - Positional arguments of the static function call
  

**Returns**:

- `any` - The return value of the via-proxy called function
  

**Todo**:

  * Support callbacks

