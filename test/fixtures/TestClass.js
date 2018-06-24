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

  async waitForMe (ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms))
    return ms
  }

  async callMeBackLater (callback, ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms))
    callback(ms)
  }

  static crazy (who = undefined) {
    if (who === undefined) {
      return 'who is crazy?'
    }
    return `${who} is crazy!`
  }
}

module.exports = TestClass
