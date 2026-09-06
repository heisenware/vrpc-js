/**
 * Retries MQTT subscriptions the broker refused (SUBACK qos=128).
 *
 * A refusal is not always final: the broker asks an authorization
 * service for every subscription, and while that service is unavailable
 * it refuses everything. An agent or client that subscribed in such a
 * window used to stay deaf for good - connected, looking online, never
 * receiving a message on the refused topic. This retries with a growing
 * delay until the broker grants the topic, and forgets everything when a
 * (re)connect subscribes afresh anyway.
 *
 * Browser-safe: timers only.
 */
class SubscribeRetrier {
  /**
   * @param {Object} options
   * @param {Function} options.subscribe (topics: String[], options: Object) => void
   *   the subscribe call to repeat; its own refusal handling schedules again
   * @param {Object} [options.log] logger with warn()
   * @param {Number} [options.initialDelayMs=1000]
   * @param {Number} [options.maxDelayMs=30000]
   */
  constructor ({ subscribe, log, initialDelayMs = 1000, maxDelayMs = 30000 }) {
    this._subscribe = subscribe
    this._log = log
    this._initialDelayMs = initialDelayMs
    this._maxDelayMs = maxDelayMs
    this._pending = new Map() // options key -> { options, topics: Set }
    this._inFlight = new Set() // topics of the retry round under way
    this._timer = null
    this._attempt = 0
  }

  /** Topics waiting for a retry. */
  get pending () {
    const topics = []
    for (const group of this._pending.values()) topics.push(...group.topics)
    return topics
  }

  /** The delay the next retry will wait, in ms. */
  get nextDelayMs () {
    return Math.min(this._initialDelayMs * 2 ** this._attempt, this._maxDelayMs)
  }

  /**
   * Remembers refused topics and arms the retry timer if none is armed.
   *
   * @param {String[]} topics
   * @param {Object} [options] the subscribe options to repeat with
   */
  schedule (topics, options = {}) {
    if (!topics || topics.length === 0) return
    for (const topic of topics) this._inFlight.delete(topic)
    const key = JSON.stringify(options)
    const group = this._pending.get(key) || { options, topics: new Set() }
    for (const topic of topics) group.topics.add(topic)
    this._pending.set(key, group)
    if (this._timer) return
    const delayMs = this.nextDelayMs
    if (this._log) {
      this._log.warn(
        `Retrying ${this.pending.length} refused subscription(s) in ${delayMs} ms: ${this.pending}`
      )
    }
    this._timer = setTimeout(() => this._fire(), delayMs)
  }

  /**
   * Called with the topics a subscribe granted: once nothing is pending
   * any more, the backoff starts over.
   */
  granted (topics) {
    for (const topic of topics) this._inFlight.delete(topic)
    for (const group of this._pending.values()) {
      for (const topic of topics) group.topics.delete(topic)
    }
    for (const [key, group] of this._pending) {
      if (group.topics.size === 0) this._pending.delete(key)
    }
    // nothing waiting, nothing under way, nothing armed: start over
    if (this._pending.size === 0 && this._inFlight.size === 0 && !this._timer) {
      this._attempt = 0
    }
  }

  /** Drops every pending retry: a (re)connect subscribes afresh, an end() stops. */
  cancel () {
    clearTimeout(this._timer)
    this._timer = null
    this._pending.clear()
    this._inFlight.clear()
    this._attempt = 0
  }

  _fire () {
    this._timer = null
    this._attempt += 1
    const groups = Array.from(this._pending.values())
    this._pending.clear()
    for (const { topics } of groups) {
      for (const topic of topics) this._inFlight.add(topic)
    }
    for (const { options, topics } of groups) {
      try {
        this._subscribe(Array.from(topics), options)
      } catch (err) {
        if (this._log) this._log.warn(`Retrying subscription failed: ${err.message}`)
        this.schedule(Array.from(topics), options)
      }
    }
  }
}

module.exports = SubscribeRetrier
