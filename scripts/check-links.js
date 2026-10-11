'use strict'

// Checks every relative link of the documentation: the file it points to
// exists, and so does the anchor (a heading, or an <a name>) it names.
// Exits with 1 when a link is broken. External links are not checked.

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function markdownFiles (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return markdownFiles(file)
    return entry.name.endsWith('.md') ? [file] : []
  })
}

// GitHub's anchor for a heading
function slug (heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]/g, '')
    .replace(/ /g, '-')
}

function withoutCode (text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

const anchorCache = new Map()
function anchorsOf (file) {
  if (!anchorCache.has(file)) {
    const anchors = new Set()
    for (const line of withoutCode(fs.readFileSync(file, 'utf8')).split('\n')) {
      const heading = line.match(/^#{1,6}\s+(.*)$/)
      if (heading) anchors.add(slug(heading[1]))
      for (const [, name] of line.matchAll(/<a (?:name|id)="([^"]+)"/g)) anchors.add(name)
    }
    anchorCache.set(file, anchors)
  }
  return anchorCache.get(file)
}

const files = [
  path.join(root, 'README.md'),
  path.join(root, 'CONTRIBUTING.md'),
  path.join(root, 'SECURITY.md'),
  path.join(root, 'website', 'README.md'),
  ...markdownFiles(path.join(root, 'docs')),
  ...markdownFiles(path.join(root, 'examples')).filter(f => !f.includes('node_modules'))
]

let broken = 0
for (const file of files) {
  const text = withoutCode(fs.readFileSync(file, 'utf8'))
  for (const [, link] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?|mailto):/.test(link)) continue
    const [target, anchor] = link.split('#')
    const targetFile = target ? path.resolve(path.dirname(file), target) : file
    const where = path.relative(root, file)
    if (!fs.existsSync(targetFile)) {
      console.error(`${where}: no such file: ${link}`)
      broken++
    } else if (anchor && targetFile.endsWith('.md') && !anchorsOf(targetFile).has(anchor)) {
      console.error(`${where}: no such anchor: ${link}`)
      broken++
    }
  }
}
console.log(`${files.length} files checked, ${broken} broken link(s)`)
process.exit(broken > 0 ? 1 : 0)
