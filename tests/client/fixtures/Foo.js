const EventEmitter = require('events')

class Foo extends EventEmitter {
  /**
   * Constructs a foo class
   * @param {Integer} [value=0] The initial value
   */
  constructor (value = 0) {
    super()
    this._value = value
    this._callbackMap = new WeakSet()
  }

  /**
   * Standalone functions that increments the provided number by 1
   * @param {Number} [value=0] The number to be incremented
   * @returns The incremented number
   */
  static staticIncrement (value = 0) {
    return value + 1
  }

  static async staticResolvePromise (ms) {
    return new Promise(resolve => setTimeout(() => resolve('Foo')), ms)
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
      setTimeout(() =>
        reject(
          new Error(`Test Error: ${this._value}`, {
            cause: 'we need to test everything'
          }),
          ms
        )
      )
    })
  }

  // this does not really make sense for node, but could well be an API in C++
  onValue (callback) {
    this.on('value', callback)
  }

  onCheckCallbackIdentity (callback) {
    if (this._callbackMap.has(callback)) {
      callback('existing')
    } else {
      this._callbackMap.add(callback)
      callback('new')
    }
  }

  circularJson () {
    const circularObj = {}
    circularObj.circularRef = circularObj
    circularObj.list = [circularObj, circularObj]
    return circularObj
  }
}

module.exports = Foo
