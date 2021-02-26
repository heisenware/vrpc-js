#include "Bar.hpp"

// NOTE: Do not include <vrpc.hpp>, even if you IDE complains

using namespace bar;

namespace vrpc {

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
  VRPC_CTOR(Bar)

  VRPC_CTOR(Bar, const Bar::Assortment&)

  // Register functions
  VRPC_CONST_MEMBER_FUNCTION(Bar, bool, hasDrink, const std::string&)
  VRPC_MEMBER_FUNCTION(Bar, void, addBottle, const std::string&, const Bottle&)
  VRPC_MEMBER_FUNCTION(Bar, Bottle, removeBottle, const std::string&)
  VRPC_MEMBER_FUNCTION(Bar, void, onEmptyDrink, VRPC_CALLBACK(const std::string&))
  VRPC_MEMBER_FUNCTION_CONST(Bar, void, prepareDrink, VRPC_CALLBACK(int))
  VRPC_MEMBER_FUNCTION_CONST(Bar, Bar::Assortment, getAssortment)
  VRPC_STATIC_FUNCTION(Bar, std::string, philosophy)
}
