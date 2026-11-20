// Small helpers that make a plain textarea behave like a code editor.
// They are pure functions, so they can be tested without a browser.

export const INDENT = '    '

function lineStart(value, pos) {
  return value.lastIndexOf('\n', pos - 1) + 1
}

// Tab inserts four spaces. With a multi-line selection (or Shift+Tab)
// it indents or un-indents every selected line.
export function handleTab(value, start, end, shift) {
  const multi = value.slice(start, end).includes('\n')
  if (!shift && !multi) {
    return {
      value: value.slice(0, start) + INDENT + value.slice(end),
      start: start + INDENT.length,
      end: start + INDENT.length,
    }
  }

  const from = lineStart(value, start)
  const lines = value.slice(from, end).split('\n')
  let removedFirst = 0
  let delta = 0
  const changed = lines.map((line, i) => {
    if (!shift) {
      delta += INDENT.length
      return INDENT + line
    }
    const m = line.match(/^ {1,4}/)
    const n = m ? m[0].length : 0
    if (i === 0) removedFirst = n
    delta -= n
    return line.slice(n)
  })

  const newText = value.slice(0, from) + changed.join('\n') + value.slice(end)
  const newStart = shift
    ? Math.max(from, start - removedFirst)
    : start + INDENT.length
  return { value: newText, start: newStart, end: end + delta }
}

// Enter keeps the current indentation, and adds one level after a colon.
export function handleEnter(value, start, end) {
  const from = lineStart(value, start)
  const before = value.slice(from, start)
  const indent = before.match(/^[ \t]*/)[0]
  const extra = before.trimEnd().endsWith(':') ? INDENT : ''
  const insert = '\n' + indent + extra
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    start: start + insert.length,
    end: start + insert.length,
  }
}
