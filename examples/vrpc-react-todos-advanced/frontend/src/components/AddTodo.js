import React from 'react'
import { useBackend } from '../react-vrpc'
function AddTodo () {
  const { backend, loading, error } = useBackend('todos')

  if (loading) return 'Loading...'
  if (error) return `Error! ${error.message}`

  let input
  return (
    <div>
      <form onSubmit={async (e) => {
        e.preventDefault()
        const { value } = input
        if (!value.trim()) return
        const id = Date.now().toString()
        await backend.create(id, { args: [value] })
        input.value = ''
      }}
      >
        <input ref={node => (input = node)} />
        <button type='submit'>
          Add Todo
        </button>
      </form>
    </div>
  )
}

export default AddTodo
