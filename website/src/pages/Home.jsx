// src/pages/Home.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, Zap, Globe, Shield, Braces, Terminal } from 'lucide-react'
import LiveRadar from '../LiveRadar'

import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'

const snippets = {
  javascript: {
    label: 'Node.js',
    command: 'npm i vrpc',
    file: 'agent.js',
    code: `const { VrpcAgent, VrpcAdapter } = require('vrpc')
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
    broker: 'mqtts://broker.hivemq.com:8883'
  })

  await agent.serve()
  console.log('Waiting for messages...\\n')
}

main().catch(console.error)`
  },
  python: {
    label: 'Python',
    command: 'pip install vrpc',
    file: 'agent.py',
    code: `import asyncio
import os
import random
from vrpc import VrpcAgent, VrpcAdapter

class SystemInfo:
    @staticmethod
    def greet(sender: str, message: str) -> str:
        print(f'[INCOMING MESSAGE] from {sender}: "{message}"')
        return f"Greetings from {os.uname().nodename}! I got your message."

VrpcAdapter.register(SystemInfo)

async def main():
    agent = VrpcAgent(
        domain="vrpc-live-demo",
        agent=f"visitor-{random.randint(0, 10000)}",
        broker="mqtts://broker.hivemq.com:8883"
    )
    print("Waiting for messages...\\n")
    await agent.serve()

if __name__ == "__main__":
    asyncio.run(main())`
  },
  cpp: {
    label: 'C++',
    command: 'cmake . && make',
    file: 'agent.cpp',
    code: `#include <vrpc/agent.hpp>
#include <vrpc/adapter.hpp>
#include <iostream>
#include <string>

#ifndef _WIN32
#include <unistd.h>
#endif

std::string getHostname() {
    char hostname[256] = "unknown";
    gethostname(hostname, sizeof(hostname));
    return std::string(hostname);
}

class SystemInfo {
public:
    static std::string greet(const std::string& sender, const std::string& message) {
        std::cout << "[INCOMING MESSAGE] from " << sender << ": \\"" << message << "\\"" << std::endl;
        return "Greetings from " + getHostname() + "! I got your message.";
    }
};

VRPC_STATIC_FUNCTION(SystemInfo, std::string, greet, const std::string&, const std::string&)

int main() {
    srand(time(NULL));
    vrpc::VrpcAgent::Options options;
    options.domain = "vrpc-live-demo";
    options.agent = "visitor-" + std::to_string(rand() % 10000);
    options.broker = "ssl://broker.hivemq.com:8883";

    auto agent = vrpc::VrpcAgent::create(options);
    std::cout << "Waiting for messages...\\n";
    agent->serve();
    return 0;
}`
  },
  arduino: {
    label: 'Arduino (ESP32)',
    command: 'Upload via Arduino IDE / PlatformIO',
    file: 'Agent.ino',
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
}

export default function Home () {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('javascript')

  const activeSnippet = snippets[activeTab]

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
              {Object.entries(snippets).map(([key, { label }]) => (
                <button
                  key={key}
                  className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className='install-command'>
              <Terminal size={14} className='opacity-50' />
              <code>{activeSnippet.command}</code>
            </div>

            <div className='code-block'>
              <button
                className='copy-btn'
                onClick={handleCopy}
                aria-label='Copy code'
              >
                {copied ? (
                  <Check size={16} className='text-success' />
                ) : (
                  <Copy size={16} />
                )}
              </button>

              <SyntaxHighlighter
                language={activeTab === 'arduino' ? 'cpp' : activeTab}
                style={vs2015}
                customStyle={{
                  background: '#1e1e1e',
                  padding: '1rem',
                  margin: 0,
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  borderRadius: '0 0 8px 8px'
                }}
              >
                {activeSnippet.code}
              </SyntaxHighlighter>
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
