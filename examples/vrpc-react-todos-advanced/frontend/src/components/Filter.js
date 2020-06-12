import React from 'react'

function Filter ({ onClick, filter }) {
  return (
    <div>
      <span>Show: </span>
      <button
        onClick={() => onClick('all')}
        disabled={filter === 'all'}
        style={{ marginLeft: '4px' }}
      >
        All
      </button>
      <button
        onClick={() => onClick('active')}
        disabled={filter === 'active'}
        style={{ marginLeft: '4px' }}
      >
        Active
      </button>
      <button
        onClick={() => onClick('completed')}
        disabled={filter === 'completed'}
        style={{ marginLeft: '4px' }}
      >
        Completed
      </button>
    </div>
  )
}

export default Filter
