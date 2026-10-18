# Securing a deployment

VRPC's access control is the broker's: who may connect, and which topics
each connection may publish and subscribe. Every request is a topic that
names agent, class, instance and function, so topic permissions decide who
may call what. This guide shows how to set a deployment up so that they do.

## 1. Use your own broker, with TLS

The default broker, `broker.hivemq.com`, is public: anybody can read and
publish there. Use it to try VRPC, never for real data.

Connect over TLS (`mqtts://`, or `wss://` from a browser) and have agents
and clients verify the broker's certificate:

```javascript
const fs = require('fs')
const tls = { ca: fs.readFileSync('/etc/ssl/broker-ca.pem') }

const agent = new VrpcAgent({ domain: 'factory', agent: 'line-1', broker: 'mqtts://broker.example.com:8883', tls })
const client = new VrpcClient({ domain: 'factory', broker: 'mqtts://broker.example.com:8883', tls })
```

Without the `tls` option, VRPC does not verify the certificate. Pass
`tls: { rejectUnauthorized: true }` to verify against the system's
certificate authorities.

## 2. Authenticate every connection

Give agents and clients credentials the broker checks:

| Peer | With `token` | With `username` and `password` |
| --- | --- | --- |
| agent | username `<domain>/<agent>`, password the token | as given |
| client | username `<domain>:client@<host>-<platform>-js`, password the token | as given |

An agent without any credentials connects with a password derived from its
host. That is no credential: do not let a broker accept it.

A client whose token expires can switch to a new one without dropping its
connection, `client.updateCredentials({ token })` (used on the next
reconnect), or reconnect with it at once, `client.reconnectWithToken(token)`.

## 3. Authorize by topic

Confine every connection to the topics it needs. The
[protocol specification](../spec/protocol.md#14-security-considerations)
lists them; in short:

| Peer | May publish | May subscribe |
| --- | --- | --- |
| client | requests `<domain>/<agent>/<class>/<instance>/<function>` it may call; its presence `<domain>/<own MQTT client id>/+/__clientInfo__` | `<domain>/<own MQTT client id>/#`; agent and class info |
| agent | `<domain>/<own name>/#`; answers and events to connections | `<domain>/<own name>/#`; client presence `<domain>/+/+/__clientInfo__` |

Two of these matter more than the rest:

- **A client may subscribe only under its own MQTT client id.** A client's
  answers, callbacks and events travel on topics under its connection id,
  `<domain>/<mqttClientId>/<secret>`. A broker that confines each client to
  topics under its own MQTT client id keeps them private - and with them the
  connection id, which is a capability: whoever knows it can act as that
  connection towards agents.
- **Narrow the request topics.** A client that may publish to
  `<domain>/line-1/Press/+/readPressure` can read pressures and nothing
  else. Wildcards in permissions follow the topic levels: agent, class,
  instance, function.
- **Let observers observe.** Functions declared `@nosideeffects` say so in
  the class info (see [Offering classes](expose-classes.md#declare-what-changes-nothing)).
  A broker whose authorization reads the class infos can let a connection
  call exactly those - a dashboard, a reporting tool, an assistant that
  should look but not touch - and refuse the rest, fan-outs included
  ([protocol, SEC-6](../spec/protocol.md#14-security-considerations)).
  Declarations are the agent's: a broker trusts the class infos of the
  agents it lets into the domain. A client that is meant to observe can
  say so itself: `new VrpcClient({ nosideeffects: true })` refuses such
  calls locally with a clear error instead of having the broker refuse
  them - which, depending on the broker, drops the request (the call
  times out) or closes the connection.

## 4. Offer only what may be called

An agent calls exactly what its class info lists, nothing else - not `emit`,
not a private helper, not a function an object acquires at run time (see
[Offering classes](expose-classes.md#what-is-published)). Turn that around
when you design a class: every published function is callable by everyone
who may publish to its topic.

- Keep functions that must stay internal private (`_name`), or out of the
  registered class.
- Use isolated instances for state that belongs to one connection; nobody
  else can reach them.
- Validate arguments in your functions: VRPC passes JSON as it came.
  Constructor arguments can be validated with a schema
  ([Offering classes](expose-classes.md#validate-constructor-arguments)).

## 5. What VRPC protects on its own

- An agent takes the target of a request from its topic, which the broker
  authorized, never from its payload.
- An agent answers only a sender that is a connection id of its own domain,
  and publishes events only to topics under the subscriber's connection id:
  no request can make it publish elsewhere.
- Subscription ids are never listed to anybody; listings of registrations
  show labels only.
- An isolated instance answers its owner's connection alone.

## Reporting a vulnerability

See [SECURITY.md](../../SECURITY.md).
