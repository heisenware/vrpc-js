# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [unreleased]

### Added

- `docs` folder with examples for nodeJS and python3 language bindings
- static `fromCommandline` function to VrpcAgent.js

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
- Added __static__ keyword to wire protocol as placeholder for the instance
  position in case of static function

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
