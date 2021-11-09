#include "Bar.hpp"

// register custom type
VRPC_DEFINE_TYPE(Bottle, name, category, country)

// register static function
VRPC_STATIC_FUNCTION(Bar, std::string, philosophy)

// register constructors
VRPC_CTOR(Bar)
VRPC_CTOR(Bar, const Bar::Selection&)

// register member functions
VRPC_MEMBER_FUNCTION_X(Bar,
                    void, "",
                    addBottle, "Adds a bottle to the bar",
                    const std::string&, "name", required(), "name of the bottle",
                    const std::string&, "category", "n/a", "category of the drink",
                    const std::string&, "country", "n/a", "country of production")
VRPC_MEMBER_FUNCTION(Bar, Bottle, removeBottle, const std::string&)
VRPC_MEMBER_FUNCTION(Bar, void, onAdd, VRPC_CALLBACK(const Bottle&))
VRPC_MEMBER_FUNCTION(Bar, void, onRemove, VRPC_CALLBACK(const Bottle&))
VRPC_CONST_MEMBER_FUNCTION(Bar, std::string, prepareDrink, VRPC_CALLBACK(const std::string&))
VRPC_CONST_MEMBER_FUNCTION(Bar, Bar::Selection, getSelection)
