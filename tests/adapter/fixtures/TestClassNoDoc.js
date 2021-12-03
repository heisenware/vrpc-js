class TestClassNoDoc {
  constructor (value = 0) {
    this._value = value
  }
  getValue () {
    return this._value
  }
}

module.exports = TestClassNoDoc
