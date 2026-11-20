// Learning progress. Everything here is a pure function, so it is easy to test;
// storage.js decides where the data is kept (the browser, no server).
import { loadJSON, saveJSON, removeKey } from './storage.js'

export const PROGRESS_KEY = 'pyviz.progress.v1'

export function emptyProgress() {
  return { ran: {}, predicted: {}, correct: {}, challenges: {} }
}

function clean(p) {
  const base = emptyProgress()
  if (!p || typeof p !== 'object') return base
  for (const k of Object.keys(base)) {
    if (p[k] && typeof p[k] === 'object') base[k] = { ...p[k] }
  }
  return base
}

export function loadProgress(storage) {
  return clean(loadJSON(PROGRESS_KEY, null, storage))
}
export function saveProgress(p, storage) {
  return saveJSON(PROGRESS_KEY, p, storage)
}
export function clearProgress(storage) {
  removeKey(PROGRESS_KEY, storage)
  return emptyProgress()
}

export const markRan = (p, id) => ({ ...p, ran: { ...p.ran, [id]: true } })
export const markPredicted = (p, id, correct) => ({
  ...p,
  predicted: { ...p.predicted, [id]: true },
  correct: correct ? { ...p.correct, [id]: true } : p.correct,
})
export const markChallenge = (p, id) => ({ ...p, challenges: { ...p.challenges, [id]: true } })

// A lesson is done once its example was run and, if it has a prediction,
// the learner answered or skipped it.
export function isLessonDone(p, lesson) {
  return !!p.ran[lesson.id] && (!lesson.predict || !!p.predicted[lesson.id])
}

export function moduleStats(p, mod) {
  const done = mod.lessons.filter((l) => isLessonDone(p, l)).length
  return { done, total: mod.lessons.length }
}

export function overall(p, modules) {
  let done = 0
  let total = 0
  for (const m of modules) {
    const s = moduleStats(p, m)
    done += s.done
    total += s.total
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

export function badgesFor(p, { learn, dsa, challenges }) {
  const learnDone = overall(p, learn).done
  const dsaDone = overall(p, dsa).done
  const challengeDone = challenges.filter((c) => p.challenges[c.id]).length
  const rightGuesses = Object.keys(p.correct).length
  const moduleComplete = [...learn, ...dsa].some((m) => {
    const s = moduleStats(p, m)
    return s.total > 0 && s.done === s.total
  })
  return [
    { id: 'first-run', title: 'First run', text: 'Ran your first program', earned: Object.keys(p.ran).length > 0 },
    { id: 'five-lessons', title: 'Getting going', text: 'Completed 5 lessons', earned: learnDone >= 5 },
    { id: 'module', title: 'Module master', text: 'Completed a whole module', earned: moduleComplete },
    { id: 'predictor', title: 'Fortune teller', text: 'Predicted 3 outputs correctly', earned: rightGuesses >= 3 },
    { id: 'challenger', title: 'Challenger', text: 'Solved a practice challenge', earned: challengeDone >= 1 },
    { id: 'all-challenges', title: 'Challenge champion', text: 'Solved every challenge', earned: challenges.length > 0 && challengeDone === challenges.length },
    { id: 'dsa', title: 'Algorithm explorer', text: 'Completed a data structures lesson', earned: dsaDone >= 1 },
    { id: 'half', title: 'Halfway there', text: 'Completed half of the lessons', earned: overall(p, learn).percent >= 50 },
  ]
}

// "What will it print?" answers ignore extra spaces at the ends of lines.
export function normalizeAnswer(s) {
  return String(s)
    .replace(/\r/g, '')
    .trim()
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .join('\n')
}
export function sameAnswer(a, b) {
  return normalizeAnswer(a) === normalizeAnswer(b)
}

// Compare what a learner's code returned with what each challenge test expects.
export function gradeChecks(challenge, result) {
  if (!result) return null
  if (result.error) return { error: result.error, rows: [], allPass: false }
  const rows = challenge.tests.map((expr, i) => {
    const r = result.results[i] || {}
    return {
      expr,
      expected: challenge.expected[i],
      got: r.error ? r.error : r.value,
      pass: !r.error && r.value === challenge.expected[i],
    }
  })
  return { error: null, rows, allPass: rows.length > 0 && rows.every((r) => r.pass) }
}
