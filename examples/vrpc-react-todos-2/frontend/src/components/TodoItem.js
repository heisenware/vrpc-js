import React, { useEffect, useState, useCallback } from 'react'
import { useBackend } from 'react-vrpc'

function TodoItem ({ id, filter }) {
  const { backend, loading, error } = useBackend('todos', id)
  const [data, setData] = useState({ text: '', completed: false })
  const memoizedUpdate = useCallback(update, [setData, backend])

  useEffect(() => {
    memoizedUpdate()
  }, [memoizedUpdate])

  useEffect(() => {
    if (!backend) return
    const handleUpdate = (data) => setData(data)
    backend.on('update', handleUpdate)
    return () => {
      backend.off('update', handleUpdate).catch(() => {})
    }
  }, [backend])

  async function update () {
    if (!backend) return
    const todoData = await backend.getData()
    setData(todoData)
  }

  async function handleClick () {
    await backend.toggleCompleted()
    await update()
  }

  if (loading) return <li>Loading...</li>
  if (error) return <li>{`Error! ${error.message}`}</li>

  if (filter === 'completed' && !data.completed) return null
  if (filter === 'active' && data.completed) return null

  return (
    <li
      onClick={handleClick}
      style={{ textDecoration: data.completed ? 'line-through' : 'none' }}
    >
      {data.text}
    </li>
  )
}

export default TodoItem
