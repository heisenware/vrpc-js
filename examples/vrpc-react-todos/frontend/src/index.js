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
