'use strict'
// The browser build's `process`: process/browser with a nextTick that does
// not ride on a page timer. process/browser schedules nextTick through
// setTimeout(fn, 0), which a browser throttles in a hidden tab (Chrome
// wakes such timers once a minute after five minutes), and mqtt parses
// every incoming packet through nextTick: the ping left on time from the
// worker timer, its response was parsed a minute later, and the client's
// own keepalive timeout dropped a healthy session. A microtask runs at the
// end of the task that queued it, whatever the state of the tab.
const process = require('process/browser')
process.nextTick = function (fn, ...args) {
  queueMicrotask(() => fn(...args))
}
module.exports = process
