#include "Foo.hpp"

// adapt constructor
VRPC_CTOR(Foo);

// adapt getter
VRPC_CONST_MEMBER_FUNCTION(Foo, int, getValue);

// adapt setter
VRPC_MEMBER_FUNCTION(Foo, void, setValue, int);
