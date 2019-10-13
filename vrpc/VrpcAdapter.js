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
Copyright (c) 2018 - 2019 Dr. Burkhard C. Heisen <burkhard.heisen@xsmail.com>.

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
const shortid = require('shortid')

class VrpcAdapter {

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
        VrpcAdapter.addPluginPath(absNodePath)
      } else if (type.isFile() && absNodePath.slice(-3) === '.js') {
        require('./' + path.join(relDirPath, node))
      }
    })
  }

  // TODO add white- and black-list based filtering
  // TODO add namespaces
  static register (
    Klass,
    { onlyPublic = true, withNew = true, schema = null } = {}
  ) {
    // Get all static static functions
    let staticFunctions = VrpcAdapter._getStaticFunctions(Klass)
    if (onlyPublic) {
      staticFunctions = staticFunctions.filter(f => !f.startsWith('_'))
    }
    // Inject constructor and destructor
    staticFunctions.push('__create__')
    staticFunctions.push('__delete__')
    staticFunctions.push('__createNamed__')
    staticFunctions.push('__getNamed__')
    let memberFunctions = VrpcAdapter._getMemberFunctions(Klass)
    if (onlyPublic) {
      memberFunctions = memberFunctions.filter(f => !f.startsWith('_'))
    }
    VrpcAdapter._functionRegistry.set(
      Klass.name,
      { Klass, withNew, staticFunctions, memberFunctions, schema }
    )
  }

  static onCallback (callback) {
    VrpcAdapter._callback = callback
  }

  static callRemote (jsonString) {
    const json = JSON.parse(jsonString)
    VrpcAdapter.call(json)
    return JSON.stringify(json)
  }

  static call (json) {
    const { targetId, method, data } = json
    const wrappedArgs = VrpcAdapter._wrapCallbacks(json)
    // VrpcAdapter._log.debug(`Calling function: ${method} with payload: ${data}`)
    switch (method) {
      // Special case: ctor
      case '__create__':
        try {
          const instance = VrpcAdapter._create(targetId, ...wrappedArgs)
          const instanceId = shortid.generate()
          VrpcAdapter._instances.set(instanceId, { targetId, instance })
          data.r = instanceId
        } catch (err) {
          data.e = err.message
        }
        break
      // Special case: dtor
      case '__delete__':
        try {
          const instanceId = wrappedArgs[0]
          const entry = VrpcAdapter._instances.get(instanceId)
          if (entry !== undefined) {
            VrpcAdapter._instances.delete(instanceId)
            data.r = instanceId
          } else {
            data.r = undefined
          }
        } catch (err) {
          data.e = err.message
        }
        break
        // Special case: named construction
      case '__createNamed__':
        try {
          VrpcAdapter._createNamed(targetId, ...wrappedArgs)
          data.r = wrappedArgs[0] // First argument is instanceId
        } catch (err) {
          data.e = err.message
        }
        break
      case '__getNamed__': // Special case: retrieval of known instance
        try {
          const instanceId = wrappedArgs[0]
          const instance = VrpcAdapter._getNamed(instanceId)
          if (instance) data.r = instanceId
          else data.e = `Instance with id: ${instanceId} does not exist`
        } catch (err) {
          data.e = err.message
        }
        break
      // Regular function call
      default: {
        // Check whether targetId is a registered class
        const entry = VrpcAdapter._functionRegistry.get(targetId)
        if (entry !== undefined) { // entry is class -> function is static
          const { Klass } = entry
          // TODO Think about whether to do live checking (like here) or
          // rather sticking to those functions registered before...
          if (VrpcAdapter._isFunction(Klass[method])) {
            try {
              const ret = Klass[method].apply(null, wrappedArgs)
              // check if function returns promise
              if (ret && this._isFunction(ret.then)) {
                this._handlePromise(json, method, ret)
              } else data.r = ret
            } catch (err) {
              data.e = err.message
            }
          } else throw new Error(`Could not find function: ${method}`)
        } else { // is not static
          const entry = VrpcAdapter._instances.get(targetId)
          if (entry === undefined) {
            throw new Error(`Could not find targetId: ${targetId}`)
          }
          const { instance } = entry
          if (VrpcAdapter._isFunction(instance[method])) {
            try {
              const ret = instance[method].apply(instance, wrappedArgs)
              // check if function returns promise
              if (ret && this._isFunction(ret.then)) {
                this._handlePromise(json, method, ret)
              } else data.r = ret
            } catch (err) {
              data.e = err.message
            }
          } else throw new Error(`Could not find function: ${method}`)
        }
      }
    }
  }

  static getClassesArray () {
    return Array.from(VrpcAdapter._functionRegistry.keys())
  }

  static getInstancesArray (className) {
    const instances = []
    VrpcAdapter._instances.forEach((value, key) => {
      if (value.className === className) instances.push(key)
    })
    return instances
  }

  static getMemberFunctionsArray (className) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (entry) return entry.memberFunctions
    return []
  }

  static getMemberFunctions (className) {
    return JSON.stringify({
      functions: VrpcAdapter.getMemberFunctionsArray(className)
    })
  }

  static getStaticFunctionsArray (className) {
    const entry = VrpcAdapter._functionRegistry.get(className)
    if (entry) return entry.staticFunctions
    return []
  }

  static getStaticFunctions (className) {
    return JSON.stringify({
      functions: VrpcAdapter.getStaticFunctionsArray(className)
    })
  }

  static _handlePromise (json, method, promise) {
    try {
      const cid = VrpcAdapter._correlationId++ % Number.MAX_SAFE_INTEGER
      const id = `__p__${method}-${cid}`
      json.data.r = id
      promise
        .then(value => {
          const data = { r: value }
          const promiseJson = Object.assign({}, json, { data, id })
          VrpcAdapter._callback(JSON.stringify(promiseJson), promiseJson)
        })
        .catch(err => {
          const data = { e: err.message }
          const promiseJson = Object.assign({}, json, { data, id })
          VrpcAdapter._callback(JSON.stringify(promiseJson), promiseJson)
        })
    } catch (err) {
      json.data.e = err.message
    }
  }

  static _create (className, ...args) {
    const { Klass, withNew, schema } = VrpcAdapter._getClassEntry(className)
    if (schema !== null) {
      VrpcAdapter._validate(schema, ...args)
    }
    if (withNew) return new Klass(...args)
    return Klass(...args)
  }

  static _validate (schema, params) {
    if (!VrpcAdapter._ajv) {
      VrpcAdapter._ajv = new Ajv()
    }
    const valid = VrpcAdapter._ajv.validate(schema, params)
    if (!valid) throw new Error(VrpcAdapter._ajv.errorsText())
  }

  static _createNamed (className, instanceId, ...args) {
    let instance = VrpcAdapter._getNamed(instanceId)
    if (instance !== undefined) {
      return instance
    }
    instance = VrpcAdapter._create(className, ...args)
    VrpcAdapter._instances.set(instanceId, { className, instance })
    return instance
  }

  static _getNamed (instanceId) {
    const entry = VrpcAdapter._instances.get(instanceId)
    if (entry !== undefined) {
      return entry.instance
    }
  }

  static _delete (instanceId) {
    const entry = VrpcAdapter._instances.get(instanceId)
    if (entry !== undefined) {
      VrpcAdapter._instances.delete(instanceId)
      return true
    }
    return false
  }

  static _extractDataToArray (data) {
    return Object.keys(data).sort()
      .filter(value => value[0] === '_')
      .map(key => data[key])
  }

  static _wrapCallbacks (json) {
    const args = VrpcAdapter._extractDataToArray(json.data)
    const wrappedArgs = []
    args.forEach(arg => {
      // Find those args that actually need to be function callbacks
      if (typeof arg === 'string' && arg.substr(0, 5) === '__f__') {
        wrappedArgs.push((...innerArgs) => {
          const data = {}
          innerArgs.forEach((value, index) => {
            data[`_${index + 1}`] = value
          })
          const callbackJson = Object.assign({}, json, { data, id: arg })
          VrpcAdapter._callback(JSON.stringify(callbackJson), callbackJson)
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
    const entry = VrpcAdapter._functionRegistry.get(className)
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
VrpcAdapter._functionRegistry = new Map()
VrpcAdapter._instances = new Map()
VrpcAdapter._correlationId = 0

module.exports = VrpcAdapter
