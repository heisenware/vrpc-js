#include <functional>
#include <unordered_map>
#include <vector>

struct Bottle {
  std::string name;
  std::string category;
  std::string country;
};

class Bar {
 public:
  typedef std::function<void(const std::string&)> StringCallback;
  typedef std::function<void(const Bottle&)> BottleCallback;
  typedef std::vector<BottleCallback> BottleCallbacks;
  typedef std::vector<Bottle> Selection;

  static std::string philosophy();

  Bar() = default;

  explicit Bar(const Selection& selection);

  void addBottle(const std::string& name,
                 const std::string& category = "n/a",
                 const std::string& country = "n/a");

  Bottle removeBottle(const std::string& name);

  void onAdd(const BottleCallback& listener);

  void onRemove(const BottleCallback& listener);

  std::string prepareDrink(const StringCallback& done) const;

  Selection getSelection() const;

 private:

  std::string _random() const;

  BottleCallbacks _addListeners;
  BottleCallbacks _removeListeners;
  Selection _selection;
};
