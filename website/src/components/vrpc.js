// The live demo's connection: the demo domain on the public broker, where
// every agent a visitor starts appears. Loaded in the browser only.
import { createVrpc } from 'vrpc-react'

export const { VrpcProvider, useClient } = createVrpc({
  domain: 'vrpc-live-demo',
  broker: 'wss://broker.hivemq.com:8884/mqtt'
})
