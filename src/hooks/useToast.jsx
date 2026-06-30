import { useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

export function useToast() {
  const [toast, setToast] = useState(null)

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 4000)
  }

  return { toast, showToast }
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div
      className={`toast${toast.isError ? ' toast-error' : ' toast-success'}`}
      role="status"
      aria-live="polite"
    >
      {toast.isError
        ? <AlertCircle size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        : <CheckCircle size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      }
      {toast.msg}
    </div>
  )
}
