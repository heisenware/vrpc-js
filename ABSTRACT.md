# C++ in Node.js or Python - The vrpc way

Using most recent language advancements as seen in Node.js (>= 8), Python
(>=3.4) and C++ (>=14) allows us to entirely rethink how inter-language bindings
can be accomplished.

A solution called **vrpc** is demonstrated, that let's Node.js or Python talk to
C++ in both directions supporting all language features (object construction,
function calling, return value reception, callback and exception handling,
etc.).

The days of writing any crazy binding code through the languages' own clunky
APIs or heavy external libraries (such as *boost-python* or *nodejs/nan*) are
counted. It suffices to non-intrusively list the respective constructors and
functions. The rest is taken care of by C++'s meta-template engine.

vrpc uses vanilla C++14 and ships as a header-only library. It's key idea
relates to those of remote procedural calls (RPC). As a side-effect of this
technology, language bindings can be used locally (via native addons) or even
remotely (via MQTT as transport protocol).
