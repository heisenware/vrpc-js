# Running in production

This guide collects what matters once agents and clients run for real: how
they come back from failures, what they report, how to see the event load
on an agent, and how to stop them cleanly. For access control, see
[Securing a deployment](security.md).

## Name things

- **Name every agent.** Without a name an agent takes
  `<user>-<id>@<host>-<platform>-js`, stable for its installation - fine on
  a laptop, wrong for a fleet. Clients address agents by name, and broker
  permissions name them.
- **Give each deployment its own domain**, or several: agents and clients
  see each other within one domain only.

## Choose delivery

VRPC publishes at QoS 0 by default: a message lost on the way stays lost,
and the caller learns of it from its timeout (12 seconds by default,
`timeout` on the client). Over unstable links, publish at QoS 1 with
`bestEffort: false` on agents and clients (`--no-bestEffort` on the command
line); it rides out short connection losses at the cost of acknowledgements.

## Connections that break

Agents and clients reconnect by themselves, and everything is set up again:

- **An agent** subscribes everything anew and announces itself only once it
  is ready to serve.
- **A client** subscribes anew and declares its subscriptions again; your
  callbacks keep receiving events without you doing anything.
- **A refused connection** (expired credentials, an authorization service
  that is briefly away) is retried after 1 second, then 2, 4, 8, 16 and at
  most every 30 seconds. Give a client new credentials with
  `client.updateCredentials({ token })` and it tries them at once.
- **A refused subscription** is retried with the same growing delay and
  reported as an `error` event.

`client.connect()` resolves once the broker accepted the connection, or
rejects after `timeout`; with `connect({ keepTrying: true })` it rejects at
the timeout but the client keeps trying in the background.

## When peers go away

The broker publishes the last will of every connection that breaks, and
VRPC acts on it:

- **An agent goes offline:** clients see it at once (`client.on('agent',
  ...)`). Their subscriptions on it are reported `lost` and declared again
  when the agent is back (`healed`). Calls to it fail with a timeout
  meanwhile.
- **A client goes offline:** every agent withdraws its subscriptions and
  deletes its isolated instances, and reports it as `clientGone`
  (connection id, and the client's `identity`, if it has one).
- **An instance goes away:** subscriptions on it are reported `lost` with
  reason `instanceGone`; create it again and subscribe again.

An agent that is itself disconnected when a client's will goes out misses
it and keeps that client's isolated instances and subscriptions until it
restarts.

## Logging

Agents and clients log through the `log` option: any object with `debug`,
`info`, `warn` and `error` (`console` by default). Agents log, among other
things:

| Warning | Meaning |
| --- | --- |
| `Dispose of deleted instance ... failed` | an instance's `[Symbol.asyncDispose]` threw, rejected or took longer than 10 seconds; it is deleted anyway |
| `Release of registration ... failed` | an event function's registration threw on release; it is gone anyway |
| `Greeting of a subscriber ... failed` | a registration's `greet` threw; the subscriber stays subscribed |
| `Instantiation of ... failed` | a constructor threw on a create |

The same events are available on the adapter (`VrpcAdapter.on('disposeFailed', ...)`,
`'releaseFailed'`, `'greetFailed'`) for metrics.

## Seeing the event load

An agent that floods the network usually has an event registration nobody
needs any more. List the registrations of an instance, with their rate and
who subscribes:

```javascript
const registrations = await client.getRegistrations({ agent: 'line-1', instance: 'mqtt' })
for (const { function: fn, args, rate, subscriptions } of registrations) {
  console.log(fn, args, `${rate.toFixed(1)}/s`, subscriptions.map(s => s.label))
}
```

Label your subscriptions (`client.setSubscriberLabel(callback, label)`)
so a listing tells who they belong to. `client.endRegistration(...)` ends a
registration for all its subscribers, who are told who ended it - a brake
for a registration whose owner you cannot reach.

## Keeping instances

Instances live in memory. To re-create an agent's shared instances when it
restarts, use [persistence](persistence.md), and restore before serving.

## Stopping cleanly

End an agent when the process is told to stop: clients learn at once that it
went offline, instead of after the broker's keepalive timeout.

```javascript
process.on('SIGTERM', async () => {
  await agent.end()
  process.exit(0)
})
```

`agent.end({ unregister: true })` takes an agent off the broker for good:
its retained agent and class info are cleared, and clients forget it. An
agent that serves again without a class it offered before clears that
class's info itself, whichever way it ended. A
client's `end()` publishes its presence, so agents clean up after it at
once.

## Mixed versions

Agents and clients of different versions work together; the
[protocol specification](../spec/protocol.md#13-versions-and-compatibility)
says how. Two things to know when you upgrade a fleet gradually:

- Clients older than 3.6 lose their event subscriptions on agents of 3.15 or
  newer: upgrade clients first.
- An agent of 3.15 or newer shares and greets event registrations for every
  client. Ended notices and healing after an agent's loss need the client at
  3.15 or newer, too (protocol 4).
