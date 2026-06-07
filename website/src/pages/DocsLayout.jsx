// src/pages/DocsLayout.jsx
import React from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import DocPage from '../components/DocPage'
import AsyncInjectedDocPage from '../components/AsyncInjectedDocPage'
import '../Docs.css'

import introMd from '../content/intro.md?raw'
import architectureMd from '../content/architecture.md?raw'
import apiMd from '../content/api.md?raw'
import persistenceMd from '../content/persistence.md?raw'
import examplesMd from '../content/examples.md?raw'

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
    template: apiMd,
    injections: {
      JS_API:
        'https://raw.githubusercontent.com/heisenware/vrpc-js/master/docs/api.md',
      REACT_API:
        'https://raw.githubusercontent.com/heisenware/vrpc-react/master/docs/api.md',
      CPP_API_ADAPTER:
        'https://raw.githubusercontent.com/heisenware/vrpc-hpp/master/docs/adapter.md',
      CPP_API_AGENT:
        'https://raw.githubusercontent.com/heisenware/vrpc-hpp/master/docs/agent.md',
      ARDUINO_API:
        'https://raw.githubusercontent.com/heisenware/vrpc-arduino/master/docs/api.md'
    }
  },
  {
    path: 'persistence',
    label: 'Persistence',
    content: persistenceMd
  },
  // { path: 'examples', label: 'Examples', content: injectedExamplesMd }
  {
    path: 'examples',
    label: 'Examples',
    template: examplesMd,
    injections: {
      JS_AGENT:
        'https://raw.githubusercontent.com/heisenware/vrpc-js/master/examples/01-agent/README.md',
      JS_CLIENT:
        'https://raw.githubusercontent.com/heisenware/vrpc-js/master/examples/02-client/README.md',
      JS_CPP_SIMPLE:
        'https://raw.githubusercontent.com/heisenware/vrpc-js/master/examples/03-native-simple/README.md',
      JS_CPP_ADVANCED:
        'https://raw.githubusercontent.com/heisenware/vrpc-js/master/examples/04-native-advanced/README.md',
      CPP_AGENT_SIMPLE:
        'https://raw.githubusercontent.com/heisenware/vrpc-hpp/master/examples/01-foo/README.md'
    }
  }
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
                element={
                  // If it has injections, use the async injector. Otherwise, render normally.
                  link.injections ? (
                    <AsyncInjectedDocPage
                      templateMarkdown={link.template}
                      injections={link.injections}
                    />
                  ) : (
                    <DocPage markdown={link.content} />
                  )
                }
              />
            ))}
          </Routes>
        </div>
      </main>
    </div>
  )
}
