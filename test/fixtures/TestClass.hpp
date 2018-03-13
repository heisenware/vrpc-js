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

    bool hasCategory(const std::string& category) const {
      return _registry.find(category) != _registry.end();
    }

    void notifyOnNew(const Callback& callback) {
      _callbacks["new"] = callback;
    }

    void notifyOnRemoved(const Callback& callback) {
      _callbacks["removed"] = callback;
    }

    void addEntry(const std::string& category, const Entry& entry) {
      _registry[category].push_back(entry);
      if (_registry[category].size() == 1) {
        if (_callbacks.find("new") != _callbacks.end()) {
          _callbacks["new"](entry);
        }
      }
    }

    Entry removeEntry(const std::string& category) {
      if (!hasCategory(category)) {
        throw std::runtime_error("Can not remove non-existing category");
      }
      Entries& entries = _registry[category];
      Entry entry =  entries.back();
      entries.pop_back();
      if (entries.size() == 0) {
        if (_callbacks.find("removed") != _callbacks.end()) {
          _callbacks["removed"](entry);
        }
        _registry.erase(category);
      }
      return entry;
    }

    void callMeBack(const std::function<void (int32_t)>& done) const {
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
      done(100);
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
