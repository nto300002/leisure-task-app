import { test } from "node:test";
import assert from "node:assert/strict";
import { publicPost, publicPosts, matchesAdmin } from "../lib/publication.ts";
const data = { tasks: [], executions: [] };
const rec = {
  id: "test-id",
  record_title: "散歩で見つけた花",
  memo: "小さな黄色い花が咲いていた。",
  activity_date: "2026-11-05",
  status: "completed",
  share_mode: "full",
  share_summary: null,
  task_id: null,
  catalog_id: null,
  snapshot: { title: "PRIVATE SNAPSHOT" },
  satisfaction: 1,
};
test("nothing is public without explicit selection", () =>
  assert.deepEqual(publicPosts({ ...data, executions: [rec] }, []), []));
test("full free record becomes an event with allowlisted fields only", () => {
  const p = publicPost(data, rec)!;
  assert.equal(p.kind, "event");
  assert.equal(p.title, rec.record_title);
  assert.deepEqual(Object.keys(p).sort(), [
    "body",
    "date",
    "id",
    "kind",
    "title",
  ]);
  assert.ok(!JSON.stringify(p).includes("PRIVATE"));
});
test("task or catalog activity is tried; hidden task never exposes its title", () => {
  const p = publicPost(data, { ...rec, task_id: "hidden" })!;
  assert.equal(p.kind, "tried");
  assert.equal(p.title, "小さな活動の記録");
});
test("summary exposes only approved summary, not title date memo or source kind", () => {
  const p = publicPost(data, {
    ...rec,
    share_mode: "summary",
    share_summary: "公開用の短文",
    catalog_id: "C01",
  })!;
  assert.equal(p.body, "公開用の短文");
  assert.equal(p.date, null);
  assert.equal(p.kind, "note");
  assert.ok(!JSON.stringify(p).includes(rec.memo));
  assert.ok(!JSON.stringify(p).includes(rec.record_title));
});
test("private, running and empty-summary records are excluded even when selected", () => {
  for (const patch of [
    { share_mode: "none" },
    { status: "running" },
    { share_mode: "summary", share_summary: "" },
  ])
    assert.equal(publicPost(data, { ...rec, ...patch }), null);
});
test("admin gate fails closed for unconfigured, anonymous, and other accounts", () => {
  assert.equal(matchesAdmin("owner@example.test", undefined), false);
  assert.equal(matchesAdmin(null, "owner@example.test"), false);
  assert.equal(
    matchesAdmin("visitor@example.test", "owner@example.test"),
    false,
  );
  assert.equal(matchesAdmin("OWNER@example.test", "owner@example.test"), true);
});
