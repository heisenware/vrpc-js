# C++ in JavaScript - The vrpc way

Using the latest features of Node.js 8 and C++14 allows us to entirely rethink
how language bindings can be accomplished.

A solution called **vrpc** is demonstrated, that let's JavaScript and C++
talk to each other in both directions supporting all language features (object
construction, function calling, return value reception, callback and exception
handling, etc.).

The days of writing any crazy binding code through *nodejs/nan* or Node.js' own
*N-API* are counted. It suffices to non-intrusively list the respective
constructors and functions. The rest is taken care of by C++'s meta-template
compiler.

vrpc uses vanilla C++14 and ships as a header-only library. It's key
idea relates to remote procedural calls (RPC). As a side-effect of this
technology, language bindings can be used locally (via native addons) or even
remotely (via MQTT as transport protocol).
