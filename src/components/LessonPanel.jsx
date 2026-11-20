import { useState, useEffect } from 'react'
import CodeEditor from './CodeEditor'
import { sameAnswer } from '../engine/progress'

// "What will it print?" before the animation runs.
function PredictQuiz({ lesson, state, onAnswer, onSkip }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    setText('')
    setResult(null)
  }, [lesson.id])

  const answered = state && state.answered
  const shown = result || (answered ? { correct: state.correct } : null)

  function check() {
    const correct = sameAnswer(text, lesson.predict.answer)
    setResult({ correct })
    onAnswer(correct)
  }

  return (
    <div className="quiz">
      <div className="quiz-title">Predict the output</div>
      <p className="quiz-q">{lesson.predict.question}</p>
      {!shown && !(state && state.skipped) && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(6, lesson.predict.answer.split('\n').length + 1)}
            placeholder="Type what you think it prints, one line per line"
            aria-label="Your prediction"
          />
          <div className="row">
            <button onClick={check} disabled={!text.trim()}>Check</button>
            <button className="ghost" onClick={onSkip}>Skip</button>
          </div>
        </>
      )}
      {shown && (
        <div className={'quiz-result ' + (shown.correct ? 'right' : 'wrong')}>
          <b>{shown.correct ? 'Correct!' : 'Not quite.'}</b> The program prints:
          <pre>{lesson.predict.answer}</pre>
          Now press Run and watch how Python gets there.
        </div>
      )}
      {state && state.skipped && !shown && (
        <div className="muted">Skipped. Press Run to see the output.</div>
      )}
    </div>
  )
}

export default function LessonPanel({
  lesson, kind, done, code, setCode, activeLine, onRun, onStop, onReset,
  ready, running, predictState, onAnswer, onSkip,
}) {
  const needsPrediction =
    !!lesson.predict && !(predictState && (predictState.answered || predictState.skipped)) && code === lesson.code

  return (
    <section className="panel">
      <div className="lesson-head">
        <h2>{lesson.title}</h2>
        <span className={'level level-' + lesson.level}>{lesson.level}</span>
        {done && <span className="done-tick" title="Completed">✓ done</span>}
      </div>

      <div className="objectives">
        <b>You will learn</b>
        <ul>{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>
      <p className="analogy"><b>Think of it like this:</b> {lesson.analogy}</p>
      <p className="explain">{lesson.explain}</p>
      {lesson.complexity && (
        <p className="complexity">
          Time: <b>{lesson.complexity.time}</b> &nbsp;·&nbsp; Space: <b>{lesson.complexity.space}</b>
        </p>
      )}

      {lesson.predict && (
        <PredictQuiz lesson={lesson} state={predictState} onAnswer={onAnswer} onSkip={onSkip} />
      )}

      <CodeEditor value={code} onChange={setCode} onRun={onRun} activeLine={activeLine} />
      <div className="row">
        <button onClick={onRun} disabled={!ready || running || needsPrediction}>
          {!ready ? 'Loading Python...' : running ? 'Running...' : needsPrediction ? 'Predict first' : 'Run'}
        </button>
        {running && <button className="ghost" onClick={() => onStop('Stopped by you.')}>Stop</button>}
        <button className="ghost" onClick={onReset}>Reset</button>
        <span className="shortcut">Ctrl+Enter to run</span>
      </div>
      <p className="hint">Edit the code and run it again to experiment.</p>

      <details className="more">
        <summary>Key points</summary>
        <ul>{lesson.points.map((p) => <li key={p}>{p}</li>)}</ul>
      </details>
      <details className="more">
        <summary>Common mistakes</summary>
        <ul>{lesson.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
      </details>
    </section>
  )
}
