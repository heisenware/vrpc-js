# Security policy

## Reporting a vulnerability

Please do not report security issues in public GitHub issues. Send them by
email to <burkhard.heisen@heisenware.com>, with:

- the version of vrpc (and of the other VRPC implementations involved);
- what an attacker can do, and what they need to do it;
- a way to reproduce it, if you have one.

You will get an answer, and credit in the changelog once a fix is released,
if you wish.

## Supported versions

Security fixes go into the latest minor release of the current major
version (3.x). Update to it to receive them.

## Hardening a deployment

How to run VRPC securely - your own broker with TLS, authentication, topic
permissions - is described in [Securing a deployment](docs/guides/security.md).
