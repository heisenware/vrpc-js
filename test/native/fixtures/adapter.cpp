#include "TestClass.hpp"

using namespace fixture;

namespace vrpc {
VRPC_DEFINE_TYPE(Entry, member1, member2, member3, member4)
VRPC_CTOR_X(TestClass, "Creates an empty TestClass")
VRPC_CTOR_X(TestClass,
            "Creates a pre-filled TestClass",
            const TestClass::Registry&,
            "registry",
            required(),
            "Registry information")

VRPC_CONST_MEMBER_FUNCTION(TestClass, const TestClass::Registry&, getRegistry)
VRPC_CONST_MEMBER_FUNCTION(TestClass, bool, hasEntry, const std::string&)
VRPC_MEMBER_FUNCTION(TestClass, void, notifyOnNew, VRPC_CALLBACK(const Entry&))
VRPC_MEMBER_FUNCTION(TestClass,
                     void,
                     notifyOnRemoved,
                     VRPC_CALLBACK(const Entry&))
VRPC_MEMBER_FUNCTION(TestClass,
                     void,
                     addEntry,
                     const std::string&,
                     const Entry&)
VRPC_MEMBER_FUNCTION(TestClass, Entry, removeEntry, const std::string&);
VRPC_CONST_MEMBER_FUNCTION(TestClass, void, callMeBack, VRPC_CALLBACK(int32_t))
VRPC_MEMBER_FUNCTION_X(TestClass,
                       bool,
                       "by default returns true",
                       usingDefaults,
                       "test to check proper injection of defaults",
                       const std::string&,
                       "dummy",
                       required(),
                       "some placeholder string",
                       bool,
                       "didWork",
                       true,
                       "toggles the return value")

VRPC_STATIC_FUNCTION(TestClass, std::string, crazy)
VRPC_STATIC_FUNCTION_X(TestClass,
                       std::string,
                       "returned message",
                       crazy,
                       "Generates a composed message",
                       const std::string&,
                       "who",
                       required(),
                       "Provides customized part of the message")
}
