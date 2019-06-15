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

  VRPC_VOID_CTOR(TestClass);
  VRPC_CTOR(TestClass, const TestClass::Registry&)

  VRPC_MEMBER_FUNCTION_CONST(TestClass, const TestClass::Registry&, getRegistry)
  VRPC_MEMBER_FUNCTION_CONST(TestClass, bool, hasCategory, const std::string&)
  VRPC_VOID_MEMBER_FUNCTION(TestClass, notifyOnNew, VRPC_CALLBACK(const Entry&))
  VRPC_VOID_MEMBER_FUNCTION(TestClass, notifyOnRemoved, VRPC_CALLBACK(const Entry&))
  VRPC_VOID_MEMBER_FUNCTION(TestClass, addEntry, const std::string&, const Entry&)
  VRPC_MEMBER_FUNCTION(TestClass, Entry, removeEntry, const std::string&);
  VRPC_VOID_MEMBER_FUNCTION_CONST(TestClass, callMeBack, VRPC_CALLBACK(int32_t))

  VRPC_STATIC_FUNCTION(TestClass, std::string, crazy);
  VRPC_STATIC_FUNCTION(TestClass, std::string, crazy, const std::string&)

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
