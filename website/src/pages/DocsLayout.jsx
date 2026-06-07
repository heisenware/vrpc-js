// src/pages/DocsLayout.jsx
import React from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import DocPage from '../components/DocPage'
import '../Docs.css'

// We will mock the markdown imports here, but in Vite you can do:
// import architectureMd from '../../../docs/architecture.md?raw'
import introMd from '../content/intro.md?raw'
import architectureMd from '../content/architecture.md?raw'
import apiMd from '../content/api.md?raw'
import persistenceMd from '../content/persistence.md?raw'
import examplesMd from '../content/examples.md?raw'

import jsAgent from '../../../../vrpc-js/examples/01-agent/README.md?raw'
import jsClient from '../../../../vrpc-js/examples/02-client/README.md?raw'
import jsCppSimple from '../../../../vrpc-js/examples/03-native-simple/README.md?raw'
import jsCppAdvanced from '../../../../vrpc-js/examples/04-native-advanced/README.md?raw'

const injectedExamplesMd = examplesMd
  .replace('JS_AGENT', jsAgent)
  .replace('JS_CLIENT', jsClient)
  .replace('JS_CPP_SIMPLE', jsCppSimple)
  .replace('JS_CPP_ADVANCED', jsCppAdvanced)

const navLinks = [
  { path: 'intro', label: 'Introduction', content: introMd },
  {
    path: 'architecture',
    label: 'Architecture',
    content: architectureMd
  },
  {
    path: 'api',
    label: 'API Reference',
    content: apiMd
  },
  {
    path: 'persistence',
    label: 'Persistence',
    content: persistenceMd
  },
  { path: 'examples', label: 'Examples', content: injectedExamplesMd }
]

export default function DocsLayout () {
  return (
    <div className='docs-container'>
      <aside className='docs-sidebar'>
        <div className='sidebar-header'>Documentation</div>
        <nav className='sidebar-nav'>
          {navLinks.map(link => (
            <NavLink
              key={link.path}
              to={`/docs/${link.path}`}
              className={({ isActive }) =>
                isActive ? 'nav-item active' : 'nav-item'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className='docs-content'>
        <div className='markdown-body'>
          <Routes>
            <Route path='/' element={<Navigate to='intro' replace />} />
            {navLinks.map(link => (
              <Route
                key={link.path}
                path={link.path}
                element={<DocPage markdown={link.content} />}
              />
            ))}
          </Routes>
        </div>
      </main>
    </div>
  )
}
