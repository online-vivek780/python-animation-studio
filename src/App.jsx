import { useState, useEffect, useMemo, useRef } from 'react'
import { MotionConfig } from 'framer-motion'
import curriculum from './data/curriculum.js'
import dsa from './data/dsa.js'
import challenges from './data/challenges.js'
import glossary from './data/glossary.js'
import examples from './data/examples.js'
import { useRunner } from './hooks/useRunner'
import {
  loadProgress, saveProgress, clearProgress, markRan, markPredicted, markChallenge,
  isLessonDone, gradeChecks,
} from './engine/progress'
import { loadSettings, saveSettings } from './engine/settings'
import Sidebar from './components/Sidebar'
import LessonPanel from './components/LessonPanel'
import PracticePanel from './components/PracticePanel'
import CodeEditor from './components/CodeEditor'
import AnimationPanel from './components/AnimationPanel'
import { ProgressPage, GlossaryPage, SettingsPage } from './components/Pages'
import './App.css'
import './app-extra.css'
import './final.css'

const TABS = [
  ['learn', 'Learn Python'],
  ['dsa', 'Data structures'],
  ['practice', 'Practice'],
  ['playground', 'Playground'],
  ['glossary', 'Glossary'],
  ['progress', 'Progress'],
  ['settings', 'Settings'],
]
const WORKSPACE = ['learn', 'dsa', 'practice', 'playground']

const lessonIndex = {}
for (const m of [...curriculum, ...dsa]) for (const l of m.lessons) lessonIndex[l.id] = l
const challengeIndex = Object.fromEntries(challenges.map((c) => [c.id, c]))
const exampleIndex = Object.fromEntries(examples.map((e) => [e.id, e]))

export default function App() {
  const [mode, setMode] = useState('learn')
  const [selected, setSelected] = useState({
    learn: curriculum[0].lessons[0].id,
    dsa: dsa[0].lessons[0].id,
    practice: challenges[0].id,
    playground: examples[0].id,
  })
  const [edits, setEdits] = useState({})
  const [query, setQuery] = useState('')
  const [activeLine, setActiveLine] = useState(null)
  const [predictStates, setPredictStates] = useState({})
  const [progress, setProgress] = useState(() => loadProgress())
  const [settings, setSettings] = useState(() => loadSettings())
  const runner = useRunner()

  const id = selected[mode]
  const lesson = mode === 'learn' || mode === 'dsa' ? lessonIndex[id] : null
  const challenge = mode === 'practice' ? challengeIndex[id] : null
  const example = mode === 'playground' ? exampleIndex[id] : null

  const defaultCode = lesson ? lesson.code : challenge ? challenge.starter : example ? example.code : ''
  const editKey = mode + ':' + id
  const code = edits[editKey] !== undefined ? edits[editKey] : defaultCode
  const setCode = (v) => setEdits((e) => ({ ...e, [editKey]: v }))
  const resetCode = () => setEdits((e) => { const n = { ...e }; delete n[editKey]; return n })

  function updateProgress(fn) {
    setProgress((p) => {
      const n = fn(p)
      saveProgress(n)
      return n
    })
  }
  function updateSettings(patch) {
    setSettings((s) => {
      const n = { ...s, ...patch }
      saveSettings(n)
      return n
    })
  }

  function go(nextMode) {
    if (nextMode === mode) return
    setMode(nextMode)
    setQuery('')
    runner.clear()
    setActiveLine(null)
  }
  function choose(nextId) {
    setSelected((s) => ({ ...s, [mode]: nextId }))
    runner.clear()
    setActiveLine(null)
  }

  // a finished successful run counts for the lesson that was on screen
  const idRef = useRef({ mode, id })
  idRef.current = { mode, id }
  useEffect(() => {
    const cur = idRef.current
    if (runner.finished.n > 0 && runner.finished.ok && (cur.mode === 'learn' || cur.mode === 'dsa')) {
      updateProgress((p) => markRan(p, cur.id))
    }
  }, [runner.finished])

  // a challenge is solved when every test passes
  useEffect(() => {
    if (!challenge || !runner.checkResult) return
    const g = gradeChecks(challenge, runner.checkResult)
    if (g && g.allPass) updateProgress((p) => markChallenge(p, challenge.id))
  }, [runner.checkResult])

  const groups = useMemo(() => {
    if (mode === 'learn' || mode === 'dsa') {
      return (mode === 'learn' ? curriculum : dsa).map((m) => ({
        id: m.id,
        title: m.title,
        items: m.lessons.map((l) => ({ id: l.id, title: l.title, done: isLessonDone(progress, l) })),
      }))
    }
    if (mode === 'practice') {
      return [{ id: 'c', title: 'Challenges', items: challenges.map((c) => ({ id: c.id, title: c.title, done: !!progress.challenges[c.id] })) }]
    }
    return [{ id: 'e', title: 'Examples', items: examples.map((e) => ({ id: e.id, title: e.title, done: false })) }]
  }, [mode, progress])

  const predictState = lesson && (predictStates[lesson.id] || (progress.predicted[lesson.id] ? { answered: true } : null))
  const view = lesson && lesson.view ? lesson.view : 'hybrid'
  const intro =
    mode === 'playground'
      ? 'Write any Python program and press Run. I will turn it into a story.'
      : mode === 'practice'
        ? 'Write your solution, run the tests, or animate the first test to see it work.'
        : 'Hi! Press Run and I will explain every step.'

  function run() {
    runner.run(code)
  }
  function runTests() {
    runner.check(code, challenge.tests)
  }
  function animateFirst() {
    runner.run(code + '\nprint(' + challenge.tests[0] + ')')
  }

  const workspace = WORKSPACE.includes(mode)

  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <nav className="topnav" aria-label="Main">
          <span className="brand">Python Animation Studio</span>
          {TABS.map(([key, label]) => (
            <button key={key} className={key === mode ? 'active' : ''} onClick={() => go(key)}>{label}</button>
          ))}
        </nav>

        {workspace && (
          <div className="app">
            <aside className="sidebar">
              <Sidebar
                title={mode === 'learn' ? 'Chapters' : mode === 'dsa' ? 'Topics' : mode === 'practice' ? 'Practice' : 'Examples'}
                groups={groups}
                selectedId={id}
                onSelect={choose}
                query={query}
                onQuery={setQuery}
                searchable={mode !== 'playground' && mode !== 'practice'}
              />
            </aside>

            {lesson && (
              <LessonPanel
                lesson={lesson}
                kind={mode}
                done={isLessonDone(progress, lesson)}
                code={code}
                setCode={setCode}
                activeLine={activeLine}
                onRun={run}
                onStop={runner.stop}
                onReset={resetCode}
                ready={runner.ready}
                running={runner.running}
                predictState={predictState}
                onAnswer={(correct) => {
                  setPredictStates((s) => ({ ...s, [lesson.id]: { answered: true, correct } }))
                  updateProgress((p) => markPredicted(p, lesson.id, correct))
                }}
                onSkip={() => {
                  setPredictStates((s) => ({ ...s, [lesson.id]: { skipped: true } }))
                  updateProgress((p) => markPredicted(p, lesson.id, false))
                }}
              />
            )}

            {challenge && (
              <PracticePanel
                challenge={challenge}
                done={!!progress.challenges[challenge.id]}
                code={code}
                setCode={setCode}
                activeLine={activeLine}
                ready={runner.ready}
                running={runner.running}
                checking={runner.checking}
                checkResult={runner.checkResult}
                onRunTests={runTests}
                onAnimate={animateFirst}
                onStop={runner.stop}
                onReset={resetCode}
              />
            )}

            {mode === 'playground' && (
              <section className="panel">
                <h2>Python Playground</h2>
                <p className="hint">
                  Write your own program, or load an example. Classes, lists, loops, conditions and
                  functions can all be mixed. The animation is built from what Python really does.
                </p>
                <CodeEditor value={code} onChange={setCode} onRun={run} activeLine={activeLine} />
                <div className="row">
                  <button onClick={run} disabled={!runner.ready || runner.running}>
                    {!runner.ready ? 'Loading Python...' : runner.running ? 'Running...' : 'Run'}
                  </button>
                  {runner.running && <button className="ghost" onClick={() => runner.stop('Stopped by you.')}>Stop</button>}
                  <button className="ghost" onClick={resetCode}>Reset</button>
                  <button className="ghost" onClick={() => setCode('')}>Clear</button>
                  <span className="shortcut">Ctrl+Enter to run</span>
                </div>
              </section>
            )}

            <AnimationPanel
              frames={runner.frames}
              error={runner.error}
              tracedCode={runner.tracedCode}
              code={code}
              view={view}
              params={lesson ? lesson.params : undefined}
              settings={settings}
              onSettings={updateSettings}
              intro={intro}
              onLine={setActiveLine}
            />
          </div>
        )}

        {mode === 'glossary' && <GlossaryPage glossary={glossary} />}
        {mode === 'progress' && (
          <ProgressPage
            progress={progress}
            learn={curriculum}
            dsa={dsa}
            challenges={challenges}
            onClear={() => setProgress(clearProgress())}
          />
        )}
        {mode === 'settings' && <SettingsPage settings={settings} onSettings={updateSettings} />}
      </div>
    </MotionConfig>
  )
}
