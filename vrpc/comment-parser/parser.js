
'use strict'

const PARSERS = require('./parsers')

const MARKER_START = '/**'
const MARKER_START_SKIP = '/***'
const MARKER_END = '*/'

/* ------- util functions ------- */

function find (list, filter) {
  let i = list.length
  let matchs = true

  while (i--) {
    for (const k in filter) {
      if ({}.hasOwnProperty.call(filter, k)) {
        matchs = (filter[k] === list[i][k]) && matchs
      }
    }
    if (matchs) { return list[i] }
  }
  return null
}

/* ------- parsing ------- */

/**
 * Parses "@tag {type} name description"
 * @param {string} str Raw doc string
 * @param {Array<function>} parsers Array of parsers to be applied to the source
 * @returns {object} parsed tag node
 */
function parse_tag (str, parsers) {
  const data = parsers.reduce(function (state, parser) {
    let result

    try {
      result = parser(state.source, Object.assign({}, state.data))
    } catch (err) {
      state.data.errors = (state.data.errors || [])
        .concat(parser.name + ': ' + err.message)
    }

    if (result) {
      state.source = state.source.slice(result.source.length)
      state.data = Object.assign(state.data, result.data)
    }

    return state
  }, {
    source: str,
    data: {}
  }).data

  data.optional = !!data.optional
  data.type = data.type === undefined ? '' : data.type
  data.name = data.name === undefined ? '' : data.name
  data.description = data.description === undefined ? '' : data.description

  return data
}

/**
 * Parses comment block (array of String lines)
 */
function parse_block (source, opts) {
  if (!source[0]) return null
  const trim = opts.trim
    ? s => s.trim()
    : s => s

  const toggleFence = (typeof opts.fence === 'function')
    ? opts.fence
    : line => line.split(opts.fence).length % 2 === 0

  let source_str = source
    .map((line) => { return trim(line.source) })
    .join('\n')

  source_str = trim(source_str)

  const start = source[0].number

  // merge source lines into tags
  // we assume tag starts with "@"
  source = source
    .reduce(function (state, line) {
      line.source = trim(line.source)

      // start of a new tag detected
      if (line.source.match(/^\s*@(\S+)/) && !state.isFenced) {
        state.tags.push({
          source: [line.source],
          line: line.number
        })
      // keep appending source to the current tag
      } else {
        const tag = state.tags[state.tags.length - 1]
        if (opts.join !== undefined && opts.join !== false && opts.join !== 0 &&
            !line.startWithStar && tag.source.length > 0) {
          let source
          if (typeof opts.join === 'string') {
            source = opts.join + line.source.replace(/^\s+/, '')
          } else if (typeof opts.join === 'number') {
            source = line.source
          } else {
            source = ' ' + line.source.replace(/^\s+/, '')
          }
          tag.source[tag.source.length - 1] += source
        } else {
          tag.source.push(line.source)
        }
      }

      if (toggleFence(line.source)) {
        state.isFenced = !state.isFenced
      }
      return state
    }, {
      tags: [{ source: [] }],
      isFenced: false
    })
    .tags
    .map((tag) => {
      tag.source = trim(tag.source.join('\n'))
      return tag
    })

  // Block description
  const description = source.shift()

  // skip if no descriptions and no tags
  if (description.source === '' && source.length === 0) {
    return null
  }

  const tags = source.reduce(function (tags, tag) {
    const tag_node = parse_tag(tag.source, opts.parsers)

    tag_node.line = tag.line
    tag_node.source = tag.source

    if (opts.dotted_names && tag_node.name.includes('.')) {
      let parent_name
      let parent_tag
      let parent_tags = tags
      const parts = tag_node.name.split('.')

      while (parts.length > 1) {
        parent_name = parts.shift()
        parent_tag = find(parent_tags, {
          tag: tag_node.tag,
          name: parent_name
        })

        if (!parent_tag) {
          parent_tag = {
            tag: tag_node.tag,
            line: Number(tag_node.line),
            name: parent_name,
            type: '',
            description: ''
          }
          parent_tags.push(parent_tag)
        }

        parent_tag.tags = parent_tag.tags || []
        parent_tags = parent_tag.tags
      }

      tag_node.name = parts[0]
      parent_tags.push(tag_node)
      return tags
    }

    return tags.concat(tag_node)
  }, [])

  return {
    tags,
    line: start,
    description: description.source,
    source: source_str
  }
}

/**
 * Produces `extract` function with internal state initialized
 */
// A class declaration: `class Name`, also exported or assigned to
// module.exports, and TypeScript's `abstract class` and `declare class`
const CLASS_DECLARATION = /^(\s*)(?:export\s+(?:default\s+)?)?(?:module\.exports\s*=\s*)?(?:declare\s+)?(?:abstract\s+)?class\s+([\w$]+)/

// The keywords TypeScript may write before a member's name: its access
// (always first), static, and the rest
const MODIFIERS = /^\s*((?:(?:public|private|protected|static|async|readonly|override|abstract|declare)\s+)*)/

// A member function TypeScript declares private or protected:
// `private static async foo<T> (`. Compiling erases the access, so only the
// source still tells
const HIDDEN_MEMBER = /^\s*(private|protected)\s+((?:(?:static|async|readonly|override|abstract)\s+)*)\*?\s*([A-Za-z_$][\w$]*)\s*(?:<.*>)?\s*\(/

/** What the modifiers before a member's name say: static, and its access */
function modifiersOf (line) {
  const words = line.match(MODIFIERS)[1].split(/\s+/)
  const access = words.find(w => w === 'private' || w === 'protected')
  return { isStatic: words.includes('static'), access }
}

function mkextract (opts) {
  let chunk = null
  let indent = 0
  let number = 0
  let findMethod = false
  // the class whose body the lines are in: its name and the indentation of
  // its declaration; a function indented deeper belongs to it
  let scope = null
  // whether the lines are inside a /** ... */ block
  let commentOpen = false

  opts = Object.assign({}, {
    trim: true,
    dotted_names: false,
    fence: '```',
    assocFunctions: false,
    parsers: [
      PARSERS.parse_tag,
      PARSERS.parse_type,
      PARSERS.parse_name,
      PARSERS.parse_description
    ]
  }, opts || {})

  /**
   * Read lines until they make a block
   * Return parsed block once fullfilled or null otherwise
   */
  return function extract (line) {
    let result = null
    const startPos = line.indexOf(MARKER_START)
    const endPos = line.indexOf(MARKER_END)

    // in the code: where a class begins, and where its body ends
    if (!commentOpen && startPos === -1) {
      const declared = line.match(CLASS_DECLARATION)
      const closing = scope && line.match(/^(\s*)\}/)
      if (declared) scope = { name: declared[2], indent: declared[1].length }
      else if (closing && closing[1].length === scope.indent) scope = null
    }

    // if open marker detected and it's not, skip one
    if (startPos !== -1 && line.indexOf(MARKER_START_SKIP) !== startPos) {
      // A block still waiting for its function is followed by another
      // block: it documents no function (a typedef, a callback) and is
      // returned as it is - parsed BEFORE the chunk makes way
      if (findMethod) {
        result = parse_block(chunk, opts)
        findMethod = false
      }
      chunk = []
      indent = startPos + MARKER_START.length
    }

    // a member with a computed key ([Symbol.asyncDispose]) names no remote
    // function: the block documents it and nothing else - without this it
    // landed on the first call in the member's body
    if (
      findMethod &&
      /^\s*(static\s+)?(async\s+)?\*?\s*((get|set)\s+)?\[[^\]]+\]\s*\(/.test(line)
    ) {
      result = parse_block(chunk, opts)
      findMethod = false
    }

    if (findMethod) {
      // a TypeScript type parameter list may stand between name and
      // parenthesis: `foo<T> (`
      const ret = line.match(/\s*function\s+(\w+)\s*\(/) ||
        line.match(/\s*(\w+)\s*(?:<.*>)?\s*=?\s*\(/)
      if (ret) {
        result = parse_block(chunk, opts)
        result.functionName = ret[1]
        const { isStatic, access } = modifiersOf(line)
        result.isStatic = isStatic
        if (access) result.access = access
        const depth = line.match(/^\s*/)[0].length
        result.className = scope && depth > scope.indent ? scope.name : null
        findMethod = false
      }
    }

    // a member TypeScript declares private or protected stays inside its
    // class with or without a doc comment: one without is told as a block
    // of its own, without description and tags
    if (
      !result &&
      !findMethod &&
      opts.assocFunctions &&
      scope &&
      !commentOpen &&
      startPos === -1
    ) {
      const hidden = line.match(HIDDEN_MEMBER)
      const depth = line.match(/^\s*/)[0].length
      if (hidden && depth > scope.indent) {
        result = {
          tags: [],
          line: number,
          description: '',
          source: '',
          functionName: hidden[3],
          isStatic: /\bstatic\b/.test(hidden[2]),
          access: hidden[1],
          className: scope.name,
          declaration: true
        }
      }
    }

    // if we are on middle of comment block
    if (chunk && !findMethod) {
      let lineStart = indent
      let startWithStar = false

      // figure out if we slice from opening marker pos
      // or line start is shifted to the left
      const nonSpaceChar = line.match(/\S/)

      // skip for the first line starting with /** (fresh chunk)
      // it always has the right indentation
      if (chunk.length > 0 && nonSpaceChar) {
        if (nonSpaceChar[0] === '*') {
          const afterNonSpaceCharIdx = nonSpaceChar.index + 1
          const extraCharIsSpace = line.charAt(afterNonSpaceCharIdx) === ' '
          lineStart = afterNonSpaceCharIdx + (extraCharIsSpace ? 1 : 0)
          startWithStar = true
        } else if (nonSpaceChar.index < indent) {
          lineStart = nonSpaceChar.index
        }
      }

      // slice the line until end or until closing marker start
      chunk.push({
        number,
        startWithStar,
        source: line.slice(lineStart, endPos === -1 ? line.length : endPos)
      })

      // finalize block if end marker detected
      if (endPos !== -1) {
        if (opts.assocFunctions) {
          findMethod = true
        } else {
          result = parse_block(chunk, opts)
          chunk = null
          indent = 0
        }
      }
    }

    if (startPos !== -1) commentOpen = true
    if (endPos !== -1) commentOpen = false

    number += 1
    return result
  }
}

/* ------- Public API ------- */

module.exports = function parse (source, opts) {
  const blocks = []
  const extract = mkextract(opts)
  const lines = source.split(/\n/)

  lines.forEach((line) => {
    const block = extract(line)
    if (block) {
      blocks.push(block)
    }
  })

  return blocks
}

module.exports.PARSERS = PARSERS
module.exports.mkextract = mkextract
module.exports.CLASS_DECLARATION = CLASS_DECLARATION
