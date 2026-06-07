// src/components/DocPage.jsx
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw' // NEW: Allows HTML parsing in markdown
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// --- CUSTOM TAB COMPONENTS ---

const TabGroup = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0)

  // Recursive function to find <tab> elements safely,
  // even if react-markdown wraps them in <p> tags!
  const tabs = []
  const findTabs = nodes => {
    React.Children.forEach(nodes, child => {
      if (!React.isValidElement(child)) return

      // If we found our custom Tab component
      if (child.type === Tab || child.type === 'tab') {
        tabs.push(child)
      } else if (child.props && child.props.children) {
        // Search deeper if wrapped in <p>
        findTabs(child.props.children)
      }
    })
  }

  findTabs(children)

  // Fallback if no tabs were found
  if (!tabs.length) return <div>{children}</div>

  return (
    <div className='md-tab-group'>
      <div className='md-tab-header'>
        {tabs.map((tab, idx) => {
          // Use data-* attributes to prevent rehype-raw from stripping them
          const name = tab.props['data-name'] || `Tab ${idx + 1}`
          const logo = tab.props['data-logo']

          return (
            <button
              key={idx}
              className={`md-tab-btn ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {logo && (
                <img src={logo} alt={`${name} logo`} className='md-tab-logo' />
              )}
              {name}
            </button>
          )
        })}
      </div>
      <div className='md-tab-content'>{tabs[activeTab]}</div>
    </div>
  )
}

const Tab = ({ children }) => {
  return <div className='md-tab-pane'>{children}</div>
}

// --- MAIN RENDERER ---

export default function DocPage ({ markdown }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]} // Enable HTML parsing
      components={{
        // Map our custom HTML tags to our React components
        'tab-group': TabGroup,
        tab: Tab,

        code ({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <div className='md-code-block'>
              <div className='md-code-header'>{match[1]}</div>
              <SyntaxHighlighter
                {...props}
                children={String(children).replace(/\n$/, '')}
                style={vscDarkPlus}
                language={match[1]}
                PreTag='div'
                customStyle={{
                  margin: 0,
                  background: 'transparent',
                  padding: '1.25rem',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          ) : (
            <code {...props} className={className}>
              {children}
            </code>
          )
        },

        img ({ src, alt, className }) {
          const isLogo = src && src.includes('/logos/')
          if (isLogo && !className?.includes('md-tab-logo')) {
            return <img src={src} alt={alt} className='md-logo' />
          }
          if (className?.includes('md-tab-logo')) {
            return <img src={src} alt={alt} className={className} />
          }
          return (
            <span
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '40px 0'
              }}
            >
              <img
                src={src}
                alt={alt}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  borderRadius: '8px',
                  border: '1px solid #262626',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  background: '#0a0a0a'
                }}
              />
            </span>
          )
        }
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
