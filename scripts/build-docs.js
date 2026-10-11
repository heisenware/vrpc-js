'use strict'

// Renders the API reference: one page per public class of vrpc-js, from its
// JSDoc, into docs/reference/. Internals (names beginning with an
// underscore, and anything tagged @private) stay out.

const fs = require('fs')
const path = require('path')
const jsdoc2md = require('jsdoc-to-markdown')

const root = path.resolve(__dirname, '..')
const pages = [
  ['vrpc/VrpcClient.js', 'vrpc-client.md', 'VrpcClient'],
  ['vrpc/VrpcAgent.js', 'vrpc-agent.md', 'VrpcAgent'],
  ['vrpc/VrpcAdapter.js', 'vrpc-adapter.md', 'VrpcAdapter'],
  ['vrpc/VrpcPersistor.js', 'vrpc-persistor.md', 'VrpcPersistor'],
  ['vrpc/VrpcNative.js', 'vrpc-native.md', 'VrpcNative']
]

async function main () {
  const dir = path.join(root, 'docs', 'reference')
  fs.mkdirSync(dir, { recursive: true })
  for (const [source, page, name] of pages) {
    const body = await jsdoc2md.render({
      files: path.join(root, source),
      configure: path.join(root, 'scripts', 'jsdoc', 'jsdoc.json'),
      'param-list-format': 'list',
      separators: true
    })
    const header =
      `# ${name}\n\n` +
      '<!-- Generated from the JSDoc of ' + source + ' by `npm run build:doc`. Edit the source, not this file. -->\n\n' +
      '[API reference](README.md) · [Documentation](../README.md)\n\n'
    // anchors as ids: GitHub honours both, the website only ids
    fs.writeFileSync(path.join(dir, page), header + body.replace(/<a name="/g, '<a id="'))
    console.log(`docs/reference/${page}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
