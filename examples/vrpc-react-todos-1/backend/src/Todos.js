/**
 * The Todos class manages all todo items
 */
class Todos {
  constructor () {
    this._todos = []
  }

  /**
   * Adds a todo item
   * @param {string} text The todo text
   */
  addTodo (text) {
    const todo = { text, completed: false, id: this._todos.length }
    this._todos.push(todo)
  }

  /**
   * Toggles a todo item
   * @param {integer} id Todo item id
   */
  toggleTodo (id) {
    const { completed } = this._todos[id]
    this._todos[id].completed = !completed
  }

  /**
   * Provides a filtered list of todo items
   * @param {string} filter Filters todo items: 'all', 'active' and 'completed'
   * are the allowed values
   * @returns {Object[]} An array of todo objects
   */
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
