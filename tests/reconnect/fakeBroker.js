'use strict'

const net = require('net')
const mqttPacket = require('mqtt-packet')

/**
 * Just enough of an MQTT broker to watch a client knock: it records every
 * TCP connection and CONNECT (time, client id, credentials), answers the
 * CONNECT with a CONNACK the test decides on, grants subscriptions and
 * answers pings. Nothing is routed.
 */
class FakeBroker {
  /**
   * @param {Object} [options]
   * @param {(connect: Object) => Boolean} [options.accept] accept a CONNECT?
   * @param {Boolean} [options.silent=false] never answer a CONNECT
   */
  constructor ({ accept = () => true, silent = false } = {}) {
    this.accept = accept
    this.silent = silent
    this.sockets = 0
    this.connects = []
    this._open = new Set()
    this._server = net.createServer(socket => this._serve(socket))
  }

  async start () {
    await new Promise(resolve => this._server.listen(0, '127.0.0.1', resolve))
    this.url = `mqtt://127.0.0.1:${this._server.address().port}`
    return this
  }

  /** Cuts every open connection, as a network loss does. */
  drop () {
    for (const socket of this._open) socket.destroy()
  }

  async stop () {
    this.drop()
    await new Promise(resolve => this._server.close(resolve))
  }

  /** Milliseconds between consecutive CONNECTs. */
  gaps () {
    return this.connects.slice(1).map((c, i) => c.at - this.connects[i].at)
  }

  _serve (socket) {
    this.sockets++
    this._open.add(socket)
    socket.on('close', () => this._open.delete(socket))
    socket.on('error', () => {})
    const parser = mqttPacket.parser({ protocolVersion: 4 })
    const send = packet => {
      if (!socket.destroyed) socket.write(mqttPacket.generate(packet))
    }
    parser.on('packet', packet => {
      switch (packet.cmd) {
        case 'connect': {
          const ok = this.accept(packet)
          this.connects.push({
            at: Date.now(),
            clientId: packet.clientId,
            username: packet.username,
            password: packet.password ? packet.password.toString() : undefined,
            ok
          })
          if (this.silent) return
          send({ cmd: 'connack', returnCode: ok ? 0 : 5, sessionPresent: false })
          if (!ok) socket.end()
          break
        }
        case 'subscribe':
          send({
            cmd: 'suback',
            messageId: packet.messageId,
            granted: packet.subscriptions.map(s => s.qos)
          })
          break
        case 'pingreq':
          send({ cmd: 'pingresp' })
          break
        case 'disconnect':
          socket.end()
          break
      }
    })
    socket.on('data', data => parser.parse(data))
  }
}

module.exports = FakeBroker
