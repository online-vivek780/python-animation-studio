import { motion } from 'framer-motion'

const INK = '#1a1410'

function Eye({ cx, cy }) {
  return (
    <g className="blink">
      <circle cx={cx} cy={cy} r="5" fill="#fff" />
      <circle cx={cx} cy={cy} r="3" fill={INK} />
    </g>
  )
}

const tailStyle = { transformBox: 'fill-box', transformOrigin: 'bottom left' }

function DogSvg({ open }) {
  return (
    <svg className="char-svg" viewBox="0 0 140 120">
      <motion.path
        d="M112 78 Q136 58 130 38"
        stroke="#b07338"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        style={tailStyle}
        animate={{ rotate: [-14, 14, -14] }}
        transition={{ duration: open ? 0.25 : 0.7, repeat: Infinity }}
      />
      <ellipse cx="78" cy="84" rx="40" ry="24" fill="#c98b4b" />
      <rect x="48" y="98" width="11" height="18" rx="5" fill="#b07338" />
      <rect x="62" y="98" width="11" height="18" rx="5" fill="#b07338" />
      <rect x="96" y="98" width="11" height="18" rx="5" fill="#b07338" />
      <rect x="110" y="98" width="11" height="18" rx="5" fill="#b07338" />
      <ellipse
        cx="22"
        cy="46"
        rx="9"
        ry="19"
        fill="#8a5a2b"
        transform="rotate(15 22 46)"
      />
      <ellipse
        cx="66"
        cy="46"
        rx="9"
        ry="19"
        fill="#8a5a2b"
        transform="rotate(-15 66 46)"
      />
      <circle cx="44" cy="54" r="28" fill="#d9a066" />
      <ellipse cx="44" cy="64" rx="16" ry="12" fill="#f1d3a8" />
      <ellipse cx="44" cy="57" rx="5" ry="3.5" fill={INK} />
      <Eye cx={34} cy={48} />
      <Eye cx={54} cy={48} />
      {open ? (
        <>
          <ellipse cx="44" cy="71" rx="8" ry="6" fill="#7a2230" />
          <ellipse cx="44" cy="74" rx="4" ry="3" fill="#f28ba0" />
        </>
      ) : (
        <path
          d="M36 70 q8 6 16 0"
          stroke={INK}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function CatSvg({ open }) {
  return (
    <svg className="char-svg" viewBox="0 0 140 120">
      <motion.path
        d="M108 86 Q138 72 128 42"
        stroke="#7f8aa0"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        style={tailStyle}
        animate={{ rotate: [-8, 10, -8] }}
        transition={{ duration: open ? 0.4 : 1.2, repeat: Infinity }}
      />
      <ellipse cx="76" cy="86" rx="36" ry="22" fill="#8a94a6" />
      <rect x="52" y="98" width="10" height="17" rx="5" fill="#7f8aa0" />
      <rect x="64" y="98" width="10" height="17" rx="5" fill="#7f8aa0" />
      <rect x="90" y="98" width="10" height="17" rx="5" fill="#7f8aa0" />
      <rect x="102" y="98" width="10" height="17" rx="5" fill="#7f8aa0" />
      <polygon points="24,42 28,14 46,32" fill="#8a94a6" />
      <polygon points="68,42 64,14 46,32" fill="#8a94a6" />
      <polygon points="30,36 31,22 40,31" fill="#f4a6b8" />
      <polygon points="62,36 61,22 52,31" fill="#f4a6b8" />
      <circle cx="46" cy="56" r="26" fill="#9aa5b8" />
      <g className="blink">
        <ellipse cx="37" cy="54" rx="5" ry="6" fill="#a3e635" />
        <ellipse cx="55" cy="54" rx="5" ry="6" fill="#a3e635" />
        <rect x="36" y="49" width="2" height="10" rx="1" fill={INK} />
        <rect x="54" y="49" width="2" height="10" rx="1" fill={INK} />
      </g>
      <polygon points="42,62 50,62 46,67" fill="#f28ba0" />
      <g stroke="#dfe6f2" strokeWidth="1.5" strokeLinecap="round">
        <line x1="34" y1="66" x2="14" y2="62" />
        <line x1="34" y1="70" x2="14" y2="72" />
        <line x1="58" y1="66" x2="78" y2="62" />
        <line x1="58" y1="70" x2="78" y2="72" />
      </g>
      {open ? (
        <ellipse cx="46" cy="72" rx="6" ry="5" fill="#7a2230" />
      ) : (
        <path
          d="M40 70 q6 5 12 0"
          stroke={INK}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function CreatureSvg({ open }) {
  return (
    <svg className="char-svg" viewBox="0 0 140 120">
      <ellipse cx="70" cy="72" rx="42" ry="38" fill="#6aa84f" />
      <ellipse cx="70" cy="84" rx="26" ry="22" fill="#a8d08d" />
      <Eye cx={55} cy={58} />
      <Eye cx={85} cy={58} />
      {open ? (
        <ellipse cx="70" cy="80" rx="9" ry="7" fill="#7a2230" />
      ) : (
        <path
          d="M60 78 q10 8 20 0"
          stroke={INK}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
      <ellipse cx="52" cy="112" rx="12" ry="6" fill="#4f8a3b" />
      <ellipse cx="88" cy="112" rx="12" ry="6" fill="#4f8a3b" />
    </svg>
  )
}

export function Character({ cls, label, title, active, speech }) {
  const kind = /dog|puppy/i.test(cls)
    ? 'dog'
    : /cat|kitten/i.test(cls)
      ? 'cat'
      : 'other'
  const Art = kind === 'dog' ? DogSvg : kind === 'cat' ? CatSvg : CreatureSvg

  return (
    <motion.div
      className="actor"
      initial={{ scale: 0, y: -60, rotate: -25, opacity: 0 }}
      animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 11 }}
    >
      <motion.div
        className="puff"
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.8 }}
      />
      {speech && (
        <motion.div
          className="speech"
          key={speech}
          initial={{ opacity: 0, scale: 0.4, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {speech}
        </motion.div>
      )}
      <motion.div
        animate={active ? { y: [0, -14, 0] } : { y: 0 }}
        transition={
          active ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }
        }
      >
        <Art open={!!speech} />
      </motion.div>
      <div className="shadow" />
      <div className="tag">{title}</div>
      <div className="varname-tag">{label}</div>
    </motion.div>
  )
}