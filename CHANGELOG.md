# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

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
