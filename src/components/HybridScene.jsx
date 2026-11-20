import { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Character } from './Characters'
import { objTitle, fmt } from '../engine/narrateEvents'
import { environmentFor } from '../engine/environment'
import './hybrid.css'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const spring = { type: 'spring', stiffness: 300, damping: 20 }
const VALUE_TYPES = ['int', 'float', 'str', 'bool', 'NoneType']
const FOCUS_ORDER = ['speech', 'active', 'condition', 'hot', 'workshop']

function unquote(s) {
  return String(s).replace(/^['"]|['"]$/g, '')
}

function nameOf(world, id) {
  for (const [name, e] of Object.entries(world.globals)) {
    if (e && e.id === id) return name
  }
  return id
}

function slotText(world, e) {
  return e.t === 'obj' ? objTitle(world, e.id) : fmt(world, e)
}

const BRANCH_TEXT = {
  if: 'so Python enters the if block',
  elif: 'so Python enters the elif block',
  else: 'so Python takes the else block',
  next: 'so Python checks the next condition',
  none: 'so Python skips the block',
}

function plateLabel(world, c) {
  const args = Object.entries(c.args || {})
    .map(([k, v]) => k + '=' + slotText(world, v))
    .join(', ')
  return (c.className ? c.className + '.' : '') + c.name + '(' + args + ')'
}

const clamp = (n) => Math.max(35, Math.min(65, n))

// world: the snapshot to draw. event: the event this step is about (for highlights).
// camera: zoom toward the action. minimal: leave out characters and collections
// (used under the data-structure views, which draw those themselves).
export default function HybridScene({ world, event, camera = true, minimal = false }) {
  const camRef = useRef(null)
  const [cam, setCam] = useState({ s: 1, x: 50, y: 50 })

  useIsoLayoutEffect(() => {
    let next = { s: 1, x: 50, y: 50 }
    const root = camRef.current
    if (camera && root && typeof window !== 'undefined') {
      const reduce =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const target = reduce
        ? null
        : FOCUS_ORDER.map((k) => root.querySelector('[data-focus="' + k + '"]')).find(Boolean)
      if (target) {
        let x = 0
        let y = 0
        let n = target
        while (n && n !== root) {
          x += n.offsetLeft
          y += n.offsetTop
          n = n.offsetParent
        }
        if (n === root && root.offsetWidth > 0 && root.offsetHeight > 0) {
          next = {
            s: 1.08,
            x: clamp(((x + target.offsetWidth / 2) / root.offsetWidth) * 100),
            y: clamp(((y + target.offsetHeight / 2) / root.offsetHeight) * 100),
          }
        }
      }
    }
    setCam((prev) =>
      Math.abs(prev.s - next.s) < 0.01 &&
      Math.abs(prev.x - next.x) < 1 &&
      Math.abs(prev.y - next.y) < 1
        ? prev
        : next
    )
  })

  if (!world) return null
  const w = world
  const env = environmentFor(w)
  const top = w.callStack.length ? w.callStack[w.callStack.length - 1] : null
  const ev = event || null
  const p = ev ? ev.payload : null

  // highlights for the thing that just changed
  const glowVar =
    ev && (ev.type === 'variable_created' || ev.type === 'variable_updated')
      ? p.scope === 'global'
        ? p.name
        : p.function + '.' + p.name
      : null

  const aliases = {}
  Object.entries(w.globals).forEach(([name, e]) => {
    if (e && e.t === 'obj') {
      if (!aliases[e.id]) aliases[e.id] = []
      aliases[e.id].push(name)
    }
  })

  const pointers = {}
  w.loops.forEach((l) => {
    if (l.active && l.current && l.current.t === 'obj' && l.variable) {
      pointers[l.current.id] = l.variable
    }
  })

  const values = {}
  Object.entries(w.globals).forEach(([name, e]) => {
    if (e && VALUE_TYPES.includes(e.t)) values[name] = e
  })
  if (top) {
    Object.entries({ ...top.args, ...top.locals }).forEach(([name, e]) => {
      if (e && VALUE_TYPES.includes(e.t)) values[top.name + '.' + name] = e
    })
  }

  const lists = Object.values(w.lists)
  const dicts = Object.values(w.dicts)
  const empty =
    !w.condition &&
    w.classOrder.length === 0 &&
    w.objectOrder.length === 0 &&
    lists.length === 0 &&
    dicts.length === 0 &&
    Object.keys(values).length === 0 &&
    w.loops.length === 0

  const workshopFrame = top && top.kind === 'function' ? top : null
  const workshopVars = workshopFrame
    ? Object.entries(workshopFrame.locals).filter(([, e]) => e && VALUE_TYPES.includes(e.t))
    : []

  return (
    <div className={'stage hybrid env-' + env.id}>
      <span className="env-label">{env.label}</span>
      <div
        className="camera"
        ref={camRef}
        style={{
          transform: 'scale(' + cam.s + ')',
          transformOrigin: cam.x + '% ' + cam.y + '%',
        }}
      >
        {empty && (
          <span className="muted">
            Step through the program and the story will build up here.
          </span>
        )}

        {!minimal && w.classOrder.length > 0 && (
          <div className="signs">
            {w.classOrder.map((name) => {
              const c = w.classes[name]
              return (
                <motion.div
                  className="sign"
                  key={name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                >
                  <div className="sign-title">class {name}</div>
                  {c.bases.length > 0 && (
                    <div className="bp-ext">▲ is a kind of {c.bases.join(', ')}</div>
                  )}
                  <div>
                    {c.methods.map((m) => (
                      <motion.span
                        className={
                          'chip' +
                          (top && top.definedIn === name && top.name === m ? ' lit' : '')
                        }
                        key={m}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={spring}
                      >
                        {m}()
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {w.condition && (
          <motion.div
            className={'signpost ' + (w.condition.result ? 'yes' : 'no')}
            data-focus="condition"
            key={w.condition.line + w.condition.test}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
          >
            <div className="sign-q">{w.condition.test}</div>
            <div className="sign-a">{w.condition.result ? '✓ True' : '✗ False'}</div>
            <div className="sign-go">{BRANCH_TEXT[w.condition.branch]}</div>
          </motion.div>
        )}

        {w.loops.length > 0 && (
          <div className="loopbars">
            {w.loops.map((l) => (
              <div className="loopbar" key={l.line}>
                {l.kind === 'for' ? 'for ' + l.variable + ' in ' + l.source : 'while ' + l.source}
                {l.index > 0
                  ? ' · round ' + l.index + (l.total ? ' of ' + l.total : '')
                  : ' · starting'}
              </div>
            ))}
          </div>
        )}

        {workshopFrame && !minimal && (
          <motion.div
            className="workshop"
            data-focus="workshop"
            key={workshopFrame.name + w.callStack.length}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
          >
            <div className="ws-title">Workshop: {workshopFrame.name}()</div>
            <div className="ws-row">
              <div className="ws-part">
                <span className="muted">In</span>
                {Object.entries(workshopFrame.args || {}).map(([k, v]) => (
                  <span className="ws-chip" key={k}>
                    {k} = {slotText(w, v)}
                  </span>
                ))}
                {Object.keys(workshopFrame.args || {}).length === 0 && (
                  <span className="muted">nothing</span>
                )}
              </div>
              <div className="ws-part">
                <span className="muted">Inside</span>
                {workshopVars.map(([k, v]) => (
                  <span className="ws-chip inside" key={k + v.v}>
                    {k} = {slotText(w, v)}
                  </span>
                ))}
                {workshopVars.length === 0 && <span className="muted">working...</span>}
              </div>
              <div className="ws-part">
                <span className="muted">Out</span>
                <span className="ws-chip out">...</span>
              </div>
            </div>
          </motion.div>
        )}

        {!minimal && (lists.length > 0 || dicts.length > 0) && (
          <div className="crates">
            {lists.map((l) => (
              <motion.div
                className="crate"
                key={l.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
              >
                <div className="crate-title">{nameOf(w, l.id)} (list)</div>
                <div className="crate-row">
                  {l.items.length === 0 && <span className="muted">empty</span>}
                  {l.items.map((it, i) => {
                    const hot = w.loops.some(
                      (lp) => lp.active && lp.sourceId === l.id && lp.index - 1 === i
                    )
                    const glow =
                      ev &&
                      (ev.type === 'item_added' || ev.type === 'item_updated') &&
                      p.listId === l.id &&
                      p.index === i
                    return (
                      <motion.div
                        className={'slot2' + (hot ? ' hot' : '') + (glow ? ' glow' : '')}
                        data-focus={hot ? 'hot' : undefined}
                        key={i + ':' + JSON.stringify(it)}
                        initial={{ scale: 0, y: -16 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={spring}
                      >
                        <span className="si">{i}</span>
                        {slotText(w, it)}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
            {dicts.map((d) => (
              <motion.div
                className="crate cabinet"
                key={d.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
              >
                <div className="crate-title">{nameOf(w, d.id)} (dictionary)</div>
                {d.pairs.length === 0 && <span className="muted">empty</span>}
                {d.pairs.map(([k, v]) => {
                  const glow =
                    ev &&
                    (ev.type === 'key_added' || ev.type === 'key_updated') &&
                    p.dictId === d.id &&
                    JSON.stringify(p.key) === JSON.stringify(k)
                  return (
                    <motion.div
                      className={'drawer' + (glow ? ' glow' : '')}
                      key={JSON.stringify(k) + JSON.stringify(v)}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={spring}
                    >
                      <span className="drawer-key">{slotText(w, k)}</span>
                      <span>{slotText(w, v)}</span>
                    </motion.div>
                  )
                })}
              </motion.div>
            ))}
          </div>
        )}

        {(w.callStack.length > 0 || w.returned) && (
          <div className="stackbar">
            {w.callStack.length > 0 && (
              <div className="plates" aria-label="Call stack">
                <span className="muted">Call stack</span>
                {w.callStack.map((c, i) => (
                  <motion.div
                    className={'plate' + (i === w.callStack.length - 1 ? ' top' : '')}
                    key={i + c.name}
                    initial={{ opacity: 0, y: -14, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={spring}
                  >
                    {plateLabel(w, c)}
                  </motion.div>
                ))}
              </div>
            )}
            {w.returned && w.returned.value && w.returned.value.t !== 'NoneType' && (
              <motion.span
                className="returned-pill"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
              >
                {w.returned.name}() sent back {fmt(w, w.returned.value)}
              </motion.span>
            )}
          </div>
        )}

        {!minimal && (
          <div className="actors">
            {w.objectOrder.map((id) => {
              const o = w.objects[id]
              const nameAttr = o.attrs.name
              const speaking = !!(w.speech && w.speech.objectId === id)
              const active = w.activeObjectId === id
              return (
                <div
                  className="actor-wrap"
                  key={id}
                  data-focus={speaking ? 'speech' : active ? 'active' : undefined}
                >
                  <Character
                    cls={o.cls}
                    label={(aliases[id] || [id]).join(', ')}
                    title={nameAttr && nameAttr.v ? unquote(nameAttr.v) : o.cls}
                    active={active}
                    speech={speaking ? w.speech.text : ''}
                  />
                  {pointers[id] && <div className="loop-ptr">▲ {pointers[id]}</div>}
                </div>
              )
            })}
          </div>
        )}

        {Object.keys(values).length > 0 && (
          <div className="valuestrip">
            {Object.entries(values).map(([name, e]) => (
              <motion.div
                className={'value-chip' + (name === glowVar ? ' glow' : '')}
                key={name + ':' + e.v}
                initial={{ y: -30, scale: 0.5, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={spring}
              >
                <span className="value-name">{name}</span>
                <span className="value-val">{e.v}</span>
              </motion.div>
            ))}
          </div>
        )}

        {w.handled && (
          <div className="caught">
            Caught {w.handled.errorType} in the except block. The program keeps running.
          </div>
        )}

        {w.error && (
          <div className="boom">
            {w.error.errorType}
            {w.error.message ? ': ' + w.error.message : ''}
          </div>
        )}
      </div>
    </div>
  )
}
