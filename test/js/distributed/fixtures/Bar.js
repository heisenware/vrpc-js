const EventEmitter = require('events')

class Bar extends EventEmitter {
  constructor (value = 0) {
    super()
    this._value = value
  }

  static staticIncrement (value = 0) {
    return value + 1
  }

  static async staticResolvePromise (ms) {
    return new Promise(resolve => setTimeout(() => resolve('Bar')), ms)
  }

  static async staticRejectPromise (ms) {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(`Test Error: ${ms}`), ms))
    })
  }

  static staticCallback (callback, ms) {
    setTimeout(() => callback(null, ms), ms)
  }

  increment () {
    this._value += 1
    this.emit('value', this._value)
    return this._value
  }

  reset () {
    this._value = 0
  }

  callback (callback, ms) {
    setTimeout(() => callback(null, this._value), ms)
  }

  async resolvePromise (ms) {
    return new Promise(resolve => setTimeout(() => resolve(this._value)), ms)
  }

  async rejectPromise (ms) {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(`Test Error: ${this._value}`), ms))
    })
  }
}

module.exports = Bar
