# React Todos App

This example shows how easily you can implement a single-page-application that
loads its data from a backend asynchronously. The idea is to end up with the
same user-experience as is demonstrated in the [redux
example](https://redux.js.org/basics/example), but - of course - using VRPC and
introducing real backend communication.

Let's start from scratch with a new directory, e.g. `vrpc-react-todos`. Once
created, cd into it and you are good to go.

## STEP 1: Implementation of the backend

Setup the project's file structure like so:

```bash
mkdir backend
cd backend
npm init -f -y
npm install vrpc
mkdir src
```

The backend should simply organize our todos, this is quickly done by writing
down a class like that:

*src/Todos.js*

```javascript
class Todos {
  constructor () {
    this._todos = []
  }

  addTodo (text) {
    const todo = { text, completed: false, id: this._todos.length }
    this._todos.push(todo)
  }

  toggleTodo (id) {
    const { completed } = this._todos[id]
    this._todos[id].completed = !completed
  }

  getTodos (filter) {
    switch (filter) {
      case 'all': return this._todos
      case 'active': return this._todos.filter(x => !x.completed)
      case 'completed': return this._todos.filter(x => x.completed)
      default: throw new Error(`Invalid filter: ${filter}`)
    }
  }
}

module.exports = Todos
```

Now, we expose this class to be remotely available through VRPC:

*index.js*

```javascript
const { VrpcAdapter, VrpcAgent } = require('vrpc')
// Register class "Todos" to be remotely callable
VrpcAdapter.register(require('./src/Todos'))

async function main () {
  try {
    const vrpcAgent = new VrpcAgent({
      agent: 'burkhards-todos-agent',
      domain: 'public.vrpc'
    })
    await vrpcAgent.serve()
  } catch (err) {
    console.log('VRPC triggered an unexpected error', err)
  }
}

// Start the agent
main()
```

> **IMPORTANT**
>
> As we are using VRPC's free but public domain, we have to make sure that
> our agent name is unique. Modify the name to something that's unique to you.
>

That's already it for the backend!

Once started,

```bash
node index.js
```

you can immediately test your backend with https://live.vrpc.io.
Simply login using `public.vrpc` as domain and leave the token-field empty.

## STEP 2: Implementation of the frontend

Next let's setup the **frontend**. Make sure you are back in the root directory
(i.e. `vrpc-react-todos`), then run:

```bash
npx create-react-app frontend
cd frontend
npm install vrpc
npm install react-vrpc
mkdir -p src/components
```

This creates a lot of files, we will go through the ones needed one by one.
All other files can afterwards be deleted, but don't also harm.

*src/index.js*

```javascript
import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import * as serviceWorker from './serviceWorker'
import { createVrpcProvider } from 'react-vrpc'

const VrpcProvider = createVrpcProvider({
  domain: 'public.vrpc',
  backends: {
    todosBackend: {
      agent: 'burkhards-todos-agent',
      className: 'Todos',
      instance: 'react-todos',
      args: []
    }
  }
})

ReactDOM.render(
  <React.StrictMode>
    <VrpcProvider>
      <App />
    </VrpcProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
```

In this file will are defining the available backends, here it's just one -
a single instance of our `Todos` class. In this case, the fronted creates a
new instance of the `Todos` class with the explicit name `react-todos`. If
an instance with that name existed before VRPC will just attach to and not
re-create it.

The `VrpcProvider` component provides a `withVrpc` function which allows
to inject the `react-todos` backend-proxy into any component that needs it.

*src/components/App.js*

```javascript
import React from 'react'
import AddTodo from './AddTodo'
import ShowTodos from './ShowTodos'

function App () {
  return (
    <div>
      <AddTodo />
      <ShowTodos />
    </div>
  )
}

export default App
```

This file defines the main `App` component that was included in the `ReactDOM.render`
method of the `index.js` file. It wraps two other components:

* `AddTodo` - renders the form allowing to submit a new todo item
* `ShowTodos` - renders the list of todos and the filtering buttons

*src/components/AddTodo.js*

```javascript
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
```

This is the first component making of our backend. Adding the `withVrpc` function
wrapping the `AddTodo` component (last line in the code) accomplishes that.

Once wrapped, all backends are available as regular properties and reflect
proxy-instances of the actual backend classes.

You can see how simple it is to call the backend if you look at the implementation
of the form submit:

```javascript
await todosBackend.addTodo(value)
```

Just remember to always place an `await` in front of all backend codes, as
a network call is involved that inherently makes all functions asynchronous.

*src/components/ShowTodo.js*

```javascript
import React from 'react'
import { withVrpc } from 'react-vrpc'
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
```

This component does two things with the backend:

1. Retrieves a list of todos from the backend (every 3 seconds)

    ```javascript
    await todosBackend.getTodos(filter)
    ```

2. Toggles the `completed` state of a todo item (upon click)

    ```javascript
    await todosBackend.toggleTodo(id)
    ```

It utilizes the stateless components `<VisibleTodoList>`

*src/components/VisibleTodoList.js*

```javascript
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
```

and `<Filter>`

```javascript
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
```

for rendering out the data and forwarding the user's interaction.

Well, and that's already it!

Your todos app is fully functional and you can play with it by clicking it
directly or by seeing it getting updated when you modify the backend through
https://live.vrpc.io (domain: `public.vrpc`, token: *leave blank*).

> **NOTE**
>
> This example shows only basic features of react-vrpc. You can find
> more documentation [here](https://www.npmjs.com/package/react-vrpc) and use
> this example as a starting point to build more complex interactions.

## Optional steps to make your communication private

### STEP A: Create a free VRPC account

If you already have an account, simply skip this step.

If not, quickly create a new one by clicking on "CREATE A NEW ACCOUNT"
under https://app.vrpc.io. It takes less than a minute and the only thing
required is your name and a valid email address.

### STEP B: Create a free domain

If you already have a domain, simply skip this step.

If not, navigate to the `Domains` tab in your VRPC app and click *ADD DOMAIN*,
choose a free domain and hit *Start 30 days trial* button.

### STEP C: Adapt the code to use your domain and token

For any agent to work, you must provide it with a valid domain and agent
token. You get an agent token from your VRPC app using the `Access Control` tab.

Simply copy the *defaultAgentToken* or create a new one and use this.

With that you are ready to make the communication between frontend and backend
private.

In the backend use:

```javascript
const vrpcAgent = new VrpcAgent({
  agent: '<yourAgent>',
  domain: '<yourDomain>',
  token: '<yourToken>'
})
```

And adapt the frontend to:

```javascript
const VrpcProvider = createVrpcProvider({
  domain: '<yourDomain>'
  // [...]
})

// [...]

<VrpcProvider token=<yourToken> >
```
