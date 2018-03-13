#include <catch.hpp>
#include <tuple>
#include <set>
#include "../cpp/json.hpp"
#include "../cpp/vrpc.hpp"

using namespace vrpc;

TEST_CASE("Test json packing and unpacking", "[packing]") {

  SECTION("Packing empty json") {
    nlohmann::json json;
    vrpc::pack(json);
    REQUIRE(json.empty());
  }

  SECTION("Packing json with simple values") {
    nlohmann::json json;
    vrpc::pack(json, 5, "Hello", false, std::vector<int>({1, 2, 3}));
    REQUIRE(json["a1"] == 5);
    REQUIRE(json["a2"] == "Hello");
    REQUIRE(json["a3"] == false);
    REQUIRE(json["a4"] == std::vector<int>({1, 2, 3}));
  }

  SECTION("Packing json with nested values") {
    nlohmann::json json;
    nlohmann::json inner{{"key1", "innerValue"}, {"key2", 2}};
    vrpc::pack(json, "test", inner);
    REQUIRE(json["a1"] == "test");
    REQUIRE(json["a2"]["key1"] == "innerValue");
    REQUIRE(json["a2"]["key2"] == 2);
  }

  SECTION("Check signature generation for empty json") {
    std::string s(vrpc::get_signature());
    REQUIRE(s.empty());
  }

  SECTION("Check signature generation using simple values") {
    std::string s(vrpc::get_signature<int, std::string, double, std::vector<char>>());
    REQUIRE(s == "-numberstringnumberarray");
  }
}

TEST_CASE("Test functionality of generic holder", "[Value]") {

  SECTION("Check retrieval with get") {
    // Store an integer to Value
    Value v(1);
    // by value
    int iv = v.get<int>();
    REQUIRE(iv == 1);
    // by const reference
    const int& ir = v.get<int>();
    REQUIRE(ir == 1);
    // by std::shared_ptr
    std::shared_ptr<int> ip = v.get<std::shared_ptr<int> >();
    REQUIRE(*ip == 1);
    auto ia = v.get<int>();
    REQUIRE(ia == 1);
  }

  SECTION("Check retrieval without get") {
    // Store an integer to Value
    Value v(1);
    // by value
    int iv = v;
    REQUIRE(iv == 1);
    // by const reference
    const int& ir = v;
    REQUIRE(ir == 1);
    // by std::shared_ptr
    std::shared_ptr<int> ip = v;
    REQUIRE(*ip == 1);
  }

  SECTION("Check formatting") {
    Value v;
    v = 1;
    REQUIRE(v.format() == "1");
    v = "foo";
    REQUIRE(v.format() == "foo");
    v = 3.1414;
    REQUIRE(v.format() == "3.141400");
    v = std::vector<int>({1, 2, 3, 4});
    REQUIRE(v.format() == "1,2,3,4");
    v = std::map<std::string, int>({
      {"1", 1},
      {"2", 2}});
    REQUIRE(v.format() == "{1:1,2:2}");
    v = std::set<int>({1, 2, 3, 4});
  }
}
