import { useState, useEffect, useMemo } from 'react'
import { buildBeats, stepInto, stepOver, stepOut, narrateBeat } from '../engine/timeline'
import { narrate } from '../utils/narrate'
import { SPEEDS } from '../engine/settings'
import Owl from './Owl'
import HybridScene from './HybridScene'
import DsaScene from './DsaScene'

// The right-hand panel: owl, player controls, the code with its current line,
// the scene, and the Python output. It plays whatever frames it is given.
export default function AnimationPanel({
  frames, error, tracedCode, code, view = 'hybrid', params, settings, onSettings, intro, onLine,
}) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const steps = useMemo(() => buildBeats(frames), [frames])

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [frames])

  useEffect(() => {
    if (!playing) return
    if (step >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setStep((s) => s + 1), 900 / settings.speed)
    return () => clearTimeout(id)
  }, [playing, step, steps.length, settings.speed])

  const cur = steps[step]
  const frame = cur ? frames[cur.frame] : null
  const isLast = step === steps.length - 1
  const lines = tracedCode.split('\n')

  const owl = cur
    ? narrateBeat(cur, lines, isLast, error)
    : narrate([], 0, lines, error, intro)

  useEffect(() => {
    if (onLine) onLine(cur && tracedCode === code ? cur.line : null)
  }, [cur, tracedCode, code, onLine])

  // optional spoken narration (browser text-to-speech, no service needed)
  useEffect(() => {
    if (!settings.speak || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    if (owl.text) window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(owl.text))
    return () => window.speechSynthesis.cancel()
  }, [owl.text, settings.speak])

  function sayAgain() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(owl.text))
  }

  return (
    <section className="panel">
      <h2>Animation</h2>
      <Owl pose={owl.pose} text={owl.text} />
      {settings.speak && (
        <button className="ghost small" onClick={sayAgain}>Say it again</button>
      )}

      {error && frames.length > 0 && (
        <pre className="output"><span className="error">{error}</span></pre>
      )}

      {cur && frame && (
        <>
          <div className="controls">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Prev</button>
            <button onClick={() => setPlaying((p) => !p)} disabled={isLast}>{playing ? 'Pause' : 'Play'}</button>
            <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={isLast}>Next</button>
            <button className="stepper" onClick={() => setStep(stepInto(steps, step))} disabled={isLast}
              title="Go to the next line, even inside a function">Step Into</button>
            <button className="stepper" onClick={() => setStep(stepOver(steps, step))} disabled={isLast}
              title="Run the whole line, including any function it calls">Step Over</button>
            <button className="stepper" onClick={() => setStep(stepOut(steps, step))} disabled={isLast || cur.depth === 0}
              title="Finish the current function">Step Out</button>
            <button onClick={() => { setPlaying(false); setStep(0) }} disabled={step === 0}>Restart</button>
            <input type="range" min={0} max={steps.length - 1} value={step}
              onChange={(e) => setStep(Number(e.target.value))} aria-label="Animation timeline" />
            <span className="muted">{step + 1} / {steps.length}</span>
            <select value={settings.speed} onChange={(e) => onSettings({ speed: Number(e.target.value) })}
              aria-label="Playback speed">
              {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>

          <div className="codeview">
            {lines.map((text, i) => (
              <div key={i} className={'codeline' + (cur.line === i + 1 ? ' current' : '')}>
                <span className="lineno">{i + 1}</span>
                {text}
              </div>
            ))}
          </div>

          <p className="muted">Call stack: {frame.stack.map((s) => s.name).join(' → ')}</p>

          {view === 'hybrid' ? (
            <HybridScene world={cur.world} event={cur.event} camera={settings.camera} />
          ) : (
            <DsaScene world={cur.world} event={cur.event} view={view} params={params} />
          )}

          <h3 className="console-title">Python output</h3>
          <pre className="output">{frame.output}</pre>
        </>
      )}
    </section>
  )
}
