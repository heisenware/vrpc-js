'use strict'

// Facts the home page states about the protocol, read from the spec when
// the site is built: they stay true as the spec grows.

const fs = require('fs')
const path = require('path')

const spec = path.resolve(__dirname, '../../docs/spec/protocol.md')

module.exports = function specFacts () {
  return {
    name: 'spec-facts',
    getPathsToWatch () {
      return [spec]
    },
    async loadContent () {
      const text = fs.readFileSync(spec, 'utf8')
      // a numbered rule: `- **EV-10.** ...`
      const rules = (text.match(/^- \*\*[A-Z]+-\d+\.\*\*/gm) || []).length
      return { rules }
    },
    async contentLoaded ({ content, actions }) {
      actions.setGlobalData(content)
    }
  }
}
