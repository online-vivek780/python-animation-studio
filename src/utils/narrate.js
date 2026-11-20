export function getTop(frame) {
  return frame ? frame.stack[frame.stack.length - 1] : null
}

function describeChange(name, v, before) {
  if (v.repr === 'function') return 'Defined function ' + name
  if (v.repr === 'class') return 'Defined class ' + name
  if (v.repr === 'module') return 'Imported ' + name
  if (v.kind === 'obj') {
    if (before && before.kind === 'obj') {
      const diff = v.attrs.filter(([k, val]) => {
        const old = before.attrs.find((a) => a[0] === k)
        return !old || old[1] !== val
      })
      if (diff.length > 0) return name + '.' + diff[0][0] + ' = ' + diff[0][1]
      return name + ' changed'
    }
    if (name === 'self') return 'a new ' + v.cls + ' is being built'
    return name + ' is now a ' + v.cls
  }
  return name + ' = ' + v.repr
}

export function narrate(frames, step, codeLines, error, intro) {
  const frame = frames[step]

  if (!frame) {
    if (error) return { pose: 'confused', text: error }
    return { pose: 'neutral', text: intro }
  }

  const isLast = step === frames.length - 1
  if (isLast) {
    if (error) return { pose: 'confused', text: error }
    return {
      pose: 'happy',
      text: 'All done! Use Prev or the slider to replay any step.',
    }
  }

  const top = getTop(frame)
  const prev = step > 0 ? frames[step - 1] : null
  const prevTop = prev ? getTop(prev) : null
  const prevVars = prevTop && prevTop.name === top.name ? prevTop.vars : {}

  const upcoming = codeLines[frame.line - 1]
  const next = upcoming ? 'Next line: ' + upcoming.trim() : ''

  const printed = prev ? frame.output.slice(prev.output.length).trim() : ''
  if (printed) {
    return { pose: 'happy', text: 'It said: ' + printed + '. ' + next }
  }

  const changes = Object.entries(top.vars).filter(
    ([n, v]) => !prevVars[n] || prevVars[n].repr !== v.repr
  )

  if (changes.length > 0) {
    const shown = changes
      .slice(0, 2)
      .map(([n, v]) => describeChange(n, v, prevVars[n]))
      .join(', ')
    return { pose: 'pointing', text: 'Now ' + shown + '. ' + next }
  }

  return {
    pose: 'thinking',
    text: step === 0 ? "Let's begin! " + next : next,
  }
}
