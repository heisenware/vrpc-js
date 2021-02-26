#include "Bar.hpp"
#include <chrono>
#include <thread>
#include <stdlib.h>

namespace bar {

  Bar::Bar(const Assortment& assortment): _assortment(assortment) {}

  std::string Bar::philosophy() {
    return "I have mixed drinks about feelings.";
  }

  bool Bar::hasDrink(const std::string& type) const {
    return _assortment.find(type) != _assortment.end();
  }

  void Bar::addBottle(const std::string& type, const Bottle& bottle) {
    _assortment[type].push_back(bottle);
  }

  Bottle Bar::removeBottle(const std::string& type) {
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

  void Bar::onEmptyDrink(const Bar::Callback& callback) {
    _callback = callback;
  }

  void Bar::prepareDrink(const std::function<void (int)>& done) const {
    const int seconds = rand() % 4;
    std::this_thread::sleep_for(std::chrono::seconds(seconds));
    done(seconds);
  }

  Bar::Assortment Bar::getAssortment() const {
    return _assortment;
  }
}
