// The documentation's structure, as docs/README.md lays it out

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
module.exports = {
  docs: [
    'README',
    'getting-started',
    {
      type: 'category',
      label: 'Understand',
      collapsed: false,
      items: [
        'concepts/overview',
        'concepts/instances',
        'concepts/calls',
        'concepts/events',
        'concepts/glossary'
      ]
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/expose-classes',
        'guides/event-functions',
        'guides/browser-and-react',
        'guides/persistence',
        'guides/native-code',
        'guides/security',
        'guides/production',
        'guides/troubleshooting'
      ]
    },
    {
      type: 'category',
      label: 'API reference',
      link: { type: 'doc', id: 'reference/README' },
      items: [
        'reference/vrpc-client',
        'reference/vrpc-agent',
        'reference/vrpc-adapter',
        'reference/vrpc-persistor',
        'reference/vrpc-native'
      ]
    },
    {
      type: 'category',
      label: 'Protocol',
      items: ['spec/protocol', 'spec/porting']
    }
  ]
}
