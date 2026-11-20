// Helpers that read data structures out of a world snapshot:
// bars for arrays, node chains for linked lists, trees, and graphs.
// They work on whatever the learner's program really built.

function unquote(s) {
  return String(s).replace(/^['"]|['"]$/g, '')
}

// the variables visible right now: globals, then the running function's own
export function visibleVars(world) {
  const top = world.callStack.length ? world.callStack[world.callStack.length - 1] : null
  return { ...world.globals, ...(top ? { ...top.args, ...top.locals } : {}) }
}

export function lookup(world, name) {
  return name ? visibleVars(world)[name] : undefined
}

export function listItems(world, name) {
  const e = lookup(world, name)
  if (!e) return null
  if (e.t === 'list' && world.lists[e.id]) return world.lists[e.id].items
  if (e.t === 'tuple' && world.tuples[e.id]) return world.tuples[e.id].items
  if (e.t === 'set' && world.sets[e.id]) return world.sets[e.id].items
  return null
}

export function intValue(world, name) {
  const e = lookup(world, name)
  return e && e.t === 'int' ? Number(e.v) : null
}

export function itemText(e) {
  return e && e.v !== undefined ? unquote(e.v) : e && e.id ? e.id : '?'
}

// ---- bars -----------------------------------------------------------------
export function barsFor(world, params) {
  let items = null
  for (const name of [].concat(params.array, params.fallback || [])) {
    items = listItems(world, name)
    if (items) break
  }
  if (!items) return null
  const values = items.map((e) => Number(e.v))
  if (values.some((v) => Number.isNaN(v))) return null

  const byName = {}
  const groups = {}
  for (const name of params.pointers || []) {
    const v = intValue(world, name)
    if (v !== null && v >= 0 && v < values.length) {
      byName[name] = v
      if (!groups[v]) groups[v] = []
      groups[v].push(name)
    }
  }
  const max = Math.max(1, ...values.map((v) => Math.abs(v)))
  return { values, max, byName, groups }
}

// ---- linked list ----------------------------------------------------------
const LABEL_KEYS = ['data', 'value', 'val', 'item', 'key', 'name']

export function nodeLabel(obj) {
  for (const k of LABEL_KEYS) {
    if (obj.attrs[k]) return itemText(obj.attrs[k])
  }
  return obj.id
}

export function chainFor(world, params, limit = 12) {
  const start = lookup(world, params.head)
  const nodes = []
  const seen = new Set()
  let e = start
  while (e && e.t === 'obj' && !seen.has(e.id) && nodes.length < limit) {
    const o = world.objects[e.id]
    if (!o) break
    seen.add(e.id)
    nodes.push({ id: e.id, label: nodeLabel(o) })
    e = o.attrs.next
  }
  const cycle = !!(e && e.t === 'obj' && seen.has(e.id))
  const pointers = {}
  for (const name of params.pointers || []) {
    const v = lookup(world, name)
    if (v && v.t === 'obj') {
      if (!pointers[v.id]) pointers[v.id] = []
      pointers[v.id].push(name)
    }
  }
  return { nodes, cycle, pointers, started: !!start }
}

// ---- tree -----------------------------------------------------------------
export function buildTree(world, e, depth = 0, seen = new Set()) {
  if (!e || e.t !== 'obj' || seen.has(e.id) || depth > 5) return null
  const o = world.objects[e.id]
  if (!o) return null
  seen.add(e.id)
  return {
    id: e.id,
    label: nodeLabel(o),
    left: buildTree(world, o.attrs.left, depth + 1, seen),
    right: buildTree(world, o.attrs.right, depth + 1, seen),
  }
}

export function layoutTree(tree) {
  const nodes = []
  const edges = []
  let counter = 0
  let maxDepth = 0
  function walk(n, depth, parent) {
    if (!n) return
    walk(n.left, depth + 1, n)
    const x = counter++
    nodes.push({ id: n.id, label: n.label, x, y: depth })
    if (depth > maxDepth) maxDepth = depth
    if (parent) edges.push({ from: parent.id, to: n.id })
    walk(n.right, depth + 1, n)
  }
  walk(tree, 0, null)
  // edges were recorded child-first, keep them as pairs of ids
  return { nodes, edges, width: counter, height: maxDepth + 1 }
}

export function treeFor(world, params) {
  const tree = buildTree(world, lookup(world, params.root))
  const layout = tree ? layoutTree(tree) : { nodes: [], edges: [], width: 0, height: 0 }
  const marked = {}
  for (const name of params.pointers || []) {
    const v = lookup(world, name)
    if (v && v.t === 'obj') marked[v.id] = name
  }
  return { ...layout, marked }
}

// ---- graph ----------------------------------------------------------------
export function graphFor(world, params, size = { w: 300, h: 220 }) {
  const g = lookup(world, params.graph)
  const dict = g && g.t === 'dict' ? world.dicts[g.id] : null
  if (!dict) return null

  const names = dict.pairs.map(([k]) => itemText(k))
  const edges = []
  for (const [k, v] of dict.pairs) {
    const list = v && v.t === 'list' && world.lists[v.id] ? world.lists[v.id].items : []
    for (const to of list) edges.push({ from: itemText(k), to: itemText(to) })
  }
  const visitedItems = listItems(world, params.visited) || []
  const visited = new Set(visitedItems.map(itemText))
  const frontierItems = listItems(world, params.queue) || []
  const frontier = frontierItems.map(itemText)
  const cur = lookup(world, params.current)
  const current = cur && cur.v !== undefined ? itemText(cur) : null

  const cx = size.w / 2
  const cy = size.h / 2
  const r = Math.min(size.w, size.h) / 2 - 30
  const nodes = names.map((name, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, names.length) - Math.PI / 2
    return {
      name,
      x: Math.round(cx + r * Math.cos(a)),
      y: Math.round(cy + r * Math.sin(a)),
      visited: visited.has(name),
      current: name === current,
      queued: frontier.includes(name),
    }
  })
  return { nodes, edges, visited: [...visited], frontier }
}
