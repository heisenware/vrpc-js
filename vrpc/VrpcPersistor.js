/*
__/\\\________/\\\____/\\\\\\\\\______/\\\\\\\\\\\\\_________/\\\\\\\\\_
__\/\\\_______\/\\\__/\\\///////\\\___\/\\\/////////\\\____/\\\////////__
 __\//\\\______/\\\__\/\\\_____\/\\\___\/\\\_______\/\\\__/\\\/___________
  ___\//\\\____/\\\___\/\\\\\\\\\\\/____\/\\\\\\\\\\\\\/__/\\\_____________
   ____\//\\\__/\\\____\/\\\//////\\\____\/\\\/////////___\/\\\_____________
    _____\//\\\/\\\_____\/\\\____\//\\\___\/\\\____________\//\\\____________
     ______\//\\\\\______\/\\\_____\//\\\__\/\\\_____________\///\\\__________
      _______\//\\\_______\/\\\______\//\\\_\/\\\_______________\////\\\\\\\\\_
       ________\///________\///________\///__\///___________________\/////////__

Non-intrusively adapts code and provides access in form of asynchronous remote
procedure calls (RPC).
Author: Dr. Burkhard C. Heisen (https://github.com/heisenware/vrpc)

Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2018 - 2022 Dr. Burkhard C. Heisen <burkhard.heisen@heisenware.com>.

Permission is hereby  granted, free of charge, to any  person obtaining a copy
of this software and associated  documentation files (the "Software"), to deal
in the Software  without restriction, including without  limitation the rights
to  use, copy,  modify, merge,  publish, distribute,  sublicense, and/or  sell
copies  of  the Software,  and  to  permit persons  to  whom  the Software  is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE  IS PROVIDED "AS  IS", WITHOUT WARRANTY  OF ANY KIND,  EXPRESS OR
IMPLIED,  INCLUDING BUT  NOT  LIMITED TO  THE  WARRANTIES OF  MERCHANTABILITY,
FITNESS FOR  A PARTICULAR PURPOSE AND  NONINFRINGEMENT. IN NO EVENT  SHALL THE
AUTHORS  OR COPYRIGHT  HOLDERS  BE  LIABLE FOR  ANY  CLAIM,  DAMAGES OR  OTHER
LIABILITY, WHETHER IN AN ACTION OF  CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE  OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const VrpcAdapter = require('./VrpcAdapter')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Provides a persistence layer for VRPC instances.
 *
 * This class automatically saves the constructor arguments of newly created
 * shared instances and re-creates them when the application restarts. It also
 * listens for an 'update' event on instances to persist their state after
 * creation (the event's payload is used as the single constructor argument
 * upon restoration). Isolated instances belong to the connection that
 * created them and are never persisted.
 *
 * A record that cannot be restored is never deleted: it is quarantined
 * (marked with the error, kept on disk), retried once per start so it heals
 * by itself once the cause is fixed, and can be inspected (`status`), retried
 * (`retry`) or removed on purpose (`forget`).
 *
 * @requires @heisenware/storage - This peer dependency must be installed.
 * Storage 1.x (synchronous constructor) and >= 2.x (async `Storage.open`)
 * are both supported; the layer is opened lazily and every operation waits
 * for it.
 */
class VrpcPersistor {
  /**
   * Creates an instance of VrpcPersistor.
   *
   * @param {object} options Configuration options for the persistor.
   * @param {VrpcAgent} options.agentInstance The VRPC agent whose instances should be persisted.
   * @param {string} [options.dir] Optional directory for storage. Defaults to a path derived from the agent's name.
   * @param {object} [options.log] Optional logger object (e.g. console) with info, warn, and error methods.
   * @param {number} [options.retries=5] How often a record that fails on a fresh restore is retried before it is quarantined.
   * @param {number} [options.retryDelay=1000] Milliseconds between retries, multiplied by the attempt number.
   */
  constructor ({
    agentInstance,
    dir,
    log = console,
    retries = 5,
    retryDelay = 1000
  }) {
    let Storage
    try {
      Storage = require('@heisenware/storage')
    } catch (err) {
      throw new Error(
        "The '@heisenware/storage' package is required to use VrpcPersistor. Please install it (`npm i @heisenware/storage`) and add it to your project's dependencies."
      )
    }

    this._agentInstance = agentInstance
    this._log = log
    this._retries = retries
    this._retryDelay = retryDelay

    this._dir =
      dir ||
      `/shared/extensions/${agentInstance._agent
        .toLocaleLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')}`

    this._storage = null
    this._isInitialized = this._init(Storage)

    this._log.info(
      `[VrpcPersistor] Persistence layer enabled. Storage path: ${this._dir}`
    )
  }

  /**
   * Restores all persisted instances from storage.
   *
   * A record seen for the first time is retried with a growing delay; a
   * record that still fails is quarantined: it stays on disk, marked with
   * the error and the number of attempts. A quarantined record gets one
   * attempt per restore, so it heals on the next start once its cause is
   * fixed, and never turns a start into a retry storm.
   *
   * @returns {Promise<{restored: string[], quarantined: Array<{instance: string, className: string, error: string, attempts: number, since: string}>}>}
   */
  async restore () {
    await this._isInitialized
    const summary = { restored: [], quarantined: [] }
    const allIds = this._storage.keys()
    if (allIds.length === 0) {
      this._log.info('[VrpcPersistor] No instances to restore.')
      return summary
    }
    this._log.info(
      `[VrpcPersistor] Found ${allIds.length} persisted instance(s) to restore.`
    )

    let failing = []
    for (const id of allIds) {
      const record = await this._storage.getItem(id)
      if (!record || !record.className) {
        this._log.warn(`[VrpcPersistor] Skipping ${id}: record is missing or broken.`)
        continue
      }
      if (record.restoreError) {
        // quarantined: one attempt per start
        const err = this._tryCreate(id, record)
        if (!err) {
          summary.restored.push(id)
          this._log.info(
            `[VrpcPersistor] Healed ${id} (${record.className}) after ${record.restoreError.attempts} failed attempt(s).`
          )
        } else {
          summary.quarantined.push(await this._quarantine(id, record, err, 1))
        }
        continue
      }
      this._log.info(`[VrpcPersistor] Restoring instance: ${id} (${record.className})`)
      const err = this._tryCreate(id, record)
      if (!err) {
        summary.restored.push(id)
      } else {
        this._log.warn(
          `[VrpcPersistor] Could not restore ${id}: ${err.message}. Will retry.`
        )
        failing.push({ id, record, err })
      }
    }

    // Retry fresh failures with a growing delay
    let trial = 0
    while (failing.length > 0 && trial++ < this._retries) {
      this._log.info(
        `[VrpcPersistor] Retrying ${failing.length} failed instance(s), attempt ${trial} of ${this._retries}.`
      )
      await sleep(this._retryDelay * trial)
      const stillFailing = []
      for (const entry of failing) {
        const err = this._tryCreate(entry.id, entry.record)
        if (!err) {
          summary.restored.push(entry.id)
          this._log.info(`[VrpcPersistor] Successfully restored ${entry.id} on retry.`)
        } else {
          stillFailing.push({ ...entry, err })
        }
      }
      failing = stillFailing
    }

    for (const { id, record, err } of failing) {
      summary.quarantined.push(
        await this._quarantine(id, record, err, 1 + this._retries)
      )
    }

    this._log.info(
      `[VrpcPersistor] Restored ${summary.restored.length} of ${allIds.length} instance(s)` +
        (summary.quarantined.length > 0
          ? `, ${summary.quarantined.length} quarantined: ${summary.quarantined
              .map(x => `${x.instance} (${x.className}): ${x.error}`)
              .join('; ')}`
          : '.')
    )
    return summary
  }

  /**
   * Lists every persisted record with its quarantine mark, if any.
   *
   * @returns {Promise<{dir: string, instances: Array<{instance: string, className: string, restoreError: (object|null)}>}>}
   */
  async status () {
    await this._isInitialized
    const instances = []
    for (const id of this._storage.keys()) {
      const record = await this._storage.getItem(id)
      if (!record) continue
      instances.push({
        instance: id,
        className: record.className,
        restoreError: record.restoreError || null
      })
    }
    return { dir: this._dir, instances }
  }

  /**
   * Attempts one more time to restore a persisted instance (quarantined or
   * not). A success clears the quarantine mark, a failure updates it.
   *
   * @param {string} id The instance id
   * @returns {Promise<boolean>} true when the instance exists afterwards
   */
  async retry (id) {
    await this._isInitialized
    const record = await this._storage.getItem(id)
    if (!record) throw new Error(`Unknown persisted instance: ${id}`)
    const err = this._tryCreate(id, record)
    if (!err) {
      this._log.info(`[VrpcPersistor] Restored ${id} (${record.className}) on request.`)
      return true
    }
    await this._quarantine(id, record, err, 1)
    return false
  }

  /**
   * Removes a persisted record on purpose, the only way a record leaves the
   * storage other than the deletion of a live instance.
   *
   * @param {string} id The instance id
   * @returns {Promise<boolean>} true
   */
  async forget (id) {
    await this._isInitialized
    const record = await this._storage.getItem(id)
    if (!record) throw new Error(`Unknown persisted instance: ${id}`)
    await this._storage.removeItem(id)
    this._log.info(`[VrpcPersistor] Forgot ${id} (${record.className}).`)
    return true
  }

  /**
   * Initializes the persistor by attaching listeners to VRPC adapter events.
   * @private
   */
  async _init (Storage) {
    try {
      // Listeners go first and synchronously: an instance created right
      // after construction must be caught. The operations they trigger wait
      // for the storage layer opened below.

      // Persist new instance creation (a restore passes here too, which
      // rewrites the record and thereby clears a quarantine mark)
      VrpcAdapter.on('create', async ({ instance, className, args, isIsolated }) => {
        if (isIsolated) {
          this._log.info(
            `[VrpcPersistor] Not persisting isolated instance: ${instance} (${className})`
          )
          return
        }
        this._log.info(
          `[VrpcPersistor] Persisting new instance: ${instance} (${className})`
        )
        try {
          await this._persist(instance, className, args)

          // Listen for 'update' events on the newly created object to persist changes
          const obj = VrpcAdapter.getInstance(instance)
          // Ensure the object is an event emitter
          if (obj && typeof obj.on === 'function') {
            obj.on('update', data => {
              this._log.info(
                `[VrpcPersistor] Persisting update for: ${instance} (${className})`
              )
              // The convention here is that the 'update' event data can be used
              // as constructor arguments upon restoration.
              this._persist(instance, className, [data]).catch(err =>
                this._log.warn(
                  `[VrpcPersistor] Failed persisting update of ${instance} (${className}): ${err.message}`
                )
              )
            })
          }
        } catch (err) {
          this._log.warn(
            `[VrpcPersistor] Failed persisting new instance ${instance} (${className}): ${err.message}`
          )
        }
      })

      // Persist instance deletion
      VrpcAdapter.on('delete', ({ instance, className }) => {
        this._log.info(
          `[VrpcPersistor] Deleting persisted instance: ${instance} (${className})`
        )
        this._delete(instance).catch(err =>
          this._log.warn(
            `[VrpcPersistor] Failed to delete persisted instance ${instance}: ${err.message}`
          )
        )
      })

      // storage >= 2 constructs through the async factory only; 1.x has a
      // synchronous constructor. No watcher: this persistor is the sole
      // writer of its directory.
      this._storage =
        typeof Storage.open === 'function'
          ? await Storage.open({ dir: this._dir, log: this._log, watch: false })
          : new Storage({ dir: this._dir, log: this._log })
    } catch (err) {
      this._log.error(
        `[VrpcPersistor] Could not initialize persistence layer: ${err.message}`
      )
      // Propagate the error to fail fast if initialization is not possible
      throw err
    }
  }

  /**
   * Creates the instance from its record; returns the error instead of
   * throwing (an existing instance counts as success).
   * @private
   */
  _tryCreate (id, { className, args }) {
    try {
      this._agentInstance.create({ className, args, instance: id })
      return null
    } catch (err) {
      return err
    }
  }

  /**
   * Marks a record as not restorable and keeps it.
   * @private
   */
  async _quarantine (id, record, err, attempts) {
    const previous = record.restoreError || { attempts: 0, since: new Date().toISOString() }
    const restoreError = {
      message: err.message,
      at: new Date().toISOString(),
      since: previous.since,
      attempts: previous.attempts + attempts
    }
    await this._storage.setItem(
      id,
      { className: record.className, args: record.args, restoreError },
      { folder: record.className }
    )
    this._log.warn(
      `[VrpcPersistor] Quarantined ${id} (${record.className}) after ${restoreError.attempts} attempt(s): ${err.message}. The record is kept; fix the cause and restart, or call retry()/forget().`
    )
    return {
      instance: id,
      className: record.className,
      error: err.message,
      attempts: restoreError.attempts,
      since: restoreError.since
    }
  }

  /**
   * Saves an instance's details to storage.
   * @private
   */
  async _persist (id, className, args) {
    await this._isInitialized
    await this._storage.setItem(id, { className, args }, { folder: className })
  }

  /**
   * Removes an instance from storage.
   * @private
   */
  async _delete (id) {
    await this._isInitialized
    await this._storage.removeItem(id)
  }
}

module.exports = VrpcPersistor
