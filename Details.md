# Topic structure


WARNING: This document currently is partially outdated. It will be adapted
with the public release of 2.0.0.

General pattern

`<domain>/<agent>/<klass>/<instance>/<method>`

## Agent

### During initialization

Configured by user: `<domain>` and `<agent>`

Generate client ID:

- `vrpca<md5 hash of domain + agent>`

Iterate all registered classes (`<klass>`) and subscribe their static functions:

- [subscribe] `<domain>/<agent>/<klass>/__static__/<method>`

Publish single message:

- [publish] `<domain>/<agent>/<klass>/__static__/__info__`

with payload:

```json
{
  "klass": "<className>",
  "staticFunctions": "[<functionName1>, <functionName2>]",
  "memberFunctions": "[<functionName1>, <functionName2>]"
}
```

### During runtime

1.  After receiving a `<domain>/<agent>/<klass>/__static__/__create__` message:

    Iterate all member functions of newly created instance (`<instance>`):

    - [subscribe] `<domain>/<agent>/<klass>/<instance>/<method>`

2.  After receiving a `<domain>/<agent>/<klass>/<instance>/<method>` message:

    Do the RPC call and reply to the sender instance:

    - [publish] `<proxy-domain>/<proxy-host>-<proxy-pid>/<proxy-uid>`

## Proxy

### During initialization

Configured by user (optional): `<domain>` and `<agent>`

Generate client ID:

- `vrpcp<md5 of own topic>`

Listen for available classes and response messages

- [subscribe] `<domain>/+/+/__static__/__info__`
- [subscribe] `<domain>/<host>/<language>/<uid>`

### During runtime

Publish a single message per function call:

- [publish] `<domain>/<agent>/<klass>/<instance>/<method>`
