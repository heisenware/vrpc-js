# How to contribute

Having worked on IoT projects for more than a decade I always felt a pain to
interconnect software pieces running on different hardware and using different
programming technologies. I was really missing a simple communication library
that could do that all.

With the advent of C++11, finally there was a possibility to achieve that. With
the initial successes the idea turned into something bigger, big enough for me
to dedicate my entire working time to that project and professionally drive it
in form of the newly founded [Heisenware GmbH](https://heisenware.com).

To make it as easy as possible for you to contribute and for me to keep an
overview, here are a few guidelines which should help us avoid all kinds of
unnecessary work or disappointment.

## Private reports

Usually, all issues are tracked publicly on
[GitHub](https://github.com/heisenware/vrpc/issues). If you want to make a
private report (e.g., for a vulnerability or to attach an example that is not
meant to be published), please send an email to
<burkhard.heisen@heisenware.com>.

## Prerequisites

Please [create an issue](https://github.com/heisenware/vrpc/issues/new/choose),
assuming one does not already exist, and describe your concern. Note you need a
[GitHub account](https://github.com/signup/free) for this.

## Describe your issue

Clearly describe the issue:

- If it is a bug, please describe how to **reproduce** it. If possible, attach a
  complete example which demonstrates the error. Please also state what you
  **expected** to happen instead of the error.
- If you propose a change or addition, try to give an **example** how the
  improved code could look like or how to use it.
- If you found a compilation error, please tell us which **compiler** (version
  and operating system) you used and paste the (relevant part of) the error
  messages to the ticket.

Please stick to the provided issue templates ([bug report](https://github.com/heisenware/vrpc/blob/master/.github/ISSUE_TEMPLATE/bug.md)
or [feature request](https://github.com/heisenware/vrpc/blob/master/.github/ISSUE_TEMPLATE/feature.md)
if possible.

## Please don't

Please do not open pull requests for new features, but rather only report
about things you would find useful using a [feature request](https://github.com/heisenware/vrpc/blob/master/.github/ISSUE_TEMPLATE/feature.md).
We are not (yet) having the capacities to manage external feature suggestions in
a timely fashion and want to avoid frustration.

## Wanted

The following areas really need contribution:

- Reporting about any bugs, API inconsistencies or documentation weaknesses.
- Provisioning of **small** pull requests that would fix such bugs.
