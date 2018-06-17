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

function Factory (namespace = '__global__') {
  if (!Factory._instances) {
    Factory._instances = new Map()
  }
  let concreteFactory = Factory._instances.get(namespace)
  if (concreteFactory !== undefined) {
    return concreteFactory
  }
  concreteFactory = new ConcreteFactory()
  Factory._instances.set(namespace, concreteFactory)
  return concreteFactory
}

Factory.addPluginPath = (dirPath) => {
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
      Factory.addPluginPath(absNodePath)
    } else if (type.isFile() && absNodePath.slice(-3) === '.js') {
      require('./' + path.join(relDirPath, node))
    }
  })
}

Factory.setLogger = (log) => {
  Factory._log = log.child({ className: 'Factory' })
}

class ConcreteFactory {

  constructor () {
    // className => { Klass, functions, withNew, schema, label }
    this._functionRegistry = new Map()

    // instanceId => { className, instance, refCount, label }
    this._instances = new Map()

    if (Factory._log === undefined) {
      Factory._log = console
    }
  }

  create (className, ...args) {
    const { Klass, withNew, schema } = this._getClassEntry(className)
    if (schema !== null) {
      this.validate(schema, ...args)
    }
    let instance
    if (withNew) {
      instance = new Klass(...args)
    } else {
      instance = Klass(...args)
    }
    // Inject log
    instance['log'] = Factory._log.child({ className })
    return instance
  }

  createNamed (className, instanceId, ...args) {
    let instance = this.getNamed(instanceId)
    if (instance !== undefined) {
      return instance
    }
    instance = this.create(className, ...args)
    instance.log = instance.log.child({ instanceId })
    this._instances.set(
      instanceId,
      { className, instance, refCount: 1, label: this.getLabel(className) }
    )
    return instance
  }

  getNamed (instanceId) {
    const entry = this._instances.get(instanceId)
    if (entry !== undefined) {
      entry.refCount += 1
      return entry.instance
    }
  }

  deleteNamed (instanceId) {
    const entry = this._instances.get(instanceId)
    if (entry !== undefined) {
      entry.refCount -= 1
      if (entry.refCount === 0) {
        this._instances.delete(instanceId)
      }
    } else {
      // This should not happen
    }
  }

  // TODO add white- and black-list based filtering
  register (Klass, { withNew = true, schema = null, label = [] } = {}) {
    // Get all static static functions
    const staticFunctions = this._getStaticFunctions(Klass)
    // Inject constructor and destructor
    staticFunctions.push('__create__')
    // staticFunctions.push('__create_named__')
    staticFunctions.push('__delete__')
    const memberFunctions = this._getMemberFunctions(Klass)
    this._functionRegistry.set(
      Klass.name,
      { Klass, withNew, schema, label, staticFunctions, memberFunctions }
    )
  }

  callRemote (jsonString) {
    const json = JSON.parse(jsonString)
    const { targetId, method, data } = json
    const args = this._extractDataToArray(data)
    const wrappedArgs = this._wrapCallbacks(args)

    this._log.debug(`Calling function: ${method} with payload: ${data}`)
    switch (method) {
      // Special case: ctor
      case '__create__':
        try {
          const instance = this.create(targetId, wrappedArgs)
          const instanceId = this._generateId(instance)
          this._instances.set(
            instanceId,
            {
              targetId,
              instance,
              refCount: 1,
              label: this.getLabel(targetId)
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
          this.createNamed(targetId, wrappedArgs)
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
        const entry = this._functionRegistry.get(targetId)
        if (entry !== undefined) { // entry is class -> function is static
          const { Klass } = entry
          // TODO Think about whether to do live checking (like here) or
          // rather sticking to those functions registered before...
          if (this._isFunction(Klass[method])) {
            try {
              data.r = Klass[method].apply(null, wrappedArgs)
            } catch (err) {
              data.e = err.message
            }
          } else throw new Error(`Could not find function: ${method}`)
        } else { // is not static
          const { instance } = this._instances.get(targetId)
          if (instance === undefined) {
            throw new Error(`Could not find targetId: ${targetId}`)
          }
          if (this._isFunction(instance[method])) {
            try {
              data.r = instance[method].apply(instance, wrappedArgs)
            } catch (err) {
              data.e = err.message
            }
          } else throw new Error(`Could not find function: ${method}`)
        }
    }
    return JSON.stringify(json)
  }

  getClasses () {
    return Array.from(this._functionRegistry.keys())
  }

  getMemberFunctions (className) {
    let functions = []
    const entry = this._functionRegistry(className)
    if (entry) functions = entry.memberFunctions
    return JSON.stringify({ functions })
  }

  getStaticFunctions (className) {
    let functions = []
    const entry = this._functionRegistry(className)
    if (entry) functions = entry.staticFunctions
    return JSON.stringify({ functions })
  }

  getClass (className) {
    return this._getClassEntry(className).Klass
  }

  getSchema (className) {
    const entry = this._getClassEntry(className)
    if (entry.schema === null) {
      throw new Error(`No schema registered for ${className}`)
    }
    return entry.schema
  }

  getLabel (className) {
    return this._getClassEntry(className).label
  }

  validate (schema, params) {
    if (!this._ajv) {
      this._ajv = new Ajv()
    }
    const valid = this._ajv.validate(schema, params)
    if (!valid) throw new Error(this._ajv.errorsText())
  }

  _extractDataToArray (data) {
    return Object.keys(data).sort()
    .filter(value => value[0] === 'a')
    .map(key => data[key])
  }

  _wrapCallbacks (args) {
    let wrappedArgs = []
    args.forEach(arg => {
      // Find those args that actually need to be function callbacks
      if (typeof arg === 'string' && arg.substr(0, 5) === '__f__') {
        wrappedArgs.push((...innerArgs) => {
          let data = {}
          innerArgs.forEach((value, index) => {
            data[`a${index + 1}`] = value
          })
          this._functionCallback({ data, id: arg }).bind(this)
        })
      // Leave the others untouched
      } else {
        wrappedArgs.push(arg)
      }
    })
    return wrappedArgs
  }

  _generateId (object) {
    return crypto.createHash('md5').update(JSON.stringify(object)).digest('hex')
  }

  _getClassEntry (className) {
    const entry = this._functionRegistry.get(className)
    if (!entry) {
      throw new Error(`"${className}" is not a registered class`)
    }
    return entry
  }

  _isFunction (variable) {
    return variable && {}.toString.call(variable) === '[object Function]'
  }

  _getMemberFunctions (klass) {
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

  _getStaticFunctions (klass) {
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

module.exports = Factory
