import CodeEditor from './CodeEditor'
import { gradeChecks } from '../engine/progress'

export default function PracticePanel({
  challenge, done, code, setCode, activeLine, ready, running, checking, checkResult,
  onRunTests, onAnimate, onStop, onReset,
}) {
  const grade = gradeChecks(challenge, checkResult)
  const busy = running || checking
  return (
    <section className="panel">
      <div className="lesson-head">
        <h2>{challenge.title}</h2>
        <span className={'level level-' + challenge.level}>{challenge.level}</span>
        {done && <span className="done-tick">✓ solved</span>}
      </div>
      <p className="explain">{challenge.prompt}</p>

      <CodeEditor value={code} onChange={setCode} onRun={onRunTests} activeLine={activeLine} />
      <div className="row">
        <button onClick={onRunTests} disabled={!ready || busy}>
          {!ready ? 'Loading Python...' : checking ? 'Checking...' : 'Run tests'}
        </button>
        <button className="ghost" onClick={onAnimate} disabled={!ready || busy}
          title={'Animate ' + challenge.tests[0]}>
          Animate first test
        </button>
        {busy && <button className="ghost" onClick={() => onStop('Stopped by you.')}>Stop</button>}
        <button className="ghost" onClick={onReset}>Reset</button>
      </div>

      {grade && (
        <div className={'tests ' + (grade.allPass ? 'all-pass' : '')}>
          {grade.error && <div className="error">{grade.error}</div>}
          {grade.rows.map((r) => (
            <div className={'test-row ' + (r.pass ? 'pass' : 'fail')} key={r.expr}>
              <span className="test-mark">{r.pass ? '✓' : '✗'}</span>
              <code>{r.expr}</code>
              <span className="test-detail">
                {r.pass ? 'returned ' + r.got : 'expected ' + r.expected + ', got ' + r.got}
              </span>
            </div>
          ))}
          {grade.allPass && <div className="solved-msg">All tests pass. Well done!</div>}
        </div>
      )}

      <details className="more"><summary>Hint</summary><p>{challenge.hint}</p></details>
      <details className="more">
        <summary>Show a solution</summary>
        <pre className="output">{challenge.solution}</pre>
      </details>
    </section>
  )
}
