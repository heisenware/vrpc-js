'use strict'

const { VrpcCaller } = require('vrpc')
const addon = require('./build/Release/vrpc_foo')

const vrpc = new VrpcCaller(addon)

const foo = vrpc.create('Foo')
foo.setValue(42)
console.log(foo.getValue()) // prints 42
