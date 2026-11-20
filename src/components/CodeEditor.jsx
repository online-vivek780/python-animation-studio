import { useRef, useLayoutEffect } from 'react'
import { handleTab, handleEnter } from '../engine/editing'
import './editor.css'

// A plain textarea with the basics of a code editor: line numbers,
// Tab and Shift+Tab indentation, auto-indent after a colon, and
// Ctrl+Enter to run. activeLine highlights the line being animated.
export default function CodeEditor({ value, onChange, onRun, activeLine }) {
  const areaRef = useRef(null)
  const gutterRef = useRef(null)
  const pending = useRef(null)

  useLayoutEffect(() => {
    if (pending.current && areaRef.current) {
      areaRef.current.setSelectionRange(pending.current.start, pending.current.end)
      pending.current = null
    }
  }, [value])

  function apply(result) {
    pending.current = { start: result.start, end: result.end }
    onChange(result.value)
  }

  function onKeyDown(e) {
    const t = e.target
    if (e.key === 'Tab') {
      e.preventDefault()
      apply(handleTab(t.value, t.selectionStart, t.selectionEnd, e.shiftKey))
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (onRun) onRun()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      apply(handleEnter(t.value, t.selectionStart, t.selectionEnd))
    }
  }

  function onScroll(e) {
    if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop
  }

  const count = value.split('\n').length

  return (
    <div className="editor">
      <div className="gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={'gn' + (activeLine === i + 1 ? ' on' : '')}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={areaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        spellCheck={false}
        wrap="off"
        aria-label="Python code editor"
      />
    </div>
  )
}
