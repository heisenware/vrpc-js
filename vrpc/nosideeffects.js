'use strict'

// The protocol's own functions answer for themselves (protocol, section
// 16.3): a class neither lists all of them nor declares them
const PROTOCOL = new Map([
  // the caller's own subscriptions, and a listing
  ['__unsubscribe__', true],
  ['__registrations__', true],
  // instance lifecycle, and an end every subscriber is told of
  ['__createShared__', false],
  ['__createIsolated__', false],
  ['__delete__', false],
  ['__end__', false],
  // fan-outs carry the function they call in the payload, out of a
  // topic-reading broker's sight
  ['__callAll__', false],
  ['__callMatching__', false]
])

/**
 * Whether a function's class declares it free of side effects: calling it
 * changes nothing another caller, a device or storage could observe
 * afterwards. The protocol's own functions answer by the protocol, with or
 * without a class info, every other function by `nosideeffects` in its
 * meta data. A function the class
 * does not list, or does not declare, has side effects. A name an agent
 * lists overloads of (`<function>-<type>:<type>`, section 16.2) is free of
 * side effects only when every overload is declared: a request names the
 * function, the agent picks the overload.
 *
 * @param {Object} classInfo the class info as published on `__classInfo__`
 * (with `meta`): `{ memberFunctions, staticFunctions, meta }`
 * @param {String} functionName the function
 * @returns {Boolean} true when the function is declared free of side effects
 */
function nosideeffects (classInfo, functionName) {
  if (typeof functionName !== 'string') return false
  // with or without a class info
  if (PROTOCOL.has(functionName)) return PROTOCOL.get(functionName)
  if (!classInfo) return false
  // a listed name before its first `-` is the function (section 16.2)
  const listed = [
    ...(classInfo.memberFunctions || []),
    ...(classInfo.staticFunctions || [])
  ].filter(name => name.split('-')[0] === functionName)
  if (listed.length === 0) return false
  const meta = classInfo.meta || {}
  return listed.every(name => {
    const entry = Object.prototype.hasOwnProperty.call(meta, name)
      ? meta[name]
      : null
    return !!entry && entry.nosideeffects === true
  })
}

module.exports = nosideeffects
