// vrpc.io: the VRPC website. The documentation is the repository's docs/
// folder, rendered as it is; nothing of it is copied here.

const { themes } = require('prism-react-renderer')

const github = 'https://github.com/heisenware/vrpc-js'

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'VRPC',
  tagline: 'Remote objects over MQTT',
  url: 'https://vrpc.io',
  baseUrl: '/',
  trailingSlash: false,
  favicon: 'favicon.ico',
  organizationName: 'heisenware',
  projectName: 'vrpc-js',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    // .md files are CommonMark, .mdx files MDX: the docs are plain Markdown
    format: 'detect',
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: 'throw' }
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
          // before Docusaurus resolves .md links: links leaving docs/ go to GitHub
          beforeDefaultRemarkPlugins: [require('./plugins/remark-repo-links')]
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') }
      })
    ]
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsDir: '../docs',
        docsRouteBasePath: 'docs',
        highlightSearchTermsOnTargetPage: true
      }
    ]
  ],

  clientModules: [require.resolve('./src/clientModules/fonts.js')],

  plugins: [
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
          { from: '/docs/examples', to: '/docs/getting-started' }
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
      colorMode: { defaultMode: 'light', respectPrefersColorScheme: true },
      navbar: {
        // the logo alone; its alt text names it for screen readers
        logo: { alt: 'VRPC', src: 'logo.svg' },
        items: [
          { type: 'docSidebar', sidebarId: 'docs', label: 'Docs', position: 'left' },
          { to: '/docs/getting-started', label: 'Getting started', position: 'left' },
          { to: '/docs/reference', label: 'API', position: 'left' },
          { to: '/docs/spec/protocol', label: 'Protocol', position: 'left' },
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
              { label: 'Changelog', href: `${github}/blob/master/CHANGELOG.md` },
              { label: 'Heisenware', href: 'https://heisenware.com' }
            ]
          }
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Heisenware GmbH. VRPC is MIT licensed.`
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.vsDark,
        additionalLanguages: ['bash', 'json', 'cpp', 'cmake', 'python']
      }
    })
}
