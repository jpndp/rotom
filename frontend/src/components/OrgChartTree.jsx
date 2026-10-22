function OrgNode({ entry, childrenOf, seen }) {
  const nextSeen = new Set(seen).add(entry.key);
  const kids = (childrenOf.get(entry.key) || []).filter((c) => !nextSeen.has(c.key));
  return (
    <li>
      <div className="orgchart-node">
        <strong>{entry.position || '(untitled)'}</strong>
        <span>{entry.name || entry.member?.name || 'Vacant'}</span>
      </div>
      {kids.length > 0 && (
        <ul>{kids.map((c) => <OrgNode key={c.key} entry={c} childrenOf={childrenOf} seen={nextSeen} />)}</ul>
      )}
    </li>
  );
}

function OrgChartTree({ entries }) {
  const list = entries.map((e, i) => ({ ...e, key: e.key || `i${i}`, reportsTo: e.reportsTo || '' }));
  const keys = new Set(list.map((e) => e.key));
  const childrenOf = new Map();
  const roots = [];
  list.forEach((e) => {
    if (e.reportsTo && keys.has(e.reportsTo)) childrenOf.set(e.reportsTo, [...(childrenOf.get(e.reportsTo) || []), e]);
    else roots.push(e);
  });
  return (
    <div className="orgchart">
      {roots.length > 0 ? (
        <ul>{roots.map((r) => <OrgNode key={r.key} entry={r} childrenOf={childrenOf} seen={new Set()} />)}</ul>
      ) : (
        <p>No positions yet.</p>
      )}
    </div>
  );
}

export default OrgChartTree;