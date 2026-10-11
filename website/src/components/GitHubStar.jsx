import React, { useCallback, useEffect, useRef, useState } from 'react'

// The star button of the navbar. A site cannot star a repository for its
// visitor - that takes a GitHub sign-in - so the button takes the visitor to
// GitHub, and thanks them when they come back: a burst of stars, and the
// count read again from GitHub's public API.

const REPO = 'heisenware/vrpc-js'
const URL = `https://github.com/${REPO}`
const API = `https://api.github.com/repos/${REPO}`
const CACHE = 'vrpc-stars'
const CACHE_MS = 30 * 60 * 1000 // the API allows a visitor 60 requests an hour
const THANKS_MS = 2600
const BURST = 8

function cached () {
  try {
    const { count, at } = JSON.parse(window.localStorage.getItem(CACHE))
    return Date.now() - at < CACHE_MS ? count : null
  } catch {
    return null
  }
}

async function fetchStars () {
  const res = await fetch(API, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  const count = (await res.json()).stargazers_count
  try {
    window.localStorage.setItem(CACHE, JSON.stringify({ count, at: Date.now() }))
  } catch {}
  return count
}

const short = n => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))

function GitHubMark () {
  return (
    <svg className='star-button__mark' viewBox='0 0 16 16' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'
      />
    </svg>
  )
}

export default function GitHubStar ({ mobile }) {
  const [stars, setStars] = useState(null)
  const [thanks, setThanks] = useState(0) // counts up per thank-you, restarting the animation
  const [showing, setShowing] = useState(false)
  const pending = useRef(false)
  const timer = useRef(0)

  useEffect(() => {
    const known = cached()
    if (known !== null) setStars(known)
    else fetchStars().then(setStars, () => {}) // no count: the button works without
  }, [])

  const celebrate = useCallback(() => {
    pending.current = false
    setThanks(n => n + 1)
    setShowing(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShowing(false), THANKS_MS)
    fetchStars().then(setStars, () => {})
  }, [])

  // back from GitHub: thank them
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.current) celebrate()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(timer.current)
    }
  }, [celebrate])

  const onClick = () => {
    pending.current = true
    // GitHub opened in a background tab: the page is still here, thank them now
    setTimeout(() => {
      if (pending.current && document.visibilityState === 'visible') celebrate()
    }, 600)
  }

  const label = stars === null ? 'Star vrpc-js on GitHub' : `Star vrpc-js on GitHub (${stars} stars)`

  if (mobile) {
    return (
      <li className='menu__list-item'>
        <a className='menu__link' href={URL} target='_blank' rel='noopener noreferrer' onClick={onClick}>
          Star on GitHub{stars !== null && ` · ${short(stars)}`}
        </a>
      </li>
    )
  }

  return (
    <a
      className={showing ? 'star-button is-thanked' : 'star-button'}
      href={URL}
      target='_blank'
      rel='noopener noreferrer'
      onClick={onClick}
      aria-label={label}
      title='Star vrpc-js on GitHub'
    >
      <GitHubMark />
      <span className='star-button__icon' aria-hidden='true'>
        <span className='star-button__star'>★</span>
        {showing && (
          <span key={thanks} className='star-burst'>
            {Array.from({ length: BURST }, (_, i) => (
              <span key={i} style={{ '--angle': `${(360 / BURST) * i + 22}deg` }}>★</span>
            ))}
          </span>
        )}
      </span>
      <span className='star-button__label'>Star</span>
      {stars !== null && <span className='star-button__count'>{short(stars)}</span>}
      {showing && (
        <span key={`t${thanks}`} className='star-thanks' role='status'>
          Thank you!
        </span>
      )}
    </a>
  )
}
