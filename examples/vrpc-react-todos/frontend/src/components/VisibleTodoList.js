import React from 'react'

function VisibleTodoList ({ todos, onClick }) {

  return (
    <ul>
      {todos.map(x => (
        <li
          key={x.id}
          onClick={() => onClick(x.id)}
          style={{ textDecoration: x.completed ? 'line-through' : 'none' }}
        >
          {x.text}
        </li>
      ))}
    </ul>
  )
}

export default VisibleTodoList
