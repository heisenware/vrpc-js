const EventEmitter = require('events')

class Todo extends EventEmitter {
  constructor (text) {
    super()
    this._data = { text, completed: false }
    setInterval(() => this.toggleCompleted(), 500)
  }

  getData () {
    return this._data
  }

  toggleCompleted () {
    this._data.completed = !this._data.completed
    this.emit('update', this._data)
  }
}

module.exports = Todo
