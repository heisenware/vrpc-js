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

  /**
   * Called on every change of the value
   *
   * @callback ChangeListener
   * @param {Integer} value The new value
   * @param {Integer} previous The value before
   */

  /**
   * Subscribes to value changes
   *
   * @param {ChangeListener} listener Receives every change
   * @returns {Boolean} true
   */
  onChange (listener) {
    this._listener = listener
    return true
  }
}

module.exports = TestClassDoc
