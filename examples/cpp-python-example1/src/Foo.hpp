class Foo {

  int _value;

public:

  Foo(int value) : _value(value) {}

  int getValue() const {
    return _value;
  }

  void setValue(int value) {
    _value = value;
  }

};
