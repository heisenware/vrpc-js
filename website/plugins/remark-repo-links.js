'use strict'

// The documentation lives in the repository's docs/ folder and links to
// files around it - the README, the changelog, the examples - with paths
// that work on GitHub. On the website those files do not exist: this
// rewrites every relative link that leaves docs/ to the file on GitHub.

const path = require('path')
const { docsRoot, githubUrl } = require('./doc-text')

function visit (node, fn) {
  fn(node)
  if (Array.isArray(node.children)) node.children.forEach(child => visit(child, fn))
}

module.exports = function remarkRepoLinks () {
  return (tree, file) => {
    const source = file.path || (file.history && file.history[0])
    if (!source) return
    visit(tree, node => {
      if (node.type !== 'link' && node.type !== 'definition') return
      const url = node.url
      if (!url || /^([a-z]+:|#|\/)/i.test(url)) return
      const [target, anchor] = url.split('#')
      const absolute = path.resolve(path.dirname(source), target)
      if (absolute.startsWith(docsRoot + path.sep) || absolute === docsRoot) return
      node.url = `${githubUrl(absolute)}${anchor ? `#${anchor}` : ''}`
    })
  }
}
