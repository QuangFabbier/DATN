import { useEffect, useRef, useState } from 'react'
import { ToastContext } from './ToastContext'

const TOAST_DURATION = 3200

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timeoutMapRef = useRef(new Map())
  const toastCounterRef = useRef(0)

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current

    return () => {
      timeoutMap.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeoutMap.clear()
    }
  }, [])

  function dismissToast(toastId) {
    const timeoutId = timeoutMapRef.current.get(toastId)

    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutMapRef.current.delete(toastId)
    }

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
  }

  function showToast({
    type = 'info',
    title = '',
    message = '',
    duration = TOAST_DURATION,
  }) {
    toastCounterRef.current += 1
    const toastId = `toast-${toastCounterRef.current}`
    const nextToast = {
      id: toastId,
      type,
      title,
      message,
    }

    setToasts((currentToasts) => [...currentToasts, nextToast])

    const timeoutId = window.setTimeout(() => {
      dismissToast(toastId)
    }, duration)

    timeoutMapRef.current.set(toastId, timeoutId)
    return toastId
  }

  return (
    <ToastContext.Provider value={{ dismissToast, showToast, toasts }}>
      {children}

      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <div className="toast-icon" aria-hidden="true">
              <i
                className={
                  toast.type === 'success'
                    ? 'fa-solid fa-circle-check'
                    : toast.type === 'error'
                      ? 'fa-solid fa-circle-xmark'
                      : toast.type === 'warning'
                        ? 'fa-solid fa-triangle-exclamation'
                        : 'fa-solid fa-circle-info'
                }
              />
            </div>

            <div className="toast-content">
              {toast.title ? <strong>{toast.title}</strong> : null}
              {toast.message ? <p>{toast.message}</p> : null}
            </div>

            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Đóng thông báo"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
