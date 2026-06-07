# Introduction to VRPC

Welcome to **VRPC (Virtual Remote Procedure Call)**, an open-source distributed computing framework designed to seamlessly connect React frontends, cloud microservices, and IoT edge devices without writing a single line of API boilerplate.

## The Problem: API Fatigue

Modern application development usually involves bridging boundaries: Frontend to Backend, Microservice to Microservice, or Cloud to Edge Device.

Traditionally, bridging these gaps requires layers of repetitive boilerplate:

1. Defining REST endpoints or GraphQL resolvers.
2. Writing data transfer objects (DTOs) or maintaining IDL files (like Protocol Buffers).
3. Managing complex WebSocket connections for real-time events.
4. Dealing with CORS, NAT traversal, and firewall port-forwarding for IoT devices.

VRPC strips all of this away.

## The VRPC Philosophy: Functions, Not Endpoints

With VRPC, you stop thinking in terms of "endpoints" and start thinking in terms of **objects and functions**.

If you have a C++ class managing hardware on an ESP32, or a Python script running a machine learning model, VRPC allows you to instantiate that class and call its methods directly from a React frontend (or any other backend) over the network—as if it were a local object.

### Key Capabilities

- **Zero Boilerplate:** No IDL generation, no route mapping, no payload parsing. Just register your existing class, and VRPC instantly makes its public methods and static functions remotely callable.
- **Native Event Proxies:** Traditional RPC struggles with streaming events. VRPC embraces them. It transparently proxies `EventEmitter` and native callbacks across the network. When your C++ edge device emits a hardware event, your React UI updates instantly.
- **Multi-Language & Embedded:** Write your performance-critical code in C++, your data scripts in Python, your business logic in Node.js, and your hardware firmware on Arduino/ESP32. Call them all identically.
- **MQTT-Powered NAT Traversal:** Under the hood, VRPC leverages robust MQTT. Your agents make _outbound_ connections to the broker. This means no open firewall ports, no complex reverse proxies, and perfect resilience on unstable cellular or WiFi networks.

## How it Works

The VRPC architecture consists of three main components:

1. **The Agent:** A lightweight wrapper around your actual code (written in C++, Python, Node.js, or Arduino). It connects to the MQTT broker and registers the classes and functions you want to expose.
2. **The Broker:** An MQTT broker (like HiveMQ or Mosquitto) that acts as the central nervous system, routing requests and events between Clients and Agents.
3. **The Client:** Your consumer application (e.g., a React frontend or another backend service). It connects to the broker, discovers available Agents, and creates dynamic "Proxy Objects".

![VRPC Architecture](/assets/vrpc-architecture.png)

### The Magic in Action

When a Client calls a method on a Proxy Object:

1. The Client serializes the function name and arguments into a compact JSON payload.
2. The payload is published to the Broker.
3. The Broker routes it to the specific Agent.
4. The Agent executes the native function, captures the return value (or catches any exceptions), and publishes the result back.
5. The Client's `await` resolves seamlessly with the native return value.

All of this happens in milliseconds, fully asynchronously, with automatic timeout handling and error propagation.

## Next Steps

Ready to stop writing boilerplate?

- Head over to the **[Architecture](./architecture)** page for a deeper dive into how state and instances are managed.
- Check out the **[API Reference](./api)** to see how to implement VRPC in your language of choice.
