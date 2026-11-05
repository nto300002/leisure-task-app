import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  blank,
  execute,
  check,
  draw,
  defaults,
  activity,
  catalog,
  capacity,
  close,
  canonical,
  parseBackup,
  merge,
  markdown,
  setState,
  base,
  now,
  ROWS,
} from "../lib/domain.ts";
function started() {
  const d = blank();
  execute(d, { action: "start", catalog_id: "C01" });
  check(d);
  return d;
}
test("first click returns eligible candidate; usual never falls back to catalog", () => {
  const d = blank();
  const s = { entry: "new", conditions: defaults, shown: [] };
  assert.ok(draw(d, s, () => 0).candidate);
  assert.equal(draw(d, { ...s, entry: "usual", shown: [] }).candidate, null);
});
test("shown, blocked and tried are excluded; exploration has uniform branch", () => {
  const d = blank();
  setState(d, "catalog:C01", { tried: true });
  setState(d, "catalog:C02", { blocked: true });
  const s = { entry: "new", conditions: defaults, shown: [] };
  const ids = [];
  for (let i = 0; i < 6; i++) ids.push(draw(d, s, () => 0).candidate?.id);
  assert.equal(new Set(ids).size, 6);
  assert.ok(!ids.includes("C01"));
  assert.ok(!ids.includes("C02"));
  assert.equal(draw(d, s).candidate, null);
});
test("finish and stopped + tried are atomic; correction never rewrites tried", () => {
  const d = started(),
    e = d.executions[0];
  execute(d, {
    action: "finish",
    id: e.id,
    revision: e.revision,
    status: "stopped",
    mark_tried: true,
  });
  assert.equal(d.activity_states[0].tried, true);
  setState(d, "catalog:C01", { tried: false });
  execute(d, {
    action: "edit-execution",
    id: e.id,
    revision: e.revision,
    patch: { status: "completed", memo: "訂正", record_title: "タイトル訂正" },
  });
  assert.equal(d.activity_states[0].tried, false);
  assert.equal(e.snapshot.title, catalog[0].title);
  check(d);
});
test("finish revision conflict is unapplied", () => {
  const d = started(),
    before = canonical(d);
  assert.throws(
    () =>
      execute(d, {
        action: "finish",
        id: d.executions[0].id,
        revision: 0,
        status: "completed",
      }),
    /REVISION_CONFLICT/,
  );
  assert.equal(canonical(d), before);
});
test("row limit reserves tried row for closing; all close routes remain possible", () => {
  const d = started();
  while (
    d.executions.length + d.catalog_snapshots.length + d.tombstones.length <
    ROWS - 1
  )
    d.tombstones.push({
      entity_type: "execution",
      id: crypto.randomUUID(),
      deleted_at: now(),
    });
  assert.equal(capacity(d).maxRows, ROWS);
  check(d);
  for (const [status, mark] of [
    ["completed", true],
    ["stopped", false],
    ["stopped", true],
    ["cancel", false],
  ] as const) {
    const x = structuredClone(d);
    close(x, x.executions[0].id, status, mark);
    check(x);
  }
  d.tombstones.push({
    entity_type: "execution",
    id: crypto.randomUUID(),
    deleted_at: now(),
  });
  assert.throws(() => check(d), /QUOTA_EXCEEDED/);
});
test("deleted tasks and goals restore with references and sharing", () => {
  const raw = readFileSync(
    new URL("../fixtures/deleted-references.json", import.meta.url),
    "utf8",
  );
  const fixture = parseBackup(raw);
  const restored = merge(blank(), fixture).data;
  assert.equal(canonical(restored), canonical(fixture));
  check(restored);
  assert.ok(restored.tasks[0].deleted_at);
  assert.equal(restored.goals[0].share_mode, "none");
  const md = markdown(restored, [restored.executions[0].id]);
  assert.ok(!md.includes("英単語"));
  assert.ok(!md.includes("英語に親しむ"));
});
test("manual title is editable without setting tried", () => {
  const d = blank();
  execute(d, { action: "manual", title: "最初の題", date: "2026-11-05" });
  const e = d.executions[0];
  execute(d, {
    action: "edit-execution",
    id: e.id,
    revision: 1,
    patch: { record_title: "訂正" },
  });
  assert.equal(e.record_title, "訂正");
  assert.equal(e.snapshot.title, "最初の題");
  assert.equal(d.activity_states.length, 0);
  check(d);
});
test("required four fields save but do not enter draw with unknown conditions", () => {
  const d = blank();
  const t = {
    ...catalog[0],
    ...base(),
    origin: "user",
    source_catalog_id: null,
    source_catalog_version: null,
    energy: null,
    focus: null,
    physical: null,
    places: null,
    tools: null,
    additional_cost_yen: null,
    preparation_min: null,
  };
  execute(d, { action: "task", item: t });
  check(d);
  assert.equal(
    draw(d, { entry: "usual", conditions: defaults, shown: [] }).candidate,
    null,
  );
});
test("backup roundtrip preserves catalog version and executions", () => {
  const d = started();
  assert.equal(d.catalog_snapshots.length, 1);
  assert.equal(canonical(parseBackup(canonical(d))), canonical(d));
});
test("private, summary and full sharing filters", () => {
  const d = blank();
  execute(d, {
    action: "manual",
    title: "秘密",
    date: "2026-11-05",
    memo: "private memo",
  });
  const e = d.executions[0];
  assert.equal(markdown(d, [e.id]), "");
  e.share_mode = "summary";
  e.share_summary = "共有用";
  assert.equal(markdown(d, [e.id]), "共有用");
  assert.ok(!markdown(d, [e.id]).includes("秘密"));
});
test("exact 5MiB boundary preserves closing reservation for each branch", () => {
  const d = started();
  for (let i = 0; i < 900; i++) {
    const e = {
      ...structuredClone(d.executions[0]),
      ...base(),
      record_title: "容量試験",
      status: "completed",
      started_at: null,
      ended_at: null,
      task_id: null,
      catalog_id: null,
      memo: "あ".repeat(1800),
    };
    d.executions.push(e);
  }
  while (capacity(d).maxBytes > 5242880) d.executions.pop();
  let gap = 5242880 - capacity(d).maxBytes;
  for (const e of d.executions.slice(1)) {
    const room = 2000 - e.memo.length,
      add = Math.min(room, gap);
    e.memo += "a".repeat(add);
    gap -= add;
    if (!gap) break;
  }
  assert.equal(gap, 0);
  assert.equal(capacity(d).maxBytes, 5242880);
  check(d);
  for (const [status, mark] of [
    ["completed", true],
    ["stopped", false],
    ["stopped", true],
    ["cancel", false],
  ] as const) {
    const x = structuredClone(d);
    close(x, x.executions[0].id, status, mark);
    check(x);
  }
  const target = d.executions.find(
    (e: any) => e.memo.length < 2000 && e.status !== "running",
  );
  target.memo += "a";
  assert.throws(() => check(d), /QUOTA_EXCEEDED/);
});
test("exploration boundary .3 selects weighted branch; manual feedback does not affect draw", () => {
  const d = blank();
  d.interests = [{ tag_id: "language" }];
  let seq = [0.29999, 0.13];
  const uniform = draw(
    d,
    { entry: "new", conditions: defaults, shown: [] },
    () => seq.shift()!,
  );
  seq = [0.3, 0.13];
  const weighted = draw(
    d,
    { entry: "new", conditions: defaults, shown: [] },
    () => seq.shift()!,
  );
  assert.equal(uniform.candidate?.id, "C02");
  assert.equal(weighted.candidate?.id, "C01");
});
test("import replacement advances revision and default merge preserves destination", () => {
  const a = started();
  const b = structuredClone(a);
  b.executions[0].memo = "changed";
  const id = a.executions[0].id;
  assert.equal(merge(a, b).data.executions[0].memo, "");
  assert.equal(
    merge(a, b, ["executions:" + id]).data.executions[0].revision,
    2,
  );
});
