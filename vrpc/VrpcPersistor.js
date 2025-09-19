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

/**
 * Provides a persistence layer for VRPC instances.
 *
 * This class automatically saves the constructor arguments of newly created
 * instances and re-creates them when the application restarts. It also listens
 * for an 'update' event on instances to persist their state after creation.
 *
 * @requires @heisenware/storage - This peer dependency must be installed.
 */
class VrpcPersistor {
  /**
   * Creates an instance of VrpcPersistor.
   *
   * @param {object} options Configuration options for the persistor.
   * @param {VrpcAgent} options.agentInstance The VRPC agent whose instances should be persisted.
   * @param {string} [options.dir] Optional directory for storage. Defaults to a path derived from the agent's name.
   * @param {object} [options.log] Optional logger object (e.g. console) with info, warn, and error methods.
   */
  constructor ({ agentInstance, dir, log = console }) {
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

    this._dir =
      dir ||
      `/shared/extensions/${agentInstance._agent
        .toLocaleLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')}`

    this._storage = new Storage({ log: this._log, dir: this._dir })
    this._isInitialized = this._init()

    this._log.info(
      `[VrpcPersistor] Persistence layer enabled. Storage path: ${this._dir}`
    )
  }

  /**
   * Restores all persisted instances from storage.
   *
   * It attempts to recreate each instance using its saved className and args.
   * If an instance fails to restore after several retries with exponential backoff,
   * it is considered "broken" and removed from storage to prevent startup loops.
   */
  async restore () {
    await this._isInitialized
    const allIds = this._storage.keys()
    if (allIds.length === 0) {
      this._log.info('[VrpcPersistor] No instances to restore.')
      return
    }

    this._log.info(
      `[VrpcPersistor] Found ${allIds.length} persisted instance(s) to restore.`
    )

    let failedIds = []
    const restorationPromises = allIds.map(async id => {
      try {
        const { className, args } = await this._storage.getItem(id)
        this._log.info(
          `[VrpcPersistor] Restoring instance: ${id} (${className})`
        )
        this._agentInstance.create({ className, args, instance: id })
      } catch (err) {
        this._log.warn(
          `[VrpcPersistor] Could not restore ${id}: ${err.message}. Will retry.`
        )
        failedIds.push(id)
      }
    })
    await Promise.all(restorationPromises)

    // Retry failed instances
    let trial = 0
    const MAX_TRIALS = 5
    while (failedIds.length > 0 && trial++ < MAX_TRIALS) {
      this._log.info(
        `[VrpcPersistor] Retrying ${failedIds.length} failed instance(s), attempt ${trial}.`
      )
      await new Promise(resolve => setTimeout(resolve, 1000 * trial)) // Exponential backoff
      const stillFailing = []
      for (const id of failedIds) {
        try {
          const { className, args } = await this._storage.getItem(id)
          this._agentInstance.create({ className, args, instance: id })
          this._log.info(
            `[VrpcPersistor] Successfully restored ${id} on retry.`
          )
        } catch (err) {
          stillFailing.push(id)
        }
      }
      failedIds = stillFailing
    }

    // Cleanup instances that could not be restored
    if (failedIds.length > 0) {
      this._log.warn(
        '[VrpcPersistor] The following instances could not be restored and will be removed:'
      )
      const deletionPromises = failedIds.map(id => {
        this._log.warn(` - ${id}`)
        return this._storage.removeItem(id)
      })
      try {
        await Promise.all(deletionPromises)
      } catch (err) {
        this._log.error(
          `[VrpcPersistor] Failed to delete broken instances: ${err.message}`
        )
      }
    }
  }

  /**
   * Initializes the persistor by attaching listeners to VRPC adapter events.
   * @private
   */
  async _init () {
    try {
      // Persist new instance creation
      VrpcAdapter.on('create', async ({ instance, className, args }) => {
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
    } catch (err) {
      this._log.error(
        `[VrpcPersistor] Could not initialize persistence layer: ${err.message}`
      )
      // Propagate the error to fail fast if initialization is not possible
      throw err
    }
  }

  /**
   * Saves an instance's details to storage.
   * @private
   */
  async _persist (id, className, args) {
    await this._storage.setItem(id, { className, args }, { folder: className })
  }

  /**
   * Removes an instance from storage.
   * @private
   */
  async _delete (id) {
    await this._storage.removeItem(id)
  }
}

module.exports = VrpcPersistor
