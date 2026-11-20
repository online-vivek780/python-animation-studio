// The timeline turns the tracer's frames into "beats".
// A beat is either a line becoming the current line, or one event
// that line caused. Every beat has its own world snapshot, so the
// player can step through an event at a time and go back exactly.

import { emptyWorld, apply } from './world.js'
import { narrateEvent } from './narrateEvents.js'

export function buildBeats(frames) {
  const beats = []
  let work = emptyWorld()

  frames.forEach((frame, k) => {
    const events = frame.events || []
    const prevLine = k > 0 ? frames[k - 1].line : null

    for (let j = 0; j < events.length; j++) {
      const e = events[j]
      work = structuredClone(work)
      try {
        apply(work, e)
      } catch (err) {
        // one bad event must never break the whole animation
      }
      // events with nothing to say still change the world,
      // they just do not get a step of their own
      if (narrateEvent(work, e, events)) {
        beats.push({
          type: 'event',
          frame: k,
          eventIndex: j,
          event: e,
          events,
          line: e.line || prevLine,
          depth: work.callStack.length,
          world: work,
        })
      }
    }

    work = structuredClone(work)
    work.speech = null
    work.returned = null
    work.condition = null
    work.handled = null
    beats.push({
      type: 'line',
      frame: k,
      eventIndex: -1,
      event: null,
      events,
      line: frame.line,
      depth: work.callStack.length,
      world: work,
    })
  })
  return beats
}

// Step Into: the next line, wherever it is.
export function stepInto(beats, i) {
  for (let j = i + 1; j < beats.length; j++) {
    if (beats[j].type === 'line') return j
  }
  return beats.length - 1
}

// Step Over: the next line at the same depth or shallower.
export function stepOver(beats, i) {
  const d = beats[i].depth
  for (let j = i + 1; j < beats.length; j++) {
    if (beats[j].type === 'line' && beats[j].depth <= d) return j
  }
  return beats.length - 1
}

// Step Out: the next line after the current function has returned.
export function stepOut(beats, i) {
  const d = beats[i].depth
  if (d === 0) return beats.length - 1
  for (let j = i + 1; j < beats.length; j++) {
    if (beats[j].type === 'line' && beats[j].depth < d) return j
  }
  return beats.length - 1
}

// Text for the owl at a given beat.
export function narrateBeat(beat, codeLines, isLast, error) {
  if (beat.type === 'event') {
    const n = narrateEvent(beat.world, beat.event, beat.events)
    if (n) return n
  }
  if (isLast) {
    if (error) return { pose: 'confused', text: 'The program ended with an error: ' + error }
    return { pose: 'happy', text: 'All done! Use Prev or the slider to replay any step.' }
  }
  const code = beat.line ? codeLines[beat.line - 1] : null
  const next = code ? 'Next line: ' + code.trim() : 'Python is working.'
  return { pose: 'thinking', text: beat.frame === 0 ? "Let's begin! " + next : next }
}
