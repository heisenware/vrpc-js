#ifndef TESTCLASS_HPP
#define TESTCLASS_HPP

#include <chrono>
#include <functional>
#include <iostream>
#include <thread>
#include <unordered_map>
#include <vector>

namespace vrpc_test {

  struct Entry {
    std::string member_1;
    int32_t member_2;
    float member_3;
    std::vector<uint16_t> member_4;
  };

  class TestClass {

  public:

    typedef std::function<void (const Entry&)> Callback;
    typedef std::unordered_map<std::string, Callback> Callbacks;
    typedef std::vector<Entry> Entries;
    typedef std::unordered_map<std::string, Entries> Registry;

    TestClass() = default;

    explicit TestClass(const Registry& registry): _registry(registry) {
    }

    const Registry& getRegistry() const {
      return _registry;
    }

    bool hasEntry(const std::string& key) const {
      return _registry.find(key) != _registry.end();
    }

    void notifyOnNew(const Callback& callback) {
      _callbacks["new"] = callback;
    }

    void notifyOnRemoved(const Callback& callback) {
      _callbacks["removed"] = callback;
    }

    void addEntry(const std::string& key, const Entry& entry) {
      _registry[key].push_back(entry);
      if (_registry[key].size() == 1) {
        if (_callbacks.find("new") != _callbacks.end()) {
          _callbacks["new"](entry);
        }
      }
    }

    Entry removeEntry(const std::string& key) {
      if (!hasEntry(key)) {
        throw std::runtime_error("Can not remove non-existing entry");
      }
      Entries& entries = _registry[key];
      Entry entry =  entries.back();
      entries.pop_back();
      if (entries.size() == 0) {
        if (_callbacks.find("removed") != _callbacks.end()) {
          _callbacks["removed"](entry);
        }
        _registry.erase(key);
      }
      return entry;
    }

    void callMeBack(const std::function<void (int32_t)>& done) const {
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
      done(100);
    }

    bool usingDefaults(const std::string& arg1, bool arg2 = true) {
      return arg2;
    }

    static std::string usingStaticDefaults(const std::string& arg1, const std::string& arg2 = "", int arg3 = 42) {
      return arg1 + arg2 + std::to_string(arg3);
    }

    static std::string crazy() {
        return "who is crazy?";
    }

    static std::string crazy(const std::string& who) {
        return who + " is crazy!";
    }

  private:

    Registry _registry;
    Callbacks _callbacks;

  };
}
#endif
