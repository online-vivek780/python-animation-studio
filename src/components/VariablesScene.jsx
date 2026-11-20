import { motion } from 'framer-motion'
import { getTop } from '../utils/narrate'

const TYPE_COLORS = {
  int: '#2d6cdf',
  float: '#14b8a6',
  str: '#e879a8',
  bool: '#f59e0b',
  list: '#8b5cf6',
  tuple: '#a78bfa',
  dict: '#22c55e',
  set: '#06b6d4',
  NoneType: '#6b7280',
}

const spring = { type: 'spring', stiffness: 320, damping: 20 }

export default function VariablesScene({ frames, step }) {
  const frame = frames[step]
  const top = getTop(frame)
  if (!top) return null

  const prevFrame = step > 0 ? frames[step - 1] : null
  const prevTop = prevFrame ? getTop(prevFrame) : null
  const prevVars = prevTop && prevTop.name === top.name ? prevTop.vars : {}

  const entries = Object.entries(top.vars).filter(
        ([, v]) => !['function', 'class', 'module'].includes(v.repr) && v.kind !== 'obj'
  )

  return (
    <div className="shelf">
      {entries.length === 0 && (
        <span className="muted">No variables yet.</span>
      )}
      {entries.map(([name, v]) => {
        const changed = !prevVars[name] || prevVars[name].repr !== v.repr
        const color = TYPE_COLORS[v.type] || '#64748b'

        let content
        if (v.kind === 'seq') {
          content = (
            <div className="cells">
              {v.items.map((it, i) => (
                <motion.div
                  className="cell"
                  key={i + ':' + it}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                >
                  <div className="idx">{i}</div>
                  {it}
                </motion.div>
              ))}
            </div>
          )
        } else if (v.kind === 'dict') {
          content = (
            <div className="cells">
              {v.pairs.map(([k, val], i) => (
                <motion.div
                  className="cell"
                  key={k + ':' + val}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring}
                >
                  <div className="idx">{k}</div>
                  {val}
                </motion.div>
              ))}
            </div>
          )
        } else {
          content = (
            <motion.div
              className="slot-value"
              key={v.repr}
              initial={{ y: -40, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={spring}
            >
              {v.repr}
            </motion.div>
          )
        }

        return (
          <motion.div
            layout
            className="slot"
            key={name}
            initial={{ opacity: 0, scale: 0.6, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={spring}
          >
            <div className="slot-label">{name}</div>
            <motion.div
              className="slot-box"
              style={{ borderColor: color }}
              animate={{
                boxShadow: changed
                  ? '0 0 18px ' + color
                  : '0 0 0px ' + color,
              }}
            >
              {content}
            </motion.div>
            <div className="slot-type" style={{ color }}>
              {v.type}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}