'use strict'

// What the site reads from a page of docs/ beyond what Docusaurus does: its
// title, a line on what it is about, where it is served, and where its
// links to files outside docs/ lead. Used for the meta description of every
// page (docusaurus.config.js) and for the Markdown the site serves
// (plugins/llms.js).

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '../..')
const docsRoot = path.join(repoRoot, 'docs')
const github = 'https://github.com/heisenware/vrpc-js'

// whether a file is a page of docs/
function isDoc (file) {
  return path.resolve(file).startsWith(docsRoot + path.sep) && /\.mdx?$/.test(file)
}

// a file of the repository on GitHub
function githubUrl (absolute) {
  const relative = path.relative(repoRoot, absolute).split(path.sep).join('/')
  const kind = fs.existsSync(absolute) && fs.statSync(absolute).isDirectory() ? 'tree' : 'blob'
  return `${github}/${kind}/master/${relative}`
}

// where a page of docs/ is served: getting-started.md at
// /docs/getting-started/, a README.md as the page of its folder
function routeOf (file) {
  const id = path
    .relative(docsRoot, path.resolve(file))
    .split(path.sep)
    .join('/')
    .replace(/\.mdx?$/, '')
  const page = id === 'README' ? '' : id.replace(/\/README$/, '')
  return page ? `/docs/${page}/` : '/docs/'
}

// where the Markdown of a page is served: beside it, /docs/x/ as /docs/x.md
function markdownOf (route) {
  return `${route.replace(/\/$/, '')}.md`
}

function titleOf (text) {
  const heading = text.match(/^# (.+)$/m)
  return heading ? heading[1].trim() : null
}

// prose without its markup; code keeps its text
function plain (markdown) {
  const code = []
  return markdown
    .replace(/`([^`]*)`/g, (_, text) => `\uE000${code.push(text) - 1}\uE000`)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_]+)[*_](?=[\s).,:;!?]|$)/g, '$1$2')
    .replace(/\uE000(\d+)\uE000/g, (_, i) => code[i])
    .replace(/\s+/g, ' ')
    .trim()
}

// its first sentences, at most `max` characters; a sentence ends where a
// full stop meets a space (not in Node.js, nor in console.log)
function shorten (text, max = 240) {
  if (text.length <= max) return text
  const end = /[.!?](?=\s)/g
  let cut = -1
  for (let m = end.exec(text); m && m.index < max; m = end.exec(text)) {
    cut = m.index + 1
  }
  if (cut > 0) return text.slice(0, cut)
  return `${text.slice(0, text.lastIndexOf(' ', max - 1))}…`
}

/**
 * What a page is about: the first paragraph of prose after its title, cut
 * after a sentence once it grows long. A heading, HTML, a table, a list,
 * code, and a line of nothing but links (the API reference's breadcrumb)
 * are no prose. Docusaurus itself takes the first line, which ends wherever
 * the source wraps.
 *
 * @param {String} text the page's Markdown, without front matter
 * @returns {String|null}
 */
function descriptionOf (text) {
  const body = text
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const title = body.search(/^# /m)
  const rest = title < 0 ? body : body.slice(body.indexOf('\n', title) + 1)
  for (const block of rest.split(/\n[ \t]*\n/)) {
    const lines = block
      .split('\n')
      .filter(line => line.trim() && !/^\s*#/.test(line) && !/^\s*<[^>]*>\s*$/.test(line))
    if (lines.length === 0 || /^\s*([|<>*+-]|\d+\.\s)/.test(lines[0])) continue
    const raw = lines.join(' ')
    if (!/[A-Za-z]/.test(raw.replace(/\[[^\]]*\]\([^)]*\)/g, ''))) continue
    const text = plain(raw)
    if (text) return shorten(text)
  }
  return null
}

module.exports = {
  repoRoot,
  docsRoot,
  isDoc,
  githubUrl,
  routeOf,
  markdownOf,
  titleOf,
  descriptionOf
}
