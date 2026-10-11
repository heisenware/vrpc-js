// vrpc.io: the home page
import React, { useState } from 'react'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { usePluginData } from '@docusaurus/useGlobalData'
import CodeBlock from '@theme/CodeBlock'
import LogoJourney from '../components/LogoJourney'
import CallStory from '../components/CallStory'
import '../css/home.css'

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
  GIT_TAG        master
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
    // steps to take in the IDE, not commands
    prose: true,
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


// How to set up and start an agent of a snippet: commands, or IDE steps
function SetupSteps ({ snippet }) {
  const line = text => (snippet.prose ? `# ${text}` : text)
  return (
    <CodeBlock language='bash' title='Set up and run'>
      {`# 1. Prepare\n${line(snippet.install)}\n\n# 2. Start the agent\n${line(snippet.run)}`}
    </CodeBlock>
  )
}

function SnippetFiles ({ files }) {
  const [first, ...more] = files
  return (
    <>
      <CodeBlock language={first.language} title={first.name}>
        {first.code}
      </CodeBlock>
      {more.map(file => (
        <details key={file.name} className='snippet-more'>
          <summary>{file.name}</summary>
          <CodeBlock language={file.language}>{file.code}</CodeBlock>
        </details>
      ))}
    </>
  )
}

// What visitors weigh VRPC against. Every statement about another product
// must be true when the site is published: objective and verifiable.
// `rules` is the number of rules of the protocol spec (plugins/spec-facts).
const alternatives = rules => [
  {
    name: 'REST or gRPC?',
    text: (
      <>
        Both need a contract you maintain (routes, schemas,{' '}
        <code>.proto</code> files) and a server others can reach. VRPC needs
        neither:{' '}
        <strong>your class is the contract</strong>, and agents only connect out.
      </>
    )
  },
  {
    name: 'Your own MQTT topics?',
    text: (
      <>
        Then you write the RPC layer: matching answers to requests, timeouts,
        errors, discovery, knowing who still listens. VRPC is that layer,{' '}
        <strong>finished, tested and specified in {rules} rules</strong>.
      </>
    )
  },
  {
    name: 'WAMP?',
    text: (
      <>
        WAMP calls functions through its own router. VRPC calls{' '}
        <strong>objects</strong>: you create, call and delete them through the
        MQTT broker you already run, down to an ESP32.
      </>
    )
  },
  {
    name: 'Zenoh or NATS?',
    text: (
      <>
        Excellent transports. VRPC works a layer higher:{' '}
        <strong>objects with a lifecycle</strong>, and events that live as long
        as someone listens.
      </>
    )
  }
]

// What VRPC stands on, in short
const proof = rules => [
  { value: '0 lines of IDL', text: 'Your classes are the interface: no schemas, routes or code generators.' },
  { value: '0 open ports', text: 'on your devices: agents and clients only connect out, to the broker.' },
  { value: '1 broker', text: 'The MQTT broker you already run, such as Mosquitto or HiveMQ.' },
  { value: '5 platforms', text: 'Node.js, React, Python, C++ and Arduino, speaking one protocol.' },
  { value: `${rules} rules`, text: 'A written protocol, and tests that name the rules they check.' },
  {
    value: 'In production',
    text: (
      <>
        VRPC runs the{' '}
        <a href='https://heisenware.com' target='_blank' rel='noreferrer'>
          Heisenware
        </a>{' '}
        platform.
      </>
    )
  }
]

export default function Home () {
  const [activeTab, setActiveTab] = useState('javascript')
  const activeSnippet = snippets[activeTab]
  const { rules } = usePluginData('spec-facts')

  return (
    <Layout
      title='Remote objects over MQTT'
      description='VRPC makes the classes of Node.js, C++, Python and Arduino programs callable from any other program, over MQTT, without an API layer.'
      wrapperClassName='vrpc-home-wrapper'
    >
      <main className='vrpc-home'>
        <LogoJourney>
          <section className='home-hero'>
            <div className='home-hero__copy'>
              <span className='hero-badge'>VRPC · Remote objects over MQTT</span>
              <h1>
                Stop writing API boilerplate<span className='hero-dot'>.</span>
              </h1>
              <p className='subtitle'>
                Call C++, Node.js, Python, and Arduino classes across any
                network as if they were local objects. Perfect for
                microservices, IoT edge devices, and directly driving React
                frontends without REST, GraphQL, or WebSocket boilerplate.
              </p>
              <div className='hero-actions'>
                <Link to='/docs/getting-started' className='btn btn-primary'>
                  Get started
                </Link>
                <Link to='/docs' className='btn btn-secondary'>
                  Read the docs
                </Link>
              </div>
            </div>
            <div className='logo-slot logo-slot--hero' data-logo-slot='hero'>
              <img className='logo-still' src='/logo.svg' alt='VRPC' />
            </div>
          </section>

          <CallStory />
        </LogoJourney>

        <section className='compare-section'>
          <div className='section-head'>
            <span className='eyebrow'>Compared</span>
            <h2>Why not just use…</h2>
          </div>
          <div className='compare-grid'>
            {alternatives(rules).map(({ name, text }) => (
              <article key={name} className='compare-card'>
                <h3>{name}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className='compare-note'>
            Building a public HTTP API for strangers? Use REST. VRPC is for
            programs that belong together.
          </p>
        </section>

        <section className='proof-section' aria-label='VRPC in short'>
          {proof(rules).map(({ value, text }) => (
            <div key={value} className='proof-item'>
              <strong className='proof-item__value'>{value}</strong>
              <p>{text}</p>
            </div>
          ))}
        </section>

        <section className='demo-section'>
          <div className='section-head'>
            <span className='eyebrow'>Live</span>
            <h2>Ever talked directly to a website?</h2>
            <p>
              Start an agent on your machine, and this page finds it within a
              second - through your firewall, over a public broker - and can
              call it.
            </p>
          </div>

          <div className='demo-row'>
            <div className='step-header'>
              <div className='step-number'>1</div>
              <h3>Run this on your machine</h3>
            </div>
            <div className='code-tabs' role='tablist'>
              {Object.entries(snippets).map(([key, { label, logo }]) => (
                <button
                  key={key}
                  role='tab'
                  aria-selected={activeTab === key}
                  className={activeTab === key ? 'tab-btn active' : 'tab-btn'}
                  onClick={() => setActiveTab(key)}
                >
                  {logo && <img src={logo} alt='' className='tab-logo' />}
                  {label}
                </button>
              ))}
            </div>
            <SetupSteps snippet={activeSnippet} />
            <SnippetFiles key={activeTab} files={activeSnippet.files} />
          </div>

          <div className='demo-row'>
            <div className='step-header'>
              <div className='step-number'>2</div>
              <h3>Watch it appear</h3>
            </div>
            <BrowserOnly fallback={<div className='radar-box loading'>Connecting to the radar…</div>}>
              {() => {
                const LiveDemo = require('../components/LiveDemo').default
                return <LiveDemo />
              }}
            </BrowserOnly>
          </div>
        </section>
      </main>
    </Layout>
  )
}
