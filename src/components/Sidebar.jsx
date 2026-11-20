// A searchable list of groups and items, with a tick on finished ones.
export default function Sidebar({ title, groups, selectedId, onSelect, query, onQuery, searchable = true }) {
  const q = (query || '').trim().toLowerCase()
  const shown = groups
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((i) => (i.title + ' ' + g.title).toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <h2>{title}</h2>
      {searchable && (
        <input
          className="search"
          type="search"
          placeholder="Search lessons"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search lessons"
        />
      )}
      {shown.length === 0 && <p className="muted">Nothing found.</p>}
      {shown.length === 1 && groups.length === 1 && shown[0].items.map((i) => (
        <button key={i.id} className={i.id === selectedId ? 'active' : ''} onClick={() => onSelect(i.id)}>
          <span className={'tick' + (i.done ? ' on' : '')}>{i.done ? '✓' : ''}</span>
          {i.title}
        </button>
      ))}
      {groups.length > 1 && shown.map((g) => {
        const done = g.items.filter((i) => i.done).length
        const open = !!q || g.items.some((i) => i.id === selectedId) || groups.length <= 2
        return (
          <details key={g.id} open={open} className="group">
            <summary>
              {g.title}
              <span className="count">{done}/{g.items.length}</span>
            </summary>
            {g.items.map((i) => (
              <button key={i.id} className={i.id === selectedId ? 'active' : ''} onClick={() => onSelect(i.id)}>
                <span className={'tick' + (i.done ? ' on' : '')}>{i.done ? '✓' : ''}</span>
                {i.title}
              </button>
            ))}
          </details>
        )
      })}
    </>
  )
}
