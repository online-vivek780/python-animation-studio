import { motion } from 'framer-motion'
import HybridScene from './HybridScene'
import { barsFor, chainFor, treeFor, graphFor, listItems, itemText } from '../engine/dsa'

const spring = { type: 'spring', stiffness: 300, damping: 24 }

function Waiting({ what }) {
  return <p className="muted dsa-wait">The {what} appears as soon as the program builds it.</p>
}

function BarsView({ data }) {
  const { values, max, byName, groups } = data
  const hasRange = byName.low !== undefined && byName.high !== undefined
  const seen = {}
  return (
    <div className="bars">
      {values.map((v, i) => {
        seen[v] = (seen[v] || 0) + 1
        const active = !!groups[i]
        const dim = hasRange && (i < byName.low || i > byName.high)
        return (
          <motion.div
            layout
            key={v + '#' + seen[v]}
            className={'bar-col' + (active ? ' active' : '') + (dim ? ' dim' : '')}
            transition={spring}
          >
            <div className="bar-val">{v}</div>
            <div className="bar" style={{ height: Math.max(8, Math.round((Math.abs(v) / max) * 150)) }} />
            <div className="bar-idx">{i}</div>
            <div className="bar-ptr">
              {(groups[i] || []).map((n) => (
                <span className="ptr" key={n}>{n}</span>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function StackView({ items, name }) {
  return (
    <div className="stack-view">
      <div className="stack-col">
        {items.length === 0 && <span className="muted">empty</span>}
        {[...items].map((e, i) => ({ e, i })).reverse().map(({ e, i }) => (
          <motion.div
            className={'stack-item' + (i === items.length - 1 ? ' top' : '')}
            key={i + ':' + itemText(e)}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
          >
            {itemText(e)}
            {i === items.length - 1 && <span className="tag-top">top</span>}
          </motion.div>
        ))}
      </div>
      <div className="muted">{name} (last in, first out)</div>
    </div>
  )
}

function QueueView({ items, name }) {
  return (
    <div className="queue-view">
      <div className="queue-row">
        {items.length === 0 && <span className="muted">empty</span>}
        {items.map((e, i) => (
          <motion.div
            className="queue-item"
            key={i + ':' + itemText(e)}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
          >
            <div>{itemText(e)}</div>
            {i === 0 && <span className="tag-end">front</span>}
            {i === items.length - 1 && i !== 0 && <span className="tag-end">back</span>}
          </motion.div>
        ))}
      </div>
      <div className="muted">{name} (first in, first out)</div>
    </div>
  )
}

function LinkedListView({ data }) {
  const { nodes, pointers, cycle } = data
  return (
    <div className="ll-row">
      {nodes.map((n, i) => (
        <div className="ll-cell" key={n.id}>
          <motion.div
            className={'ll-node' + (pointers[n.id] ? ' active' : '')}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
          >
            <span className="ll-data">{n.label}</span>
            <span className="ll-next">•</span>
          </motion.div>
          <div className="bar-ptr">
            {(pointers[n.id] || []).map((name) => (
              <span className="ptr" key={name}>{name}</span>
            ))}
          </div>
          {i < nodes.length - 1 && <span className="ll-arrow">→</span>}
        </div>
      ))}
      <div className="ll-end">{cycle ? '↺ back to an earlier node' : '→ None'}</div>
    </div>
  )
}

function TreeView({ data }) {
  const W = Math.max(1, data.width) * 56 + 24
  const H = data.height * 64 + 24
  const pos = {}
  data.nodes.forEach((n) => {
    pos[n.id] = { x: 28 + n.x * 56, y: 28 + n.y * 64 }
  })
  return (
    <svg className="tree-svg" viewBox={'0 0 ' + W + ' ' + H} style={{ maxWidth: W * 1.4 }}>
      {data.edges.map((e) => (
        <line key={e.from + e.to} x1={pos[e.from].x} y1={pos[e.from].y} x2={pos[e.to].x} y2={pos[e.to].y} className="tree-edge" />
      ))}
      {data.nodes.map((n) => (
        <g key={n.id}>
          <circle cx={pos[n.id].x} cy={pos[n.id].y} r="20" className={'tree-node' + (data.marked[n.id] ? ' active' : '')} />
          <text x={pos[n.id].x} y={pos[n.id].y + 5} textAnchor="middle" className="tree-text">{n.label}</text>
        </g>
      ))}
    </svg>
  )
}

function GraphView({ data, params }) {
  const at = {}
  data.nodes.forEach((n) => { at[n.name] = n })
  return (
    <div>
      <svg className="graph-svg" viewBox="0 0 300 220">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#6b7686" />
          </marker>
        </defs>
        {data.edges.map((e, i) => (
          at[e.from] && at[e.to] ? (
            <line key={i} x1={at[e.from].x} y1={at[e.from].y} x2={at[e.to].x} y2={at[e.to].y} className="graph-edge" markerEnd="url(#arrow)" />
          ) : null
        ))}
        {data.nodes.map((n) => (
          <g key={n.name}>
            <circle cx={n.x} cy={n.y} r="20" className={'graph-node' + (n.visited ? ' visited' : '') + (n.queued ? ' queued' : '') + (n.current ? ' current' : '')} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="tree-text">{n.name}</text>
          </g>
        ))}
      </svg>
      <div className="graph-lists">
        <span><b>Visited</b>: {data.visited.join(', ') || 'nothing yet'}</span>
        <span><b>{params.queue}</b>: {data.frontier.join(', ') || 'empty'}</span>
      </div>
    </div>
  )
}

export default function DsaScene({ world, event, view, params }) {
  let body = null
  if (world && view === 'bars') {
    const d = barsFor(world, params)
    body = d ? <BarsView data={d} /> : <Waiting what="array" />
  } else if (world && (view === 'stack' || view === 'queue')) {
    const items = listItems(world, params.list)
    if (!items) body = <Waiting what={view} />
    else body = view === 'stack'
      ? <StackView items={items} name={params.list} />
      : <QueueView items={items} name={params.list} />
  } else if (world && view === 'linkedlist') {
    const d = chainFor(world, params)
    body = d.nodes.length ? <LinkedListView data={d} /> : <Waiting what="linked list" />
  } else if (world && view === 'tree') {
    const d = treeFor(world, params)
    body = d.nodes.length ? <TreeView data={d} /> : <Waiting what="tree" />
  } else if (world && view === 'graph') {
    const d = graphFor(world, params)
    body = d ? <GraphView data={d} params={params} /> : <Waiting what="graph" />
  }
  return (
    <>
      <div className="dsa-box">{body}</div>
      <HybridScene world={world} event={event} camera={false} minimal />
    </>
  )
}
