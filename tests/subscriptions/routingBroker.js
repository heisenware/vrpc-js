'use strict'

const net = require('net')
const mqttPacket = require('mqtt-packet')

/**
 * Just enough of an MQTT 3.1.1 broker to run a VrpcClient against a
 * VrpcAgent in one process: QoS 0 routing with `+`/`#` wildcards, retained
 * messages, last wills (published when a connection breaks without
 * DISCONNECT, or is taken over by its client id) and a `cut` that breaks a
 * client's connection the way a network loss does. Nothing persists.
 */
class RoutingBroker {
  constructor () {
    this._connections = new Set()
    this._retained = new Map()
    this._server = net.createServer(socket => this._serve(socket))
    // every PUBLISH that reached the broker: { topic, payload, from }
    this.published = []
    // rewrites a payload before it is routed (topic, json) => json
    this.rewrite = null
    // refuses a subscription (SUBACK 0x80) when it answers true:
    // (filter, clientId) => Boolean
    this.refuse = null
  }

  /** The topic filters a client id is subscribed to now. */
  subscriptionsOf (clientId) {
    const filters = []
    for (const connection of this._connections) {
      if (connection.clientId === clientId) filters.push(...connection.subscriptions)
    }
    return filters
  }

  /** The retained topics under a prefix. */
  retainedUnder (prefix) {
    return Array.from(this._retained.keys()).filter(topic => topic.startsWith(prefix))
  }

  /** Publishes as the broker itself would route a message from outside. */
  inject (topic, payload, { retain = false } = {}) {
    this._route(topic, Buffer.from(payload), { retain, from: null })
  }

  async start () {
    await new Promise(resolve => this._server.listen(0, '127.0.0.1', resolve))
    this.url = `mqtt://127.0.0.1:${this._server.address().port}`
    return this
  }

  async stop () {
    for (const connection of this._connections) connection.socket.destroy()
    await new Promise(resolve => this._server.close(resolve))
  }

  /** Breaks the connection of a client id: its will goes out. */
  cut (clientId) {
    for (const connection of this._connections) {
      if (connection.clientId === clientId) connection.socket.destroy()
    }
  }

  publishedOn (pattern) {
    return this.published.filter(({ topic }) =>
      RoutingBroker.matches(pattern, topic)
    )
  }

  static matches (filter, topic) {
    const f = filter.split('/')
    const t = topic.split('/')
    for (let i = 0; i < f.length; i++) {
      if (f[i] === '#') return true
      if (i >= t.length) return false
      if (f[i] !== '+' && f[i] !== t[i]) return false
    }
    return f.length === t.length
  }

  _route (topic, payload, { retain = false, from = null } = {}) {
    if (this.rewrite && payload.length > 0) {
      try {
        const json = this.rewrite(topic, JSON.parse(payload.toString()))
        if (json !== undefined) payload = Buffer.from(JSON.stringify(json))
      } catch (err) {
        // not JSON: routed as it is
      }
    }
    this.published.push({ topic, payload: payload.toString(), from })
    if (retain) {
      if (payload.length === 0) this._retained.delete(topic)
      else this._retained.set(topic, payload)
    }
    for (const connection of this._connections) {
      if (!connection.alive) continue
      for (const filter of connection.subscriptions) {
        if (RoutingBroker.matches(filter, topic)) {
          connection.send({ cmd: 'publish', topic, payload, qos: 0, retain: false })
          break
        }
      }
    }
  }

  _serve (socket) {
    const connection = {
      socket,
      clientId: null,
      will: null,
      alive: false,
      subscriptions: new Set(),
      send: packet => {
        if (!socket.destroyed) socket.write(mqttPacket.generate(packet))
      }
    }
    this._connections.add(connection)
    const gone = () => {
      if (!this._connections.has(connection)) return
      this._connections.delete(connection)
      connection.alive = false
      if (connection.will) {
        const { topic, payload, retain } = connection.will
        this._route(topic, payload, { retain, from: connection.clientId })
      }
    }
    socket.on('close', gone)
    socket.on('error', () => {})
    const parser = mqttPacket.parser({ protocolVersion: 4 })
    parser.on('packet', packet => {
      switch (packet.cmd) {
        case 'connect': {
          // a client id connecting again takes the old session over
          for (const other of Array.from(this._connections)) {
            if (other !== connection && other.clientId === packet.clientId) {
              other.socket.destroy()
              const { will } = other
              this._connections.delete(other)
              other.alive = false
              if (will) {
                this._route(will.topic, will.payload, {
                  retain: will.retain,
                  from: other.clientId
                })
              }
            }
          }
          connection.clientId = packet.clientId
          connection.will = packet.will || null
          connection.alive = true
          connection.send({ cmd: 'connack', returnCode: 0, sessionPresent: false })
          break
        }
        case 'subscribe': {
          const refused = packet.subscriptions.map(
            ({ topic }) => !!this.refuse && this.refuse(topic, connection.clientId)
          )
          connection.send({
            cmd: 'suback',
            messageId: packet.messageId,
            granted: packet.subscriptions.map((s, i) => (refused[i] ? 0x80 : s.qos))
          })
          for (const [i, { topic }] of packet.subscriptions.entries()) {
            if (refused[i]) continue
            connection.subscriptions.add(topic)
            for (const [retainedTopic, payload] of this._retained) {
              if (RoutingBroker.matches(topic, retainedTopic)) {
                connection.send({
                  cmd: 'publish',
                  topic: retainedTopic,
                  payload,
                  qos: 0,
                  retain: true
                })
              }
            }
          }
          break
        }
        case 'unsubscribe':
          for (const topic of packet.unsubscriptions) {
            connection.subscriptions.delete(topic)
          }
          connection.send({ cmd: 'unsuback', messageId: packet.messageId })
          break
        case 'publish':
          if (packet.qos === 1) {
            connection.send({ cmd: 'puback', messageId: packet.messageId })
          }
          this._route(packet.topic, packet.payload, {
            retain: packet.retain,
            from: connection.clientId
          })
          break
        case 'pingreq':
          connection.send({ cmd: 'pingresp' })
          break
        case 'disconnect':
          // a clean goodbye: no will
          connection.will = null
          socket.end()
          break
      }
    })
    socket.on('data', data => parser.parse(data))
  }
}

module.exports = RoutingBroker
