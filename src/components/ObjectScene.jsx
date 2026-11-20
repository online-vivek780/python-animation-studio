import { motion } from 'framer-motion'
import { getTop } from '../utils/narrate'
import VariablesScene from './VariablesScene'

const spring = { type: 'spring', stiffness: 300, damping: 20 }

export default function ObjectScene({ frames, step }) {
  const frame = frames[step]
  const top = getTop(frame)
  if (!top) return null

  const prevFrame = step > 0 ? frames[step - 1] : null
  const prevTop = prevFrame ? getTop(prevFrame) : null
  const prevVars = prevTop && prevTop.name === top.name ? prevTop.vars : {}

  const classes = {}
  Object.entries(frame.stack[0].vars).forEach(([name, v]) => {
    if (v.kind === 'class') classes[name] = v
  })

  const objects = Object.entries(top.vars).filter(([, v]) => v.kind === 'obj')
  const inMethod = top.name !== '<module>'

  function methodsFor(v) {
    const seen = new Set()
    const out = []
    v.mro.forEach((c) => {
      const info = classes[c]
      if (!info) return
      info.methods.forEach((m) => {
        if (!seen.has(m)) {
          seen.add(m)
          out.push({ name: m, from: c })
        }
      })
    })
    return out
  }

  return (
    <>
      <h4 className="scene-title">Blueprints (classes)</h4>
      <div className="blueprints">
        {Object.keys(classes).length === 0 && (
          <span className="muted">Define a class to see its blueprint.</span>
        )}
        {Object.entries(classes).map(([name, c]) => (
          <motion.div
            className="bp"
            key={name}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
          >
            <div className="bp-name">class {name}</div>
            {c.bases.length > 0 && (
              <div className="bp-ext">▲ inherits from {c.bases.join(', ')}</div>
            )}
            <div>
              {c.methods.map((m) => (
                <span className="chip" key={m}>
                  {m}()
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <h4 className="scene-title">Objects</h4>
      <div className="blueprints">
        {objects.length === 0 && (
          <span className="muted">No objects created yet.</span>
        )}
        {objects.map(([name, v]) => {
          const prevObj =
            prevVars[name] && prevVars[name].kind === 'obj'
              ? prevVars[name]
              : null
          const active = inMethod && name === 'self'
          return (
            <motion.div
              layout
              className={'objcard' + (active ? ' active' : '')}
              key={name}
              initial={{ scale: 0.3, opacity: 0, y: -30, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              transition={spring}
            >
              <div className="obj-head">
                {name} <span className="muted">→ {v.cls} object</span>
              </div>
              {v.attrs.length === 0 && (
                <span className="muted">no attributes yet</span>
              )}
              {v.attrs.map(([k, val]) => {
                const before = prevObj && prevObj.attrs.find((a) => a[0] === k)
                const changed = !before || before[1] !== val
                return (
                  <motion.div
                    className={'attr' + (changed ? ' changed' : '')}
                    key={k + ':' + val}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={spring}
                  >
                    <span className="attr-k">{k}</span>
                    <span className="attr-v">{val}</span>
                  </motion.div>
                )
              })}
              <div>
                {methodsFor(v).map((m) => (
                  <span
                    className={'chip' + (m.from !== v.cls ? ' inherited' : '')}
                    key={m.name}
                    title={'from ' + m.from}
                  >
                    {m.name}()
                  </span>
                ))}
              </div>
              {active && <div className="running">running {top.name}()</div>}
            </motion.div>
          )
        })}
      </div>

      <VariablesScene frames={frames} step={step} />
    </>
  )
}