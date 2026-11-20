let pyodideReady = null

try {
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js')

  pyodideReady = loadPyodide().then((py) => {
    postMessage({ type: 'ready' })
    return py
  })

  pyodideReady.catch((e) => {
    postMessage({ type: 'fatal', message: String(e.message || e) })
  })
} catch (e) {
  postMessage({ type: 'fatal', message: String(e.message || e) })
}

self.onmessage = async (event) => {
  const { type, code, tracer, exprs } = event.data
  if (!pyodideReady) return
  if (type !== 'trace' && type !== 'check') return

  const py = await pyodideReady
  try {
    py.runPython(tracer)
    py.globals.set('user_code', code)

    if (type === 'trace') {
      const json = py.runPython('run_trace(user_code)')
      postMessage({ type: 'trace_result', data: JSON.parse(json) })
    } else {
      py.globals.set('check_exprs', py.toPy(exprs))
      const json = py.runPython('run_checks(user_code, list(check_exprs))')
      postMessage({ type: 'check_result', data: JSON.parse(json) })
    }
  } catch (e) {
    const message = String(e.message || e)
    if (type === 'trace') {
      postMessage({ type: 'trace_result', data: { frames: [], error: message } })
    } else {
      postMessage({ type: 'check_result', data: { error: message, results: [] } })
    }
  }
}
