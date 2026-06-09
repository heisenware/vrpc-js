// src/pages/Home.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy,
  Check,
  Zap,
  Globe,
  Shield,
  Braces,
  Terminal,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import LiveRadar from '../LiveRadar'

import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'

const snippets = {
  javascript: {
    label: 'Node.js',
    logo: '/assets/logos/nodejs.png',
    install: 'npm init -y && npm install vrpc',
    run: 'node agent.js',
    files: [
      {
        name: 'agent.js',
        language: 'javascript',
        code: `const { VrpcAgent, VrpcAdapter } = require('vrpc')

class SystemInfo {
  static greet(sender, message) {
    console.log(\`[INCOMING MESSAGE] from \${sender}: "\${message}"\`)
    return 'Greetings from Node.js Edge Device! I got your message.'
  }
}

VrpcAdapter.register(SystemInfo)

async function main() {
  const agent = new VrpcAgent({
    domain: 'vrpc-live-demo',
    agent: \`visitor-js-\${Math.floor(Math.random() * 10000)}\`,
    broker: 'mqtts://broker.hivemq.com:8883'
  })

  await agent.serve()
  console.log('Waiting for messages...\\n')
}

main().catch(console.error)`
      }
    ]
  },
  python: {
    label: 'Python',
    logo: '/assets/logos/python.png',
    install: 'pip install vrpc',
    run: 'python agent.py',
    files: [
      {
        name: 'agent.py',
        language: 'python',
        code: `import asyncio
import random
from vrpc import VrpcAgent, VrpcAdapter

class SystemInfo:
    @staticmethod
    def greet(sender: str, message: str) -> str:
        print(f'[INCOMING MESSAGE] from {sender}: "{message}"')
        return "Greetings from Python Edge Device! I got your message."

VrpcAdapter.register(SystemInfo)

async def main():
    agent = VrpcAgent(
        domain="vrpc-live-demo",
        agent=f"visitor-py-{random.randint(0, 10000)}",
        broker="mqtts://broker.hivemq.com:8883"
    )
    print("Waiting for messages...\\n")
    await agent.serve()

if __name__ == "__main__":
    asyncio.run(main())`
      }
    ]
  },
  cpp: {
    label: 'C++',
    logo: '/assets/logos/cpp.png',
    install: 'cmake -B build -DVRPC_WITH_TLS=ON',
    run: 'cmake --build build && ./build/agent',
    files: [
      {
        name: 'main.cpp',
        language: 'cpp',
        code: `#include <vrpc/agent.hpp>
#include <vrpc/adapter.hpp>
#include <iostream>
#include <string>
#include <cstdlib>

class SystemInfo {
public:
    static std::string greet(const std::string& sender, const std::string& message) {
        std::cout << "[INCOMING MESSAGE] from " << sender << ": \\"" << message << "\\"" << std::endl;
        return "Greetings from C++ Edge Device! I got your message.";
    }
};

VRPC_STATIC_FUNCTION(SystemInfo, std::string, greet, const std::string&, const std::string&)

int main() {
    srand(time(NULL));
    vrpc::VrpcAgent::Options options;
    options.domain = "vrpc-live-demo";
    options.agent = "visitor-cpp-" + std::to_string(rand() % 10000);
    options.broker = "mqtts://broker.hivemq.com:8883";

    auto agent = vrpc::VrpcAgent::create(options);
    std::cout << "Waiting for messages...\\n";
    agent->serve();

    return 0;
}`
      },
      {
        name: 'CMakeLists.txt',
        language: 'cmake',
        code: `cmake_minimum_required(VERSION 3.14)
project(vrpc_example LANGUAGES CXX)

include(FetchContent)
FetchContent_Declare(
  vrpc
  GIT_REPOSITORY https://github.com/heisenware/vrpc-hpp.git
  GIT_TAG        v3.1.2
)
FetchContent_MakeAvailable(vrpc)

add_executable(agent main.cpp)
target_link_libraries(agent PRIVATE vrpc::vrpc)`
      }
    ]
  },
  arduino: {
    label: 'Arduino (ESP32)',
    logo: '/assets/logos/arduino.png',
    install: 'Install "vrpc" via the Library Manager',
    run: 'Compile and Upload via Arduino IDE / PlatformIO',
    files: [
      {
        name: 'Agent.ino',
        language: 'cpp',
        code: `#include <WiFi.h>
#include <vrpc.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

class Hardware {
public:
  static String blink(int times) {
    for (int i = 0; i < times; i++) {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(200);
      digitalWrite(LED_BUILTIN, LOW);
      delay(200);
    }
    return "Blinked " + String(times) + " times successfully.";
  }
};

// Bind the C++ function to VRPC without boilerplate
VRPC_STATIC_FUNCTION(Hardware, String, blink, int)

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  Vrpc::begin(
    "vrpc-live-demo",           // Domain
    "visitor-esp32",            // Agent Name
    "broker.hivemq.com",        // Broker
    1883                        // Port
  );
}

void loop() {
  Vrpc::loop();
}`
      }
    ]
  }
}

// Helper Component: Collapsible Setup Instructions
const SetupInstructions = ({ install, run }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      style={{
        background: '#1e1e1e',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #2d2d2d'
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#252526',
          padding: '0.8rem 1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: '#cccccc',
          fontSize: '0.85rem',
          userSelect: 'none'
        }}
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Terminal size={16} className='text-ci' />
        <span style={{ fontWeight: '600', letterSpacing: '0.5px' }}>
          Setup & Run
        </span>
      </div>
      {isOpen && (
        <div
          style={{
            padding: '1rem',
            color: '#d4d4d4',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderTop: '1px solid #2d2d2d'
          }}
        >
          <div>
            <div style={{ color: '#6a9955', marginBottom: '0.3rem' }}>
              // 1. Install dependencies
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span style={{ color: '#569cd6' }}>$</span>
              <span>{install}</span>
            </div>
          </div>
          <div>
            <div style={{ color: '#6a9955', marginBottom: '0.3rem' }}>
              // 2. Start the agent
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span style={{ color: '#569cd6' }}>$</span>
              <span>{run}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Component: Collapsible Code File
const CodeFile = ({ file, initiallyOpen }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const [copied, setCopied] = useState(false)

  const handleCopy = e => {
    e.stopPropagation()
    navigator.clipboard.writeText(file.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #2d2d2d'
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.6rem 1rem',
          background: '#252526',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#cccccc',
            fontSize: '0.85rem',
            fontFamily: 'monospace'
          }}
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span style={{ color: '#4fc1ff' }}>{file.name}</span>
        </div>
        <button
          onClick={handleCopy}
          aria-label='Copy code'
          style={{
            background: 'none',
            border: 'none',
            color: '#858585',
            cursor: 'pointer',
            padding: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#cccccc')}
          onMouseLeave={e => (e.currentTarget.style.color = '#858585')}
        >
          {copied ? (
            <Check size={16} className='text-success' />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
      {isOpen && (
        <SyntaxHighlighter
          language={file.language}
          style={vs2015}
          customStyle={{
            background: '#1e1e1e',
            padding: '1rem',
            margin: 0,
            fontSize: '0.85rem',
            lineHeight: '1.4',
            borderTop: '1px solid #2d2d2d'
          }}
        >
          {file.code}
        </SyntaxHighlighter>
      )}
    </div>
  )
}

export default function Home () {
  const [activeTab, setActiveTab] = useState('javascript')
  const activeSnippet = snippets[activeTab]

  return (
    <div className='home'>
      {/* HERO SECTION */}
      <section className='hero'>
        <div className='hero-badge'>v3.0 is now live</div>
        <h1>Stop writing API boilerplate.</h1>
        <p className='subtitle'>
          Call C++, Node.js, Python, and Arduino classes across any network as
          if they were local objects. Perfect for microservices, IoT edge
          devices, and directly driving React frontends without REST, GraphQL,
          or WebSocket boilerplate.
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

      {/* FEATURES SECTION */}
      <section className='features-section'>
        <div className='feature-card'>
          <Zap className='feature-icon text-ci' />
          <h3>Zero Boilerplate</h3>
          <p>
            No IDL files (like protobuf), no route definitions, and no payload
            parsing. Just register your class, and VRPC instantly makes its
            public methods and static functions remotely callable.
          </p>
        </div>
        <div className='feature-card'>
          <Globe className='feature-icon text-ci' />
          <h3>Native Event Proxies</h3>
          <p>
            Don't just fetch data—stream it. VRPC transparently proxies
            EventEmitters and native callbacks across the network. When your C++
            edge device emits a hardware event, your React UI updates instantly.
          </p>
        </div>
        <div className='feature-card'>
          <Braces className='feature-icon text-ci' />
          <h3>Multi-Language & Embedded</h3>
          <p>
            Write your performance-critical code in C++, your scripts in Python,
            your business logic in Node, and your IoT firmware on ESP32/Arduino.
            Call them all identically.
          </p>
        </div>
        <div className='feature-card'>
          <Shield className='feature-icon text-ci' />
          <h3>MQTT-Powered NAT Traversal</h3>
          <p>
            Built on top of robust MQTT, agents make outbound connections to
            your broker. No open firewall ports, no complex reverse proxies, and
            perfect resilience on unstable networks.
          </p>
        </div>
      </section>

      {/* INTERACTIVE DEMO SECTION */}
      <section className='demo-section'>
        <div
          className='demo-section-title'
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            marginTop: '2rem'
          }}
        >
          <h2
            style={{
              fontSize: '2.8rem',
              fontWeight: '800',
              letterSpacing: '-0.5px',
              color: '#ffffff'
            }}
          >
            Ever talked directly to a website?
          </h2>
          <p
            style={{
              color: '#a0a0a0',
              fontSize: '1.15rem',
              maxWidth: '650px',
              margin: '1rem auto 0',
              lineHeight: '1.6'
            }}
          >
            Experience seamless, bi-directional RPC in seconds. Fire up an agent
            on your local machine and watch it instantly communicate with this
            page.
          </p>
        </div>

        <div className='demo-row'>
          <div className='step-header'>
            <div className='step-number'>1</div>
            <h2>Run this on your machine</h2>
          </div>
          <p className='step-desc'>
            Choose your language, prepare the environment, and run the agent.
          </p>

          <div className='code-block-wrapper'>
            <div className='code-tabs'>
              {Object.entries(snippets).map(([key, { label, logo }]) => (
                <button
                  key={key}
                  className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {logo && (
                    <img
                      src={logo}
                      alt={`${label} logo`}
                      className='tab-logo'
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>

            {/* DYNAMIC CODE & INSTRUCTION BLOCKS */}
            <div
              className='code-blocks-container'
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                marginTop: '1rem'
              }}
            >
              {/* COLLAPSIBLE SETUP COMMANDS */}
              <SetupInstructions
                install={activeSnippet.install}
                run={activeSnippet.run}
              />

              {/* COLLAPSIBLE FILES */}
              {activeSnippet.files.map((file, idx) => (
                <CodeFile
                  key={file.name}
                  file={file}
                  initiallyOpen={idx === 0}
                />
              ))}
            </div>
          </div>
        </div>

        <div className='demo-row'>
          <div className='step-header'>
            <div className='step-number'>2</div>
            <h2>Watch the Global Radar</h2>
          </div>
          <p className='step-desc'>
            Your machine (or hardware device) will bypass NATs/firewalls and
            instantly appear below.
          </p>
          <LiveRadar />
        </div>
      </section>
    </div>
  )
}
