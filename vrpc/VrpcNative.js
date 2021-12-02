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
 * Client capable of creating proxy classes and objects to locally call
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
      const json = typeof data === 'string' ? JSON.parse(data) : data
      this._eventEmitter.emit(json.i, json.a)
    })
  }

  /**
   * Provides a proxy class to an existing one in the native addon
   *
   * You can use the returned class in the usual way. Static function calls
   * are forwarded to the native addon, as are any instantiations and member
   * function calls.
   * @param {String} className The name of the class
   * @returns Proxy Class
   */
  getClass (className) {
    if (!this.getAvailableClasses().includes(className)) {
      throw new Error(`Native addon does not provide class: ${className}`)
    }
    const eventEmitter = this._eventEmitter
    const adapter = this._adapter

    let invokeId = 0
    let proxyId = 0
    const classId = nanoid(4)

    const memberFuncs = new Set(
      JSON.parse(adapter.getMemberFunctions(className)).map(x => {
        const pos = x.indexOf('-')
        return pos > 0 ? x.substring(0, pos) : x
      })
    )

    const staticFuncs = new Set(
      JSON.parse(adapter.getStaticFunctions(className)).map(x => {
        const pos = x.indexOf('-')
        return pos > 0 ? x.substring(0, pos) : x
      })
    )

    function wrapArguments (context, functionName, ...args) {
      const wrapped = []
      args.forEach((x, i) => {
        // Check whether provided argument is a function
        if (VrpcNative._isFunction(x)) {
          if (functionName.startsWith('vrpcOn')) {
            const id = `__f__${context}-${functionName}`
            wrapped.push(id)
            eventEmitter.on(id, a => x.apply(null, a))
          } else {
            const id = `__f__${context}-${functionName}-${i}-${invokeId++ %
              Number.MAX_SAFE_INTEGER}`
            wrapped.push(id)
            eventEmitter.once(id, a => x.apply(null, a))
          }
        } else if (VrpcNative._isEmitter(x)) {
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
        // TODO Error handling while constructing
        const instanceId = nanoid(8)
        const { r } = JSON.parse(
          adapter.call(
            JSON.stringify({
              c: className,
              f: '__createIsolated__',
              a: [instanceId, ...args]
            })
          )
        )
        this.vrpcInstanceId = r
        this.vrpcProxyId = `${classId}-${proxyId++}`
        memberFuncs.forEach(f => {
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
        if (!memberFuncs.has('vrpcOn') && !memberFuncs.has('vrpcOff')) {
          this.vrpcOn = (functionName, ...args) => {
            if (!memberFuncs.has(functionName)) throw new Error('Bad magic')
            const { r, e } = JSON.parse(
              adapter.call(
                JSON.stringify({
                  f: functionName,
                  c: this.vrpcInstanceId,
                  a: wrapArguments(
                    this.vrpcProxyId,
                    `vrpcOn:${functionName}`,
                    ...args
                  )
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
          this.vrpcOff = functionName => {
            const id = `__f__${this.vrpcProxyId}-vrpcOn:${functionName}`
            eventEmitter.removeAllListeners(id)
          }
        }
      }
    } // Klass

    // set the name of the class
    Object.defineProperty(Klass, 'name', { value: className })

    // inject static functions
    staticFuncs.forEach(f => {
      Klass[f] = (...args) => {
        return JSON.parse(
          adapter.call(
            JSON.stringify({
              f,
              c: className,
              a: wrapArguments(className, f, ...args)
            })
          )
        ).r
      }
    })
    if (!staticFuncs.has('vrpcOn')) {
      Klass.vrpcOn = (functionName, ...args) => {
        if (!staticFuncs.has(functionName)) throw new Error('Bad magic')
        return JSON.parse(
          adapter.call(
            JSON.stringify({
              f: functionName,
              c: className,
              a: wrapArguments(className, `vrpcOn:${functionName}`, ...args)
            })
          )
        ).r
      }
    }
    return Klass
  }

  /**
   * Deletes a proxy object and its underlying instance
   * @param {Object} proxy A proxy object
   * @returns True in case of success, false otherwise
   */
  delete (proxy) {
    if (!typeof proxy === 'object' || !proxy.vrpcProxyId) {
      throw new Error('Provided argument seems not to be a VRPC proxy')
    }
    const json = {
      c: proxy.constructor.name,
      f: '__delete__',
      a: [proxy.vrpcInstanceId]
    }
    return JSON.parse(this._adapter.call(JSON.stringify(json))).r
  }

  /**
   * Secondary option to call a static function (when creation of a proxy class
   * seems to be too much overhead)
   *
   * @param {String} className The class on which the static function should be called
   * @param {String} functionName Name of the static function
   * @param  {...any} args The function arguments
   * @returns The output of the underlying static function
   */
  callStatic (className, functionName, ...args) {
    if (functionName === 'vrpcOff') {
      const id = `__f__${className}-vrpcOn:${args[0]}`
      this._eventEmitter.removeAllListeners(id)
    }
    const wrapped = []
    args.forEach((x, i) => {
      // Check whether provided argument is a function
      if (VrpcNative._isFunction(x)) {
        if (functionName.startsWith('vrpcOn')) {
          const id = `__f__${className}-${functionName}:${args[0]}`
          wrapped.push(id)
          this._eventEmitter.on(id, a => x.apply(null, a))
        } else {
          const id = `__f__${className}-${functionName}-${i}-${invokeId++ %
            Number.MAX_SAFE_INTEGER}`
          wrapped.push(id)
          this._eventEmitter.once(id, a => x.apply(null, a))
        }
      } else if (VrpcNative._isEmitter(x)) {
        const { emitter, event } = x
        const id = `__f__${className}-${functionName}-${i}-${event}`
        wrapped.push(id)
        this._eventEmitter.on(id, a => emitter.emit(event, ...a))
      } else {
        wrapped.push(x)
      }
    })
    return JSON.parse(
      this._adapter.call(
        JSON.stringify({
          c: className,
          f: functionName === 'vrpcOn' ? args[0] : functionName,
          a: wrapped
        })
      )
    ).r
  }

  /**
   * Retrieves an array of all available classes (names only)
   *
   * @return {Array.<String>} Array of class names
   */
  getAvailableClasses () {
    return JSON.parse(this._adapter.getClasses())
  }

  // private:

  static _isFunction (v) {
    const getType = {}
    return v && getType.toString.call(v) === '[object Function]'
  }

  static _isEmitter (v) {
    return (
      typeof v === 'object' &&
      v.hasOwnProperty('emitter') &&
      v.hasOwnProperty('event') &&
      typeof v.emitter === 'object' &&
      typeof v.emitter.emit === 'function'
    )
  }
}

module.exports = VrpcNative
