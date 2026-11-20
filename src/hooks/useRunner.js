import { useState, useEffect, useRef, useCallback } from 'react'
import tracerSource from '../tracer.py?raw'

const TIME_LIMIT_MS = 20000

// Owns the Python worker: loading, tracing a program, checking a challenge,
// stopping it, and a time limit. Python only runs inside the browser.
export function useRunner() {
  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [checking, setChecking] = useState(false)
  const [frames, setFrames] = useState([])
  const [error, setError] = useState(null)
  const [tracedCode, setTracedCode] = useState('')
  const [finished, setFinished] = useState({ n: 0, ok: false })
  const [checkResult, setCheckResult] = useState(null)
  const workerRef = useRef(null)
  const timerRef = useRef(null)
  const busyRef = useRef(false)

  const startWorker = useCallback(() => {
    const worker = new Worker(new URL('../pyodide.worker.js', import.meta.url))
    workerRef.current = worker
    busyRef.current = false
    setReady(false)

    worker.onmessage = (event) => {
      const msg = event.data
      if (msg.type === 'ready') setReady(true)
      if (msg.type === 'fatal') setError('Python failed to load: ' + msg.message)
      if (msg.type === 'trace_result') {
        clearTimeout(timerRef.current)
        busyRef.current = false
        setFrames(msg.data.frames)
        setError(msg.data.error)
        setRunning(false)
        setFinished((f) => ({ n: f.n + 1, ok: !msg.data.error }))
      }
      if (msg.type === 'check_result') {
        clearTimeout(timerRef.current)
        busyRef.current = false
        setCheckResult(msg.data)
        setChecking(false)
      }
    }
  }, [])

  useEffect(() => {
    startWorker()
    return () => {
      clearTimeout(timerRef.current)
      if (workerRef.current) workerRef.current.terminate()
    }
  }, [startWorker])

  // The only way to interrupt Python is to throw its worker away and start
  // a new one. Python reloads from the browser cache.
  const stop = useCallback(
    (message) => {
      clearTimeout(timerRef.current)
      if (workerRef.current) workerRef.current.terminate()
      setRunning(false)
      setChecking(false)
      setFrames([])
      setError(message || 'Stopped.')
      startWorker()
    },
    [startWorker]
  )

  const guard = useCallback(() => {
    timerRef.current = setTimeout(
      () => stop('Stopped: the program ran for more than 20 seconds.'),
      TIME_LIMIT_MS
    )
  }, [stop])

  const run = useCallback(
    (code) => {
      if (!ready || busyRef.current) return
      busyRef.current = true
      setRunning(true)
      setError(null)
      setFrames([])
      setTracedCode(code)
      clearTimeout(timerRef.current)
      guard()
      workerRef.current.postMessage({ type: 'trace', code, tracer: tracerSource })
    },
    [ready, guard]
  )

  const check = useCallback(
    (code, exprs) => {
      if (!ready || busyRef.current) return
      busyRef.current = true
      setChecking(true)
      setCheckResult(null)
      clearTimeout(timerRef.current)
      guard()
      workerRef.current.postMessage({ type: 'check', code, tracer: tracerSource, exprs })
    },
    [ready, guard]
  )

  const clear = useCallback(() => {
    setFrames([])
    setError(null)
    setTracedCode('')
    setCheckResult(null)
  }, [])

  return { ready, running, checking, frames, error, tracedCode, finished, checkResult, run, check, stop, clear }
}
