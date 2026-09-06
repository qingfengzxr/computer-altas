// Shelf packing preserves physical scale while reserving room for pick markers.
export function layoutInventory(entries, aspect = 1) {
  if (!entries.length) return new Map();
  const gap = 0.32;
  const items = entries
    .map((entry, order) => ({
      ...entry,
      order,
      cellWidth: Math.max(entry.width, 0.65) + gap,
      cellHeight: Math.max(entry.height, 0.35) + 0.52,
    }))
    .sort((a, b) => b.cellHeight - a.cellHeight || a.order - b.order);
  const minimum = Math.max(...items.map((item) => item.cellWidth));
  const maximum = items.reduce((sum, item) => sum + item.cellWidth, 0);
  let best;
  for (let sample = 0; sample <= 100; sample++) {
    const limit = minimum + ((maximum - minimum) * sample) / 100;
    const rows = [];
    let row = { items: [], width: 0, height: 0 };
    for (const item of items) {
      if (row.items.length && row.width + item.cellWidth > limit) {
        rows.push(row);
        row = { items: [], width: 0, height: 0 };
      }
      row.items.push(item);
      row.width += item.cellWidth;
      row.height = Math.max(row.height, item.cellHeight);
    }
    rows.push(row);
    const width = Math.max(...rows.map((r) => r.width));
    const height = rows.reduce((sum, r) => sum + r.height, 0);
    const cost = Math.max(width / Math.max(aspect, 0.1), height);
    if (!best || cost < best.cost) best = { rows, width, height, cost };
  }
  const positions = new Map();
  let top = best.height / 2;
  for (const row of best.rows) {
    let left = -row.width / 2;
    for (const item of row.items) {
      positions.set(item.id, [
        left + item.cellWidth / 2,
        top - row.height / 2 + 0.16,
        0,
      ]);
      left += item.cellWidth;
    }
    top -= row.height;
  }
  return positions;
}
