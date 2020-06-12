import React, { useState, useEffect, useCallback } from 'react'
import { useBackend } from '../react-vrpc'
import VisibleTodoList from './VisibleTodoList'
import Filter from './Filter'

function Todos () {
  const [filter, setFilter] = useState('all')
  const [todos, setTodos] = useState([])
  const { backend, loading, error } = useBackend('todos')
  const memoizedUpdate = useCallback(update, [setTodos, backend, filter])

  useEffect(() => {
    memoizedUpdate()
  }, [memoizedUpdate])

  if (loading) return 'Loading...'
  if (error) return `Error! ${error.message}`

  async function update () {
    try {
      const todos = await backend.getTodos(filter)
      setTodos(todos)
    } catch (err) {
      console.warn(`Could not update todos, because: ${err.message}`)
    }
  }

  async function toggleTodo (id) {
    try {
      await backend.toggleTodo(id)
      await update()
    } catch (err) {
      console.warn(`Could not toggle todo ${id}, because: ${err.message}`)
    }
  }

  return (
    <div>
      <VisibleTodoList
        todos={todos}
        onClick={toggleTodo}
      />
      <Filter
        onClick={setFilter}
        filter={filter}
      />
    </div>
  )
}

export default Todos
