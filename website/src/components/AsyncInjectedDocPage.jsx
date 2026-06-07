// src/components/AsyncInjectedDocPage.jsx
import React, { useState, useEffect } from 'react'
import DocPage from './DocPage'

export default function AsyncInjectedDocPage ({ templateMarkdown, injections }) {
  const [finalMarkdown, setFinalMarkdown] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    async function fetchAndInject () {
      try {
        let processedMarkdown = templateMarkdown

        // If there are no injections, just render the template
        if (!injections || Object.keys(injections).length === 0) {
          if (isMounted) {
            setFinalMarkdown(processedMarkdown)
            setIsLoading(false)
          }
          return
        }

        // Fetch all external snippets in parallel
        const fetchPromises = Object.entries(injections).map(
          async ([placeholder, url]) => {
            console.log('###', url)
            const res = await fetch(url)
            if (!res.ok)
              throw new Error(`HTTP ${res.status} when fetching ${url}`)
            const text = await res.text()
            return { placeholder, text }
          }
        )

        const results = await Promise.all(fetchPromises)

        // Inject the fetched text into the markdown
        for (const { placeholder, text } of results) {
          // .split().join() safely replaces ALL occurrences of the placeholder
          processedMarkdown = processedMarkdown.split(placeholder).join(text)
        }

        if (isMounted) {
          setFinalMarkdown(processedMarkdown)
          setIsLoading(false)
        }
      } catch (err) {
        console.log('### err', err.message)
        if (isMounted) {
          setError(err.message)
          setIsLoading(false)
        }
      }
    }

    fetchAndInject()

    return () => {
      isMounted = false
    }
  }, [templateMarkdown, injections])

  if (isLoading) {
    return (
      <div className='md-loading-state'>
        <div className='md-spinner' />
        <p>Fetching live code examples from GitHub...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='md-error-state'>
        <h3>Unable to load examples</h3>
        <p>{error}</p>
      </div>
    )
  }

  return <DocPage markdown={finalMarkdown} />
}
