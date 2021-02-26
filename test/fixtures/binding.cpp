#include <json.hpp>
#include "TestClass.hpp"

namespace vrpc_test {

  // Register custom type: Entry
  void to_json(vrpc::json& j, const Entry& b) {
    j = vrpc::json{
      {"member1", b.member_1},
      {"member2", b.member_2},
      {"member3", b.member_3},
      {"member4", b.member_4}
    };
  }
  void from_json(const vrpc::json& j, Entry& b) {
    b.member_1 = j.at("member1").get<std::string>();
    b.member_2 = j.at("member2").get<int32_t>();
    b.member_3 = j.at("member3").get<float>();
    b.member_4 = j.at("member4").get<std::vector<uint16_t>>();
  }

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
  VRPC_MEMBER_FUNCTION(TestClass, void, notifyOnRemoved, VRPC_CALLBACK(const Entry&))
  VRPC_MEMBER_FUNCTION(TestClass, void, addEntry, const std::string&, const Entry&)
  VRPC_MEMBER_FUNCTION(TestClass, Entry, removeEntry, const std::string&);
  VRPC_CONST_MEMBER_FUNCTION(TestClass, void, callMeBack, VRPC_CALLBACK(int32_t))
  VRPC_MEMBER_FUNCTION_X(
    TestClass,
    bool, "by default returns true",
    usingDefaults, "test to check proper injection of defaults",
    const std::string&, "dummy", required(), "some placeholder string",
    bool, "didWork", true, "toggles the return value"
  )

  VRPC_STATIC_FUNCTION(TestClass, std::string, crazy)
  VRPC_STATIC_FUNCTION_X(
    TestClass,
    std::string, "returned message",
    crazy, "Generates a composed message",
    const std::string&, "who", required(), "Provides customized part of the message"
  )

}

/**** VRPC_BUILD ****

  'defines': [],
  'sources': [],
  'include_dirs': [],
  'link_settings' : {
    'libraries': [],
     'ldflags': []
  }

********************/
