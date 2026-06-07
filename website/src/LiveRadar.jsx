// src/LiveRadar.jsx
import React, { useEffect, useState } from 'react'
import { useClient } from 'vrpc-react'
import { Terminal, Send, Activity, Radio } from 'lucide-react'

export default function LiveRadar () {
  const [client] = useClient('vrpc-live-demo')
  const [onlineAgents, setOnlineAgents] = useState([])
  const [message, setMessage] = useState('Hello from the website!')

  useEffect(() => {
    if (!client) return
    const handleAgent = ({ agent, status }) => {
      if (!agent.startsWith('visitor-')) return
      setOnlineAgents(prev => {
        if (status === 'offline') return prev.filter(a => a !== agent)
        if (status === 'online' && !prev.includes(agent))
          return [...prev, agent]
        return prev
      })
    }
    client.on('agent', handleAgent)
    return () => client.off('agent', handleAgent)
  }, [client])

  const sendGreeting = async targetAgent => {
    if (!client) return
    try {
      const reply = await client.callStatic({
        agent: targetAgent,
        className: 'SystemInfo',
        functionName: 'greet',
        args: ['Website Visitor', message]
      })
      alert(`Reply from ${targetAgent}:\n\n${reply}`)
    } catch (err) {
      alert(
        `Failed to reach ${targetAgent}. They might have closed their terminal.`
      )
    }
  }

  if (!client)
    return (
      <div className='radar-box loading'>
        <Activity className='spin' size={24} /> Connecting to global radar...
      </div>
    )

  return (
    <div className='radar-box'>
      <div className='radar-header'>
        <h3>
          <Radio className='pulse-icon' size={20} /> Global Agent Radar
        </h3>
        <span className='badge'>{onlineAgents.length} Online</span>
      </div>

      {onlineAgents.length === 0 ? (
        <div className='radar-empty'>
          <Terminal size={32} />
          <p>Waiting for someone to run the script...</p>
        </div>
      ) : (
        <div className='radar-controls'>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder='Type a message to send...'
          />
        </div>
      )}

      <div className='agent-grid'>
        {onlineAgents.map(agent => (
          <div key={agent} className='agent-card'>
            <div className='agent-title'>
              <Terminal size={16} /> {agent}
            </div>
            <button className='send-btn' onClick={() => sendGreeting(agent)}>
              <Send size={14} /> Send Message
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
