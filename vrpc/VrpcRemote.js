const os = require('os')
const crypto = require('crypto')
const mqtt = require('mqtt')
const EventEmitter = require('events')

class VrpcRemote {

  constructor ({
    username,
    password,
    token,
    brokerUrl = 'mqtt://test.mosquitto.org',
    topicPrefix = 'vrpc'
   } = {}
  ) {
    this._username = username
    this._password = password
    this._token = token
    this._brokerUrl = brokerUrl
    this._topicPrefix = topicPrefix
    this._instance = crypto.randomBytes(2).toString('hex')
    this._clientId = this._createClientId(this._instance)
    this._topic = `${topicPrefix}/${os.hostname()}/${this._instance}`
    this._classInfo = new Map()
    this._eventEmitter = new EventEmitter()
    this._invokeId = 0
    this._client

    this._init()
  }

  _createClientId (instanceId) {
    const clientInfo = os.arch() + JSON.stringify(os.cpus()) + os.homedir() +
    os.hostname() + JSON.stringify(os.networkInterfaces()) + os.platform() +
    os.release() + os.totalmem() + os.type()
    console.log('ClientInfo:', clientInfo)
    const md5 = crypto.createHash('md5').update(clientInfo).digest('hex').substr(0, 13)
    return `vrpcp${instanceId}X${md5}` // 5 + 4 + 1 + 13 = 23 (max clientId)
  }

  _init () {
    let username = this._username
    let password = this._password
    if (this._token) {
      username = '__token__'
      password = this._token
    }
    const options = {
      username,
      password,
      clean: true,
      keepalive: 120,
      clientId: this._clientId
    }
    this._client = mqtt.connect(this._brokerUrl, options)
    this._client.on('connect', () => {
      // This will give us an overview of all remotely available classes
      this._client.subscribe(`${this._topicPrefix}/+/+/__static__/__info__`)
      // Listen for remote function return values
      this._client.subscribe(this._topic)
    })
    this._client.on('message', (topic, message) => {
      const tokens = topic.split('/')
      const agent = tokens[1]
      const func = tokens[4]
      if (func === '__info__') {
        // Json properties: { class, memberFunctions, staticFunctions }
        const json = JSON.parse(message.toString())
        const classMap = this._classInfo.get(agent)
        if (classMap) classMap.set(json.class, json)
        else this._classInfo.set(agent, new Map([[json.class, json]]))
        this._classInfo.set(json.class, json)
      } else {
        const {id, data} = JSON.parse(message.toString())
        this._eventEmitter.emit(id, data)
      }
    })
  }

  async reconnectWithToken (token) {
    this._token = token
    this._client.end(() => {
      this._init()
    })
  }

  _ensureConnected () {
    return new Promise((resolve, reject) => {
      if (this._client.connected) {
        resolve()
      } else {
        this._client.once('connect', () => resolve())
      }
    })
  }

  async create (agentId, className, ...args) {
    let data = {}
    args.forEach((value, index) => {
      data[`_${index + 1}`] = value
    })
    const json = {
      targetId: className,
      method: '__create__',
      id: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
      sender: this._topic,
      data
    }
    await this._ensureConnected()
    const topic = `${this._topicPrefix}/${agentId}/${className}/__static__/__create__`
    this._client.publish(topic, JSON.stringify(json))
    return new Promise((resolve, reject) => {
      this._eventEmitter.once(json.id, data => {
        if (data.e) {
          reject(new Error(data.e))
        } else {
          const proxy = this._createProxy(agentId, className, data)
          resolve(proxy)
        }
      })
    })
  }

  async _createProxy (agentId, className, data) {
    const instance = data.r
    const targetTopic = `${this._topicPrefix}/${agentId}/${className}/${instance}`
    let proxy = {}
    let functions = this._classInfo.get(agentId).get(className).memberFunctions
    // Strip off argument signature
    functions = functions.map(name => {
      const pos = name.indexOf('-')
      if (pos > 0) return name.substring(0, pos)
      else return name
    })
    // Remove overloads
    const uniqueFuncs = new Set(functions)
    // Build proxy
    uniqueFuncs.forEach(name => {
      proxy[name] = async (...args) => {
        const json = {
          targetId: instance,
          method: name,
          id: `${this._instance}-${this._invokeId++ % Number.MAX_SAFE_INTEGER}`,
          sender: this._topic,
          data: this._packData(name, ...args)
        }
        await this._ensureConnected()
        this._client.publish(`${targetTopic}/${name}`, JSON.stringify(json))
        return new Promise((resolve, reject) => {
          this._eventEmitter.once(json.id, data => {
            if (data.e) {
              reject(new Error(data.e))
            } else {
              const ret = data.r
              // Handle functions returning a promise
              if (typeof ret === 'string' && ret.substr(0, 5) === '__p__') {
                const promise = new Promise((resolve, reject) => {
                  this._eventEmitter.once(ret, promiseData => {
                    if (promiseData.e) reject(new Error(promiseData.e))
                    else resolve(promiseData.r)
                  })
                })
                resolve(promise)
              } else {
                resolve(ret)
              }
            }
          })
        })
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
        data[`_${index + 1}`] = id
        this._eventEmitter.once(id, data => {
          const args = Object.keys(data).sort()
          .filter(value => value[0] === '_')
          .map(key => data[key])
          value.apply(null, args) // This is the actual function call
        })
      } else if (this._isEmitter(value)) {
        const id = `__f__${functionName}-${index}`
        data[`_${index + 1}`] = id
        this._eventEmitter.on(id, data => {
          const args = Object.keys(data).sort()
          .filter(value => value[0] === '_')
          .map(key => data[key])
          const { emitter, event } = value
          emitter.emit(event, ...args)
        })
      } else {
        data[`_${index + 1}`] = value
      }
    })
    return data
  }

  async callStatic (agentId, className, functionName, ...args) {
    const json = {
      targetId: className,
      method: functionName,
      sender: this._topic,
      data: this._packData(functionName, ...args)
    }
    await this._ensureConnected()
    const topic = `${this._topicPrefix}/${agentId}/${className}/__static__/${functionName}`
    this._client.publish(topic, JSON.stringify(json))
    return new Promise((resolve, reject) => {
      this._eventEmitter.once(json.id, data => {
        if (data.e) {
          reject(new Error(data.e))
        } else {
          resolve(data.r)
        }
      })
    })
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
}

module.exports = VrpcRemote
