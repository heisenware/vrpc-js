import React from 'react'
import { withManagedInstance } from 'react-vrpc'

class TodoItem extends React.Component {
  constructor () {
    super()
    this.state = { data: { text: '', completed: false } }
    this.handleUpdate = this.handleUpdate.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  async componentDidUpdate (prevProps) {
    const { backend, loading, error } = this.props
    if (!backend || loading || error) return
    if (prevProps.loading) {
      await backend.on('update', this.handleUpdate)
      await this.update()
    }
  }

  componentWillUnmount () {
    const { backend } = this.props
    if (!backend) return
    backend.off('update', this.handleUpdate).catch(() => {})
  }

  handleUpdate (data) {
    this.setState({ data })
  }

  async update () {
    const { backend } = this.props
    if (!backend) return
    const data = await backend.getData()
    this.setState({ data })
  }

  async handleClick () {
    const { backend } = this.props
    await backend.toggleCompleted()
    await this.update()
  }

  render () {
    const { loading, error, filter } = this.props
    const { data } = this.state

    if (loading) return <li>Loading...</li>
    if (error) return <li>{`Error! ${error.message}`}</li>

    if (filter === 'completed' && !data.completed) return null
    if (filter === 'active' && data.completed) return null

    return (
      <li
        onClick={this.handleClick}
        style={{ textDecoration: data.completed ? 'line-through' : 'none' }}
      >
        {data.text}
      </li>
    )
  }
}

export default withManagedInstance('todos', TodoItem)
