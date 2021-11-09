const { VrpcNative } = require('vrpc')
const addon = require('./build/Release/vrpc_foo')

const native = new VrpcNative(addon)

// obtain proxy class
const Foo = native.getClass('Foo')

// create proxy instance
const foo = new Foo()

foo.setValue(42)
console.log(foo.getValue()) // prints 42
