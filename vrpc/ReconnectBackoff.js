/**
 * Paces the reconnects of an mqtt.js client after refused CONNACKs.
 *
 * mqtt.js retries at a fixed `reconnectPeriod`. A connection the broker
 * refuses - a stale credential, an authorization service that is away -
 * would knock once per period for as long as it lives, and an
 * authorization service may block a client id that knocks too often. So
 * every refusal doubles the wait up to `max`, and a successful connect
 * restores the base. The refusal itself stays visible as the client's
 * 'error' event, so a host can renew its credentials and `hurry()`.
 *
 * mqtt.js reads `reconnectPeriod` only when it arms its reconnect
 * interval, once per outage; re-arming it takes the internal
 * `_clearReconnect` / `_setupReconnect`. Without them (a future mqtt.js)
 * a new period applies from the next outage on.
 */

const REFUSED = /^Connection refused/

class ReconnectBackoff {
  /**
   * @param {Object} client an mqtt.js client created with
   *   `reconnectOnConnackError: true`
   * @param {Object} [options]
   * @param {Number} [options.max=30000] longest wait in ms between attempts
   */
  constructor (client, { max = 30000 } = {}) {
    this._client = client
    this._base = client.options.reconnectPeriod
    this._max = Math.max(max, this._base)
    this._next = this._base
    client.on('error', err => {
      if (ReconnectBackoff.isRefusal(err)) this._slowDown()
    })
    client.on('connect', () => this._restore())
  }

  /** Whether an mqtt.js error is a refused CONNACK. */
  static isRefusal (err) {
    return (
      !!err && typeof err.code === 'number' && REFUSED.test(err.message || '')
    )
  }

  /** The wait in ms before the next attempt. */
  get period () {
    return this._client.options.reconnectPeriod
  }

  /**
   * New credentials: the next attempt follows within the base period
   * instead of waiting out the back-off. A live connection stays as it is.
   */
  hurry () {
    this._restore()
    const client = this._client
    if (client.connected || client.disconnecting || !client.reconnecting) return
    if (typeof client._clearReconnect !== 'function') return
    client._clearReconnect()
    client._setupReconnect()
  }

  // Runs inside the CONNACK handler's 'error' emit: the handler re-arms
  // the reconnect interval right after (reconnectOnConnackError), with the
  // period set here
  _slowDown () {
    const client = this._client
    client.options.reconnectPeriod = this._next
    this._next = Math.min(this._next * 2, this._max)
    if (typeof client._clearReconnect === 'function') client._clearReconnect()
  }

  _restore () {
    this._next = this._base
    this._client.options.reconnectPeriod = this._base
  }
}

module.exports = ReconnectBackoff
