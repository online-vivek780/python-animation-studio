import { motion } from 'framer-motion'
import { getTop } from '../utils/narrate'
import VariablesScene from './VariablesScene'

const PITCH = 70

export default function LoopScene({ frames, step, params }) {
  const varName = params && params.var

  const seq = []
  let last = null
  let pos = -1

  if (varName) {
    frames.forEach((f, idx) => {
      const t = getTop(f)
      const v = t && t.vars[varName]
      if (v && v.repr !== last) {
        seq.push(v.repr)
        last = v.repr
      }
      if (idx === step) pos = last === null ? -1 : seq.length - 1
    })
  }

  return (
    <>
      {varName && seq.length > 0 && (
        <>
          <p className="muted">
            Values taken by {varName}
            {pos >= 0 ? ' · iteration ' + (pos + 1) + ' of ' + seq.length : ''}
          </p>
          <div className="track">
            <motion.div
              className="runner"
              animate={{ left: 10 + Math.max(pos, 0) * PITCH, opacity: pos >= 0 ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              {varName} ▼
            </motion.div>
            {seq.map((val, i) => (
              <div
                key={i}
                className={
                  'stone' + (i < pos ? ' done' : '') + (i === pos ? ' here' : '')
                }
              >
                {val}
              </div>
            ))}
            <div className="flag">🏁</div>
          </div>
        </>
      )}
      <VariablesScene frames={frames} step={step} />
    </>
  )
}