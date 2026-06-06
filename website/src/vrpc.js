import { createVrpcProvider } from 'vrpc-react'

// We don't define specific backends here because we want to dynamically
// discover ANY agent that joins the 'vrpc-live-demo' domain!
export const VrpcProvider = createVrpcProvider({
  domain: 'vrpc-live-demo',
  broker: 'wss://broker.hivemq.com:8884/mqtt',
  backends: {},
  debug: false
})
