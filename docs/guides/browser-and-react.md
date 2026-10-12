# VRPC in the browser

The same `VrpcClient` that runs in Node.js runs in the browser: a web page
can call agents, create instances and listen to events directly, over the
broker. A page can also be an agent itself. This guide shows how to load
VRPC in a page, connect it, and what to mind in a browser.

## Loading VRPC

With a bundler (Vite, webpack, esbuild, ...), import from `vrpc`. The
package's `browser` field points bundlers to a build made for browsers:

```javascript
import { VrpcClient } from 'vrpc'
```

Without a bundler, load the build itself; it defines the global `vrpc`:

```html
<script src="https://cdn.jsdelivr.net/npm/vrpc@3.15.0/browser/vrpc.js"></script>
<script>
  const client = new vrpc.VrpcClient({ domain: 'factory', broker: 'wss://broker.example.com:8884/mqtt' })
</script>
```

The browser build exports `VrpcClient`, and `VrpcAgent` and `VrpcAdapter`
for agents that run in a page.

## Connecting

A browser can only open WebSocket connections, so the broker URL uses
`wss://` (or `ws://` during development) and the broker's WebSocket port and
path:

```javascript
const client = new VrpcClient({
  domain: 'factory',
  broker: 'wss://broker.example.com:8884/mqtt',
  token: sessionToken
})
await client.connect()
const press = await client.getInstance('press-a', { agent: 'line-1' })
```

Everything else - calls, instances, events - works as in Node.js; see
[How VRPC works](../concepts/overview.md).

## A tab, a connection

Every `VrpcClient` is one connection with its own connection id. When a tab
closes, or its network goes, the broker publishes the connection's will and
every agent cleans up after it: its subscriptions are withdrawn, its
isolated instances deleted. A tab that reconnects declares its subscriptions
again by itself.

To let agents recognize the connections of one user across tabs, give the
client an `identity`; agents report it with every departed connection
(`clientGone`).

## Background tabs

Browsers throttle the timers of hidden tabs, which used to delay a client's
keepalive until the broker dropped the connection. VRPC runs its keepalive
on a Web Worker timer and its packet handling outside page timers, so a
hidden tab keeps its session.

## An agent in a page

A page can offer classes and plain functions:

```javascript
import { VrpcAgent, VrpcAdapter } from 'vrpc'

class Display {
  show (text) { document.querySelector('#message').textContent = text }
}

VrpcAdapter.registerClass(Display)
VrpcAdapter.registerFunction(text => alert(text), 'notify')

const agent = new VrpcAgent({ domain: 'factory', agent: 'hmi-3', broker: 'wss://broker.example.com:8884/mqtt' })
await agent.serve()
```

A browser agent without a name takes eight random characters on every page
load; name it if clients need to find it again. Plain functions registered
with `registerFunction` are called on the class `__global__`. Persistence
and the command line are not available in the browser, and neither is
schema validation of constructor arguments
([Validate constructor arguments](expose-classes.md#validate-constructor-arguments)):
the validator would make every page's bundle a fifth larger.

## React

[vrpc-react](https://github.com/heisenware/vrpc-react) wraps a client in
React hooks: a provider that connects, and hooks that give components the
instances and events of agents.
