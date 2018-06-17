const EventEmitter = require('events')

class VrpcLocal {

  constructor (addon = null) {
    this._eventEmitter = new EventEmitter()
    this._invokeId = 0
    if (addon) this._vrpc = addon
    else this._vrpc = require('../build/Release/vrpc')

    // Register callback handler
    this._vrpc.onCallback(json => {
      const { id, data } = JSON.parse(json)
      this._eventEmitter.emit(id, data)
    })
  }

  loadBindings (sharedLibraryFile) {
    try {
      this._vrpc.loadBindings(sharedLibraryFile)
    } catch (err) {
      console.log('Problem while loading bindings', err)
    }
  }

  create (className, ...args) {
    let data = {}
    args.forEach((value, index) => {
      data[`a${index + 1}`] = value
    })
    const json = {
      targetId: className,
      method: '__create__',
      data
    }
    // Create instance
    const ret = JSON.parse(this._vrpc.callRemote(JSON.stringify(json)))
    const instanceId = ret.data.r

    let proxy = {}
    let functions = JSON.parse(this._vrpc.getMemberFunctions(className)).functions
    functions = functions.map(name => {
      const pos = name.indexOf('-')
      if (pos > 0) return name.substring(0, pos)
      else return name
    })
    const uniqueFuncs = new Set(functions)
    uniqueFuncs.forEach(name => {
      proxy[name] = (...args) => {
        const json = {
          targetId: instanceId,
          method: name,
          data: this._packData(name, ...args)
        }
        const { data } = JSON.parse(this._vrpc.callRemote(JSON.stringify(json)))
        if (data.e) throw new Error(data.e)
        return data.r
      }
    })
    return proxy
  }

  _packData (functionName, ...args) {
    let data = {}
    args.forEach((value, index) => {
      // Check whether provided argument is a function
      if (this._isFunction(value)) {
        const id = `__f__${functionName}-${index}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`
        data[`a${index + 1}`] = id
        this._eventEmitter.once(id, data => {
          const args = Object.keys(data).sort()
          .filter(value => value[0] === 'a')
          .map(key => data[key])
          value.apply(null, args) // This is the actual function call
        })
      } else if (this._isEmitter(value)) {
        const id = `__f__${functionName}-${index}`
        data[`a${index + 1}`] = id
        this._eventEmitter.on(id, data => {
          const args = Object.keys(data).sort()
          .filter(value => value[0] === 'a')
          .map(key => data[key])
          const { emitter, event } = value
          emitter.emit(event, ...args)
        })
      } else {
        data[`a${index + 1}`] = value
      }
    })
    return data
  }

  _isFunction (variable) {
    const getType = {}
    return variable && getType.toString.call(variable) === '[object Function]'
  }

  _isEmitter (variable) {
    return (
      typeof variable === 'object' &&
      variable.hasOwnProperty('emitter') &&
      variable.hasOwnProperty('event') &&
      typeof variable.emitter === 'object' &&
      typeof variable.emitter.emit === 'function'
    )
  }

  callStatic (className, functionName, ...args) {
    const json = {
      targetId: className,
      method: functionName,
      data: this._packData(functionName, ...args)
    }
    return JSON.parse(this._vrpc.callRemote(JSON.stringify(json))).data.r
  }
}

module.exports = VrpcLocal
