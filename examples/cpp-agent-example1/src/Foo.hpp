class Foo {

  int _value = 0;

public:

  Foo() = default;

  int getValue() const {
    return _value;
  }

  void setValue(int value) {
    _value = value;
  }
};
