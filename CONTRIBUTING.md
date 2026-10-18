# How to contribute

Having worked on IoT projects for more than a decade I always felt a pain to
interconnect software pieces running on different hardware and using different
programming technologies. I was really missing a simple communication library
that could do that all. With the initial successes the idea turned into
something bigger, big enough for me to dedicate my entire working time to it
and drive it professionally as [Heisenware GmbH](https://heisenware.com).

Here is how to contribute without unnecessary work or disappointment.
Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Reporting

- **Bugs, API inconsistencies, weak documentation:** open an
  [issue](https://github.com/heisenware/vrpc-js/issues/new/choose) with the
  bug form. Say how to reproduce it - ideally with a complete example - and
  what you expected instead.
- **Features:** open an issue describing what you need, with an example of
  how the improved code would look. Please do not open pull requests for
  features: we cannot review them in time yet, and want to spare you the
  frustration.
- **Security issues:** never in public; see [SECURITY.md](SECURITY.md).

## Pull requests

Small pull requests that fix a bug, or the documentation, are welcome. A
pull request:

- comes with a test that fails without it;
- changes the documentation in the same pull request when it changes
  behaviour - the [documentation map](docs/README.md) says where things
  belong;
- adds an entry to the top section of [CHANGELOG.md](CHANGELOG.md);
- keeps `npm test` and `npm run check:links` passing.

## Development

You need Node.js 18 or newer, and Docker for three of the test suites. CI
runs the in-process suites on Node.js 18, 22 and 24, and everything else
on 24.

```bash
npm install
npm run test:adapter         # in-process, seconds
npm run test:subscriptions   # agent and client over an in-process broker
npm run test:examples        # the examples, as a reader runs them
npm run test:reconnect       # reconnect pacing against a fake broker
npm run test:agent           # Docker: agent against Mosquitto
npm run test:client          # Docker: client against agents and Mosquitto
npm run test:legacy-runtime  # Docker: the agent on Node.js 16, which native agents still ship on
npm test                     # everything
```

`test:persistor`, `test:lifecycle` and `test:production` use the public
broker unless `VRPC_TEST_BROKER` names another. A local one is faster and
more reliable:
`docker run -p 1883:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf`,
then `VRPC_TEST_BROKER=mqtt://localhost:1883 npm test`.

Other scripts:

| Script | Does |
| --- | --- |
| `npm run build:doc` | regenerates the [API reference](docs/reference/README.md) from the JSDoc |
| `npm run build:browser` | rebuilds the browser bundle `browser/vrpc.js` |
| `npm run check:links` | checks every relative link and anchor of the documentation |

To see the documentation as [vrpc.io](https://vrpc.io) shows it, run
`npm install && npm start` in [website/](website/README.md).

To try the browser bundle by hand, serve the repository root with any static
server (`python3 -m http.server`) and open `/tests/browser/`: the page loads
`browser/vrpc.js` and reports to the browser's console.

## Changing the protocol

The [protocol specification](docs/spec/protocol.md) binds every VRPC
implementation. A change to what travels on the wire:

- changes or adds a numbered rule there (never re-using an identifier),
  and its "Changes" appendix;
- comes with tests that name the rule they check, like
  `tests/subscriptions/wire.spec.js`;
- keeps peers of the previous protocol version working, or says in section
  13 why it cannot.
