#include "Foo.hpp"

// Bind constructor
// Needs: class, [arg1-type, [arg2-type...]]
VRPC_CTOR(Foo)

// Bind constant member function
// Needs: class, return-type, function, [arg1-type, [arg2-type...]]
VRPC_CONST_MEMBER_FUNCTION(Foo, int, getValue)

// Bind void, non-const member function
// Needs: class, return-type, function, [arg1-type, [arg2-type...]]
VRPC_MEMBER_FUNCTION(Foo, void, setValue, int)
