'use strict'

const EventEmitter = require('events')

// A sensor whose functions declare whether calling them changes anything
class Sensor {
  constructor () {
    this._value = 21.5
    this._offset = 0
  }

  /**
   * The latest reading
   *
   * @nosideeffects
   * @returns {number} the value
   */
  read () {
    return this._value + this._offset
  }

  /**
   * Shifts every later reading
   *
   * @modifies {this}
   * @param {number} offset the shift
   */
  calibrate (offset) {
    this._offset = offset
  }

  /**
   * Restarts the device
   */
  restart () {}

  // undocumented
  status () {
    return 'ok'
  }

  /**
   * The sensors the class knows
   *
   * @nosideeffects
   * @returns {string[]} their names
   */
  static list () {
    return []
  }
}

// An emitter that keeps Node's functions, and one that replaces `on`
class Meter extends EventEmitter {
  /**
   * The total
   *
   * @nosideeffects
   */
  total () {
    return 0
  }
}

class LoudMeter extends EventEmitter {
  on (event, listener) {
    this.emit('subscribed', event)
    return super.on(event, listener)
  }
}

module.exports = { Sensor, Meter, LoudMeter }
