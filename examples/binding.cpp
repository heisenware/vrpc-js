#include <json.hpp> // needed to register custom data types
#include "Bar.hpp"

// NOTE: Do not include <vrpc.hpp>, even if you IDE complains

using nlohmann::json;

namespace vrpc_example {

  // Register custom type: Bottle
  void to_json(json& j, const Bottle& b) {
    j = json{{"brand", b.brand}, {"country", b.country}, {"age", b.age}};
  }
  void from_json(const json& j, Bottle& b) {
    b.brand = j.at("brand").get<std::string>();
    b.country = j.at("country").get<std::string>();
    b.age = j.at("age").get<int>();
  }

  // Register constructors
  VRPC_VOID_CTOR(Bar)

  VRPC_CTOR(Bar, const Bar::Assortment&)

  // Register functions
  VRPC_MEMBER_FUNCTION_CONST(Bar, bool, hasDrink, const std::string&)

  VRPC_VOID_MEMBER_FUNCTION(Bar, addBottle, const std::string&, const Bottle&)

  VRPC_MEMBER_FUNCTION(Bar, Bottle, removeBottle, const std::string&)

  VRPC_VOID_MEMBER_FUNCTION(Bar, onEmptyDrink, VRPC_CALLBACK(const std::string&))

  VRPC_VOID_MEMBER_FUNCTION_CONST(Bar, prepareDrink, VRPC_CALLBACK(int))

  VRPC_MEMBER_FUNCTION_CONST(Bar, Bar::Assortment, getAssortment)

  VRPC_STATIC_FUNCTION(Bar, std::string, philosophy)
}
