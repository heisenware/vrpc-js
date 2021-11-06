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


Non-intrusively binds code and provides access in form of asynchronous remote
procedure calls (RPC).
Author: Dr. Burkhard C. Heisen (https://github.com/bheisen/vrpc)


Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2018 - 2021 Dr. Burkhard C. Heisen <burkhard.heisen@heisenware.com>.

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

const EventEmitter = require('events')
const { nanoid } = require('nanoid')

/**
 * Client capable of creating proxy objects and locally calling
 * functions as provided through native addons.
 */
class VrpcNative {
  /**
   * Constructs a local caller object, able to communicate to natively added C++
   *
   * @constructor
   * @param {Object} adapter An adapter object, typically loaded as native addon
   */
  constructor (adapter) {
    this._adapter = adapter
    this._eventEmitter = new EventEmitter()

    // register callback handler
    this._adapter.onCallback(data => {
      // when a javascript VrpcAdapter was used we will receive an object, in
      // all other cases data will be a string (crossing language boundaries)
      const json =
        typeof data === 'string' ? JSON.parse(data) : data
        console.log('EMITTING', json)
      this._eventEmitter.emit(json.i, json.a)
    })
  }

  getClass (className) {
    if (!this.getAvailableClasses().includes(className)) {
      throw new Error(`Native addon does not provide class: ${className}`)
    }
    const eventEmitter = this._eventEmitter
    const adapter = this._adapter

    let invokeId = 0
    let proxyId = 0
    const classId = nanoid(4)

    const functions = new Set(
      JSON.parse(adapter.getMemberFunctions(className)).map(x => {
        const pos = x.indexOf('-')
        return pos > 0 ? x.substring(0, pos) : x
      })
    )

    function isFunction (v) {
      const getType = {}
      return v && getType.toString.call(v) === '[object Function]'
    }

    function isEmitter (v) {
      return (
        typeof v === 'object' &&
        v.hasOwnProperty('emitter') &&
        v.hasOwnProperty('event') &&
        typeof v.emitter === 'object' &&
        typeof v.emitter.emit === 'function'
      )
    }

    function wrapArguments (context, functionName, ...args) {
      const wrapped = []
      args.forEach((x, i) => {
        // Check whether provided argument is a function
        if (isFunction(x)) {
          const id = functionName.startsWith('__on')
            ? `__f__${context}-${functionName}-${i}`
            : `__f__${context}-${functionName}-${i}-${invokeId++ %
                Number.MAX_SAFE_INTEGER}`
          wrapped.push(id)
          eventEmitter.once(id, a => x.apply(null, a))
        } else if (isEmitter(x)) {
          const { emitter, event } = x
          const id = `__f__${context}-${functionName}-${i}-${event}`
          wrapped.push(id)
          eventEmitter.on(id, a => emitter.emit(event, ...a))
        } else {
          wrapped.push(x)
        }
      })
      return wrapped
    }

    const Klass = class {
      constructor (...args) {
        // Create remote instance
        // TODO this is a deep-copy, needed for the mutative nature of ".call"
        // Check if this is needed, or not even buggy (return via param in C++ ??)
        // Error handling while constructing
        const { r } = JSON.parse(
          adapter.call(
            JSON.stringify({
              c: className,
              f: '__create__',
              a: args
            })
          )
        )
        this.vrpcInstanceId = r
        this.vrpcProxyId = `${classId}-${proxyId++}`
        functions.forEach(f => {
          this[f] = (...args) => {
            const { r, e } = JSON.parse(
              adapter.call(
                JSON.stringify({
                  f,
                  c: this.vrpcInstanceId,
                  a: wrapArguments(this.vrpcProxyId, f, ...args)
                })
              )
            )
            if (e) throw new Error(e)
            // Handle functions returning a promise
            if (typeof r === 'string' && r.substr(0, 5) === '__p__') {
              return new Promise((resolve, reject) => {
                eventEmitter.once(r, data => {
                  if (data.e) reject(new Error(data.e))
                  else resolve(data.r)
                })
              })
            }
            return r
          }
        })
        if (!functions.has('on')) {
          console.log('injecting magic')
          this.on = (event, listener) => {
            if (!functions.has(event)) throw new Error('Bad magic')
            const { r, e } = JSON.parse(
              adapter.call(
                JSON.stringify({
                  f: event,
                  c: this.vrpcInstanceId,
                  a: wrapArguments(this.vrpcProxyId, `__on${event}`, listener)
                })
              )
            )
            if (e) throw new Error(e)
            // Handle functions returning a promise
            if (typeof r === 'string' && r.substr(0, 5) === '__p__') {
              return new Promise((resolve, reject) => {
                eventEmitter.once(r, data => {
                  if (data.e) reject(new Error(data.e))
                  else resolve(data.r)
                })
              })
            }
            return r
          }
        }
      }
    } // Klass

    // set the name of the class
    Object.defineProperty(Klass, 'name', { value: className })

    // inject static functions
    JSON.parse(adapter.getStaticFunctions(className)).forEach(f => {
      Klass[f] = (...args) => {
        const json = {
          f,
          c: className,
          a: wrapArguments(className, f, ...args)
        }
        return JSON.parse(adapter.call(JSON.stringify(json))).r
      }
    })
    return Klass
  }

  getInstance ({ className, instance }) {
    const json = {
      context: className,
      method: '__getNamed__',
      data: { _1: instance }
    }
    return this._createProxy(className, json)
  }

  delete ({ className, instance }) {
    let context
    if (typeof instance === 'string') {
      context = instance
    } else if (typeof instance === 'object') {
      context = instance._targetId
    }
    const json = {
      context: className,
      method: '__delete__',
      data: { _1: context }
    }
    return JSON.parse(this._adapter.call(JSON.stringify(json))).data.r
  }

  callStatic (className, functionName, ...args) {
    const json = {
      context: className,
      method: functionName,
      data: this._wrapArguments(className, functionName, ...args)
    }
    return JSON.parse(this._adapter.call(JSON.stringify(json))).data.r
  }

  /**
   * Retrieves an array of all available classes (names only)
   *
   * @return {Array.<String>} Array of class names
   */
  getAvailableClasses () {
    return JSON.parse(this._adapter.getClasses())
  }
}

module.exports = VrpcNative
