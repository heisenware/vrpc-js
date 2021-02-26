from vrpc import VrpcLocal
import vrpc_foo # Imports the extension

vrpc = VrpcLocal(vrpc_foo)

foo = vrpc.create("Foo", 42)
print(foo.getValue()) # prints 42
foo.setValue(24)
print(foo.getValue()) # prints 24
