import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

function ProgressBar() {
  const location = useLocation()
  const rafRef = useRef(0)
  const hideTimeoutRef = useRef(0)
  const startTimestampRef = useRef(0)
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const isInitialMountRef = useRef(true)

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return undefined
    }

    window.cancelAnimationFrame(rafRef.current)
    window.clearTimeout(hideTimeoutRef.current)

    setIsVisible(true)
    setProgress(10)
    startTimestampRef.current = performance.now()

    const animate = (timestamp) => {
      const elapsed = timestamp - startTimestampRef.current
      const easedProgress = Math.min(92, 10 + elapsed / 9.5)

      setProgress((currentProgress) => Math.max(currentProgress, easedProgress))

      if (easedProgress < 92) {
        rafRef.current = window.requestAnimationFrame(animate)
      }
    }

    rafRef.current = window.requestAnimationFrame(animate)

    hideTimeoutRef.current = window.setTimeout(() => {
      window.cancelAnimationFrame(rafRef.current)
      setProgress(100)

      hideTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 260)
    }, 340)

    return () => {
      window.cancelAnimationFrame(rafRef.current)
      window.clearTimeout(hideTimeoutRef.current)
    }
  }, [location.pathname, location.search])

  if (!isVisible && progress === 0) {
    return null
  }

  return (
    <div className="progress-bar-container" aria-hidden="true">
      <div
        className={`progress-bar ${isVisible ? 'visible' : ''}`}
        style={{
          transform: `scaleX(${progress / 100})`,
        }}
      />
    </div>
  )
}

function TopProgressBar() {
  return <ProgressBar />
}

export { ProgressBar, TopProgressBar }
