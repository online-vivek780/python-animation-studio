// Owl narration written from structured events, with fixed templates.
// It needs no external AI service and always matches what Python did.

function unquote(s) {
  return String(s).replace(/^['"]|['"]$/g, '')
}

export function objTitle(w, id) {
  const o = w.objects[id]
  if (!o) return id
  const n = o.attrs && o.attrs.name
  return n && n.v ? unquote(n.v) : o.cls
}

export function fmt(w, e) {
  if (!e) return 'nothing'
  if (e.t === 'obj') return objTitle(w, e.id)
  if (e.t === 'list' || e.t === 'dict' || e.t === 'tuple' || e.t === 'set') {
    return 'a ' + e.t
  }
  return e.v
}

function nameOf(w, id) {
  for (const [name, e] of Object.entries(w.globals)) {
    if (e && e.id === id) return name
  }
  return id
}

function loopAt(w, line) {
  return w.loops.find((l) => l.line === line) || null
}

// Returns [priority, sentence, pose] or null when an event is not worth saying.
function say(w, e, all) {
  const p = e.payload
  switch (e.type) {
    case 'class_started':
      return [4, 'Python starts reading class ' + p.name + '. A class is a blueprint that describes what objects can have and do.', 'pointing']
    case 'method_defined':
      if (p.name === '__init__') {
        return [5, 'We defined __init__, the setup method. Python runs it every time a new ' + p.className + ' is created.', 'pointing']
      }
      return [5, 'We defined a method called ' + p.name + '. It describes an action a ' + p.className + ' can perform. Nothing runs yet.', 'pointing']
    case 'class_defined': {
      const extra = p.bases.length
        ? ' It builds on ' + p.bases.join(', ') + ', so it inherits their abilities.'
        : ''
      return [3, 'The ' + p.name + ' blueprint is ready.' + extra, 'happy']
    }
    case 'function_defined':
      return [4, 'Function ' + p.name + ' is defined. It only runs when we call it.', 'pointing']
    case 'object_created': {
      const same = Object.values(w.objects).filter((o) => o.cls === p.className).length
      if (same > 1) {
        return [9, 'Python created another ' + p.className + ' object (' + p.objectId + ') from the same blueprint.', 'happy']
      }
      return [9, 'Python created a real ' + p.className + ' object from the ' + p.className + ' blueprint.', 'happy']
    }
    case 'method_called': {
      if (p.isConstructor) {
        return [8, 'Python calls __init__ to set up the new ' + p.className + '.', 'pointing']
      }
      const who = objTitle(w, p.objectId)
      const inherited =
        p.definedIn !== p.className
          ? ' This ability is inherited from ' + p.definedIn + '.'
          : ''
      return [8, 'We called ' + p.name + '() on ' + who + ', so ' + who + ' performs this action.' + inherited, 'pointing']
    }
    case 'function_called': {
      const args = Object.values(p.args || {}).map((a) => fmt(w, a)).join(', ')
      return [8, 'Calling ' + p.name + '(' + args + '). Python enters the function.', 'pointing']
    }
    case 'method_returned':
    case 'function_returned': {
      if (p.name === '__init__') return [2, 'The new ' + (p.className || 'object') + ' is ready.', 'happy']
      const back = p.value && p.value.t !== 'NoneType' ? ' and sends back ' + fmt(w, p.value) : ''
      return [6, p.name + '() is finished' + back + '.', 'happy']
    }
    case 'attribute_assigned':
      return [5, objTitle(w, p.objectId) + ' now has ' + p.name + ' = ' + fmt(w, p.value) + '.', 'pointing']
    case 'list_created': {
      const items = all
        .filter((x) => x.type === 'item_added' && x.payload.listId === p.listId)
        .map((x) => fmt(w, x.payload.value))
      const holding = items.length ? ' holding ' + items.join(', ') : ''
      return [6, 'A list called ' + nameOf(w, p.listId) + ' was created' + holding + '. Think of it as a row of storage crates.', 'pointing']
    }
    case 'item_added':
      return [4, 'Placed ' + fmt(w, p.value) + ' in ' + nameOf(w, p.listId) + ' at position ' + p.index + '.', 'pointing']
    case 'item_updated':
      return [5, 'Position ' + p.index + ' of ' + nameOf(w, p.listId) + ' now holds ' + fmt(w, p.value) + '.', 'pointing']
    case 'item_removed':
      return [5, 'Removed the item at position ' + p.index + ' from ' + nameOf(w, p.listId) + '.', 'pointing']
    case 'dict_created':
      return [5, 'A dictionary was created. It stores values under names called keys.', 'pointing']
    case 'key_added':
      return [4, 'Stored ' + fmt(w, p.value) + ' under the key ' + fmt(w, p.key) + '.', 'pointing']
    case 'key_updated':
      return [5, 'The key ' + fmt(w, p.key) + ' now holds ' + fmt(w, p.value) + '.', 'pointing']
    case 'key_removed':
      return [5, 'Removed the key ' + fmt(w, p.key) + '.', 'pointing']
    case 'loop_started':
      return [7, p.kind === 'for'
        ? 'A for loop starts. It will visit each item of ' + p.source + ' one at a time.'
        : 'A while loop starts. It repeats as long as ' + p.source + ' is True.', 'pointing']
    case 'iteration_started': {
      const l = loopAt(w, p.loopLine)
      const of = l && l.total ? ' of ' + l.total : ''
      if (l && l.kind === 'while') {
        return [7, 'Round ' + p.index + ': the condition ' + l.source + ' was True, so the body runs.', 'pointing']
      }
      return [7, 'Round ' + p.index + of + ': ' + p.variable + ' now refers to ' + fmt(w, p.value) + '.', 'pointing']
    }
    case 'loop_finished':
      return [6, 'The loop is finished' + (p.iterations ? ' after ' + p.iterations + ' round' + (p.iterations === 1 ? '' : 's') : '') + '.', 'happy']
    case 'variable_created': {
      const isLoopVar = all.some((x) => x.type === 'iteration_started' && x.payload.variable === p.name)
      if (isLoopVar) return null
      return [3, 'Python created ' + p.name + ' and stored ' + fmt(w, p.value) + ' in it.', 'pointing']
    }
    case 'variable_updated': {
      const isLoopVar = all.some((x) => x.type === 'iteration_started' && x.payload.variable === p.name)
      if (isLoopVar) return null
      return [3, p.name + ' changes from ' + fmt(w, p.old) + ' to ' + fmt(w, p.value) + '.', 'pointing']
    }
    case 'output':
      return [9, 'The program printed: ' + p.text, 'happy']
    case 'condition_checked': {
      const verdict = p.result ? 'True' : 'False'
      const where =
        p.branch === 'if' || p.branch === 'elif'
          ? ' So Python enters the ' + p.branch + ' branch.'
          : p.branch === 'else'
            ? ' So Python takes the else branch.'
            : p.branch === 'next'
              ? ' So Python moves on to the next condition.'
              : ' There is no else branch, so Python skips this block.'
      return [8, 'Python checks ' + p.test + '. It is ' + verdict + '.' + where, 'pointing']
    }
    case 'exception_handled':
      return [9, 'The except block for ' + p.handler + ' caught the error, so the program keeps running.', 'happy']
    case 'exception_raised':
      return [10, 'Oops! ' + p.errorType + (p.message ? ': ' + p.message : '') + '.', 'confused']
    default:
      return null
  }
}

// Narration for a single event (one step of the timeline).
export function narrateEvent(w, e, allEvents) {
  const s = say(w, e, allEvents)
  return s ? { pose: s[2], text: s[1] } : null
}

export function narrateFrame(w, frame, isLast, error) {
  const events = frame.events || []
  const said = events
    .map((e) => say(w, e, events))
    .filter(Boolean)
    .map((s, i) => ({ priority: s[0], text: s[1], pose: s[2], order: i }))

  if (isLast && error && !said.some((s) => s.pose === 'confused')) {
    return { pose: 'confused', text: 'Python stopped with an error: ' + error }
  }

  if (said.length === 0) {
    if (isLast) return { pose: 'happy', text: 'All done! Use Prev or the slider to replay any step.' }
    return { pose: 'thinking', text: 'Python is running the highlighted line.' }
  }

  const best = [...said]
    .sort((a, b) => b.priority - a.priority || a.order - b.order)
    .slice(0, 2)
    .sort((a, b) => a.order - b.order)
  const lead = [...said].sort((a, b) => b.priority - a.priority)[0]
  return { pose: lead.pose, text: best.map((s) => s.text).join(' ') }
}
