# Troubleshooting

Symptoms, their usual causes, and what to do. When something is not listed
here, run agent and client with a logger that prints `debug`
(`log: { ...console, debug: console.log }`): they log every message they
send and receive.

## A call times out

`Function call "<context>::<function>()" on agent "<agent>" timed out`

| Cause | Check |
| --- | --- |
| The instance does not exist | `client.getAvailableInstances({ className, agent })`. A request for an unknown instance reaches no agent and is never answered. |
| The function is static but called on an instance, or the other way round | the class info: `client.getAvailableStaticFunctions(...)`, `getAvailableMemberFunctions(...)`. |
| The agent is offline or under another name | `client.getAvailableAgents()`. |
| Agent and client are in different domains | both `domain` options. |
| The message was lost (QoS 0) on an unstable link | use `bestEffort: false` on both sides. |
| The function takes longer than the timeout | raise `timeout` on the client, or return a promise: a promise is answered when it settles, without a time limit. |

## A call lost its answer

`Function call "<context>::<function>()" on agent "<agent>" lost its answer: <reason>`

The answer can no longer arrive, so the call failed at once instead of
waiting. Calling again is safe as far as VRPC goes; whether the function ran
is unknown.

| Reason | What happened |
| --- | --- |
| `this client lost its connection` | the client's broker connection dropped while it waited. With a clean session nothing published meanwhile reaches it. |
| `the agent went offline` | the agent's will arrived while a promise of it was pending. |
| `the agent connected anew` | the agent announced itself from a new connection - it restarted, or its connection was taken over - while a promise of it was pending. |
| `the client ended` | `client.end()` was called while the call waited. |

## `Could not find function: <name>`

The function is not published. Functions starting with `_`, functions an
object only gets at run time, `constructor`, and `emit` and Node's other
emitter internals never are. See
[What is published](expose-classes.md#what-is-published).

## `Could not find context: <name>`

The instance was deleted while the request was on its way, or the request
names an instance that never existed on a topic the agent listens to.

## `Instance '<name>' is isolated to another connection`

An isolated instance belongs to the connection that created it. Another
client, or the same program after a new `VrpcClient` was made, cannot use it.
Create a shared instance if several clients need it.

## An isolated instance is gone after a network hiccup

When a client's connection breaks, the broker publishes its will and the
agents delete its isolated instances - also when the client reconnects a
moment later. Create them again after a reconnect (`client.on('connect',
...)`), or use shared instances for state that must survive.

## A handler receives nothing

| Cause | Check |
| --- | --- |
| The function is not recognized as an event function, so the handler was sent as a one-shot callback | name it `on<Name>`, declare `@returns {Registration}` (and use `requiresSchema: true` on the client), or call it through `proxy.vrpcOn(...)`. See [Writing event functions](event-functions.md). |
| The subscription ended or was lost | listen to the client's `ended` and `lost` events. |
| The subscription was refused | the subscribing call rejected: a client older than 3.6 against an agent of 3.15, or one subscription id reused with other arguments. |
| The class calls the handler before returning, to greet | that greets the first subscriber only: move it into `greet`. |

## A new subscriber does not get the current value

The class greets inside its event function, which reaches only the
subscribers present at that first call. Give its registration a `greet`
function ([Greeting](event-functions.md#greeting)).

## An event arrives twice

Two subscriptions: one callback subscribed to two functions, or to the same
function with two different arguments - for example a topic `#` and a topic
`line/+/state` that both match. `client.getSubscriptions({ callback })`
lists them.

## An agent keeps restarting its connection

Two agents with the same name in the same domain take each other's session
over in turn. Give each agent its own name; the default name is the same for
every agent of one installation.

## A refused connection

`Connection refused: Not authorized`, repeated with a growing delay: the
broker refuses the credentials. Check `token` or `username` and `password`,
and the broker's permissions for the username (see
[Securing a deployment](security.md)). Agents and clients keep retrying, so
fixing the broker side is enough.

## Instances are missing after an agent restart

Instances live in memory. Use [persistence](persistence.md); a record that
cannot be restored is quarantined and listed by `persistor.status()`.
