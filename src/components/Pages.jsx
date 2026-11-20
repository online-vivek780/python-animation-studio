import { useState } from 'react'
import { moduleStats, overall, badgesFor } from '../engine/progress'
import { SPEEDS } from '../engine/settings'

export function ProgressPage({ progress, learn, dsa, challenges, onClear }) {
  const a = overall(progress, learn)
  const b = overall(progress, dsa)
  const solved = challenges.filter((c) => progress.challenges[c.id]).length
  const badges = badgesFor(progress, { learn, dsa, challenges })
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="page">
      <h1>Your progress</h1>
      <div className="stat-row">
        <div className="stat"><b>{a.percent}%</b><span>Learn Python ({a.done}/{a.total})</span></div>
        <div className="stat"><b>{b.done}/{b.total}</b><span>Data structures lessons</span></div>
        <div className="stat"><b>{solved}/{challenges.length}</b><span>Challenges solved</span></div>
      </div>

      <h2>By module</h2>
      {[...learn, ...dsa].map((m) => {
        const s = moduleStats(progress, m)
        return (
          <div className="mod-row" key={m.id}>
            <span>{m.title}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: (s.total ? (s.done / s.total) * 100 : 0) + '%' }} /></div>
            <span className="muted">{s.done}/{s.total}</span>
          </div>
        )
      })}

      <h2>Badges</h2>
      <div className="badges">
        {badges.map((x) => (
          <div className={'badge' + (x.earned ? ' earned' : '')} key={x.id}>
            <b>{x.title}</b>
            <span>{x.text}</span>
          </div>
        ))}
      </div>

      <h2>Saved on this device</h2>
      <p className="muted">Your progress is stored in this browser only. Nothing is sent anywhere.</p>
      {!confirm ? (
        <button className="danger" onClick={() => setConfirm(true)}>Clear my progress</button>
      ) : (
        <div className="row">
          <button className="danger" onClick={() => { onClear(); setConfirm(false) }}>Yes, clear everything</button>
          <button className="ghost" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      )}
    </div>
  )
}

export function GlossaryPage({ glossary }) {
  const [q, setQ] = useState('')
  const list = glossary.filter((g) => (g.term + ' ' + g.meaning).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="page">
      <h1>Glossary</h1>
      <input className="search wide" type="search" placeholder="Search terms" value={q}
        onChange={(e) => setQ(e.target.value)} aria-label="Search the glossary" />
      {list.length === 0 && <p className="muted">No matching term.</p>}
      <dl className="glossary">
        {list.map((g) => (
          <div key={g.term}><dt>{g.term}</dt><dd>{g.meaning}</dd></div>
        ))}
      </dl>
    </div>
  )
}

export function SettingsPage({ settings, onSettings }) {
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  return (
    <div className="page">
      <h1>Settings</h1>
      <label className="setting">
        <input type="checkbox" checked={settings.camera} onChange={(e) => onSettings({ camera: e.target.checked })} />
        <span><b>Camera movement</b><br /><span className="muted">The scene zooms toward what is happening.</span></span>
      </label>
      <label className="setting">
        <input type="checkbox" checked={settings.speak} disabled={!canSpeak}
          onChange={(e) => onSettings({ speak: e.target.checked })} />
        <span><b>Read the owl aloud</b><br />
          <span className="muted">{canSpeak ? 'Uses your browser\'s built-in voice.' : 'Your browser has no speech support.'}</span></span>
      </label>
      <label className="setting">
        <span><b>Playback speed</b><br /><span className="muted">How fast Play moves.</span></span>
        <select value={settings.speed} onChange={(e) => onSettings({ speed: Number(e.target.value) })}>
          {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
        </select>
      </label>
      <p className="muted">
        Reduced motion: if your device is set to reduce motion, animations and the camera are
        toned down automatically.
      </p>
    </div>
  )
}
