import test from "node:test";
import assert from "node:assert/strict";
import { layoutInventory } from "../src/inventoryLayout.js";
import { parts } from "../src/data.js";

test("empty inventory has no positions", () => {
  assert.equal(layoutInventory([]).size, 0);
});

for (const aspect of [0.5, 1, 1.5, 3]) {
  test(`layout preserves all parts without overlapping at aspect ${aspect}`, () => {
    const entries = parts.map((p) => ({
      id: p.id,
      width: p.size[0],
      height: p.size[1],
    }));
    const before = JSON.stringify(entries);
    const positions = layoutInventory(entries, aspect);
    assert.equal(positions.size, entries.length);
    assert.equal(JSON.stringify(entries), before);
    assert.deepEqual(positions, layoutInventory(entries, aspect));
    for (const a of entries) {
      assert.equal(positions.get(a.id)[2], 0);
      for (const b of entries) {
        if (a.id === b.id) continue;
        const [ax, ay] = positions.get(a.id),
          [bx, by] = positions.get(b.id);
        assert.ok(
          Math.abs(ax - bx) >= (a.width + b.width) / 2 ||
            Math.abs(ay - by) >= (a.height + b.height) / 2,
          `${a.id} overlaps ${b.id}`,
        );
      }
    }
  });
}
