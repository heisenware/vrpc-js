class TestClass {
  constructor (registry = new Map()) {
    this._registry = registry
    this._callbacks = new Map()
  }

  getRegistry () {
    return this._registry
  }

  hasCategory (category) {
    return this._registry.has(category)
  }

  notifyOnNew (callback) {
    this._callbacks.set('new', callback)
  }

  notifyOnRemoved (callback) {
    this._callbacks.set('removed', callback)
  }

  addEntry (category, entry) {
    const entries = this._registry.get(category)
    if (entries) entries.push(entry)
    else {
      this._registry.set(category, [entry])
      const callback = this._callbacks.get('new')
      if (callback) callback(entry)
    }
  }

  removeEntry (category) {
    if (!this.hasCategory(category)) {
      throw new Error('Can not remove non-existing category')
    }
    const entries = this._registry.get(category)
    const entry = entries.pop()
    if (entries.size() === 0) {
      const callback = this._callbacks.get('removed')
      if (callback) callback(entry)
      this._registry.delete(category)
    }
    return entry
  }

  async callMeBack (callback) {
    await new Promise(resolve => setTimeout(resolve, 100))
    callback(100)
  }

  static crazy (who = undefined) {
    if (who === undefined) {
      return 'who is crazy'
    }
    return `${who} is crazy!`
  }
}

module.exports = TestClass
