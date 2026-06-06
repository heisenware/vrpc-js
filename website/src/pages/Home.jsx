// src/pages/Home.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, Zap, Globe, Shield, Braces } from 'lucide-react'
import LiveRadar from '../LiveRadar'

// Using the Highlight.js engine. It uses pure inline styles, making it
// 100% immune to CSS conflicts and guaranteed to respect line breaks.
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'

const scriptCode = `const { VrpcAgent, VrpcAdapter } = require('vrpc')
const os = require('os')

class SystemInfo {
  static greet(sender, message) {
    console.log(\`[INCOMING MESSAGE] from \${sender}: "\${message}"\`)
    return \`Greetings from \${os.hostname()}! I got your message.\`
  }
}

VrpcAdapter.register(SystemInfo)

async function main() {
  const agent = new VrpcAgent({
    domain: 'vrpc-live-demo',
    agent: \`visitor-\${Math.floor(Math.random() * 10000)}\`,
    broker: 'wss://broker.hivemq.com:8884/mqtt'
  })

  await agent.serve()
  console.log(\`Waiting for messages...\\n\`)
}

main().catch(console.error)`

export default function Home () {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='home'>
      {/* HERO SECTION */}
      <section className='hero'>
        <div className='hero-badge'>v2.0 is now live</div>
        <h1>Stop writing API boilerplate.</h1>
        <p className='subtitle'>
          Call your backend C++, Node.js, and Python classes directly from
          React. No REST endpoints, no GraphQL resolvers, no WebSocket routing.
        </p>
        <div className='hero-actions'>
          <Link to='/docs' className='btn btn-primary'>
            Read the Docs
          </Link>
          <a
            href='https://github.com/heisenware/vrpc-js'
            target='_blank'
            rel='noreferrer'
            className='btn btn-secondary'
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* INTERACTIVE DEMO SECTION */}
      <section className='demo-section'>
        <div className='demo-row'>
          <div className='step-header'>
            <div className='step-number'>1</div>
            <h2>Run this on your machine</h2>
          </div>
          <p className='step-desc'>
            Open a terminal, run <code>npm i vrpc</code>, save this as{' '}
            <code>agent.js</code> and run it.
          </p>
          <div className='code-block'>
            <button
              className='copy-btn'
              onClick={handleCopy}
              aria-label='Copy code'
            >
              {copied ? (
                <Check size={16} className='text-ci' />
              ) : (
                <Copy size={16} />
              )}
            </button>

            <SyntaxHighlighter
              language='javascript'
              style={vs2015}
              customStyle={{
                background: 'transparent',
                padding: 0,
                margin: 0,
                fontSize: '0.7rem', // Forces font size on the wrapper
                lineHeight: '1.2' // Forces tighter line spacing on the wrapper
              }}
              codeTagProps={{
                style: {
                  padding: 0, // Strips the annoying 8px left space
                  background: 'transparent',
                  fontSize: '0.7rem', // Forces font size on the inner text
                  lineHeight: '1.2' // Forces tighter line spacing on the inner text
                }
              }}
            >
              {scriptCode}
            </SyntaxHighlighter>
          </div>
        </div>

        <div className='demo-row'>
          <div className='step-header'>
            <div className='step-number'>2</div>
            <h2>Watch the Global Radar</h2>
          </div>
          <p className='step-desc'>
            Your machine will bypass NATs/firewalls and instantly appear below.
          </p>
          <LiveRadar />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className='features-section'>
        <div className='feature-card'>
          <Zap className='feature-icon text-ci' />
          <h3>Zero Boilerplate</h3>
          <p>
            Stop defining routes, HTTP methods, and payload structures. Just
            call your class functions remotely as if they were local objects.
          </p>
        </div>
        <div className='feature-card'>
          <Globe className='feature-icon text-ci' />
          <h3>Truly Reactive</h3>
          <p>
            Subscribe to backend events directly in your frontend. When the
            backend emits an event, your React UI updates instantly.
          </p>
        </div>
        <div className='feature-card'>
          <Braces className='feature-icon text-ci' />
          <h3>Multi-Language</h3>
          <p>
            Write your performance-critical code in C++, your scripts in Python,
            and your business logic in Node. Call them all identically.
          </p>
        </div>
        <div className='feature-card'>
          <Shield className='feature-icon text-ci' />
          <h3>NAT Traversal</h3>
          <p>
            Agents connect outbound to the MQTT broker. No need to open firewall
            ports or configure port forwarding to reach your devices.
          </p>
        </div>
      </section>
    </div>
  )
}
