import { useEffect, useRef, useState } from 'react'

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid'

export function useJsonBinKeyValidation(key: string): {
  status: ValidationStatus
  message: string
} {
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (!key.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle')
      setMessage('')
      return
    }

    setStatus('checking')

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch('https://api.jsonbin.io/v3/c', {
          headers: { 'X-Master-Key': key },
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setStatus('valid')
          setMessage('')
        } else {
          setStatus('invalid')
          setMessage(data.message || 'Invalid key.')
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setStatus('invalid')
          setMessage('Could not reach JSONBin. Check your connection.')
        }
      }
    }, 600)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [key])

  return { status, message }
}
