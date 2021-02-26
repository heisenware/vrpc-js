#include <functional>
#include <unordered_map>
#include <vector>

namespace bar {

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

    explicit Bar(const Assortment& assortment);

    static std::string philosophy();

    bool hasDrink(const std::string& type) const;

    void addBottle(const std::string& type, const Bottle& bottle);

    Bottle removeBottle(const std::string& type);

    void onEmptyDrink(const Callback& callback);

    void prepareDrink(const std::function<void (int)>& done) const;

    Assortment getAssortment() const;

  private:

    Callback _callback;
    Assortment _assortment;

  };
}
