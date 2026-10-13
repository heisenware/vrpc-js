# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [3.16.1] - Oct 13 2026

### Fixed

- **A create of a shared instance that exists changes nothing**: the adapter did not construct it again, but announced it again as `create` and filed it anew under the class and arguments of the repeated request. A `VrpcPersistor` therefore rewrote the instance's record with those arguments - discarding the state its `update` events had stored, so a restart restored an older instance, or one of the wrong class - logged "Persisting new instance" each time and attached one more `update` listener to it. A client that creates the instance it relies on once a minute did all of this once a minute. Now a shared create of a name that exists returns the instance unchanged and emits nothing, as an isolated create of its owner already did; the Node and the browser adapter alike.
- **A class an agent no longer offers leaves the broker**: its class info stayed retained under the agent's name - only `end({ unregister: true })` cleared class infos, and only of the classes the agent still offered - so every client listed the class forever and a call into it timed out. Now an agent subscribes to the class infos retained under its name each time it connects and clears, in full and concise, every one of a class it does not offer; class infos routed live, its own included, it leaves alone. The Node and the browser agent alike; protocol rule AG-12. Two processes serving under one agent name with different classes clear each other's class infos.

## [3.16.0] - Oct 12 2026

### Changed

- **The browser bundle is a fifth smaller** (#73): `browser/vrpc.js` no longer carries Ajv, the JSON Schema validator, which only an agent in a page uses, to check the constructor arguments of a class registered with a `schema`. Every page that loads VRPC as a client carried it for nothing: the bundle goes from 660 to 547 KB, 199 to 161 KB gzipped. An agent in a page whose class has a schema now warns once on the console and constructs with the arguments as given - unchecked, and without the defaults the schema declares. Node agents validate as before.

### Fixed

- **A promise's lost result rejects the call instead of hanging it for good** (#75): a function that returns a promise is answered twice, `__p__<id>` at once and the result once it settles, and the client waited for the second answer without a deadline and without anything else that could end the wait. A result lost on the way - this client's connection dropped for a second, the agent went offline or restarted - left the caller's promise pending for the life of the process, without a log line, and leaked a listener. Every `callAll` is answered this way, and `callAll` over an agent pattern waited for all agents, so one lost result held back every other agent's answer too. The client now rejects a call as soon as its answer can no longer arrive: `Function call "<context>::<function>()" on agent "<agent>" lost its answer: <reason>`, when the agent goes offline, when it announces itself from a new connection (its former connection was to deliver the result; a retained announcement a subscription brings changes nothing), when this client loses its connection (a clean session keeps nothing for it meanwhile - this also ends a call still waiting for its first answer, which used to wait out `timeout` for nothing), and when the client ends. A `callAll` over an agent pattern answers the failed agent with its usual `err` entries, the others' answers stand. A result that arrives after the rejection is ignored, as a late answer after `timeout` is. There is still no time limit on a promise's result: a function may run as long as it needs while agent and client stay connected.
- **Two agents no longer give one client the same promise id** (#76): an agent named a pending promise `__p__<function>-<counter>`, with a counter that starts at 0 in every process, and a client waits for the result under that id alone - answers reach it on its own topic, whichever agent sends them. Two agents whose counters stood alike, waited on by one client for the same function at once, gave the same id, and the first result settled both calls: the caller got one agent's value as the other's, without an error. Agents started together and serving the same calls count alike - a fleet of edge agents behind one `callAll` over an agent pattern collided on every poll. A promise id now carries a random part per process, `__p__<function>-<nonce>-<counter>`. Clients check only the `__p__` prefix, so clients of every version profit; the protocol now requires such ids (CALL-6).

## [3.15.0] - Oct 11 2026

Protocol version 4, a minor: peers of protocol 3 keep working with it (see
docs/spec/protocol.md, section 13).

### Added

- **One registration per function and arguments**: the agent calls an event function once per instance (or class), function and arguments, compared by value, whatever clients repeat, flap or reconnect, and passes every event on to every subscription through one listener per handler position. A class needs no identity guard any more: a counter re-registered once a minute held 1,100 copies of one handler after 19 hours, and every pulse went out 1,100 times. Ten browsers on one `on('update::x')` are one listener on the emitter, not ten.
- **Subscriptions are sets, the last one out releases**: declaring a held subscription again changes nothing; withdrawing it once ends it. A subscription id names one registration per instance: a protocol-4 request that brings a held id with another function or other arguments is refused, and what the id holds stays (an id from a client before 3.15, derived from less, may hold several registrations, as before). The registration is released when its last subscription leaves - through the `Registration` the event function returned (`[Symbol.dispose]` / `[Symbol.asyncDispose]`), through `removeListener` for Node's own `EventEmitter` `on` (checked by identity), through the class's `off<Name>` twin called with the arguments of the original call (deprecated), through the class's `removeListener` (deprecated), or kept silent and reused when the class offers no way to release. After its release a registration's listener is silent, whatever the class does with it. A release that fails is reported as the adapter event `releaseFailed`.
- **Every end is told**: a registration whose `ended` promise settles, or that a member ends (`__end__`), is dropped and every subscriber of protocol 4 gets an ended notice `{ i, end: { reason, by, failed?, context }, v }`; the client emits `ended` (id, reason, by, info) and never calls the handler for it. A lost subscription (agent offline, instance gone) is emitted as `lost` (id, reason, info).
- **Withdraw by id, list and end registrations**: `__unsubscribe__`, `__registrations__` and `__end__` on the agent (on the static topic of any class); `client.unsubscribe(idOrCallbackOrContract)` withdraws wherever the subscriptions are held - callAll across instances and agents included; `client.getSubscriptions()`, `client.setSubscriberLabel(callback, label)`, `client.getRegistrations()` and `client.endRegistration()`. A subscribing call is answered with the class's return value - a returned registration with its `value` property when it carries one (what the function answered before, e.g. node ids or a subscription id), else `true`; a successful answer from a protocol-4 agent tells the client its subscriptions are held (`getSubscriptions()` reports them `confirmed`).
- **Every subscriber is greeted**: a registration may offer `greet(...handlers)`. The agent calls it once for every new subscription, the first one included, with handlers that reach that subscription alone - so every subscriber gets what the class greets with (its current state), not only the one whose call registered the event function. A greeting the event function sent through its handler reaches only the subscribers present at that call: move it into `greet`. A greeting that fails is reported as the adapter event `greetFailed`, and the subscription stays.
- **A loss heals by itself**: when an agent of protocol 4 goes offline, the client keeps its subscriptions there (`lost`, reason `agentOffline`; `getSubscriptions()` reports them `lost`) and declares them again once the agent is back (`healed`). An agent that only lost its connection still holds them and changes nothing; one that restarted registers them anew. Withdrawals the client could not send while the agent or the client itself was offline go out once both are back - an agent that only lost its connection kept what was withdrawn meanwhile. Towards older agents lost subscriptions are dropped as before. The loss of an instance stays the consumer's to heal.
- **A client declares its subscriptions again after its own reconnect**, towards agents of protocol 4: an agent that saw the connection go withdrew them, and the consumer notices nothing.
- **Withdraw at one instance**: `client.unsubscribe(target, { instance })` withdraws only what is held on that instance; a callAll subscription (one id on every instance of its class) stops there while the other instances keep delivering. On the wire an `__unsubscribe__` entry may be `{ id, context }`; plain ids keep their meaning. The client applies such a withdrawal again after its own reconnect, until the subscription is declared anew. An end that reaches one registration of a callAll subscriber can so take exactly that instance; towards older agents the instance's events stop locally.

- **`@private` keeps a function inside**: when the agent reads a class's JSDoc (registered by path, or with `jsdocPath`), a function tagged `@private` or `@access private` is neither listed in its class info nor callable, like one whose name begins with `_`; `onlyPublic: false` publishes both. A tag counts for the class it is written in, and for the static or member function it documents: comments used to be matched to functions by name alone, across every class of a source. The class info now carries the documentation of published functions only - it carried that of `_` helpers, and of every class in the source. JavaScript's own `#private` methods were never reachable, and are the way that holds without JSDoc, in the browser too.

- **callAll selects instances** (`__callMatching__`): `client.callAll({ instances })` takes a name pattern (`line-*`, where `*` matches any run of characters) or a list of names and patterns, and the agent calls the selected shared instances alone and answers for those - one request however many instances, where a consumer used to call each instance on its own. An agent lists `__callMatching__` in its class info; towards one that does not, the client calls each selected instance itself, and refuses a selection for a subscription. A selection is part of a callAll subscription: one callback on two selections is two subscriptions, each declared again with its selection after a reconnect, and `getSubscriptions()` reports it as `instances`.
- **callAll on several agents by pattern or list**: `agent` takes a pattern (`edge-*`) or a list of agents besides a name and `*`, and the agents are asked all at once.

- **An event that cannot travel is told, not dropped**: when JSON cannot encode an event's arguments (a `BigInt`), the agent publishes an undeliverable notice `{ i, e, v }` to each subscription of protocol 4 in its place, and the client emits `undelivered` (id, error, info) instead of calling the callback; the subscription stays and gets the next event. A one-shot callback the agent cannot encode is told the same way. Subscribers of protocol 3 get nothing, as they would call their handler without arguments. (In 3.14 a result JSON could not carry arrived as the string `__vrpc::not-serializable__`; 3.15 answers it as an error.)

### Changed

- **Entries of a callAll across agents name their agent**: `{ agent, id, val }` or `{ agent, id, err }` when `agent` is `*`, a pattern or a list. An agent that fails as a whole while the client knows none of its instances answers one `{ agent, err }` - it answered nothing.
- **The client decides what is an event function by one rule**: declared `@returns {Registration}` (with meta data), else `on` followed by a capital letter (plus `on(event, handler)` / `addListener`). The prefixes `notify`, `monitor` and `signal` still count, deprecated. `once` and other `on`-prefixed names in lower case (`online`) are plain callbacks now; `once` stays a one-shot on the agent also for older clients.
- **A client holds one subscription per target, function, arguments and callback**: a second `on` with the same callback no longer doubles its events, and one `off` ends it (it used to count). One callback on two functions or two arguments (`onValue('x', cb)` and `onStatus('x', cb)`, `onValue(1, cb)` and `onValue(2, cb)`) stays two subscriptions. Each is named by a counted id, never a hash, so two subscriptions never share one; declared again after a loss it keeps its id, declared anew after a withdrawal it gets a fresh one. An `off<Name>` remover withdraws the subscription its arguments name, or all of that function's without them - towards a protocol-4 agent by id, never calling the class; a callback that names no subscription goes as a plain callback (it used to go as `null`). An `{ emitter, event }` contract given to a remover (`off`, `off<Name>`) now withdraws instead of subscribing once more.
- **`off`, `removeListener` and `off<Name>` carrying a subscription id withdraw it on the agent** - the one held on the twin event function with the remover's own arguments, else all the id holds on that function - and are never handed to the class or registered: an older engine's `offX(handler)` used to reach the agent as one more registration. From clients before 3.15 the same holds for `unmonitor<Name>`, `unsignal<Name>` and `remove<Name>`.
- **`removeAllListeners(event)` withdraws the caller's subscriptions only**: it used to call `removeAllListeners` on the emitter and took every other client's and the class's own listeners with it.
- **An instance that ends leaves its registrations to its own dispose**; the adapter releases them itself only for an object without a dispose method, and what it attached through Node's own `on` it always takes back.
- `vrpcOff(functionName)` withdraws the proxy's subscriptions of that function (it computed an event topic of an older format and removed nothing).
- **An answer carries what the call yielded, nothing else**: `{ r, i, v }` or `{ e, i, v }`, the second answer of a promise likewise. The request's arguments are no longer echoed (no client reads them, and a large argument crossed the network twice), fields a request brings (`r`, `e`) never come back, a rejected promise no longer answers `r` next to `e`, and `v` is the agent's own protocol version, not the request's.
- **Every error travels as `{ message, cause? }`**, the browser agent's too (it sent plain strings). Clients keep accepting strings from older agents.
- **Every request that reaches an agent is answered**: a function the class does not have, arguments that are no list (a missing list counts as none) - an error instead of the caller's timeout. A result JSON cannot carry (a `BigInt`) is answered as an error instead of the string `__vrpc::not-serializable__`.
- **callAll answers one entry per instance: `{ id, val }` or `{ id, err }`**, `err` an error as above. A failing instance answered `{ id, val: true, err: '<message>' }` and an async rejection `{ id, err: {}, val: null }`.
- **Agents publish and subscribe at QoS 0 by default, everywhere**: on the command line and in the browser they used QoS 1. `bestEffort: false` (`--no-bestEffort` on the command line) keeps QoS 1; `--bestEffort` still works.
- **The class info lists no `constructor`**: it was never callable as a member function.
- **An agent nobody named gets a name of its own installation**: `<user>-<installationId>@<host>-<platform>-js`, the installation id a short hash of where this vrpc is installed. It was meant to tell installations apart, but hashed nothing (a function instead of a path), so every unnamed agent of a user on a host was `<user>-0000@...` - two of them in one domain shared a name and an MQTT client id and threw each other off the broker in turn. The name is the same however and from wherever the agent is started, also for the `vrpc-agent-js` executable (which hashed the working directory). An agent that ran on the default name gets a new name once: give it an explicit `agent` to keep a name (clients address agents by name, and broker permissions may name them).

### Fixed

- **A deleted instance's requests no longer reach the agent**: a delete unsubscribed `<class>/__static__/+` instead of the instance's own topic, so the agent kept receiving (and dropping) its requests. A delete must name the instance's own class now; deleting through another class's topic worked and refreshed the wrong class info. A delete of an instance that does not exist no longer republishes class info.
- **Isolated instances go with their connection every time**: once a connection had gone offline, the agent never watched it again - and a client keeps its connection id across reconnects, so every isolated instance it created after its first network loss lived for good. A delete by one connection could also end the presence watch of another.
- **Refused subscriptions are retried again**: mqtt.js 5 reports a refused SUBSCRIBE as an error, which agent and client only logged - the retrier never ran, and a client whose agent-info subscription was refused hung in its connect handler. The browser agent retries now, too.
- **`callAll` with `agent: '*'` asks the agents that offer the class, all at once**: it asked every online agent one after the other, so one agent without the class failed the whole call after its timeout. An agent that fails as a whole now answers an `err` for each of its instances, and the other agents' answers stand.
- **A client waiting for a class completes on the agent info as well**: when the class info came first, it waited out its timeout.
- **Unregistering leaves nothing behind**: `agent.end({ unregister: true })` and `client.unregisterAgent()` now clear `__classInfoConcise__` as well, which is what clients subscribe to by default.
- **A refused browser agent keeps trying**: with mqtt.js 5 a refused connection (wrong credentials, or an authorization service briefly away) ended its reconnecting for good. It now retries with the growing delay the Node agent uses.
- **The browser agent publishes `__classInfoConcise__`**: clients with default settings saw none of its classes. A create that fails there leaves nothing behind (it subscribed `<class>/undefined/+` and published class info, even for unknown class names), and `end()` while disconnected stops trying to connect.
- **Instance names are checked**: a create whose name is empty, contains `/`, `+`, `#` or `*`, or is `__static__` is refused - the instance name is one topic level, such names made topics no request could reach, and a `*` would read as a pattern (callAll selections).
- **A client finds and deletes the isolated instances it created**: no class info lists them, so `getInstance()` and `delete()` waited for one until they timed out.
- **`import { VrpcClient } from 'vrpc'` works in Node.js ES modules**: Node could not see the package's named exports and only offered its default export.
- The agent's `--version`, and that of `vrpc-agent-js`, prints the package version.

### Security

- **Only what the class info lists can be called**: the agent dispatched any function an instance or class happened to have, so `emit` (any client could fake an event to every subscriber, or emit `'error'` and end the agent), private `_helpers`, `setMaxListeners` and the like were reachable with a hand-made request. A class deriving `EventEmitter` publishes `on`, `addListener`, `off`, `removeListener`, `once` and `removeAllListeners` of Node's functions; the others and the `EventEmitter` statics are neither listed nor callable.
- **An agent publishes only to its sender's topics**: answers go to the sender `s` and events to the topic a subscription id names, and neither was checked - a request could make an agent publish onto other topics its broker permissions allow (another agent's info topic, say). A request whose `s` is no connection id of the agent's domain is ignored, and a subscription id must name a topic under `s`. Clients before 3.6 derived their subscription ids otherwise: their subscriptions are refused by a 3.15 agent.

### Deprecated (to go in 4.0)

- `off<Name>` twins and a class's `removeListener` as the release of an event function (return a `Registration`); the client's `notify`/`monitor`/`signal` prefixes; withdrawing by calling `off`/`removeListener`/`off<Name>` with a subscription id (use `client.unsubscribe()`).

## [3.14.0] - Oct 1 2026

### Added

- **New credentials reach a live connection**: `client.updateCredentials({ username, password, token })` replaces what the connection logs in with, without a reconnect. The broker checks credentials when a connection is made, so a working session carries on and the next connection - after a network loss, a broker restart - uses the new ones; a connection that is being refused right now tries them within a second. A host renews an expiring access token this way instead of tearing its client down and racing a fresh one through its first connect.
- **A client can keep trying past its connect timeout**: `client.connect({ keepTrying: true })` still rejects when no connection stands within `timeout`, so the caller can show it, but the client goes on trying until `end()` and emits `connect` once it is through. A further `connect({ keepTrying: true })` on a client that is still trying waits for it instead of starting another connection under the same client id. Opt-in: without the flag `connect()` behaves exactly as before and gives up at the timeout.

### Fixed

- **A refused connection backs off** (#74): a refused CONNACK was retried every second for as long as the client or agent lived, and an authorization service that blocks a client id after a number of refusals blocked it - and kept blocking it, so even valid credentials arriving later met the block. Every refusal now doubles the wait, up to 30 s; a successful connect starts over at the base period; the refusal is still emitted as `error`. A transient refusal (an authorization service restarting) heals within seconds, a stale credential costs a few dozen attempts per ten minutes instead of six hundred. mqtt.js arms its reconnect timer once per outage, so the back-off re-arms it through its internal `_clearReconnect`; a future mqtt.js without it falls back to applying the new period from the next outage on.
- **A client given up at its connect timeout stays given up**: the workaround for mqtt.js's `client disconnecting` error (mqtt.js #1284) reset the flag and reconnected whatever client the failed publish or subscribe went through - also one that vrpc itself was ending at the connect timeout. Any RPC in that moment revived the abandoned connection, which then went on knocking with its old credentials, next to its successor and under the same client id. The workaround now leaves alone every client that was ended on purpose (connect timeout, `end()`, `reconnectWithToken`) or has been replaced since, and a subscribe on such a client rejects instead of hanging.
- **An agent ended while it is not connected stops trying**: `agent.end()` returned early when the agent was not connected and left the mqtt client retrying in the background - a refused agent ended by its host knocked on for ever. It is ended now; the agent's `end` event follows once.

## [3.13.0] - Sep 30 2026

### Added

- **A delete disposes its instance**: JavaScript has no destructor, and a deleted instance used to lose only its name - an object running a clock or holding a connection went on running. A delete now calls the ECMAScript dispose protocol, `instance[Symbol.asyncDispose]()` or else `instance[Symbol.dispose]()`, and a remote delete answers once an asynchronous dispose has settled, so a create of the same name right after it never meets a port or a session the old object still holds. A dispose that fails or outlasts `VrpcAdapter.DISPOSE_TIMEOUT` (10 s) is reported with the new adapter event `disposeFailed`, which the agent logs; the delete still answers `true`. Symbol-keyed methods are never remote methods, so a delete is the only way to dispose. On runtimes without the dispose symbols (Node before 18.18 / 20.4) VRPC installs Node's own stand-ins from the symbol registry. See docs/protocol.md, "Ending an instance".

### Fixed

- **A deleted instance no longer speaks on the bus**: `_delete` meant to free an EventEmitter's listeners but tested the registry record instead of the object, so it never did; it forgot its own bookkeeping and left every listener it had attached on the object. A deleted instance whose clock kept running therefore went on publishing its events - and since a client that re-subscribes a re-created name gets the same event topic, each delete and re-create added one more series of events to the living subscription. A delete now takes back every listener the adapter attached, and every listener and callback remembers the object it was made for and stays silent once that object is no longer the live instance of its name - whatever the class does with its listeners.
- **Every delete door ends an instance the same way**: an in-process `VrpcAdapter.delete(object)` only dropped the name, and the auto-delete of an isolated instance whose connection went offline kept the instance's request-topic subscription and announced its delete without a class name. All doors - remote, isolated auto-delete, in-process by name or by object - now run the one teardown, in the Node and the browser adapter alike.
- **The persistor no longer resurrects a deleted instance**: its `update` listener outlived the delete, and an `update` from the deleted object rewrote the record, so the instance came back with the next start. The listener is dropped on delete and ignores any object that is no longer the live instance of its name.
- **A client that subscribed one event several times leaves nothing behind when it goes**: it was listed once per subscription and its going removed one entry, so the listeners stayed attached. Its going now ends all of its subscriptions, one detach per attachment. Several subscriptions with one callback still fire several times (EventEmitter semantics, unchanged).
- **What a client deleted is gone for it at once**: a client learned of a deleted instance only from the agent's class info, which travels on another topic than the delete's answer. A broker need not keep their order, and on a clustered one the answer could come first - a `getInstance` right after `await delete()` then still found the instance and returned a proxy to nothing (a flaky test on the public broker showed it). A successful delete now takes the instance off the client's view right away, as the class info would: listing, `instanceGone`, cached subscriptions; the class info that follows finds nothing left to remove.
- **A call into an unknown instance registers no listener**: the arguments of a call were unwrapped before its context was checked, so a subscription to a name that did not exist yet left a registration behind. The context is checked first now; the error is the same.
- **A comment above a Symbol-keyed method documents nothing else**: the comment parser binds a JSDoc block to the next line that looks like `name(`. A method with a computed key (`async [Symbol.asyncDispose] ()`) does not look like that, so its block landed on the first call inside its body and replaced that function's documentation (a dispose whose body starts with `this.stop()` redocumented `stop`). The block now documents the computed-key member and nothing else.
- **The browser adapter hands a class a listener, not `null`**: a callback-style subscription (`onTick(listener)`) with an event id already registered got `null`. It now gets the listener, as in the Node adapter.

## [3.12.1] - Sep 22 2026

### Fixed

- **An agent serves before it announces**: on every connection the agent subscribed its static request topics, published its agent and class info, and only then subscribed the method topics of the instances it already held, one subscription per instance. A client that waited for the agent acted on the announcement at once, and its first request into an instance reached the broker before the instance's topic was subscribed; with QoS 0 that request was lost for good and the caller saw only a timeout. This was the fate of the first call into a backend that came online after the client waiting for it - an application deployed for the first time, a restarted backend with clients open, all the worse behind a broker that asks an authorization service about every subscription. Now every request topic, statics and the methods of every existing instance, is subscribed first, and the agent and class info go out once the broker has answered every subscription. The Node and the browser agent alike; the agent's `connect` event follows the announcement as before, and `serve()` now resolves on that event - once the agent serves, not merely once the socket is up - so whatever a process does after `await agent.serve()` finds its agent reachable.

## [3.12.0] - Sep 19 2026

### Added

- **Agents and clients can verify the broker's certificate**: a `tls` option on `VrpcAgent` and `VrpcClient`, `{ ca, rejectUnauthorized }`, goes into the MQTT connection. Without it nothing changes: the certificate is not verified, as it never was. With `ca` the broker must present a chain the given certificates anchor, which is what a native agent built by the Heisenware platform does with the platform's certificate baked into its build - the same anchor its update download verifies.

## [3.11.1] - Sep 16 2026

### Fixed

- **The browser client no longer times out its own healthy session in a background tab**: 3.11.0 moved the ping onto a Web Worker timer, and the broker kept the session, but the client still parsed every incoming packet through `process.nextTick`, and the polyfill behind it schedules with `setTimeout(fn, 0)`. One such tick issued from a deeply nested page timer (any application page has intervals) is aligned to Chrome's one-wake-up-per-minute rule and parks the whole nextTick queue, ping responses included, so the client's own keepalive timeout closed a session the broker was happy with, about every one to two minutes. The browser build now bundles the library's Node build on its own polyfills, with a `process.nextTick` that runs as a microtask, which no tab state throttles. The SOCKS transport, Node-only, stays out of the bundle. Proven with a simulation of the browser's timer rules: the 3.11.0 bundle reconnects after 48 seconds, this one keeps its connection.

## [3.11.0] - Sep 16 2026

### Changed

- **The browser client's keepalive survives a background tab**: the MQTT library moves from 4.3 to 5.16, whose keepalive runs on a Web Worker timer in browsers. A page timer is throttled once its tab is hidden (Chrome aligns wake-ups to one per minute after five minutes), so the ping of a background tab arrived late and the broker dropped the session about once a minute: a will, a reconnect and a full re-subscribe each time, and every isolated instance of the connection gone with it. A worker timer is not throttled, so a hidden tab keeps its session. Nothing changes for Node, where the library uses the native timer as before. The MQTT surface vrpc uses is unchanged: options, events, the `code` of a refused connection (4, 5) and its message. One default of the new library is overridden: it stops reconnecting after a refused CONNACK, while an agent or client of vrpc keeps retrying as before (`reconnectOnConnackError`) - an authorization service that is briefly away refuses too, and whoever wants a refusal to be final ends the client.

## [3.10.1] - Sep 14 2026

### Fixed

- **`VrpcAgent.create()` works before `serve()`**: creating an instance on an agent that was not served yet threw, since the announcement (method-topic subscription, class-info publish) reached for the MQTT client that only `serve()` creates. An unserved agent now only collects: the connect handler already subscribes every adapter instance and publishes every class info once the connection stands. A process may therefore build its complete state first and go online afterwards, so that "online" means "complete" for every client that lists its instances.

## [3.10.0] - Sep 14 2026

### Added

- **`@callback` typedefs reach the reflection**: a documentation block `@callback Name` with `@param` lines describes the signature of a function-typed parameter. `_parseComments` collects these blocks and attaches them to every parameter whose type names one, as `param.callback = { name, description, params }`, so a client knows what a listener is called with. A typedef block is never reported as a function of its own.

### Fixed

- **The comment parser dropped a documentation block followed by another block**: with `assocFunctions`, a block still waiting for its function was parsed only after its chunk had been reset, so any block not directly above a function (a typedef, a class comment followed by a method comment) vanished from the result.

## [3.9.1] - Sep 13 2026

### Changed

- **`VrpcPersistor` keeps what it cannot restore**: a record that fails to restore used to be deleted after the retries "to prevent startup loops", which turned a stricter constructor or a class missing from a build into silent data loss. It is now quarantined instead: kept on disk with the error, the time and the number of attempts, reported by `restore()` (which returns `{ restored, quarantined }` and logs a summary), and given exactly one attempt per start, so it heals by itself once the cause is fixed. `status()` lists every record with its mark, `retry(id)` attempts one on request, and `forget(id)` is the only way a record leaves the storage other than the deletion of a live instance. The retry policy for fresh records is configurable (`retries`, `retryDelay`).

### Fixed

- **A constructor that throws is reported, and leaves nothing behind**: `create()` on a client rejected with `[object Object]` when the remote constructor threw, since the error object travelled into `new Error()` unformatted; it now rejects with the constructor's message, prefixed like every other call error, and carries the cause. On the agent the failed creation still ran the success bookkeeping with an undefined instance id: a subscription to `<class>/undefined/+`, a phantom entry in the per-client lifetime tracking, and a class-info publish. A failed creation now logs a warning and does nothing else.
- **`VrpcPersistor` no longer persists isolated instances**: an isolated instance belongs to the connection that created it and dies with it; restoring it would have resurrected it as an open instance without an owner. The adapter's create event carries `isIsolated`, and the persistor skips those.

## [3.9.0] - Sep 11 2026

### Changed

- **The connection id names the connection the broker knows**: it now reads `<domain>/<mqttClientId>/<secret>` instead of `<domain>/<hostname>/<identity>:<n>`. A broker that confines a client to topics under its own mqtt client id thereby keeps every response, event and presence message of a connection private to it, and the random secret makes the sender field of a request impossible to forge by anyone who cannot read those topics. The three-segment layout is kept on purpose: every agent (this one, the C++ and the Python port) recognises a presence message by `__clientInfo__` arriving as the fourth topic token. Agents of any version answer the new id unchanged, and clients of any version keep talking to new agents; the privacy applies per client from the version it upgrades. `getClientId()` and `proxy.vrpcClientId`, the identity-derived id that names the principal, do not change. A connection id no longer equals the client id for clients without an identity.
- **Isolated instances answer their creating connection only**: an instance created with `__createIsolated__` remembers the sender that created it, and the adapter refuses every call, `removeAllListeners` and `__delete__` on it from any other sender, including one without a sender. An id is never re-homed: re-creating an existing isolated instance from another connection, re-creating it as shared, or creating an existing shared instance as isolated is refused (a shared id used to be silently flipped to isolated by any caller, and vice versa). Instances the agent creates itself through `VrpcAdapter.create()` have no owner and stay open. Agents of older versions do not enforce this.
- **`mqttClientId` is validated**: it becomes a topic segment, so `+`, `/`, `#` and the empty string are refused like they are for `domain` and `identity`.

### Fixed

- **An agent kept tracking a client after its last instance went**: the per-client bookkeeping tested `.length` on a `Set` and never emptied, so the presence subscription stayed and stale instance ids were retried on the client's offline message.

## [3.8.3] - Sep 09 2026

### Fixed

- **An `off()` the client cannot map to a listener no longer travels, and the agent tolerates one that arrives**: after an agent restarted, the client's cache had already dropped the instance's subscriptions, so a later `proxy.off(event, handler)` (a React effect cleanup, typically) found nothing of its own to remove - and sent the call anyway with a `null` listener, which the instance's `EventEmitter` rejected (`The "listener" argument must be of type function. Received null`, logged on every service restart). The client now resolves such an `off()`/`removeListener()` locally without sending it; the adapter answers `off()`/`removeListener()` with a listener it does not hold (or none) as a no-op instead of handing it to the emitter.

## [3.8.2] - Sep 06 2026

### Fixed

- **A refused subscription is retried until the broker grants it** (agent and client): while the broker's authorization service is unavailable it answers every subscribe with `qos=128`; an agent or client that subscribed in that window stayed deaf for good - connected, looking online, never receiving a message on the refused topic (a restart of the authorization service left agents deaf until they were restarted themselves). Both now retry with a growing delay (1 s doubling up to 30 s) until the topic is granted, drop pending retries when a (re)connect subscribes afresh or `end()` is called, and keep emitting the `SUBSCRIBE_FAILED` error so consumers still see it.

## [3.8.1] - Sep 03 2026

### Fixed

- **Losing an instance on one agent dropped the client's subscriptions on another agent's instance of the same id**: the client cleaned its cached event subscriptions by instance id alone when an `instanceGone` arrived, although it listens to the class information of every agent in the domain. A deployed app backend rebooting with the same executor ids as the builder backend therefore silently deafened every builder tab. The cleanup is now scoped to the agent and class that lost the instance.
- **Instance lookups honour the agent**: `getInstance()` and `delete()` with an explicit `agent` never serve a proxy cached for another agent's instance of the same id (the proxy cache is keyed by agent, class and instance now), and a client constructed with a default agent prefers that agent's instance when none is given (the priority branch was inverted and never applied).

## [3.8.0] - Sep 02 2026

### Added

- **Connection id**: `VrpcClient.getConnectionId()` and `proxy.vrpcConnectionId` expose an id that is unique per client instance, even when several clients share one `identity`. `getClientId()` and `proxy.vrpcClientId` keep returning the identity-derived client id: it names the principal and is shared by all of its connections.
- **Presence carries the identity**: the client-info messages (last will and `end()`) now include `clientId`, and the agents' `clientGone` event emits `(connectionId, { clientId })` so consumers can group the connections of one identity.

### Changed

- **Peer range on `@heisenware/storage`** widened to `^1.2.2 || ^2.0.0 || ^3.0.0`, so consumers on storage 3.x install without `--legacy-peer-deps`. `VrpcPersistor` opens storage >= 2 through the async `Storage.open()` (1.x keeps its synchronous constructor) and every operation waits for the layer to be ready. Note that storage >= 2 stores readable `<id>.json` files and restricts ids to letters, digits, `_` and `-`; instances with other ids are reported as failed to persist.
- **`clientGone` payload**: the first argument is the connection id. For clients without an identity it equals the client id as before; consumers comparing it with `getClientId()` of a client that has an identity must compare with `getConnectionId()` instead. Agents < 3.8.0 interoperate with 3.8.0 clients unchanged: the connection id keeps the three-segment topic layout they parse.

### Fixed

- **Clients sharing an identity silently lost their event subscriptions**: every client with the same domain, host and identity used one id for its last will, its response routing and the agents' listener bookkeeping. When any of them disconnected (tab closed, keepalive expired) the agents unregistered every listener and isolated instance of that id, and the surviving clients kept their sockets but never received another event. Presence, routing and bookkeeping are now keyed by the per-connection id, so one connection ending never disturbs the others. Clients without an identity are unaffected.

## [3.7.0] - Apr 07 2026

### Changed

- **Optimized Event Topic Generation**: Refactored remote event topics to use a flat, sanitized hash instead of deeply nested strings. This prevents potential MQTT subscription failures caused by unsanitized user inputs (e.g., custom event names containing MQTT wildcards).
- **Authentication System Compatibility**: Event topics are now explicitly formatted to be exactly 4 segments long (`<clientId>/<hash>`). This avoids collisions with external authentication/policy engines that rely on a 5-segment length to identify RPC messages.
- **Simplified MQTT Subscriptions**: Consolidated client subscriptions. A single wildcard subscription (`<clientId>/#`) now elegantly handles both RPC responses and all event callbacks, reducing network overhead during the connection phase.
- **Improved Internal Event Tracking**: Removed legacy fallback logic for event topic cleanups. The internal `_cachedSubscriptions` map now strictly stores structured metadata objects, eliminating complex and fragile string parsing.

## [3.6.0] - Apr 06 2026

### Added

- **Smart Event Detection**: Introduced a heuristic to automatically detect continuous remote event emitters. Functions starting with `on`, `notify`, `monitor`, or `signal` (and their removers `off`, `remove`, `unmonitor`, `unsignal`) that receive a callback are now automatically routed through the VRPC event system, removing the strict necessity to use `vrpcOn`/`vrpcOff`.

### Changed

- **Massive Performance Improvement (N-Subscription Problem)**: Drastically reduced MQTT overhead for event listeners. Instead of creating a dynamic MQTT subscription for every single frontend event listener, the `VrpcClient` now uses a single, dedicated wildcard subscription (`__e__/#`) for all remote events.
- **Offline Resilience**: Teardown and reconnect phases are now significantly faster as disconnecting agents no longer trigger hundreds of recursive background un-subscriptions.

### Fixed

- A silent memory leak and incorrect reference counting issue that occurred when the exact same callback function was registered multiple times to the same event.
- Ensured local event listeners are properly and completely wiped from the internal `EventEmitter` when a proxy invokes `removeAllListeners`.

## [3.5.3] - Oct 10 2025

## Fixed

- Removed several potentials for code races in the VrpcClient, especially when
  subscribing events

## [3.5.2] - Oct 07 2025

### Fixed

- Potentially escaping error message in connect() function able to kill the process
- Test script clean up

## [3.5.1] - Oct 06 2025

### Fixed

- Broken browser package is now working again
- Callbacks are now identical by object reference when the same emitter and same
  event is used

### Changed

- Downgraded to mqtt version 4

## [3.5.0] - Oct 05 2025

### Fixed

- A race condition in the `delete()` method that could cause tests to fail. The
  method's promise could resolve before the local instance cache was updated.
  The fix ensures the local cache is proactively and synchronously updated upon
  successful deletion.
- A race condition in the test suite where the client would disconnect before
  receiving the agent's offline message, causing a timeout.

### Changed

- **Improved Connection Robustness:** The initial connection logic was hardened
  to use a single, overall timeout. This allows the underlying MQTT client to
  attempt reconnections after transient network failures without prematurely
  rejecting the connection promise.
- **Improved Reconnection State Handling:** The client is now significantly more
  resilient to network interruptions.
  - It properly restores all event-related MQTT subscriptions after a reconnect,
    preventing silent failures of event listeners.
  - The local cache of agents and instances is now cleared when the client goes
    offline, ensuring a fresh and consistent state is rebuilt upon reconnection.
- **Improved Shutdown Reliability:** The `end()` method now provides a more
  comprehensive and immediate cleanup of all internal listeners and pending RPC
  timeouts, preventing potential memory leaks and dangling asynchronous
  operations.
- **Improved API Contract:** Public-facing methods like `create()`,
  `getInstance()`, etc., now check if the client is connected and will fail-fast
  with a clear error, rather than timing out on an RPC call.
- The `reconnectWithToken()` method was refactored to be fully asynchronous,
  eliminating a potential race condition during the shutdown and restart of the
  client.
- **Improved Event handling:** Event registrations always hit the remote agent
  and behave exactly like it is expected on Node.js. Most importantly, the
  agent's listener object reference is preserved when identical listeners are
  registered on the client side.

### Added

- Defensive checks in the message handler to ensure data integrity (e.g.,
  verifying that `instances` is an array) before processing, making the client
  more resilient to malformed data from agents.

## [3.4.0] - Oct 02 2025

### Changed

- network calls for existing event listeners are not anymore skipped,
  a corresponding test got adapted

## [3.3.2] - Sep 19 2025

### Changed

- require call is moved back to dynamic loading and error message

### Fixed

- an issue with taking up a custom logger into `VrpcPersistor`

## [3.3.1] - Sep 05 2025

### Changed

- moved require call to @heisenware/storage to top of file for ESM compatibility

## [3.3.0] - Sep 05 2025

### Added

- new class `VrpcPersistor` providing a persistence layer that can automatically
  save and restore instances

## [3.2.1] - Jun 26 2025

### Fixed

- null subscription when creating instances through the agent

## [3.2.0] - Jun 26 2025

### Added

- new VrpcAdapter event being triggered just before deletion
- possibility to configure the keepalive interval
- possibility to skip receiving meta data (which is the new default)
- support for the node 16 "cause" property on error objects
- create function for VrpcAgent that allows local instance creation

### Changed

- when subscribing or publishing fails because the client is "disconnecting" an
  additional error event is emitted and the client is only reconnected not ended
  and then reconnected
- breaking circular JSON structures using json-stringify-safe
- changed bestEffort default to true, both on clients and agents
- meta information is not shipped by default anymore, a new flag
  `requiresSchema` must instead be set to true, for that to work:

  - second topic `__classInfoConcise__` was introduced with `meta` tag removed
  - agents provide retained messages on both topics
  - clients subscribe to one or the other depending on the `requiresSchema`
    setting

- using `docker compose` instead of `docker-compose` in the test suite

### Fixed

- agent-generated instances also report proper deletion
- now unsubscribing from events on instances that aren't available anymore
- invalid log message triggered when JSON return values are circular
- multiple emitter registration under the same clientId
- issue when loading files that are not ending with ".js"
- issue when calling a remote function with null as part of the arguments

## [3.1.1] - Aug 17 2022

### Fixed

- missing defaultValue when parsing source code comments

### Added

- reconnection test when broker toggles offline/online

## [3.1.0] - Jun 15 2022

### Added

- possibility to set a user-defined MQTT client ID for both, agent and client [#56]
- possibility to set a user-defined VRPC client identity

### Fixed

- potential access to null object resulting in remote exception
- more defensive programming when client used an non-emitter instance for
  registering events
- potential application crash when VrpcNative was provided with a bad callback
  which got called from within C++

### Changed

- switched domain and agent separator from `:` to `/` when generating username

## [3.0.4] - Apr 04 2022

### Added

- automatic token generation when no token and not password were provided

### Changed

- changed agent to always run connect with clean session
- changed generated username on agent to include domain information
- generating username when neither token nor password are provided
- changed client's username generation to as well include domain information
  disconnects on inactive browser pages
- added agent name info to token generator (allows to run in same folder)

### Fixed

- agent simplification should fix subscription issues when broker gets restarted
- removed `os.userInfo()` from generated client username as browsers do not
  support this function
- failing mqtt reconnection when using websocket on a browser that goes inactive
- removed changing `os.cpus()` call making the clientId stable on same executable
- serious bug while cleaning up event-registrations resulting from "callAll"

## [3.0.3] - Feb 09 2022

### Fixed

- again generating implicit username (when none is given) as MQTT does not
  support handing over password only

## [3.0.2] - Feb 08 2022

### Changed

- removed implicit setting of username to `__token__` when authenticating with
  access token

### Fixed

- bug during un-registering obsolete event subscriptions

## [3.0.1] - Jan 24 2022

### Fixed

- non-functional event un-subscription on silent client disconnect and when
  initially registered via `callAll`

## [3.0.0] - Jan 20 2022

### Added

- `vrpcOn` / `vrpcOff` feature to client
- tests exclusively for VrpcAdapter
- support for `path.join(__dirname, <path>)` expressions when registering class

### Fixed

- unhandled promise rejection on initial connect timeout
- missing documentation for VrpcNative
- bug on new `vrpcOn` feature
- bug while unregister event listeners via "off" or "removeAllListeners"

### Changed

- error messages as triggered on remote agents (now include context info)
- removed obsolete public API from VrpcAdapter
- internal handling of EventEmitter subscriptions
  - now publishing a single message per event to a fixed topic
  - dispatching happens by the broker not by the agent anymore
  - this saves a lot of traffic when many clients subscribe to same events
- reduced size of response messages by skipping redundant information
- order of items within RPC message
- promise rejection message as triggered on remote agents (now include context
  info)

## [3.0.0-alpha.3] - 25 Nov 2021

### Fixed

- missing 'create' event in VrpcAdapter
- respecting isolation state in callAll

### Changed

- cleaned API and tests from deprecation supports, those will now result in
  errors
- intercepting return value of EventEmitter functions and changing it from
  potentially gigantic object (as it returns `this`) to `true`

## [3.0.0-alpha.2] - 19 Nov 2021

### Fixed

- leaking event registrations on remote-controlled instance when event consumer
  was not creator of the instance

## Changed

- reduced payload of callback message by omitting the original return value
- changed prefix of mqtt client id to `vc3` and `va3`, respectively

## [3.0.0-alpha.1] - 10 Nov 2021

### Changed

- layout and content of this repository, only javascript related code is left
- naming of public API classes is made consistent
  - VrpcAdapter
  - VrpcAgent
  - VrpcClient (formerly VrpcRemote)
  - VrpcNative (formerly VrpcLocal)
- RPC wire protocol got changed and simplified, a protocol version is attached
  to every message (`v: 3`)
- concept of isolated and shared proxy instances
  ([#51](https://github.com/heisenware/vrpc/issues/51)) got implemented
- all namings including 'binding' got renamed for the more appropriate 'adapter'
- calling embedded C++ code got a completely new API (VrpcNative)

### Added

- injection of proxy-, instance-, and client id into proxy instance [Node.js](#49)
- public accessor for client id [Node.js](#49)
- signal `clientGone` on agent, indicating that a state-changing client went
  [Node.js]

### Fixed

- Bug during clientId extraction for an exited client (causing leaks for
  anonymous instances)

## [2.6.0] - 12 Jul 2021

### Added

- support for event and callback registrations when using `callAll`

### Fixed

- prevented proxyId of `VrpcRemote` from potential collisions
- improved proxyId generation of `VrpcLocal`

## [2.5.1] - 29 Jun 2021

### Fixed

- replaced the deprecated shortid package with nanoid
- prolonged the `proxyId` to 9 characters, reducing the collision probability to
  1% after having generated 19M ids
- bug in `extractMemberFunctions` that would miss function in certain cases when
  using `registerInstance`
- missing class info messages when successfully reconnecting against a restarted
  broker
- compiler error when using deprecated C++ binding macros on zero arguments
  function

## [2.5.0] - 25 May 2021

### Added

- events `create` and `delete` to VrpcAdapter [Node.js]
- possibility to register already existing instances [Node.js]
- possibility to cache the proxy object [Node.js]

### Fixed

- performance issue when clients silently go offline while still being
  subscribed to callbacks [Node.js]
- issue when providing an explicit jsonDoc path while registering a class
  [Node.js]

## [2.4.0] - 01 Mar 2021

### Added

- possibility to use `VRPC_CTOR`, `VRPC_MEMBER_FUNCTION` and
  `VRPC_STATIC_FUNCTION` for `void` return values as well. This obsoletes all
  macros including the `*_VOID_*` tag. [C++]
- `*_X` version of all macros allowing to add function meta information.
  See documentation for more details. [C++]
- support for C++ code that executes callbacks within threads
- fresh examples (including code) exploring the new features
- version information to agent cli [Node.js]
- userVersion configuration possibility to external agent [Node.js]

### Changed

- upgraded json.hpp version to latest [C++]
- made domain and agent optional when starting commandline agents [All]

### Fixed

- documentation w.r.t. to meta data API [Node.js]

### Removed

- old examples documentation under `docs/examples`
- old example code under `examples`

## [2.3.2] - 18 Feb 2021

### Fixed

- domain inconsistency in the VrpcRemote API [Node.js](#33)
- webpack-5 crash, using custom browser library now (#36)
- missing callback when same native addon was loaded to different VrpcLocal instances [Node.js](#31)

### Changed

- converted log-based deprecation warnings to `process.emitWarning()` [Node.js]

### Added

- possibility to unregister an offline agent [Node.js](#32)

## [2.3.1] - 02 Feb 2021

### Fixed

- Wrong `break` statements when inspecting the client cache for instances to be
  attached to [Node.js]
- Compilation error on non-copyable classes [C++-Addon](#22)

## [2.3.0] - 13 Jan 2021

### Added

- Reference documentation for Node.js based components [Node.js]
- Feature to `callAll` instances of the same class across agents [Node.js]
- Initial setup for a new docker compose based specification testing [Node.js]
- Improved protection against malformed domain and agent names [Node.js]
- Improved log message (more verbose) in case proxy creation timed out [Node.js]

### Fixed

- Missing events upon failed `agent.serve()` [Node.js]

## [2.2.3] - 4 Dec 2020

### Fixed

- Created workaround for broken mqtt-packet sub-dependency (issue #17)

## [2.2.2] - 09 Nov 2020

### Fixed

- Handling of the internal `error` event within VrpcAgent.js to avoid an
  exception in case the user forgot to implement that.

### Changed

- Stopped supporting Node.js 8.0 and included Node.js 14 while testing [Node.js]

## [2.2.1] - 30 Oct 2020

### Fixed

- Correct provisioning of `version` information when sending `offline`
  agent-info message

### Changed

- upgraded major versions of mqtt and argparse dependencies

### Added

- possibility to specify custom defaults for commandline based agent runs
  [Node.js]

## [2.2.0] - 30 Oct 2020

### Added

- Feature of being able to call the same function across all instances of the
  same class (which is executed on the agent and only then send as single
  message to the client) [Node.js]
- Added `version` property to agent (thanks to
  [cstim](https://github.com/cstim)), allowing to specify a custom version which
  is taken up in the agent-info message and digested by the remote client
  [Node.js]

### Changed

- Improved the in-code documentation

## [2.1.6] - 23 Aug 2020

### Changed

- Embedded comment-parser dependency into code base
- Using a wildcard topic for subscribing and unsubscribing the method of new or
  deleted instances respectively. This was suggested by
  [psorowka](https://github.com/psorowka) as a performance improvement and could
  be reproduced with a changed class-fixture (including many more functions) in
  the performance test.

### Fixed

- Potential crash of comment-parser when faced with stand-alone comment-blocks

## [2.1.5] - 19 Aug 2020

### Added

- Feature of parsing js-doc like comments while registering code through the
  adapter [Node.js]
- New option: `bestEffort` which sets all `qos` levels to 0 when true [Node.js]
  (thanks to [psorowka](https://github.com/psorowka) for suggesting this for
  performance improvement)

### Changed

- Sequential subscription calls to single array-based one, much improving proxy
  creation performance [Node.js] (thanks to [cstim](https://github.com/cstim)
  suggesting this)

### Fixed

- Wrong error message in-case a re-subscription happened. Now message is fixed
  and level set from `warn` to `debug`

## [2.1.4] - 19 Jun 2020

### Changed

- Implementation of event-registration: now dispatching multiple
  subscribers of a proxy on the client side, not the agent side [Node.js]
- React todos example showing what can be done with react-vrpc v1.x

## [2.1.3] - 9 Jun 2020

### Fixed

- Proper un-registration of local event subscriptions on a proxy instance
  through `off` or `removeListener` function [Node.js]
- Missing `await` statement in `delete()` method of `VrpcRemote` leading to
  race condition [Node.js]
- using `removeListener` instead of `off` for event un-subscription to support
  older version of Node.js [Node.js]

## [2.1.2] - 26 May 2020

### Fixed

- Issues with `VrpcRemote::getInstance` ignoring defaults or throwing wrong
  exceptions [Node.js]

### Added

- Initial example code for a minimal Todos Application using react-vrpc

## [2.1.1] - 4 Apr 2020

### Fixed

- Compilation error of addon.cpp whe using V8 12.x (solves GH-5) [C++]
- Unhandled error propagation of `VrpcRemote::#error` event when no handler is
  subscribed [Node.js]
- Immediate failure of `VrpcRemote::connect` function when MQTT connection takes
  time [Node.js]
- Wrong RPC timeouts when agent is online only after the
  client call (but still within `timeout` time) [Node.js]
- Loss of messages and re-subscription issues while `VrpcAgent` re-connects
  - Agent is using a persisted session while being online

### Added

- Node 12.x as additional travis test platform
- Performance test (not part of CI)

## [2.1.0] - 25 Mar 2020

### Fixed

- Possible exception when using deprecated form of `VrpcRemote::getInstance`
  [Node.js]

## [2.1.0-alpha.8] - 19 Mar 2020

### Fixed

- Spuriously occurring RPC timeouts on calls that actually successfully
  travelled the network by removing the promise-based waiting from all mqtt
  pub/sub calls. Turns out that those callbacks may come later then event
  RPC answer! [Node.js]

### Added

- Option `noWait` on `VrpcRemote::getInstance` skipping any waiting for the
  instance to appear if not currently found in the local cache. [Node.js]

## [2.1.0-alpha.7] - 13 Mar 2020

### Changed

- `VrpcRemote::getInstance` will try first locally, second remotely to find
  the instance (exception is thrown after timeout) [Node.js]

### Fixed

- VrpcAgent: unregistration of named instances [Node.js]
- VrpcAgent: ordering of classInfo message w.r.t. named creation [Node.js]

## [2.1.0-alpha.6] - 12 Mar 2020

### Changed

- handling of agent answer implementation (always using single promise) [Node.js]
- improved error message on timed out functions [Node.js]
- triggering a deprecation notice upon calling `VrpcRemote::connected()` [Node.js]
- naming of info messages:
  - `__agentInfo__`
  - `__classInfo__`
  - `__clientInfo__`

### Removed

- implicit triggering of MQTT connection within VrpcRemote constructor [Node.js]
- waiting for retained info messages during connect [Node.js]

### Added

- explicit `VrpcRemote::connect()` function, performing the MQTT connect [Node.js]
- 'error' and 'connect' event for `VrpcRemote` [Node.js]

### Fixed

- ambiguity between classInfo and clientInfo message subscription
- documentation

## [2.1.0-alpha.5] - 26 Feb 2020

### Changed

- got rid of the requirement to await twice for asynchronous agent functions
  [Node.js]

### Added

- two events on VrpcRemote: `instanceNew` and `instanceGone` [Node.js]

## [2.1.0-alpha.4] - 25 Feb 2020

### Changed

- API for `VrpcRemote::getInstance` and `VrpcRemote::delete` [Node.js]
  - provisioning of instanceId only is acceptable now, explicit context is
    optional.
  - old API usage is still supported, but generates a deprecation report
- automatic schema validation now injects schema defaults [Node.js]

### Fixed

- missing topic un-subscription after client death [Node.js]

## [2.1.0-alpha.3] - 20 Feb 2020

### Changed

- shortened MQTT keepalive interval (now 30s) to play nice with websocket timeouts
- validity year for all licence statements

## [2.1.0-alpha.2] - 20 Feb 2020

### Fixed

- failures on un-serializable return values

### Changed

- asynchronous timeout implementation on VrpcRemote

## [2.1.0-alpha.1] - 19 Feb 2020

### Changed

- topic structure of info messages
  - Agent Info: `<domain>/<agent>/__info__`
  - Class Info: `<domain>/<agent>/<class>/__info__`
  - Client Info: `<domain>/<host>/<random>/__info__`
- renamed `targetId` to `context`

### Added

**NodeJs: VrpcRemote**

- possibility to hand-over custom log-object
- handler for mqtt errors resulting in error log messages
- log notification in case of non-permitted sub/pubs

**NodeJs: VrpcAgent, VrpcAdapter**

- Automatic un-subscription of event-listeners belonging to dead clients
- log notification in case of non-permitted sub/pubs

### Fixed

- proper waiting until all INFO messages arrived
- automatic un-subscription of dead-client events

## [2.1.0-alpha.0] - 11 Nov 2019

### Added

- implemented proper deletion of named and un-named instances for node.js
- a new PRC message, indicating end of proxy
- events for `VrpcRemote` indicating changes of remote agents or classes
- initial set of javadoc-style public function documentation
- full adapter interface to c++ implementation

### Fixed

- improper asynchronicity of `serve` method in `VrpcAgent`
- broken event handling using `on` when used on several named instance proxies

### Changed

- property `class` to `className` in class info RPC message
- renamed `callRemote` to `call` in `VrpcAdapter.js` and `addon.cpp`
- made several functions public in VrpcAdapter for usage as local factory
- adapted public interface of VrpcLocal to be in sync with VrpcRemote

### Removed

- special function `__deleteNamed__`, turned out that `__delete__` suffices

## [2.0.3] - 04 Oct 2019

### Fixed

- missing instances when calling `VrpcRemote.getAvailableInstances()`

## [2.0.2] - 03 Oct 2019

### Fixed

- missing promise support on static functions (GH-2)
- proper association for multiple C++ instances of same class

### Added

- improved possibility to retrieve availabilities in `VrpcRemote.js`

## [2.0.1] - 22 Jun 2019

### Fixed

- a bug regarding C++ iterator usage (compile issue on windows)

### Changed

- wrong function calls (including incorrect signature) lead to RPC error instead
  of runtime exception in C++

## [2.0.0] - 15 Jun 2019

### Added

- `docs` folder with examples for Node.js, C++ and Python bindings
- static `fromCommandline` function to VrpcAgent.js
- support to remotely use event-emitters provided by Node.js agents
- documentation about rpc call details

### Fixed

- a bug while remotely registering async functions as direct callbacks
- sending multiple agent-info messages if several classes were registered
- incorrect internal correlationId in node.js remote-proxy

## [2.0.0-alpha.8] - 12 May 2019

### Added

- New npm run script: build - Triggers building of addons needed for testing,
  examples and dynamic loading feature
- `catch.hpp` header to third_party, simplifying installation and build
- Configurable timeout (default 5s) to rpc function calls
- Retained agent status (`<domain>/<agent>/__agent__/__static__/__info__`)
  published as retained message, indicating offline/online status and hostname

### Changed

- Default broker for tests is now vrpc.io itself and uses tls secured mqtt
- Currently the validity of the server certificate will be trusted
- Removed the need of automatically building native add-on during vrpc installation

## [2.0.0-alpha.7] - 01 Apr 2019

### Fixed

- Protecting yet another linux-only piece of code from windows compiler

## [2.0.0-alpha.6] - 01 Apr 2019

### Fixed

- Protected dlfcn.h header from being compiled by windows
- Callback multiplication upon re-registering with same event name

## [2.0.0-alpha.5] - 17 Mar 2019

### Added

- Token based login for node.js agent
- Additional API functions allowing to query available agents, classes, methods
- Possibility to create named instances usable by multiple proxies

### Fixed

- Asynchronous exceptions where not caught on remote proxy (await await - style)
- Session cleaning for re-login on node.js proxy
- Proper promise based await of client disconnect in case of VrpcRemote reconnect

### Changed

- The API of VrpcRemote to take a objects instead of multiple args
- Updated version of Modern JSON lib to 3.5.0
- Changed namespace and macro names from nlohmann to vrpc
- Adapted corresponding examples, tests and documentation
- Renamed all topicPrefix to domain
- Commandline options of vrpc-agent-js and default settings

## [2.0.0-alpha.4] - 02 Jan 2019

### Fixed

- Exchanged md4 with md5 hashing fixing missing browser support

## [2.0.0-alpha.3] - 01 Jan 2019

### Changed

- Adapter and Proxy can now use username and password for MQTT authentication
- ClientIDs are not longer random generated but explicitly set
- Added **static** keyword to wire protocol as placeholder for the instance
  position in case of static function
- Updated README to reflect latest documentation

### Fixed

- Bug that led to ambiguity given different agents serving same class names

## [2.0.0-alpha.2] - 02 Jul 2018

### Changed

- module.exports in index.js to also support VrpcAdapter

## [2.0.0-alpha.1] - 02 Jul 2018

### Changed

- module.exports in index.js to also support VrpcRemote

## [2.0.0-alpha.0] - 02 Jul 2018

### Added

- VrpcAgent for node.js
- VrpcRemote for node.js
- Corresponding tests involving MQTT
- Corresponding dependencies

### Changed

- Rewrote `VrpcLocal.js` using classes
- Adapted tests to instantiate VrpcLocal with `new` keyword
- Removed VRPC_COMPILE_AS_ADDON and introduced VRPC_WITH_DL
- Removed previously deprecated `cpp` symbolic link
- Some details of the wire-protocol
  - Renamed the argument identifiers from `a1`, `a2`... to `_1`, `_2`...
  - Renamed `function` to `method`
- Renamed VrpcFactory to VrpcAdapter
- Renamed vrpc_local.py to VrpcLocal.py

## [1.1.7] - 31 Mar 2018

### Fixed

- Re-registration problem for emitter based callbacks resulting in multiplied callbacks

## [1.1.6] - 31 Mar 2018

- Nothing changed, this tag is identical to 1.1.5 for a technical issue during
  publishing

## [1.1.5] - 14 Jun 2018

### Changed

- Increased maximum number of inflight ("open") callbacks
- Updated dependent packages

## [1.1.4] - 04 Jun 2018

### Added

- Low-level addon tests

### Changed

- vrpc's callCpp function to throw runtime exception in case of issues
- DRYed addon.cpp, improved string conversions and exception text

### Fixed

- Dev-Ops issue if installing twice (`cpp` soft-link is now forced)

## [1.1.3] - 01 Jun 2018

### Changed

- Updated dependencies
- Improved documentation

### Fixed

- Potential memory corruption if provided with non-null terminated strings
- Missing `inline` keyword on `get_signature` overload

## [1.1.2] - 01 Apr 2018

### Fixed

- Link to python example project in `README.md`
- Wrong path in `index.js`

## [1.1.1] - 01 Apr 2018

### Fixed

- Forgotten CHANGELOG.md file

## [1.1.0] - 01 Apr 2018

### Added

- This CHANGELOG.md file
- pandoc generated REAMDE.rst file

### Changed

- Renamed source folder `cpp` into `vrpc`, needed to please python's setup tools
  - Moved all non-test code into the new `vrpc` folder
  - Adapted all paths involving the old `cpp` folder
  - Adapted the `binding.gyp` template in `README.md`
  - Keeping backwards compatibility by generating `cpp` symbolic link
- Renamed environmental `BUILD_TESTS` to `BUILD_TEST` (has no external effect)
- Made building of python native extension conditional
  using `BUILD_TEST` and `BUILD_EXAMPLE`. This was needed to provide vrpc as
  pure python wheel.

### Fixed

- Python proxy constructor to be callable with variadic arguments
- Syntactic problems in `REAMDE.md` leading to mistakes in auto rst translation

## [1.0.2] - 16 Mar 2018

### Changed

- Link address to the C++ json library in `README.md`

### Removed

- Unnecessary npm-dependency `shortid`

## [1.0.1] - 14 Mar 2018

### Added

- Link to nodejs project example in `README.md`

### Fixed

- Typo and missing brace in `README.md`

## [1.0.0] - 14 Mar 2018

First public release
