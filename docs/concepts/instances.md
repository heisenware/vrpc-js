# Instances

An agent keeps the objects of its classes as named **instances**. Clients
create them, call them and delete them; the agent's own program can create
them too. This page explains the two kinds of instances, how long each one
lives, and how an instance releases what it runs.

## Shared and isolated

| | Shared | Isolated |
| --- | --- | --- |
| Visible to | every client of the domain | the connection that created it |
| Listed in the class info | yes | no |
| Lives until | it is deleted | it is deleted, or its creator's connection goes |
| Typical use | a device, a service, a machine everybody watches | a session, a per-user cart, a scratch object |

```javascript
// shared: anybody may find and call it
const press = await client.create({
  agent: 'line-1',
  className: 'Press',
  instance: 'press-a',
  args: [{ port: '/dev/ttyUSB0' }]
})

// isolated: only this connection can reach it
const draft = await client.create({
  agent: 'line-1',
  className: 'Recipe',
  instance: 'draft-anna',
  isIsolated: true
})
```

The constructor arguments travel as JSON. An instance name is one MQTT topic
level: a non-empty string without `/`, `+` or `#`, and not `__static__`.
Without a name, the client makes up a random one.

## Creating an instance that exists

Creating is idempotent for its owner:

- Creating a shared instance that exists does **not** call the constructor
  again; it answers the existing instance, and the new arguments are
  ignored. Several clients can "create" the same shared instance at start-up
  and all get the one object.
- Creating an isolated instance that exists answers it to the connection
  that created it, and is refused to every other connection.
- A name is never re-used for the other kind: creating a shared instance
  under the name of an isolated one fails, and the other way round.

## Finding an instance

```javascript
const press = await client.getInstance('press-a', { agent: 'line-1' })
```

`getInstance` looks the name up in the class info the agents publish, and
waits for it to appear when it does not exist yet. It creates nothing and
sends nothing: the proxy it returns calls the instance when you call it.
Shared instances are found by every client. An isolated instance is listed
nowhere; only the connection that created it finds it.

`client.on('instanceNew', ...)` and `client.on('instanceGone', ...)` tell
when shared instances come and go.

## Instances the agent creates

The program that runs the agent can create instances itself, before or
after it serves:

```javascript
agent.create({ className: 'Press', instance: 'press-a', args: [options] })
```

Such an instance has no owner and behaves as a shared one. An existing
object can be offered as well, with `VrpcAdapter.registerInstance(object, {
className, instance })`.

## Deleting

```javascript
await client.delete('press-a', { agent: 'line-1' })
```

Deleting ends an instance for good, in this order:

1. **The name is free at once.** No call reaches the old object any more,
   and a create of the same name makes a new object.
2. **It falls silent.** The agent forgets its event registrations, and
   every handler and callback it handed out stops publishing - even if the
   object keeps calling them. Its subscribers learn from the class info that
   the instance is gone.
3. **It releases what it runs** (next section).

`delete` resolves `true` once that is done, and `false` when there was no
such instance. A delete names the instance's own class; the agent refuses a
delete through another class.

## Releasing what an instance runs

JavaScript has no destructor: an object that runs a timer, holds a socket or
owns a serial port keeps doing so as long as anything refers to it. An
instance releases its resources through the standard
[explicit resource management](https://github.com/tc39/proposal-explicit-resource-management)
methods, which the agent calls on delete:

```javascript
class Press {
  constructor ({ port }) {
    this._port = openPort(port)
    this._timer = setInterval(() => this._poll(), 1000)
  }

  async [Symbol.asyncDispose] () {
    clearInterval(this._timer)
    await this._port.close()
  }
}
```

- The agent calls `[Symbol.asyncDispose]()`, or else `[Symbol.dispose]()`,
  and answers the delete once it has settled - so a create of the same name
  right after the delete never meets a port the old object still holds.
- A disposal that throws, rejects or takes longer than 10 seconds
  (`VrpcAdapter.DISPOSE_TIMEOUT`) is reported as the adapter event
  `disposeFailed`, which the agent logs; the delete still succeeds, because
  the instance is gone either way.
- Symbol-named methods are never remote functions: a delete is the only way
  to dispose an instance.
- On Node.js before 18.18 and 20.4, which lack the dispose symbols, VRPC
  installs Node's own stand-ins (`Symbol.for('nodejs.dispose')`,
  `Symbol.for('nodejs.asyncDispose')`).

## When the creator goes

An agent watches the presence of every connection that owns isolated
instances. When that connection goes - closed cleanly or broken, which the
broker reports through the connection's last will - the agent deletes its
isolated instances as above.

This includes a client that only loses its network for a moment: when it
reconnects, its isolated instances are gone, and it creates them again if it
needs them. Shared instances are never deleted because a client went.

One gap remains: an agent that is itself disconnected at the moment a
client's will goes out never learns that the client left, and keeps that
client's isolated instances until it restarts (see the specification's
[known limitations](../spec/protocol.md#15-known-limitations)).

## Instances across agent restarts

Instances live in the agent's memory and are gone when it restarts. To have
an agent re-create its shared instances on start-up, with the arguments they
were created with, use [persistence](../guides/persistence.md).
