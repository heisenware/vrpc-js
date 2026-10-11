'use strict'

/**
 * Name patterns and selections (docs/spec/protocol.md, section 11).
 *
 * In a pattern, `*` matches any run of characters, none included; every
 * other character matches itself, case counts, and nothing else is special.
 * A selection is a pattern or a non-empty list of them; it selects a name
 * one of them matches.
 *
 * Matching takes time in proportion to the lengths of pattern and name,
 * whatever they hold: no backtracking a name could make explode.
 *
 * @private
 */

/**
 * Whether a pattern matches a name
 *
 * @param {String} pattern
 * @param {String} name
 * @returns {Boolean}
 */
function matches (pattern, name) {
  let p = 0
  let n = 0
  // the last `*` seen, and the position in the name it stands at
  let star = -1
  let mark = 0
  while (n < name.length) {
    if (p < pattern.length && pattern[p] === '*') {
      star = p++
      mark = n
    } else if (p < pattern.length && pattern[p] === name[n]) {
      p++
      n++
    } else if (star !== -1) {
      // the last `*` takes one more character
      p = star + 1
      n = ++mark
    } else {
      return false
    }
  }
  while (p < pattern.length && pattern[p] === '*') p++
  return p === pattern.length
}

/**
 * Whether a value is a selection: a non-empty string, or a non-empty list
 * of them
 *
 * @param {Any} selection
 * @returns {Boolean}
 */
function isSelection (selection) {
  const isPattern = x => typeof x === 'string' && x.length > 0
  return Array.isArray(selection)
    ? selection.length > 0 && selection.every(isPattern)
    : isPattern(selection)
}

/**
 * Whether a selection selects a name
 *
 * @param {String|Array.<String>} selection
 * @param {String} name
 * @returns {Boolean}
 */
function selects (selection, name) {
  return Array.isArray(selection)
    ? selection.some(pattern => matches(pattern, name))
    : matches(selection, name)
}

/**
 * Whether a selection is everything: `*`, alone or in its list
 *
 * @param {String|Array.<String>} selection
 * @returns {Boolean}
 */
function selectsAll (selection) {
  return Array.isArray(selection) ? selection.includes('*') : selection === '*'
}

module.exports = { matches, isSelection, selects, selectsAll }
