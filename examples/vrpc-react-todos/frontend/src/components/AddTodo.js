import React from 'react'
import { withVrpc } from 'react-vrpc'
function AddTodo ({ todosBackend }) {
  let input
  return (
    <div>
      <form onSubmit={async (e) => {
        e.preventDefault()
        const { value } = input
        if (!value.trim()) return
        await todosBackend.addTodo(value)
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

export default withVrpc(AddTodo)
