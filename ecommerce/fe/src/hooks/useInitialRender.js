import { useEffect, useState } from 'react'

export function useInitialRender(delay = 180) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsReady(true)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delay])

  return isReady
}
