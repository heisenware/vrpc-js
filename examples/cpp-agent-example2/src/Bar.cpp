#include "Bar.hpp"
#include <chrono>
#include <iostream>
#include <thread>

std::string Bar::philosophy() {
  return "I have mixed drinks about feelings.";
}

Bar::Bar(const Selection& selection) : _selection(selection) {}

void Bar::addBottle(const std::string& name,
                    const std::string& category,
                    const std::string& country) {
  Bottle bottle = {name, category, country};
  _selection.push_back(bottle);
  for (const auto& notify : _addListeners) notify(bottle);
}

Bottle Bar::removeBottle(const std::string& name) {
  Selection filtered;
  Bottle bottle;
  for (const auto& x : _selection) {
    if (bottle.name.empty() && (x.name == name)) {
      for (const auto& notify : _removeListeners) notify(x);
      bottle = x;
      continue;
    }
    filtered.push_back(x);
  }
  if (bottle.name.empty()) {
    throw std::runtime_error("Sorry, this bottle is not in our selection");
  }
  _selection = filtered;
  return bottle;
}

void Bar::onAdd(const Bar::BottleCallback& listener) {
  _addListeners.push_back(listener);
}

void Bar::onRemove(const Bar::BottleCallback& listener) {
  _removeListeners.push_back(listener);
}

std::string Bar::prepareDrink(const Bar::StringCallback& done) const {
  const std::vector<std::string> v = {_random(), _random(), _random()};
  std::thread([=]() {
    std::this_thread::sleep_for(std::chrono::seconds(3));
    done("Your drink is ready! I mixed " + v[0] + " with " + v[1] +
         " and a bit of " + v[2] + ".");
  }).detach();
  return "In preparation...";
}

Bar::Selection Bar::getSelection() const {
  return _selection;
}

std::string Bar::_random() const {
  if (_selection.size() == 0) {
    throw std::runtime_error("I searched, but couldn\'t find any bottles");
  }
  int index = std::rand() % _selection.size();
  return _selection[index].name;
}
