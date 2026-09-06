import test from "node:test";
import assert from "node:assert/strict";
import * as data from "../src/data.js";
import {
  flowStages,
  powerLabels,
  rearSwitchObservation,
} from "../src/simulation.js";
import { translate, localize, readLanguage } from "../src/i18n.js";

test("English is the default, while a saved Chinese preference is honored", () => {
  for (const value of [null, "en", "invalid"])
    assert.equal(readLanguage({ getItem: () => value }), "en");
  assert.equal(readLanguage({ getItem: () => "zh" }), "zh");
  assert.equal(
    readLanguage({
      getItem: () => {
        throw new Error("Storage blocked");
      },
    }),
    "en",
  );
});
test("all component, course and process content has English translations", () => {
  const source = {
    data: { ...data },
    flowStages,
    powerLabels,
    observations: [
      rearSwitchObservation("off"),
      rearSwitchObservation("standby"),
    ],
  };
  assert.equal(
    /\p{Script=Han}/u.test(JSON.stringify(localize(source, "en"))),
    false,
  );
  assert.deepEqual(localize(source, "zh"), source);
  assert.equal(data.byId.cpu.name, "中央处理器");
  assert.deepEqual(
    localize(data.parts, "en").map((p) => [p.id, p.pos, p.related]),
    data.parts.map((p) => [p.id, p.pos, p.related]),
  );
});
test("translation preserves technical identifiers and translates UI labels", () => {
  assert.equal(translate("计算机解剖学"), "Computer Atlas");
  assert.equal(translate("计算机解剖学", "zh"), "计算机解剖学");
  assert.equal(translate("NVMe / PCIe"), "NVMe / PCIe");
});
