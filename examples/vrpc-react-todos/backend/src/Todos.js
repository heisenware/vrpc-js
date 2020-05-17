class Todos {
  constructor () {
    this._todos = []
  }

  addTodo (text) {
    const todo = { text, completed: false, id: this._todos.length }
    this._todos.push(todo)
  }

  toggleTodo (id) {
    const { completed } = this._todos[id]
    this._todos[id].completed = !completed
  }

  getTodos (filter) {
    switch (filter) {
      case 'all': return this._todos
      case 'active': return this._todos.filter(x => !x.completed)
      case 'completed': return this._todos.filter(x => x.completed)
      default: throw new Error(`Invalid filter: ${filter}`)
    }
  }
}

module.exports = Todos
