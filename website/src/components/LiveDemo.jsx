import React from 'react'
import { VrpcProvider } from './vrpc'
import LiveRadar from './LiveRadar'

// The page connects to the demo domain and discovers every agent a visitor
// starts there. Loaded in the browser only: it opens an MQTT connection.
export default function LiveDemo () {
  return (
    <VrpcProvider>
      <LiveRadar />
    </VrpcProvider>
  )
}
