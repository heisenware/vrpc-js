import React, { forwardRef, useEffect, useReducer, useRef } from 'react'

// One call, end to end: a browser asks a Raspberry Pi for the temperature,
// then listens to every reading. Pulses carry each message through the V,
// and the strip below shows the message as it travels - the protocol 4
// topics and payloads (docs/spec/protocol.md, sections 6 and 12), without
// the sender `s` and the version `v` every message also carries.

const CONN = 'home/web-7f3a/k9x2' // the browser's connection id
const SUB = `__e__${CONN}/s1` // its subscription id

const CLIENT = [
  "const client = new VrpcClient({ domain: 'home' })",
  'await client.connect()',
  "const sensor = await client.getInstance('kitchen')",
  '',
  'const celsius = await sensor.read()',
  'await sensor.onReading(c => chart.add(c))'
]

const AGENT = [
  'class Sensor {',
  '  read () {',
  '    return this._adc.celsius()',
  '  }',
  '',
  '  onReading (handler) {',
  "    this._adc.on('reading', handler)",
  "    const off = () => this._adc.off('reading', handler)",
  '    return { [Symbol.dispose]: off }',
  '  }',
  '}',
  '',
  'VrpcAdapter.register(Sensor)',
  "new VrpcAgent({ domain: 'home', agent: 'pi-kitchen' })",
  '  .serve()'
]

const request = (f, a, i) => ({
  topic: `home/pi-kitchen/Sensor/kitchen/${f}`,
  payload: JSON.stringify({ c: 'kitchen', f, a, i })
})
const answer = (r, i) => ({ topic: CONN, payload: JSON.stringify({ r, i }) })
const event = value => ({ topic: `${CONN}/s1`, payload: JSON.stringify({ a: [value], i: SUB }) })

const FLIGHT = 1100 // ms from one card to the other

// The script, in ms from the start of a round. `fly` sends a pulse.
const SCRIPT = [
  { at: 0, set: { client: [4], agent: [], note: null, out: null, in: null } },
  { at: 400, fly: 'request', set: { out: request('read', [], 'Xa3kP9qz-1') } },
  { at: 1500, set: { agent: [1, 2, 3] } },
  { at: 1900, fly: 'answer', set: { in: answer(21.4, 'Xa3kP9qz-1') } },
  { at: 3000, set: { note: { line: 4, text: '21.4' } } },

  { at: 5200, set: { client: [5], agent: [], note: null, out: null, in: null } },
  { at: 5600, fly: 'request', set: { out: request('onReading', [SUB], 'Xa3kP9qz-2') } },
  { at: 6700, set: { agent: [5, 6, 7, 8, 9] } },
  { at: 7000, fly: 'answer', set: { in: answer(true, 'Xa3kP9qz-2') } },
  { at: 8200, fly: 'answer', set: { agent: [6], in: event(21.5) } },
  { at: 9300, set: { note: { line: 5, text: '21.5' } } },
  { at: 9500, fly: 'answer', set: { in: event(21.6) } },
  { at: 10600, set: { note: { line: 5, text: '21.6' } } },
  { at: 10800, fly: 'answer', set: { in: event(21.8) } },
  { at: 11900, set: { note: { line: 5, text: '21.8' } } }
]
const ROUND = 14000

// what the page shows at rest: the call, done
const AT_REST = {
  client: [4],
  agent: [1, 2, 3],
  note: { line: 4, text: '21.4' },
  out: request('read', [], 'Xa3kP9qz-1'),
  in: answer(21.4, 'Xa3kP9qz-1')
}

// the longest topic of the story, so that the strip's columns stay put
const TOPIC_WIDTH = Math.max(
  ...[AT_REST, ...SCRIPT.map(step => step.set || {})]
    .flatMap(set => [set.out, set.in])
    .filter(Boolean)
    .map(message => message.topic.length)
)

const reduce = (state, set) => ({ ...state, ...set })

// a small JavaScript highlighter, enough for these lines
const TOKEN = /(\/\/.*$)|('(?:[^'\\]|\\.)*')|\b(const|await|new|class|return|this)\b|\b(\d+(?:\.\d+)?|true)\b|([A-Za-z_$][\w$]*)(?=\s*\()|(=>|\[Symbol\.dispose\])/g
const KINDS = [null, 'tok-com', 'tok-str', 'tok-kw', 'tok-num', 'tok-fn', 'tok-op']
function highlight (line) {
  const out = []
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    if (m.index > last) out.push(line.slice(last, m.index))
    const kind = KINDS.findIndex((k, i) => i > 0 && m[i] !== undefined)
    out.push(<span key={m.index} className={KINDS[kind]}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

const CodeCard = forwardRef(function CodeCard ({ kind, file, where, lines, active, note }, ref) {
  return (
    <div ref={ref} className={`call-card call-card--${kind}`}>
      <div className='call-card__bar'>
        <span className='call-card__file'>{file}</span>
        <span className='call-card__where'>{where}</span>
      </div>
      <pre className='call-card__code'>
        <code>
          {lines.map((line, i) => (
            <span key={i} className={active.includes(i) ? 'line is-active' : 'line'}>
              {highlight(line)}
              {note && note.line === i && <span className='line-note'>{'  // '}{note.text}</span>}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
})

function WireRow ({ dir, message }) {
  return (
    <div className={`wire-row wire-row--${dir}${message ? ' is-on' : ''}`}>
      <span className='wire-row__dir' aria-hidden='true'>{dir === 'out' ? '→' : '←'}</span>
      <code className='wire-row__topic'>{message ? message.topic : ' '}</code>
      <code className='wire-row__payload'>{message ? message.payload : ' '}</code>
    </div>
  )
}

export default function CallStory () {
  const [state, set] = useReducer(reduce, AT_REST)
  const section = useRef(null)
  const stage = useRef(null)
  const client = useRef(null)
  const agent = useRef(null)
  const slot = useRef(null)
  const left = useRef(null)
  const right = useRef(null)
  const dots = useRef([])

  // the wires: client to the V, the V to the agent
  useEffect(() => {
    function draw () {
      const s = stage.current.getBoundingClientRect()
      const c = client.current.getBoundingClientRect()
      const a = agent.current.getBoundingClientRect()
      const v = slot.current.getBoundingClientRect()
      const vx = v.left + v.width / 2 - s.left
      const vy = v.top + v.height / 2 - s.top
      const stacked = a.top >= c.bottom
      let d1, d2
      if (stacked) {
        const cx = c.left + c.width / 2 - s.left
        const cy = c.bottom - s.top
        const ax = a.left + a.width / 2 - s.left
        const ay = a.top - s.top
        d1 = `M${cx} ${cy}C${cx} ${cy + 30} ${vx} ${vy - 40} ${vx} ${vy}`
        d2 = `M${vx} ${vy}C${vx} ${vy + 40} ${ax} ${ay - 30} ${ax} ${ay}`
      } else {
        const cx = c.right - s.left
        const cy = c.top + c.height * 0.42 - s.top
        const ax = a.left - s.left
        const ay = a.top + a.height * 0.42 - s.top
        d1 = `M${cx} ${cy}C${cx + 50} ${cy} ${vx - 60} ${vy} ${vx} ${vy}`
        d2 = `M${vx} ${vy}C${vx + 60} ${vy} ${ax - 50} ${ay} ${ax} ${ay}`
      }
      left.current.setAttribute('d', d1)
      right.current.setAttribute('d', d2)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(stage.current)
    return () => ro.disconnect()
  }, [])

  // the script, while the story is on screen
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let t0 = 0
    let next = 0
    let flights = []

    function place (from, u) {
      // u: 0 at the sender, 0.5 at the V, 1 at the receiver
      const [first, second] = from === 'client' ? [left.current, right.current] : [right.current, left.current]
      const forward = from === 'client'
      const path = u < 0.5 ? first : second
      const k = u < 0.5 ? u * 2 : u * 2 - 1
      const len = path.getTotalLength()
      const at = forward ? k : 1 - k
      return path.getPointAtLength(len * at)
    }

    function tick (now) {
      if (!t0) t0 = now
      let t = now - t0
      if (t >= ROUND) {
        t0 = now
        t = 0
        next = 0
        flights = []
      }
      while (next < SCRIPT.length && SCRIPT[next].at <= t) {
        const step = SCRIPT[next++]
        if (step.set) set(step.set)
        if (step.fly) {
          flights.push({
            start: now,
            from: step.fly === 'request' ? 'client' : 'agent',
            kind: step.fly,
            passed: false
          })
        }
      }
      flights = flights.filter(f => now - f.start < FLIGHT)
      dots.current.forEach((group, i) => {
        const f = flights[i]
        if (!group) return
        if (!f) { group.style.opacity = 0; return }
        const u = (now - f.start) / FLIGHT
        if (!f.passed && u >= 0.5) {
          // the pulse reaches the V: it flashes in the message's color
          f.passed = true
          window.dispatchEvent(new CustomEvent('vrpc-pulse', { detail: { kind: f.kind } }))
        }
        group.style.opacity = 1
        group.setAttribute('class', `pulse pulse--${f.kind}`)
        Array.from(group.children).forEach((circle, k) => {
          const p = place(f.from, Math.max(0, u - k * 0.03))
          circle.setAttribute('cx', p.x)
          circle.setAttribute('cy', p.y)
        })
      })
      frame = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame)
      if (entry.isIntersecting) {
        t0 = 0
        next = 0
        flights = []
        frame = requestAnimationFrame(tick)
      } else {
        set(AT_REST)
        dots.current.forEach(g => g && (g.style.opacity = 0))
      }
    }, { threshold: 0.35 })
    io.observe(section.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section ref={section} className='call-story'>
      <div className='section-head'>
        <span className='eyebrow'>One call, end to end</span>
        <h2>A remote call that reads like a local one</h2>
        <p>
          A browser asks a Raspberry Pi in the kitchen for the temperature,
          then listens to every new reading. In between: your MQTT broker, and
          no API layer.
        </p>
      </div>

      <div ref={stage} className='call-stage'>
        <CodeCard
          ref={client}
          kind='client'
          file='client.js'
          where='in the browser'
          lines={CLIENT}
          active={state.client}
          note={state.note}
        />
        <div ref={slot} className='logo-slot logo-slot--call' data-logo-slot='call'>
          <img className='logo-still' src='/logo.svg' alt='' />
          <span className='logo-slot__label'>over MQTT</span>
        </div>
        <CodeCard
          ref={agent}
          kind='agent'
          file='agent.js'
          where='on the Raspberry Pi'
          lines={AGENT}
          active={state.agent}
        />
        <svg className='call-wires' aria-hidden='true'>
          <path ref={left} className='wire' />
          <path ref={right} className='wire' />
          {[0, 1, 2].map(i => (
            <g key={i} ref={el => (dots.current[i] = el)} className='pulse' style={{ opacity: 0 }}>
              {[0, 1, 2, 3, 4].map(k => (
                <circle key={k} r={5 - k * 0.8} opacity={1 - k * 0.2} />
              ))}
            </g>
          ))}
        </svg>
      </div>

      <div className='wire-log' style={{ '--topic': `${TOPIC_WIDTH}ch` }}>
        <span className='wire-log__label'>On the wire</span>
        <WireRow dir='out' message={state.out} />
        <WireRow dir='in' message={state.in} />
      </div>
    </section>
  )
}
