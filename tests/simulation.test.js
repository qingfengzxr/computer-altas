import test from "node:test";
import assert from "node:assert/strict";
import {
  transitionPower,
  canShowFlow,
  hasMainPower,
  flowSegments,
  rearSwitchObservation,
  flowStages,
} from "../src/simulation.js";
import { parts } from "../src/data.js";
const ids = parts.map((p) => p.id);

test("AC restoration only provides standby; case button and boot completion are separate", () => {
  assert.equal(transitionPower("off", "pressCase"), "off");
  assert.equal(transitionPower("off", "bootComplete"), "off");
  let state = transitionPower("off", "acOn");
  assert.equal(state, "standby");
  assert.equal(hasMainPower(state), false);
  assert.equal(transitionPower(state, "bootComplete"), "standby");
  state = transitionPower(state, "pressCase");
  assert.equal(state, "starting");
  state = transitionPower(state, "bootComplete");
  assert.equal(state, "running");
  assert.equal(transitionPower(state, "acOff"), "off");
});
test("power state gates flows and observations", () => {
  for (const flow of ["data", "power", "heat"])
    assert.deepEqual(flowSegments(flow, 0, "off", ids), []);
  assert.equal(canShowFlow("data", "standby"), false);
  assert.deepEqual(
    flowSegments("power", 0, "standby", ids).map((e) => [e.from, e.to]),
    [["psu", "board"]],
  );
  assert.match(rearSwitchObservation("off"), /「0」/);
  assert.match(rearSwitchObservation("standby"), /「I」/);
});
test("each data phase contains just its own causal link", () => {
  const edges = flowStages.data.map((_, phase) =>
    flowSegments("data", phase, "running", ids),
  );
  assert.ok(edges.every((stage) => stage.length === 1));
  assert.deepEqual(
    edges.map((stage) => [stage[0].from, stage[0].to]),
    [
      ["ssd", "ram1"],
      ["ram1", "cpu"],
      ["cpu", "gpu"],
      ["gpu", "display"],
    ],
  );
});
test("heat distinguishes conduction from airflow and never conducts through fan motors", () => {
  const conduction = flowSegments("heat", 0, "running", ids);
  assert.deepEqual(
    conduction.map((e) => [e.from, e.to]),
    [["cpu", "cooler"]],
  );
  const air = flowSegments("heat", 1, "running", ids);
  assert.equal(air.length, 4);
  assert.equal(new Set(air.map((e) => e.color)).size, 2);
  assert.ok(
    air.every(
      (e) =>
        !["cpuFan", "intake", "exhaust"].includes(e.from) &&
        !["cpuFan", "intake", "exhaust"].includes(e.to),
    ),
  );
});
test("hidden endpoints cannot leave orphaned flow segments", () => {
  for (const flow of Object.keys(flowStages))
    for (let phase = 0; phase < flowStages[flow].length; phase++)
      assert.deepEqual(flowSegments(flow, phase, "running", []), []);
  assert.deepEqual(flowSegments("data", 0, "running", ["ssd"]), []);
  assert.equal(flowSegments("heat", 1, "running", ["intake"]).length, 1);
});
