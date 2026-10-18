'use strict'

// What vrpc.io offers AI assistants and other programs that read Markdown
// better than a rendered page (https://llmstxt.org), written after the
// site is built:
//
// - /llms.txt: what VRPC is (llms.md), and every page of the documentation
//   in the order of the sidebar, with a line on each
// - /llms-full.txt: the same, with every page in full
// - every page of the documentation as Markdown, beside the page: its URL
//   with .md in place of the trailing slash (/docs/getting-started.md),
//   and the README as /index.md, for the home page
//
// Links in that Markdown are absolute, so they work wherever the text ends
// up: to the Markdown of a page of the documentation, else to GitHub.

const fs = require('fs')
const path = require('path')
const sidebars = require('../sidebars')
const {
  repoRoot,
  docsRoot,
  githubUrl,
  routeOf,
  markdownOf,
  titleOf,
  descriptionOf
} = require('./doc-text')

const template = path.resolve(__dirname, '../llms.md')
const PAGES = '<!-- pages -->'

// the pages of a sidebar, in its order, each with its category
function pagesOf (items, category = 'Start here') {
  return items.flatMap(item => {
    if (typeof item === 'string') return [{ id: item, category }]
    if (item.type === 'doc') return [{ id: item.id, category }]
    if (item.type !== 'category') return []
    const own =
      item.link && item.link.type === 'doc'
        ? [{ id: item.link.id, category: item.label }]
        : []
    return [...own, ...pagesOf(item.items, item.label)]
  })
}

function filesOf (dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? filesOf(path.join(dir, entry.name))
        : [path.join(dir, entry.name)]
    )
}

function visit (node, fn) {
  fn(node)
  if (Array.isArray(node.children)) node.children.forEach(child => visit(child, fn))
}

/**
 * A Markdown file of the repository with its relative links made absolute:
 * to the Markdown of a page of docs/, else to the file on GitHub. The text
 * stays as written; only the link destinations change.
 */
async function absoluteMarkdown (file, site) {
  const { fromMarkdown } = await import('mdast-util-from-markdown')
  const text = fs.readFileSync(file, 'utf8')
  const edits = []
  visit(fromMarkdown(text), node => {
    if (!['link', 'image', 'definition'].includes(node.type)) return
    const url = node.url
    if (!url || /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(url)) return
    const [target, anchor] = url.split('#')
    const absolute = path.resolve(path.dirname(file), decodeURI(target))
    const inDocs =
      absolute.startsWith(docsRoot + path.sep) && /\.mdx?$/.test(absolute)
    const to =
      (inDocs ? site + markdownOf(routeOf(absolute)) : githubUrl(absolute)) +
      (anchor ? `#${anchor}` : '')
    // the destination follows the link's text
    const { start, end } = node.position
    const children = node.children || []
    const from = children.length
      ? children[children.length - 1].position.end.offset
      : start.offset
    const at = text.indexOf(url, from)
    if (at < 0 || at >= end.offset) {
      throw new Error(`llms: cannot rewrite the link ${url} in ${file}`)
    }
    edits.push({ at, length: url.length, to })
  })
  let out = text
  for (const { at, length, to } of edits.sort((a, b) => b.at - a.at)) {
    out = out.slice(0, at) + to + out.slice(at + length)
  }
  return out
}

function write (outDir, route, content) {
  const file = path.join(outDir, route)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

module.exports = function llms () {
  return {
    name: 'llms',
    async postBuild ({ siteConfig, outDir, routesPaths }) {
      const site = siteConfig.url
      const routes = new Set(routesPaths)

      // every page of docs/ as Markdown, those outside the sidebar too
      const markdown = new Map()
      for (const file of filesOf(docsRoot).filter(f => /\.mdx?$/.test(f))) {
        const route = routeOf(file)
        if (!routes.has(route)) {
          throw new Error(`llms: ${file} is not served at ${route}`)
        }
        const text = await absoluteMarkdown(file, site)
        markdown.set(route, text)
        write(outDir, markdownOf(route), text)
      }
      write(outDir, '/index.md', await absoluteMarkdown(path.join(repoRoot, 'README.md'), site))

      // the pages of the sidebar, grouped by category
      const pages = pagesOf(sidebars.docs).map(({ id, category }) => {
        const file = path.join(docsRoot, `${id}.md`)
        const route = routeOf(file)
        const text = fs.readFileSync(file, 'utf8')
        return { category, route, title: titleOf(text), description: descriptionOf(text) }
      })
      const sections = []
      for (const page of pages) {
        let section = sections.find(s => s.category === page.category)
        if (!section) sections.push((section = { category: page.category, pages: [] }))
        section.pages.push(page)
      }
      const index = sections
        .map(({ category, pages }) =>
          [
            `## ${category}`,
            '',
            ...pages.map(
              ({ route, title, description }) =>
                `- [${title}](${site}${markdownOf(route)})${description ? `: ${description}` : ''}`
            )
          ].join('\n')
        )
        .join('\n\n')
      const full = pages
        .map(({ route }) => `---\n\n<!-- ${site}${route} -->\n\n${markdown.get(route).trim()}`)
        .join('\n\n')

      const [head, tail] = fs.readFileSync(template, 'utf8').split(PAGES)
      if (tail === undefined) throw new Error(`llms: ${template} has no ${PAGES}`)
      write(outDir, '/llms.txt', `${head}${index}${tail}`)
      write(outDir, '/llms-full.txt', `${head}${full}\n\n${tail.trimStart()}`)
    }
  }
}
