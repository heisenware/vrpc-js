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


Non-intrusively binds any JS code and provides access in form of asynchronous
remote procedural callbacks (RPC).
Author: Dr. Burkhard C. Heisen (https://github.com/bheisen/vrpc)


Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2018 Dr. Burkhard C. Heisen <burkhard.heisen@xsmail.com>.

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

const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const Ajv = require('ajv')
const caller = require('caller')

class VrpcFactory {

  static addPluginPath (dirPath) {
    let absDirPath
    let relDirPath
    if (path.isAbsolute(dirPath)) {
      absDirPath = dirPath
      relDirPath = path.relative(__dirname, dirPath)
    } else {
      absDirPath = path.join(caller(), '../', dirPath)
      relDirPath = path.relative(__dirname, absDirPath)
    }
    fs.readdirSync(absDirPath).forEach(node => {
      const absNodePath = path.join(absDirPath, node)
      const type = fs.lstatSync(absNodePath)
      if (type.isDirectory()) {
        VrpcFactory.addPluginPath(absNodePath)
      } else if (type.isFile() && absNodePath.slice(-3) === '.js') {
        require('./' + path.join(relDirPath, node))
      }
    })
  }

  // TODO add white- and black-list based filtering
  // TODO add namespaces
  static register (Klass, { withNew = true, schema = null } = {}) {
    // Get all static static functions
    const staticFunctions = VrpcFactory._getStaticFunctions(Klass)
    // Inject constructor and destructor
    staticFunctions.push('__create__')
    // staticFunctions.push('__create_named__')
    staticFunctions.push('__delete__')
    const memberFunctions = VrpcFactory._getMemberFunctions(Klass)
    VrpcFactory._functionRegistry.set(
      Klass.name,
      { Klass, withNew, staticFunctions, memberFunctions, schema }
    )
  }

  static onCallback (callback) {
    VrpcFactory._callback = callback
  }

  static callRemote (jsonString) {
    const json = JSON.parse(jsonString)
    const { targetId, method, data } = json
    const args = VrpcFactory._extractDataToArray(data)
    const wrappedArgs = VrpcFactory._wrapCallbacks(args)
    // VrpcFactory._log.debug(`Calling function: ${method} with payload: ${data}`)
    switch (method) {
      // Special case: ctor
      case '__create__':
        try {
          const instance = VrpcFactory['_create'].apply(null, [targetId, ...wrappedArgs])
          const instanceId = VrpcFactory._generateId(instance)
          VrpcFactory._instances.set(
            instanceId,
            {
              targetId,
              instance,
              refCount: 1
            }
          )
          data.r = instanceId
        } catch (err) {
          data.e = err.message
        }
        break
      // Special case: named construction
      case '__create_named__':
        try {
          VrpcFactory._createNamed(targetId, wrappedArgs)
          data.r = wrappedArgs[0] // First argument is instanceId
        } catch (err) {
          data.e = err.message
        }
        break
      // Special case: dtor
      case '__delete__':
        // TODO: Implement
        break
      // Regular function call
      default:
        // Check whether targetId is a registered class
        const entry = VrpcFactory._functionRegistry.get(targetId)
        if (entry !== undefined) { // entry is class -> function is static
          const { Klass } = entry
          // TODO Think about whether to do live checking (like here) or
          // rather sticking to those functions registered before...
          if (VrpcFactory._isFunction(Klass[method])) {
            try {
              const ret = Klass[method].apply(null, wrappedArgs)
              // check if function returns promise
              if (ret && this._isFunction(ret.then)) {
                this._handlePromise(data, method, ret)
              } else data.r = ret
            } catch (err) {
              data.e = err.message
            }
          } else throw new Error(`Could not find function: ${method}`)
        } else { // is not static
          const entry = VrpcFactory._instances.get(targetId)
          if (entry === undefined) {
            throw new Error(`Could not find targetId: ${targetId}`)
          }
          const { instance } = entry
          if (VrpcFactory._isFunction(instance[method])) {
            try {
              const ret = instance[method].apply(instance, wrappedArgs)
              // check if function returns promise
              if (ret && this._isFunction(ret.then)) {
                this._handlePromise(data, method, ret)
              } else data.r = ret
            } catch (err) {
              data.e = err.message
            }
          } else throw new Error(`Could not find function: ${method}`)
        }
    }
    return JSON.stringify(json)
  }

  static getMemberFunctions (className) {
    let functions = []
    const entry = VrpcFactory._functionRegistry.get(className)
    if (entry) functions = entry.memberFunctions
    return JSON.stringify({ functions })
  }

  static getStaticFunctions (className) {
    let functions = []
    const entry = VrpcFactory._functionRegistry(className)
    if (entry) functions = entry.staticFunctions
    return JSON.stringify({ functions })
  }

  static _handlePromise (data, method, promise) {
    try {
      const cid = VrpcFactory._correlationId++ % Number.MAX_SAFE_INTEGER
      const id = `__p__${method}-${cid}`
      data.r = id
      promise
      .then(value => {
        let data = { r: value }
        const jsonString = JSON.stringify({ data, id })
        VrpcFactory._callback(jsonString)
      })
      .catch(reason => {
        const data = { e: reason }
        const jsonString = JSON.stringify({ data, id })
        VrpcFactory._callback(jsonString)
      })
    } catch (err) {
      data.e = err.message
    }
  }

  static _create (className, ...args) {
    const { Klass, withNew, schema } = VrpcFactory._getClassEntry(className)
    if (schema !== null) {
      VrpcFactory._validate(schema, ...args)
    }
    if (withNew) return new Klass(...args)
    return Klass(...args)
  }

  static _validate (schema, params) {
    if (!VrpcFactory._ajv) {
      VrpcFactory._ajv = new Ajv()
    }
    const valid = VrpcFactory._ajv.validate(schema, params)
    if (!valid) throw new Error(VrpcFactory._ajv.errorsText())
  }

  static _createNamed (className, instanceId, ...args) {
    let instance = VrpcFactory._getNamed(instanceId)
    if (instance !== undefined) {
      return instance
    }
    instance = VrpcFactory.create(className, ...args)
    instance.log = instance.log.child({ instanceId })
    VrpcFactory._instances.set(
      instanceId,
      { className, instance, refCount: 1 }
    )
    return instance
  }

  static _getNamed (instanceId) {
    const entry = VrpcFactory._instances.get(instanceId)
    if (entry !== undefined) {
      entry.refCount += 1
      return entry.instance
    }
  }

  static _deleteNamed (instanceId) {
    const entry = VrpcFactory._instances.get(instanceId)
    if (entry !== undefined) {
      entry.refCount -= 1
      if (entry.refCount === 0) {
        VrpcFactory._instances.delete(instanceId)
      }
    } else {
      // VrpcFactory should not happen
    }
  }

  static _extractDataToArray (data) {
    return Object.keys(data).sort()
    .filter(value => value[0] === 'a')
    .map(key => data[key])
  }

  static _wrapCallbacks (args) {
    let wrappedArgs = []
    args.forEach(arg => {
      // Find those args that actually need to be function callbacks
      if (typeof arg === 'string' && arg.substr(0, 5) === '__f__') {
        wrappedArgs.push((...innerArgs) => {
          let data = {}
          innerArgs.forEach((value, index) => {
            data[`a${index + 1}`] = value
          })
          const jsonString = JSON.stringify({ data, id: arg })
          VrpcFactory._callback(jsonString)
        })
      // Leave the others untouched
      } else {
        wrappedArgs.push(arg)
      }
    })
    return wrappedArgs
  }

  static _generateId (object) {
    return crypto.createHash('md5').update(JSON.stringify(object)).digest('hex')
  }

  static _getClassEntry (className) {
    const entry = VrpcFactory._functionRegistry.get(className)
    if (!entry) {
      throw new Error(`"${className}" is not a registered class`)
    }
    return entry
  }

  static _isFunction (variable) {
    if (variable) {
      const ident = {}.toString.call(variable)
      return ident === '[object Function]' || ident === '[object AsyncFunction]'
    }
    return false
  }

  static _getMemberFunctions (klass) {
    let klass_ = klass
    let fs = []
    do {
      if (klass_.prototype) {
        fs = [...fs, ...Object.getOwnPropertyNames(klass_.prototype)]
      } else {
        fs = [...fs, ...Object.getOwnPropertyNames(klass_)]
      }
      klass_ = Object.getPrototypeOf(klass_)
    } while (klass_ && klass_.name)
    // Filter out all duplicates
    return Array.from(new Set(fs))
  }

  static _getStaticFunctions (klass) {
    let klass_ = klass
    let fs = []
    do {
      fs = [...fs, ...Object.getOwnPropertyNames(klass_).filter(prop => {
        const desc = Object.getOwnPropertyDescriptor(klass_, prop)
        return !!desc && typeof desc.value === 'function'
      })]
      klass_ = Object.getPrototypeOf(klass_)
    } while (klass_ && klass_.name)
    // Filter out all duplicates
    return Array.from(new Set(fs))
  }
}

// Initialize static members
VrpcFactory._functionRegistry = new Map()
VrpcFactory._instances = new Map()
VrpcFactory._correlationId = 0

module.exports = VrpcFactory
