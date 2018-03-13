#include <chrono>
#include <functional>
#include <thread>
#include <unordered_map>
#include <vector>
#include <stdlib.h>

namespace vrpc_example {

  struct Bottle {
    std::string brand;
    std::string country;
    int age;
  };

  class Bar {

  public:

    typedef std::function<void (const std::string& /*type*/)> Callback;
    typedef std::vector<Bottle> Bottles;
    typedef std::unordered_map<std::string, Bottles> Assortment;

    Bar() = default;

    explicit Bar(const Assortment& assortment): _assortment(assortment) {}

    static std::string philosophy() {
      return "I have mixed drinks about feelings.";
    }

    bool hasDrink(const std::string& type) const {
      return _assortment.find(type) != _assortment.end();
    }

    void addBottle(const std::string& type, const Bottle& bottle) {
      _assortment[type].push_back(bottle);
    }

    Bottle removeBottle(const std::string& type) {
      if (!hasDrink(type)) {
        throw std::runtime_error("Can't remove bottle of unavailable category");
      }
      Bottles& bottles = _assortment[type];
      Bottle bottle =  bottles.back();
      bottles.pop_back();
      if (bottles.size() == 0) {
        _callback(type);
        _assortment.erase(type);
      }
      return bottle;
    }

    void onEmptyDrink(const Callback& callback) {
      _callback = callback;
    }

    void prepareDrink(const std::function<void (int)>& done) const {
      const int seconds = rand() % 4;
      std::this_thread::sleep_for(std::chrono::seconds(seconds));
      done(seconds);
    }

    Assortment getAssortment() const {
      return _assortment;
    }

  private:

    Callback _callback;
    Assortment _assortment;

  };
}
