// vrpc.io: the VRPC website. The documentation is the repository's docs/
// folder, rendered as it is; nothing of it is copied here.

const { themes } = require('prism-react-renderer')
const { isDoc, descriptionOf } = require('./plugins/doc-text')

const github = 'https://github.com/heisenware/vrpc-js'

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'VRPC',
  tagline: 'Remote objects over MQTT',
  url: 'https://vrpc.io',
  baseUrl: '/',
  // GitHub Pages serves a page's folder: /docs/x/ is the page, and /docs/x
  // redirects to it (with false, /docs/x/ would not be found)
  trailingSlash: true,
  favicon: 'favicon.ico',
  organizationName: 'heisenware',
  projectName: 'vrpc-js',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    // .md files are CommonMark, .mdx files MDX: the docs are plain Markdown
    format: 'detect',
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: 'throw' },
    // a page of docs/ is described by its first paragraph, not by its first
    // line - the docs wrap their lines, Docusaurus would cut mid-sentence
    parseFrontMatter: async params => {
      const result = await params.defaultParseFrontMatter(params)
      if (isDoc(params.filePath) && result.frontMatter.description === undefined) {
        const description = descriptionOf(result.content)
        if (description) result.frontMatter.description = description
      }
      return result
    }
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: ({ docPath }) => `${github}/edit/master/docs/${docPath}`,
          // from git: the deploy workflow checks out the whole history
          showLastUpdateTime: true,
          // before Docusaurus resolves .md links: links leaving docs/ go to GitHub
          beforeDefaultRemarkPlugins: [require('./plugins/remark-repo-links')]
        },
        // news and stories, in English and German: a German post sets its
        // own language and links to its English twin (hreflang)
        blog: {
          path: 'blog',
          routeBasePath: 'blog',
          blogTitle: 'VRPC blog',
          blogDescription: 'News and stories from VRPC: remote objects over MQTT',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'VRPC blog',
            copyright: 'Copyright © 2018 Dr. Burkhard Heisen'
          },
          onUntruncatedBlogPosts: 'throw'
        },
        theme: { customCss: require.resolve('./src/css/custom.css') },
        sitemap: {
          lastmod: 'date',
          ignorePatterns: ['/search/**']
        }
      })
    ]
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: true,
        docsDir: '../docs',
        docsRouteBasePath: 'docs',
        highlightSearchTermsOnTargetPage: true
      }
    ]
  ],

  clientModules: [require.resolve('./src/clientModules/fonts.js')],

  plugins: [
    // the number of protocol rules and other facts the home page states
    require.resolve('./plugins/spec-facts.js'),
    // llms.txt, and every page of the documentation as Markdown
    require.resolve('./plugins/llms.js'),
    // The live demo uses the browser bundle of vrpc, also in the server
    // build; the Node entry would pull the native addon sources in
    () => ({
      name: 'vrpc-browser-bundle',
      configureWebpack: () => ({
        resolve: { alias: { vrpc$: require.resolve('vrpc/browser/vrpc.js') } }
      })
    }),
    // the pages of the previous site, for links out there
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          { from: '/docs/intro', to: '/docs/concepts/overview' },
          { from: '/docs/architecture', to: '/docs/concepts/overview' },
          { from: '/docs/api', to: '/docs/reference' },
          { from: '/docs/persistence', to: '/docs/guides/persistence' },
          { from: '/docs/examples', to: '/docs/getting-started' },
          { from: '/examples', to: '/docs/getting-started' }
        ]
      }
    ]
  ],

  headTags: [
    { tagName: 'link', attributes: { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' } },
    { tagName: 'link', attributes: { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' } },
    { tagName: 'link', attributes: { rel: 'manifest', href: '/site.webmanifest' } }
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // the preview a shared link shows, unless a page brings its own
      image: 'img/social-card.png',
      colorMode: { defaultMode: 'light', respectPrefersColorScheme: true },
      navbar: {
        // the logo alone; its alt text names it for screen readers
        logo: { alt: 'VRPC', src: 'logo.svg' },
        items: [
          { type: 'docSidebar', sidebarId: 'docs', label: 'Docs', position: 'left' },
          { to: '/docs/getting-started', label: 'Getting started', position: 'left' },
          { to: '/docs/reference', label: 'API', position: 'left' },
          { to: '/docs/spec/protocol', label: 'Protocol', position: 'left' },
          { to: '/blog', label: 'Blog', position: 'left' },
          { type: 'custom-githubStar', position: 'right' }
        ]
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              { label: 'Getting started', to: '/docs/getting-started' },
              { label: 'How VRPC works', to: '/docs/concepts/overview' },
              { label: 'Protocol specification', to: '/docs/spec/protocol' }
            ]
          },
          {
            title: 'Implementations',
            items: [
              { label: 'JavaScript', href: github },
              { label: 'C++', href: 'https://github.com/heisenware/vrpc-hpp' },
              { label: 'Python', href: 'https://github.com/heisenware/vrpc-py' },
              { label: 'Arduino', href: 'https://github.com/heisenware/vrpc-arduino' },
              { label: 'React', href: 'https://github.com/heisenware/vrpc-react' }
            ]
          },
          {
            title: 'More',
            items: [
              { label: 'Blog', to: '/blog' },
              { label: 'Changelog', href: `${github}/blob/master/CHANGELOG.md` },
              // the documentation's index for AI assistants (plugins/llms.js)
              { label: 'llms.txt', href: 'pathname:///llms.txt' },
              { label: 'Heisenware', href: 'https://heisenware.com' }
            ]
          }
        ],
        copyright: 'Copyright © 2018 Dr. Burkhard Heisen. VRPC is MIT licensed.'
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.vsDark,
        additionalLanguages: ['bash', 'json', 'cpp', 'cmake', 'python']
      }
    })
}
