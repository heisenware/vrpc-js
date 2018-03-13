'use strict'

const EventEmitter = require('events')

function VrpcLocal (addon = null) {
  const _eventEmitter = new EventEmitter()
  let invokeId = 0
  let vrpc

  if (addon) vrpc = addon
  else vrpc = require('../build/Release/vrpc')

  function loadBindings (sharedLibraryFile) {
    try {
      vrpc.loadBindings(sharedLibraryFile)
    } catch (err) {
      console.log('Problem while loading bindings', err)
    }
  }

  // Register callback handler
  vrpc.onCallback(json => {
    const { id, data } = JSON.parse(json)
    _eventEmitter.emit(id, data)
  })

  function create (className, ...args) {
    let data = {}
    args.forEach((value, index) => {
      data[`a${index + 1}`] = value
    })
    const json = {
      targetId: className,
      function: '__create__',
      data
    }
    // Create instance
    const ret = JSON.parse(vrpc.callCpp(JSON.stringify(json)))
    const instanceId = ret.data.r

    let proxy = {}
    let functions = JSON.parse(vrpc.getMemberFunctions(className)).functions
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
          function: name,
          data: packData(name, ...args)
        }
        const { data } = JSON.parse(vrpc.callCpp(JSON.stringify(json)))
        if (data.e) throw new Error(data.e)
        return data.r
      }
    })
    return proxy
  }

  function packData (functionName, ...args) {
    let data = {}
    args.forEach((value, index) => {
      // Check whether provided argument is a function
      if (isFunction(value)) {
        const id = `${functionName}-${index}-${invokeId++ % 512}`
        data[`a${index + 1}`] = id
        _eventEmitter.once(id, data => {
          const args = Object.keys(data).sort()
          .filter(value => value[0] === 'a')
          .map(key => data[key])
          value.apply(null, args) // This is the actual function call
        })
      } else if (isEmitter(value)) {
        const id = `${functionName}-${index}`
        data[`a${index + 1}`] = id
        _eventEmitter.on(id, data => {
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

  function isFunction (variable) {
    const getType = {}
    return variable && getType.toString.call(variable) === '[object Function]'
  }

  function isEmitter (variable) {
    return (
      typeof variable === 'object' &&
      variable.hasOwnProperty('emitter') &&
      variable.hasOwnProperty('event') &&
      typeof variable.emitter === 'object' &&
      typeof variable.emitter.emit === 'function'
    )
  }

  function callStatic (className, functionName, ...args) {
    const json = {
      targetId: className,
      function: functionName,
      data: packData(functionName, ...args)
    }
    return JSON.parse(vrpc.callCpp(JSON.stringify(json))).data.r
  }

  return {
    callStatic,
    create,
    loadBindings
  }
}

module.exports = VrpcLocal
