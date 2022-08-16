class TestClassDoc {
  /**
   * Constructor
   *
   * @param {Integer} [value=0] Initial value
   */
  constructor (value = 0) {
    this._value = value
  }

  /**
   * Gets a value
   *
   * @returns internal value
   */
  getValue () {
    return this._value
  }

  /**
   * Sets a value
   *
   * @param {Integer} value The new value
   * @returns {Integer} the updated value
   */
   setValue (value) {
    this._value = value
    return this._value
  }
}

module.exports = TestClassDoc
