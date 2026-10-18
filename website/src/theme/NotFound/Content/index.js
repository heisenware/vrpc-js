// The 404 page: what there is instead of the page that is not
import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import Heading from '@theme/Heading'

const instead = [
  { to: '/docs/getting-started', label: 'Getting started', text: 'offer a class and call it, in ten minutes' },
  { to: '/docs', label: 'Documentation', text: 'concepts and guides' },
  { to: '/docs/reference', label: 'API reference', text: 'every class, function and option' },
  { to: '/docs/spec/protocol', label: 'Protocol specification', text: 'what travels on the wire' },
  { to: '/blog', label: 'Blog', text: 'news and stories' }
]

export default function NotFoundContent ({ className }) {
  return (
    <main className={clsx('container margin-vert--xl', className)}>
      <div className='row'>
        <div className='col col--6 col--offset-3'>
          <Heading as='h1' className='hero__title'>
            Page not found
          </Heading>
          <p>This page does not exist, or no longer does. Perhaps you are looking for:</p>
          <ul>
            {instead.map(({ to, label, text }) => (
              <li key={to}>
                <Link to={to}>{label}</Link> - {text}
              </li>
            ))}
          </ul>
          <p>
            The search at the top finds everything else. Programs find every
            page in <Link to='pathname:///llms.txt'>/llms.txt</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}
