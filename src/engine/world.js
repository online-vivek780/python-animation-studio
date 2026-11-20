// The world is everything the animation needs to draw at one moment:
// blueprints, characters, collections, the call stack, loops and speech.
// It is built by replaying the tracer's events, so it always matches
// what Python really did, and every step keeps its own snapshot.

export function emptyWorld() {
  return {
    classes: {},
    classOrder: [],
    functions: [],
    objects: {},
    objectOrder: [],
    lists: {},
    dicts: {},
    sets: {},
    tuples: {},
    globals: {},
    callStack: [],
    loops: [],
    activeObjectId: null,
    speech: null,
    returned: null,
    printed: [],
    error: null,
    handled: null,
    condition: null,
    lastEvents: [],
  }
}

function topFrame(w) {
  return w.callStack.length ? w.callStack[w.callStack.length - 1] : null
}

function syncActive(w) {
  const top = topFrame(w)
  w.activeObjectId = top && top.objectId ? top.objectId : null
}

function findLoop(w, line) {
  for (let i = w.loops.length - 1; i >= 0; i--) {
    if (w.loops[i].line === line) return w.loops[i]
  }
  return null
}

export function apply(w, e) {
  const p = e.payload

  switch (e.type) {
    case 'class_started':
      if (!w.classes[p.name]) {
        w.classes[p.name] = { name: p.name, bases: [], methods: [], defined: false }
        w.classOrder.push(p.name)
      }
      break
    case 'method_defined': {
      const c = w.classes[p.className]
      if (c && !c.methods.includes(p.name)) c.methods.push(p.name)
      break
    }
    case 'class_defined': {
      if (!w.classes[p.name]) {
        w.classes[p.name] = { name: p.name, bases: [], methods: [], defined: false }
        w.classOrder.push(p.name)
      }
      const c = w.classes[p.name]
      c.bases = p.bases
      c.methods = p.methods
      c.defined = true
      break
    }
    case 'function_defined':
      w.functions.push({ name: p.name, params: p.params })
      break

    case 'object_created':
      w.objects[p.objectId] = { id: p.objectId, cls: p.className, attrs: {} }
      w.objectOrder.push(p.objectId)
      break
    case 'attribute_assigned':
      if (w.objects[p.objectId]) w.objects[p.objectId].attrs[p.name] = p.value
      break
    case 'attribute_deleted':
      if (w.objects[p.objectId]) delete w.objects[p.objectId].attrs[p.name]
      break

    case 'list_created':
      w.lists[p.listId] = { id: p.listId, items: [] }
      break
    case 'item_added':
      if (w.lists[p.listId]) w.lists[p.listId].items.splice(p.index, 0, p.value)
      break
    case 'item_updated':
      if (w.lists[p.listId]) w.lists[p.listId].items[p.index] = p.value
      break
    case 'item_removed':
      if (w.lists[p.listId]) w.lists[p.listId].items.splice(p.index, 1)
      break
    case 'list_changed':
      if (w.lists[p.listId]) w.lists[p.listId].items = p.items
      break

    case 'dict_created':
      w.dicts[p.dictId] = { id: p.dictId, pairs: [] }
      break
    case 'key_added':
      if (w.dicts[p.dictId]) w.dicts[p.dictId].pairs.push([p.key, p.value])
      break
    case 'key_updated':
      if (w.dicts[p.dictId]) {
        const k = JSON.stringify(p.key)
        const pair = w.dicts[p.dictId].pairs.find((x) => JSON.stringify(x[0]) === k)
        if (pair) pair[1] = p.value
      }
      break
    case 'key_removed':
      if (w.dicts[p.dictId]) {
        const k = JSON.stringify(p.key)
        w.dicts[p.dictId].pairs = w.dicts[p.dictId].pairs.filter(
          (x) => JSON.stringify(x[0]) !== k
        )
      }
      break

    case 'tuple_created':
      w.tuples[p.tupleId] = { id: p.tupleId, items: p.items }
      break
    case 'set_created':
      w.sets[p.setId] = { id: p.setId, items: [] }
      break
    case 'set_added':
      if (w.sets[p.setId]) w.sets[p.setId].items.push(p.value)
      break
    case 'set_removed':
      if (w.sets[p.setId]) {
        const k = JSON.stringify(p.value)
        w.sets[p.setId].items = w.sets[p.setId].items.filter(
          (x) => JSON.stringify(x) !== k
        )
      }
      break

    case 'variable_created':
    case 'variable_updated':
      if (p.scope === 'global') {
        w.globals[p.name] = p.value
      } else {
        const top = topFrame(w)
        if (top) top.locals[p.name] = p.value
      }
      break
    case 'variable_deleted':
      if (p.scope === 'global') {
        delete w.globals[p.name]
      } else {
        const top = topFrame(w)
        if (top) delete top.locals[p.name]
      }
      break

    case 'method_called':
      w.callStack.push({
        kind: 'method',
        name: p.name,
        objectId: p.objectId,
        className: p.className,
        definedIn: p.definedIn,
        isConstructor: p.isConstructor,
        args: p.args,
        locals: {},
      })
      syncActive(w)
      break
    case 'function_called':
      w.callStack.push({
        kind: 'function',
        name: p.name,
        objectId: null,
        className: null,
        definedIn: null,
        isConstructor: false,
        args: p.args,
        locals: {},
      })
      syncActive(w)
      break
    case 'method_returned':
    case 'function_returned':
      w.callStack.pop()
      w.returned = { name: p.name, value: p.value }
      syncActive(w)
      break

    case 'loop_started':
      w.loops.push({
        line: p.loopLine,
        kind: p.kind,
        variable: p.variable,
        source: p.source,
        sourceId: p.sourceId,
        total: p.total,
        index: 0,
        current: null,
        active: false,
      })
      break
    case 'iteration_started': {
      const l = findLoop(w, p.loopLine)
      if (l) {
        l.index = p.index
        l.current = p.value
        l.active = true
      }
      break
    }
    case 'iteration_finished': {
      const l = findLoop(w, p.loopLine)
      if (l) l.active = false
      break
    }
    case 'loop_finished':
      w.loops = w.loops.filter((l) => l.line !== p.loopLine)
      break

    case 'output':
      w.speech = { objectId: p.objectId, text: p.text }
      w.printed.push(p.text)
      break
    case 'exception_raised':
      w.error = { errorType: p.errorType, message: p.message }
      w.handled = null
      break
    case 'exception_handled':
      w.handled = { errorType: p.errorType, handler: p.handler }
      w.error = null
      break
    case 'condition_checked':
      w.condition = { test: p.test, result: p.result, branch: p.branch, line: p.line }
      break
    default:
      // Unknown event types are kept in lastEvents and otherwise ignored,
      // so a newer tracer can never crash an older scene.
      break
  }
}

export function buildWorlds(frames) {
  const worlds = []
  let current = emptyWorld()
  for (const frame of frames) {
    const next = structuredClone(current)
    next.speech = null
    next.returned = null
    next.condition = null
    next.handled = null
    next.lastEvents = frame.events || []
    for (const e of next.lastEvents) {
      try {
        apply(next, e)
      } catch (err) {
        // never let one bad event break the whole animation
      }
    }
    worlds.push(next)
    current = next
  }
  return worlds
}
