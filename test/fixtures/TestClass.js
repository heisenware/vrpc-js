/**
 * A class intended for testing VRPC's functionality.
 *
 * @class TestClass
 * @param {Object} registry
 */
class TestClass {
  constructor (registry = {}) {
    this._registry = registry
    this._callbacks = new Map()
  }

  getRegistry () {
    return this._registry
  }

  hasCategory (category) {
    return this._registry[category] !== undefined
  }

  /**
   * Allows to register a notification callback
   *
   * @param {function(Object)} callback A callback notifying whenever a new
   * entry is available
   */
  notifyOnNew (callback) {
    this._callbacks.set('new', callback)
  }

  notifyOnRemoved (callback) {
    this._callbacks.set('removed', callback)
  }

  addEntry (category, entry) {
    const entries = this._registry[category]
    if (entries) entries.push(entry)
    else {
      this._registry[category] = [entry]
      const callback = this._callbacks.get('new')
      if (callback) callback(entry)
    }
  }

  removeEntry (category) {
    if (!this.hasCategory(category)) {
      throw new Error('Can not remove non-existing category')
    }
    const entries = this._registry[category]
    const entry = entries.pop()
    if (entries.length === 0) {
      const callback = this._callbacks.get('removed')
      if (callback) callback(entry)
      delete this._registry[category]
    }
    return entry
  }

  /**
   * Waits the configured amount of time and then returns.
   *
   * @param {number} ms Time to wait
   * @returns {number} The time this function waited for
   *
   */
  async waitForMe (ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms))
    return ms
  }

  async callMeBackLater (callback, ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms))
    callback(ms)
  }

  async willThrowLater () {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Some test error'), 100))
    })
  }

  static crazy (who = undefined) {
    if (who === undefined) {
      return 'who is crazy?'
    }
    return `${who} is crazy!`
  }

  static async promisedEcho (message) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return message
  }
}

module.exports = TestClass
