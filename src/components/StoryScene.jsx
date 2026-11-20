import { motion } from 'framer-motion'
import { getTop } from '../utils/narrate'
import { Character } from './Characters'
import VariablesScene from './VariablesScene'

function unquote(s) {
  return String(s).replace(/^['"]|['"]$/g, '')
}

function selfOf(t) {
  return t && t.name !== '<module>' && t.vars.self && t.vars.self.kind === 'obj'
    ? t.vars.self
    : null
}

export default function StoryScene({ frames, step }) {
  const frame = frames[step]
  const top = getTop(frame)
  if (!top) return null

  const prevFrame = step > 0 ? frames[step - 1] : null
  const prevTop = prevFrame ? getTop(prevFrame) : null

  const moduleVars = frame.stack[0].vars
  const classes = {}
  Object.entries(moduleVars).forEach(([name, v]) => {
    if (v.kind === 'class') classes[name] = v
  })

  const chars = Object.entries(moduleVars)
    .filter(([, v]) => v.kind === 'obj')
    .map(([name, v]) => ({ name, v }))

  const selfVar = selfOf(top)
  let activeIdx = selfVar ? chars.findIndex((c) => c.v.repr === selfVar.repr) : -1
  const list = [...chars]
  if (selfVar && activeIdx === -1) {
    list.push({ name: 'self', v: selfVar })
    activeIdx = list.length - 1
  }

  const newText = prevFrame
    ? frame.output.slice(prevFrame.output.length).trim()
    : ''
  let speakerIdx = -1
  if (newText && list.length > 0) {
    const ps = selfOf(prevTop)
    if (ps) speakerIdx = list.findIndex((c) => c.v.repr === ps.repr)
    if (speakerIdx === -1) speakerIdx = list.length - 1
  }

  const owner = selfVar
    ? selfVar.mro.find(
        (cn) => classes[cn] && classes[cn].methods.includes(top.name)
      )
    : null

  return (
    <>
      <div className="stage">
        <div className="signs">
          {Object.keys(classes).length === 0 && (
            <span className="muted">
              The story starts when a class is defined.
            </span>
          )}
          {Object.entries(classes).map(([name, c]) => (
            <motion.div
              className="sign"
              key={name}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <div className="sign-title">class {name}</div>
              {c.bases.length > 0 && (
                <div className="bp-ext">
                  ▲ is a kind of {c.bases.join(', ')}
                </div>
              )}
              <div>
                {c.methods.map((m) => (
                  <span
                    className={
                      'chip' + (owner === name && top.name === m ? ' lit' : '')
                    }
                    key={m}
                  >
                    {m}()
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="actors">
          {list.length === 0 && (
            <span className="muted">No characters yet.</span>
          )}
          {list.map((c, i) => {
            const nameAttr = c.v.attrs.find((a) => a[0] === 'name')
            return (
              <Character
                key={c.v.cls + ':' + i}
                cls={c.v.cls}
                label={c.name}
                title={nameAttr ? unquote(nameAttr[1]) : c.v.cls}
                active={i === activeIdx}
                speech={i === speakerIdx ? newText : ''}
              />
            )
          })}
        </div>
      </div>

      <VariablesScene frames={frames} step={step} />
    </>
  )
}