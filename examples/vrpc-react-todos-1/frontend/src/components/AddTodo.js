import React from 'react'
import { useBackend } from 'react-vrpc'

function AddTodo () {
  const { backend, refresh } = useBackend('todos')

  async function handleSubmit (e) {
    e.preventDefault()
    const { value } = input
    if (!value.trim()) return
    await backend.addTodo(value)
    input.value = ''
    refresh()
  }

  let input
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input ref={node => (input = node)} />
        <button type='submit'>
          Add Todo
        </button>
      </form>
    </div>
  )
}

export default AddTodo
