'use strict'

const EventEmitter = require('events')

// the contract of the design (4.1): one handler per call, a registration
// that undoes exactly this call
class Counter {
  constructor () {
    this._emitter = new EventEmitter()
    this._emitter.setMaxListeners(0)
    this.calls = 0
    this.releases = 0
  }

  /**
   * Calls back with every event the counter records
   * @param {Function} handler
   * @returns {Registration}
   */
  onEvent (handler) {
    this.calls++
    this._emitter.on('event', handler)
    return {
      [Symbol.dispose]: () => {
        this.releases++
        this._emitter.off('event', handler)
      }
    }
  }

  fire (value) {
    this._emitter.emit('event', value)
    return this._emitter.listenerCount('event')
  }

  // calls a one-shot callback with what it is given, or a BigInt
  reply (callback, value) {
    callback(value === 'big' ? 10n : value)
    return true
  }

  handlers () {
    return this._emitter.listenerCount('event')
  }
}

// an async event function with arguments; its source can end it
class Topics {
  constructor () {
    this._emitter = new EventEmitter()
    this._emitter.setMaxListeners(0)
    this._ends = new Map()
    this.calls = []
    this.releases = []
  }

  /**
   * Calls back with every message on a topic
   * @param {Function} handler
   * @param {String} topic
   * @param {Object} [options]
   * @returns {Promise<Registration>}
   */
  async onMessage (handler, topic, options = {}) {
    this.calls.push(topic)
    await new Promise(resolve => setTimeout(resolve, 5))
    this._emitter.on(topic, handler)
    let end
    const ended = new Promise((resolve, reject) => {
      end = { resolve, reject }
    })
    this._ends.set(topic, end)
    return {
      ended,
      [Symbol.asyncDispose]: async () => {
        this.releases.push(topic)
        this._emitter.off(topic, handler)
      }
    }
  }

  publish (topic, value) {
    this._emitter.emit(topic, value)
    return this._emitter.listenerCount(topic)
  }

  endTopic (topic, failure) {
    const end = this._ends.get(topic)
    if (!end) return false
    this._emitter.removeAllListeners(topic)
    if (failure) end.reject(new Error(failure))
    else end.resolve()
    return true
  }

  handlers (topic) {
    return this._emitter.listenerCount(topic)
  }
}

// the EventEmitter shape (4.1b)
class Emitting extends EventEmitter {
  constructor () {
    super()
    this.setMaxListeners(0)
    this.on('error', () => {})
  }

  fire (event, value) {
    this.emit(event, value)
    return this.listenerCount(event)
  }

  count (event) {
    return this.listenerCount(event)
  }
}

// written before registrations: an off twin and a removeListener
class Legacy {
  constructor () {
    this._emitter = new EventEmitter()
    this.calls = 0
    this.offCalls = 0
  }

  onTick (handler) {
    this.calls++
    this._emitter.on('tick', handler)
  }

  offTick (handler) {
    this.offCalls++
    this._emitter.off('tick', handler)
  }

  removeListener (event, handler) {
    this._emitter.removeListener('tick', handler)
  }

  tick (value) {
    this._emitter.emit('tick', value)
    return this._emitter.listenerCount('tick')
  }
}

// two event functions keyed alike: one callback can subscribe to both
class Channels {
  constructor () {
    this._emitter = new EventEmitter()
    this._emitter.setMaxListeners(0)
    this.calls = []
    this.offCalls = 0
  }

  /**
   * Calls back with every value on a channel
   * @param {String} channel
   * @param {Function} handler
   * @returns {Registration}
   */
  onValue (channel, handler) {
    return this._register(`value:${channel}`, handler)
  }

  /**
   * Calls back with every status change of a channel
   * @param {String} channel
   * @param {Function} handler
   * @returns {Registration}
   */
  onStatus (channel, handler) {
    return this._register(`status:${channel}`, handler)
  }

  // a remover by name only: its callback is a plain one-shot
  removeChannel (channel, done) {
    done(channel)
  }

  // an off twin as older engines call it
  offValue (channel, handler) {
    this.offCalls++
    this._emitter.off(`value:${channel}`, handler)
  }

  _register (event, handler) {
    this.calls.push(event)
    this._emitter.on(event, handler)
    return { [Symbol.dispose]: () => this._emitter.off(event, handler) }
  }

  fire (event, value) {
    this._emitter.emit(event, value)
    return this._emitter.listenerCount(event)
  }
}

// greets every subscriber with its current value
class Meter {
  constructor () {
    this._emitter = new EventEmitter()
    this._emitter.setMaxListeners(0)
    this.value = 0
    this.calls = 0
  }

  /**
   * Calls back with every value, beginning with the current one
   * @param {Function} handler
   * @returns {Registration}
   */
  onValue (handler) {
    this.calls++
    this._emitter.on('value', handler)
    return {
      [Symbol.dispose]: () => this._emitter.off('value', handler),
      greet: greeting => greeting(this.value)
    }
  }

  set (value) {
    this.value = value
    this._emitter.emit('value', value)
  }
}

module.exports = { Counter, Topics, Emitting, Legacy, Channels, Meter }
