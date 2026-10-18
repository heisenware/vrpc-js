// A page of the documentation names its Markdown (plugins/llms.js), for
// programs that read Markdown better than the rendered page
import React from 'react'
import Head from '@docusaurus/Head'
import Metadata from '@theme-original/DocItem/Metadata'
import { useDoc } from '@docusaurus/plugin-content-docs/client'

export default function MetadataWithMarkdown (props) {
  const { metadata } = useDoc()
  return (
    <>
      <Metadata {...props} />
      <Head>
        <link
          rel='alternate'
          type='text/markdown'
          href={`${metadata.permalink.replace(/\/$/, '')}.md`}
        />
      </Head>
    </>
  )
}
