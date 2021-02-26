'use strict'

const { VrpcLocal } = require('vrpc')
const addon = require('./build/Release/vrpc_foo')

const vrpc = new VrpcLocal(addon)

const foo = vrpc.create('Foo')
foo.setValue(42)
console.log(foo.getValue()) // prints 42
