import React, { useEffect, useRef, useState } from 'react'

// Wraps the hero and the call story: the glossy V travels between their
// logo slots. Until it is ready - and for visitors who prefer less motion,
// or whose browser has no WebGL - the slots show the flat logo.
export default function LogoJourney ({ children }) {
  const wrap = useRef(null)
  const flight = useRef(null)
  const canvas = useRef(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let stopped = false
    let stop = () => {}
    import('./logo3d')
      .then(({ startLogo }) => {
        if (stopped) return
        stop = startLogo({
          wrap: wrap.current,
          flight: flight.current,
          canvas: canvas.current,
          onReady: () => setLive(true)
        })
      })
      .catch(() => {}) // no WebGL: the flat logo stays
    return () => {
      stopped = true
      stop()
    }
  }, [])

  return (
    <div ref={wrap} className={live ? 'logo-journey is-live' : 'logo-journey'}>
      {children}
      <div ref={flight} className='logo-flight' aria-hidden='true'>
        <span className='logo-floor' />
        <canvas ref={canvas} className='logo-canvas' />
      </div>
    </div>
  )
}
