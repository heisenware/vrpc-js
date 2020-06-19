import React from 'react'
import { withBackend } from 'react-vrpc'
import VisibleTodoList from './VisibleTodoList'
import Filter from './Filter'

class ShowTodos extends React.Component {
  constructor () {
    super()
    this.state = {
      todos: [],
      filter: 'all'
    }
  }

  async componentDidMount () {
    await this.updateTodos()
  }

  async componentDidUpdate (prevProps, prevState) {
    if (prevProps.todos !== this.props.todos) {
      await this.updateTodos()
    }
    if (this.state.filter !== prevState.filter) {
      await this.updateTodos()
    }
  }

  async updateTodos () {
    const { todos: { backend } } = this.props
    if (!backend) return
    const { filter } = this.state
    const todos = await backend.getTodos(filter)
    this.setState({ todos })
  }

  async handleToggle (id) {
    const { todos: { backend } } = this.props
    if (!backend) return
    await backend.toggleTodo(id)
    await this.updateTodos()
  }

  render () {
    const { todos, filter } = this.state
    return (
      <div>
        <VisibleTodoList
          todos={todos}
          onClick={async (id) => this.handleToggle(id) }
        />
        <Filter
          onClick={(filter) => this.setState({ filter })}
          filter={filter}
        />
      </div>
    )
  }
}

export default withBackend('todos', ShowTodos)
