import React from 'react'
import { createVrpcProvider } from 'vrpc-react'
import LiveRadar from './LiveRadar'

// The page connects to the demo domain and discovers every agent a visitor
// starts there. Loaded in the browser only: it opens an MQTT connection.
const VrpcProvider = createVrpcProvider({
  domain: 'vrpc-live-demo',
  broker: 'wss://broker.hivemq.com:8884/mqtt'
})

export default function LiveDemo () {
  return (
    <VrpcProvider>
      <LiveRadar />
    </VrpcProvider>
  )
}
