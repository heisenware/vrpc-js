import React from 'react'
import { withVrpc } from '../react-vrpc'
import VisibleTodoList from './VisibleTodoList'
import Filter from './Filter'

class ShowTodos extends React.Component {

  state = {
    todos: [],
    filter: 'all'
  }

  async componentDidMount () {
    await this.updateTodos()
    this.timeout = setInterval(() => this.updateTodos(), 3000)
  }

  async componentWillUnmount () {
    clearInterval(this.timeout)
  }

  async updateTodos () {
    const { todosBackend } = this.props
    const { filter } = this.state
    const todos = await todosBackend.getTodos(filter)
    this.setState({ todos })
  }

  render () {
    const { todosBackend } = this.props
    const { todos, filter } = this.state
    return (
      <div>
        <VisibleTodoList
          todos={todos}
          onClick={async (id) => await todosBackend.toggleTodo(id) }
        />
        <Filter
          onClick={async (filter) => this.setState({ filter })}
          filter={filter}
        />
      </div>
    )
  }
}

export default withVrpc(ShowTodos)
