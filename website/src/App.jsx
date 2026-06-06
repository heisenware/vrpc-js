// src/App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { VrpcProvider } from './vrpc'
import Home from './pages/Home'
import './App.css'

function App () {
  return (
    <VrpcProvider>
      <BrowserRouter>
        <div className='app-container'>
          <nav className='navbar'>
            <div className='logo'>VRPC</div>
            <div className='nav-links'>
              <Link to='/'>Home</Link>
              <a
                href='https://github.com/heisenware/vrpc-js'
                target='_blank'
                rel='noreferrer'
              >
                GitHub
              </a>
            </div>
          </nav>

          <main className='content'>
            <Routes>
              <Route path='/' element={<Home />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </VrpcProvider>
  )
}

export default App
