import { motion } from 'framer-motion'

const BODY = '#9a6f4d'
const DARK = '#6e4b32'
const BELLY = '#ecd9b8'
const BEAK = '#f59e0b'
const INK = '#1a1410'

const wingStyle = { transformBox: 'fill-box', transformOrigin: 'top center' }

function OwlSvg({ pose }) {
  const happy = pose === 'happy'
  const pupils = {
    neutral: [0, 0],
    thinking: [4, -4],
    pointing: [4, 1],
    confused: [-2, 0],
    happy: [0, 0],
  }
  const [px, py] = pupils[pose] || [0, 0]
  const leftWing = happy ? 35 : 0
  const rightWing = pose === 'pointing' ? -70 : happy ? -35 : 0

  return (
    <svg className="owl-svg" viewBox="0 0 120 140">
      <polygon points="28,34 36,8 52,28" fill={DARK} />
      <polygon points="92,34 84,8 68,28" fill={DARK} />

      <ellipse cx="60" cy="88" rx="40" ry="46" fill={BODY} />
      <ellipse cx="60" cy="102" rx="25" ry="31" fill={BELLY} />
      <path
        d="M48 96 q4 4 8 0 M64 96 q4 4 8 0 M52 110 q4 4 8 0 M64 110 q4 4 8 0 M56 122 q4 4 8 0"
        stroke={DARK}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <motion.ellipse
        cx="24"
        cy="90"
        rx="10"
        ry="26"
        fill={DARK}
        style={wingStyle}
        animate={{ rotate: leftWing }}
        transition={{ type: 'spring', stiffness: 160, damping: 12 }}
      />
      <motion.ellipse
        cx="96"
        cy="90"
        rx="10"
        ry="26"
        fill={DARK}
        style={wingStyle}
        animate={{ rotate: rightWing }}
        transition={{ type: 'spring', stiffness: 160, damping: 12 }}
      />

      <ellipse cx="60" cy="50" rx="38" ry="32" fill={BODY} />
      <circle cx="44" cy="48" r="17" fill={BELLY} />
      <circle cx="76" cy="48" r="17" fill={BELLY} />

      {happy ? (
        <g
          stroke={INK}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        >
          <path d="M34 50 q10 -14 20 0" />
          <path d="M66 50 q10 -14 20 0" />
        </g>
      ) : (
        <g className="blink">
          <circle cx="44" cy="48" r="12" fill="#fff" />
          <circle cx="76" cy="48" r="12" fill="#fff" />
          <circle cx={44 + px} cy={48 + py} r="6" fill={INK} />
          <circle cx={76 + px} cy={48 + py} r="6" fill={INK} />
          <circle cx={46 + px} cy={46 + py} r="2" fill="#fff" />
          <circle cx={78 + px} cy={46 + py} r="2" fill="#fff" />
        </g>
      )}

      {pose === 'confused' && (
        <>
          <path
            d="M32 30 L54 36 M88 36 L68 30"
            stroke={DARK}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="100" y="26" fontSize="24" fill="#f5b83d" fontWeight="700">
            ?
          </text>
        </>
      )}
      {pose === 'thinking' && (
        <g fill="#f5b83d">
          <circle cx="98" cy="30" r="2.5" />
          <circle cx="106" cy="20" r="3.5" />
          <circle cx="116" cy="8" r="4.5" />
        </g>
      )}

      <polygon points="52,58 68,58 60,74" fill={BEAK} />
      <ellipse cx="48" cy="136" rx="9" ry="4" fill={BEAK} />
      <ellipse cx="72" cy="136" rx="9" ry="4" fill={BEAK} />
    </svg>
  )
}

export default function Owl({ pose = 'neutral', text }) {
  return (
    <div className="owl-wrap">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <OwlSvg pose={pose} />
      </motion.div>
      <div className="bubble">
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {text}
        </motion.div>
      </div>
    </div>
  )
}