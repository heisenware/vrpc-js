'use strict'

// Two classes in one source that share function names, and a function
// outside both: each `@private` hides its own function, nothing else.

class Gate {
  /**
   * Opens the gate
   */
  open () {
    return 'open'
  }

  /**
   * Starts the gate - private on the barrier below, public here
   */
  start () {
    return 'started'
  }

  /**
   * Adjusts the motor; only the gate's own code calls it
   *
   * @private
   */
  calibrate () {
    return 'calibrated'
  }

  /**
   * Resets every gate
   *
   * @access private
   */
  static reset () {
    return 'reset'
  }

  /**
   * Counts the gates
   */
  static count () {
    return 1
  }

  /**
   * Helps, by its name
   */
  _helper () {
    return 'helped'
  }

  #secret () {
    return 'secret'
  }

  /**
   * Tells the secret
   */
  reveal () {
    return this.#secret()
  }
}

class Barrier {
  /**
   * Starts the barrier
   *
   * @private
   */
  start () {
    return 'started'
  }

  /**
   * Opens every barrier - a static function, the gate's open is a member
   *
   * @private
   */
  static open () {
    return 'open'
  }

  /**
   * Lowers the barrier
   */
  lower () {
    return 'lowered'
  }
}

/**
 * Counts nothing: a function outside every class
 *
 * @private
 */
function count () {
  return 0
}

module.exports = { Gate, Barrier, count }
