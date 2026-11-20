// One scene setting for the whole program. It only changes when the program
// brings something new into the story, so it never flickers.
export function environmentFor(world) {
  if (world.objectOrder.length > 0 || world.classOrder.length > 0) {
    return { id: 'garden', label: 'Garden' }
  }
  if (Object.keys(world.dicts).length > 0) return { id: 'library', label: 'Library' }
  if (world.callStack.length > 0 || world.functions.length > 0) {
    return { id: 'workshop', label: 'Workshop' }
  }
  if (world.loops.length > 0) return { id: 'track', label: 'Track' }
  return { id: 'classroom', label: 'Classroom' }
}
