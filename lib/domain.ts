import { z } from "zod";
export const LIMIT = 5242880,
  ROWS = 10000;
export const arrays = [
  "interests",
  "goals",
  "tasks",
  "task_goals",
  "executions",
  "execution_goals",
  "activity_states",
  "catalog_snapshots",
  "tombstones",
] as const;
export type Data = Record<string, any>;
export class Fault extends Error {
  constructor(
    public code: string,
    public status = 400,
    public extra: Data = {},
  ) {
    super(code);
  }
}
export const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
export const uid = () => crypto.randomUUID();
const uuid = z.string().uuid(),
  date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const d = new Date(s);
      return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
    }),
  time = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    .refine((s) => !isNaN(Date.parse(s)));
const str = (n: number) =>
  z
    .string()
    .min(1)
    .max(n)
    .refine((s) => s.trim().length > 0);
const share = {
  share_mode: z.enum(["none", "summary", "full"]),
  share_summary: z.string().max(500).nullable(),
  origin: z.enum(["user", "catalog"]),
};
const common = {
  id: uuid,
  created_at: time,
  updated_at: time,
  revision: z
    .number()
    .int()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER - 1),
};
const snapshot = z
  .object({
    title: str(100),
    purpose: z.string().max(500).nullable(),
    duration_min: z.number().int().min(1).max(240).nullable(),
    minimum_action: z.string().max(500).nullable(),
    first_step: z.string().max(500).nullable(),
    start_url: z
      .string()
      .max(2048)
      .url()
      .refine((s) => s.startsWith("https://"))
      .nullable(),
    tags: z.array(str(40)).max(20),
    source_catalog_version: z.number().int().positive().nullable(),
  })
  .strict();
export const taskSchema = z
  .object({
    ...common,
    ...share,
    title: str(100),
    purpose: z.string().max(500).nullable(),
    duration_min: z.number().int().min(1).max(240),
    minimum_action: str(500),
    first_step: str(500),
    energy: z.number().int().min(1).max(3).nullable(),
    focus: z.number().int().min(1).max(3).nullable(),
    physical: z.number().int().min(1).max(3).nullable(),
    places: z.array(z.enum(["any", "home", "outside"])).nullable(),
    tools: z.array(str(40)).max(20).nullable(),
    additional_cost_yen: z.number().int().min(0).max(100000).nullable(),
    preparation_min: z.number().int().min(0).max(60).nullable(),
    tags: z.array(str(40)).max(20),
    start_url: snapshot.shape.start_url,
    source_catalog_id: z.string().nullable(),
    source_catalog_version: z.number().int().positive().nullable(),
    deleted_at: time.nullable(),
  })
  .strict();
const goalSchema = z
  .object({ ...common, ...share, title: str(100), deleted_at: time.nullable() })
  .strict();
const executionSchema = z
  .object({
    ...common,
    ...share,
    record_title: str(100),
    status: z.enum(["running", "completed", "stopped"]),
    activity_date: date,
    task_id: uuid.nullable(),
    catalog_id: z.string().nullable(),
    snapshot,
    started_at: time.nullable(),
    ended_at: time.nullable(),
    memo: z.string().max(2000),
    satisfaction: z.number().int().min(1).max(5).nullable(),
    repeat_wish: z.enum(["yes", "no"]).nullable(),
  })
  .strict();
const stateSchema = z
  .object({
    activity_key: str(100),
    tried: z.boolean(),
    blocked: z.boolean(),
    tried_changed_at: time.nullable(),
    blocked_changed_at: time.nullable(),
    updated_at: time,
    revision: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER - 1),
  })
  .strict();
const schemas: Data = {
  interests: z.object({ tag_id: str(40) }).strict(),
  goals: goalSchema,
  tasks: taskSchema,
  task_goals: z.object({ task_id: uuid, goal_id: uuid }).strict(),
  executions: executionSchema,
  execution_goals: z.object({ execution_id: uuid, goal_id: uuid }).strict(),
  activity_states: stateSchema,
  catalog_snapshots: z
    .object({
      id: str(100),
      version: z.number().int().positive(),
      task: taskSchema.extend({ id: str(100) }),
    })
    .strict(),
  tombstones: z
    .object({ entity_type: z.literal("execution"), id: uuid, deleted_at: time })
    .strict(),
};
export const key = (kind: string, r: Data) =>
  kind === "interests"
    ? r.tag_id
    : kind === "activity_states"
      ? r.activity_key
      : kind === "task_goals"
        ? `${r.task_id}:${r.goal_id}`
        : kind === "execution_goals"
          ? `${r.execution_id}:${r.goal_id}`
          : kind === "catalog_snapshots"
            ? `${r.id}:${r.version}`
            : r.id;
export function sorted(x: any): any {
  if (Array.isArray(x)) return x.map(sorted);
  if (x && typeof x === "object")
    return Object.fromEntries(
      Object.keys(x)
        .sort()
        .map((k) => [k, sorted(x[k])]),
    );
  return x;
}
export function canonical(d: Data) {
  const x = structuredClone(d);
  for (const k of arrays)
    if (x[k])
      x[k].sort((a: Data, b: Data) =>
        key(k, a) < key(k, b) ? -1 : key(k, a) > key(k, b) ? 1 : 0,
      );
  return JSON.stringify(sorted(x));
}
export function blank(): Data {
  return {
    format: "leisure-task-backup",
    schema_version: 1,
    exported_at: now(),
    dataset_id: uid(),
    settings: { timezone: "Asia/Tokyo" },
    ...Object.fromEntries(arrays.map((k) => [k, []])),
  };
}
export const today = (d: Data) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: d.settings.timezone }).format(
    new Date(),
  );
export const activity = (t: Data) =>
  t.source_catalog_id ? `catalog:${t.source_catalog_id}` : `task:${t.id}`;
export function validate(d: Data) {
  if (d.format !== "leisure-task-backup" || d.schema_version !== 1)
    throw new Fault("バックアップの形式版が違います");
  const fields = [
    "format",
    "schema_version",
    "exported_at",
    "dataset_id",
    "settings",
    ...arrays,
  ];
  if (Object.keys(d).some((k) => !fields.includes(k)))
    throw new Fault("未知の項目があります");
  uuid.parse(d.dataset_id);
  time.parse(d.exported_at);
  z.object({ timezone: str(80) })
    .strict()
    .parse(d.settings);
  try {
    today(d);
  } catch {
    throw new Fault("タイムゾーンが無効です");
  }
  for (const k of arrays) {
    if (!Array.isArray(d[k])) throw new Fault(`${k}がありません`);
    const ids = new Set();
    for (const r of d[k]) {
      schemas[k].parse(r);
      const id = key(k, r);
      if (ids.has(id)) throw new Fault(`${k}に重複があります`);
      ids.add(id);
    }
  }
  if (d.interests.some((x: Data) => !(x.tag_id in tagNames)))
    throw new Fault("興味タグが無効です");
  if (
    d.interests.length > 20 ||
    d.goals.filter((x: Data) => !x.deleted_at).length > 10
  )
    throw new Fault("興味または目標の上限を超えています");
  for (const t of d.tasks)
    if ((t.source_catalog_id === null) !== (t.source_catalog_version === null))
      throw new Fault("元候補と版の組が不正です");
  const has = (k: string, id: string) => d[k].some((r: Data) => r.id === id);
  for (const r of d.task_goals)
    if (!has("tasks", r.task_id) || !has("goals", r.goal_id))
      throw new Fault("タスクの関連先がありません");
  for (const r of d.execution_goals)
    if (!has("executions", r.execution_id) || !has("goals", r.goal_id))
      throw new Fault("記録の関連先がありません");
  for (const e of d.executions) {
    if (e.task_id && !has("tasks", e.task_id))
      throw new Fault("記録のタスクがありません");
    if (e.activity_date > today(d))
      throw new Fault("未来日の記録は保存できません");
    if (e.status === "running" && (!e.started_at || e.ended_at))
      throw new Fault("実行中の日時が不正です");
    if (e.started_at && e.ended_at && e.ended_at < e.started_at)
      throw new Fault("終了が開始より前です");
  }
  if (d.executions.filter((x: Data) => x.status === "running").length > 1)
    throw new Fault("実行中は1件までです");
  const copied = d.tasks
    .filter((t: Data) => !t.deleted_at && t.source_catalog_id)
    .map((t: Data) => t.source_catalog_id);
  if (new Set(copied).size !== copied.length)
    throw new Fault("同じ候補が重複しています");
  for (const t of d.tombstones)
    if (has("executions", t.id))
      throw new Fault("削除情報と記録が重複しています");
  for (const a of d.activity_states)
    if (
      a.activity_key.startsWith("task:") &&
      !has("tasks", a.activity_key.slice(5))
    )
      throw new Fault("活動のタスクがありません");
}
export function measure(d: Data) {
  return {
    bytes: new TextEncoder().encode(canonical(d)).length,
    rows: arrays.reduce((n, k) => n + d[k].length, 0),
  };
}
export function setState(d: Data, k: string, patch: Data) {
  let s = d.activity_states.find((x: Data) => x.activity_key === k);
  if (!s) {
    s = {
      activity_key: k,
      tried: false,
      blocked: false,
      tried_changed_at: null,
      blocked_changed_at: null,
      updated_at: now(),
      revision: 1,
    };
    d.activity_states.push(s);
  }
  for (const p of ["tried", "blocked"])
    if (p in patch && s[p] !== patch[p]) {
      s[p] = patch[p];
      s[p + "_changed_at"] = now();
      s.updated_at = now();
      s.revision++;
    }
}
export const execKey = (d: Data, e: Data) =>
  e.catalog_id
    ? `catalog:${e.catalog_id}`
    : e.task_id
      ? activity(d.tasks.find((t: Data) => t.id === e.task_id))
      : null;
export function close(d: Data, id: string, status: string, mark = false) {
  const e = d.executions.find((x: Data) => x.id === id);
  if (!e) throw new Fault("NOT_FOUND", 404);
  if (e.status !== "running") throw new Fault("REVISION_CONFLICT", 409);
  if (status === "cancel") {
    d.executions = d.executions.filter((x: Data) => x.id !== id);
    d.execution_goals = d.execution_goals.filter(
      (x: Data) => x.execution_id !== id,
    );
    d.tombstones.push({ entity_type: "execution", id, deleted_at: now() });
    return;
  }
  e.status = status;
  e.ended_at = now();
  e.activity_date = today(d);
  e.updated_at = now();
  e.revision++;
  const k = execKey(d, e);
  if (k && (status === "completed" || mark)) setState(d, k, { tried: true });
}
export function capacity(d: Data) {
  const current = measure(d);
  let max = { ...current };
  const e = d.executions.find((x: Data) => x.status === "running");
  if (e)
    for (const [s, m] of [
      ["completed", true],
      ["stopped", false],
      ["stopped", true],
      ["cancel", false],
    ] as const) {
      const x = structuredClone(d);
      close(x, e.id, s, m);
      const n = measure(x);
      max.bytes = Math.max(max.bytes, n.bytes);
      max.rows = Math.max(max.rows, n.rows);
    }
  return {
    ...current,
    reservedBytes: max.bytes - current.bytes,
    reservedRows: max.rows - current.rows,
    maxBytes: max.bytes,
    maxRows: max.rows,
  };
}
export function check(d: Data) {
  validate(d);
  const n = capacity(d);
  if (n.maxBytes > LIMIT || n.maxRows > ROWS)
    throw new Fault("QUOTA_EXCEEDED", 422, n);
  return n;
}
export const defaults = {
  minutes: 5,
  cost: 0,
  prep: 0,
  place: "any",
  tools: [] as string[],
  energy: 1,
  focus: 1,
  physical: 1,
};
const seeds = [
  [
    "C01",
    "言葉を三つ、思い出す",
    "知っている外国語の単語を三つ思い出す。",
    "まず一語、心の中で言ってみる。",
    "一語を思い出す",
    "language",
    2,
  ],
  [
    "C02",
    "目の前のものから、短い物語",
    "目に入ったものを主人公に短い話を考える。",
    "主人公になるものを一つ選ぶ。",
    "一文を考える",
    "story",
    3,
  ],
  [
    "C03",
    "色の組み合わせを見つける",
    "周囲にある色の組み合わせを眺める。",
    "気になる二色を選ぶ。",
    "一組を見つける",
    "design",
    3,
  ],
  [
    "C04",
    "身近な音に、耳をすます",
    "身近な音のリズムを聴く。",
    "一つの音に注意を向ける。",
    "ひとつの音を聴く",
    "music",
    2,
  ],
  [
    "C05",
    "三つだけ、覚えてみる",
    "近くのものを三つ覚えて思い出す。",
    "ものを三つ選ぶ。",
    "一つを思い出す",
    "memory",
    2,
  ],
  [
    "C06",
    "まるい形を探す",
    "周囲にある丸いものを探す。",
    "一方向をゆっくり見渡す。",
    "一つを見つける",
    "observation",
    3,
  ],
  [
    "C07",
    "行ってみたい場所を想像する",
    "好きな場所で過ごす一場面を想像する。",
    "まず場所を一つ決める。",
    "一場面を思い浮かべる",
    "imagination",
    3,
  ],
  [
    "C08",
    "何もせず、ひと休み",
    "楽な姿勢で、何もせずに休む。",
    "楽な姿勢を取る。",
    "30秒休む",
    "rest",
    2,
  ],
];
export const tagNames: Data = {
  language: "ことば",
  story: "物語",
  design: "デザイン",
  music: "音楽",
  memory: "記憶",
  observation: "観察",
  imagination: "想像",
  rest: "休息",
};
export const catalog: Data[] = seeds.map(
  ([id, title, purpose, first, minimum, tag, min]) => ({
    id,
    title,
    purpose,
    first_step: first,
    minimum_action: minimum,
    duration_min: min,
    tags: [tag],
    energy: 1,
    focus: 1,
    physical: 1,
    places: ["any"],
    tools: [],
    additional_cost_yen: 0,
    preparation_min: 0,
    start_url: null,
    source_catalog_id: id,
    source_catalog_version: 1,
    origin: "catalog",
    share_mode: "none",
    share_summary: null,
    deleted_at: null,
    revision: 1,
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  }),
);
export const ready = (t: Data) =>
  [
    "energy",
    "focus",
    "physical",
    "places",
    "tools",
    "additional_cost_yen",
    "preparation_min",
  ].every((k) => t[k] !== null && t[k] !== undefined);
export function conditions(c: Data = {}) {
  return z
    .object({
      minutes: z.number().int().min(1).max(240),
      cost: z.number().int().min(0).max(100000),
      prep: z.number().int().min(0).max(60),
      place: z.enum(["any", "home", "outside"]),
      tools: z.array(str(40)),
      energy: z.number().int().min(1).max(3),
      focus: z.number().int().min(1).max(3),
      physical: z.number().int().min(1).max(3),
    })
    .parse({ ...defaults, ...c });
}
export function draw(
  d: Data,
  session: Data,
  rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
) {
  let list: Data[] =
    session.entry === "usual"
      ? d.tasks.filter((t: Data) => !t.deleted_at)
      : catalog;
  let reason = "未登録";
  if (!list.length) return { candidate: null, reason };
  if (session.entry !== "usual") {
    list = list.filter(
      (t) =>
        !d.activity_states.find((s: Data) => s.activity_key === activity(t))
          ?.tried,
    );
    reason = "未経験の候補がありません";
  }
  if (!list.length) return { candidate: null, reason };
  list = list.filter(
    (t) =>
      !d.activity_states.find((s: Data) => s.activity_key === activity(t))
        ?.blocked,
  );
  if (!list.length)
    return { candidate: null, reason: "停止中の候補があります" };
  const c = conditions(session.conditions);
  list = list.filter(
    (t) =>
      ready(t) &&
      t.duration_min <= c.minutes &&
      t.additional_cost_yen <= c.cost &&
      t.preparation_min <= c.prep &&
      t.energy <= c.energy &&
      t.focus <= c.focus &&
      t.physical <= c.physical &&
      (t.places.includes("any") || t.places.includes(c.place)) &&
      t.tools.every((x: string) => c.tools.includes(x)),
  );
  if (!list.length)
    return { candidate: null, reason: "この条件に合う候補はありません" };
  list = list.filter((t) => !session.shown.includes(activity(t)));
  if (!list.length)
    return {
      candidate: null,
      reason: "このセッションの候補をすべて表示しました",
    };
  const explore = session.entry !== "usual" && rng() < 0.3;
  const weights = list.map((t) =>
    explore
      ? 1
      : 1 +
        Math.min(
          2,
          t.tags.filter((tag: string) =>
            d.interests.some((i: Data) => i.tag_id === tag),
          ).length,
        ),
  );
  let v = rng() * weights.reduce((a, b) => a + b, 0);
  let chosen = list.at(-1)!;
  for (let i = 0; i < list.length; i++) {
    v -= weights[i];
    if (v < 0) {
      chosen = list[i];
      break;
    }
  }
  session.shown.push(activity(chosen));
  return {
    candidate: chosen,
    reason: explore
      ? "新しい発見のためのランダムな提案"
      : "いまの条件と、設定した興味から",
  };
}
export function snap(t: Data) {
  return Object.fromEntries(
    [
      "title",
      "purpose",
      "duration_min",
      "minimum_action",
      "first_step",
      "start_url",
      "tags",
      "source_catalog_version",
    ].map((k) => [k, t[k] ?? (k === "tags" ? [] : null)]),
  );
}
export const base = (id = uid()) => ({
  id,
  created_at: now(),
  updated_at: now(),
  revision: 1,
  share_mode: "none",
  share_summary: null,
  origin: "user",
});
function archiveCatalog(d: Data, t: Data) {
  if (
    t.source_catalog_id &&
    !d.catalog_snapshots.some(
      (s: Data) =>
        s.id === t.source_catalog_id && s.version === t.source_catalog_version,
    )
  ) {
    const original = catalog.find((x) => x.id === t.source_catalog_id);
    if (original)
      d.catalog_snapshots.push({
        id: original.id,
        version: original.source_catalog_version,
        task: structuredClone(original),
      });
  }
}
export function execute(d: Data, cmd: Data) {
  const { action } = cmd;
  if (action === "settings") {
    d.settings = { timezone: cmd.timezone };
    d.interests = cmd.tags.map((tag_id: string) => ({ tag_id }));
  } else if (action === "task" || action === "goal") {
    const kind = action === "task" ? "tasks" : "goals";
    const old = d[kind].find((x: Data) => x.id === cmd.item.id);
    if (old && old.revision !== cmd.item.revision)
      throw new Fault("REVISION_CONFLICT", 409);
    const row = old
      ? {
          ...cmd.item,
          created_at: old.created_at,
          updated_at: now(),
          revision: old.revision + 1,
        }
      : { ...base(), ...cmd.item };
    d[kind] = [...d[kind].filter((x: Data) => x.id !== row.id), row];
    if (action === "task" && cmd.task_goals) {
      if (cmd.task_goals.some((g: Data) => g.task_id !== row.id))
        throw new Fault("関連の親IDが違います");
      d.task_goals = [
        ...d.task_goals.filter((x: Data) => x.task_id !== row.id),
        ...cmd.task_goals,
      ];
    }
  } else if (action === "soft-delete") {
    const t = d[cmd.kind]?.find((x: Data) => x.id === cmd.id);
    if (!["tasks", "goals"].includes(cmd.kind) || !t)
      throw new Fault("NOT_FOUND", 404);
    if (t.revision !== cmd.revision) throw new Fault("REVISION_CONFLICT", 409);
    t.deleted_at = cmd.restore ? null : now();
    t.updated_at = now();
    t.revision++;
  } else if (action === "activity") {
    if (!/^(task:|catalog:)/.test(cmd.key)) throw new Fault("活動IDが無効です");
    const st = d.activity_states.find((s: Data) => s.activity_key === cmd.key);
    if ((st?.revision ?? 0) !== cmd.revision)
      throw new Fault("REVISION_CONFLICT", 409);
    for (const p of Object.keys(cmd.patch))
      if (
        !["tried", "blocked"].includes(p) ||
        typeof cmd.patch[p] !== "boolean"
      )
        throw new Fault("状態が不正です");
    setState(d, cmd.key, cmd.patch);
  } else if (action === "save-catalog") {
    const t = catalog.find((t) => t.id === cmd.id);
    if (!t) throw new Fault("NOT_FOUND", 404);
    archiveCatalog(d, t);
    const old = d.tasks.find((t: Data) => t.source_catalog_id === cmd.id);
    if (old) {
      if (old.deleted_at && !cmd.restore)
        throw new Fault("削除済みコピーの復元を確認してください", 409);
      if (old.deleted_at) {
        old.deleted_at = null;
        old.revision++;
        old.updated_at = now();
      }
      return;
    }
    d.tasks.push({ ...t, ...base(), origin: "catalog" });
  } else if (action === "start" || action === "manual") {
    if (
      action === "start" &&
      d.executions.some((e: Data) => e.status === "running")
    )
      throw new Fault("すでに実行中の活動があります", 409);
    const t = cmd.catalog_id
      ? catalog.find((t) => t.id === cmd.catalog_id)
      : d.tasks.find((t: Data) => t.id === cmd.task_id);
    if (
      action === "start" &&
      (!t ||
        t.deleted_at ||
        d.activity_states.find((s: Data) => s.activity_key === activity(t))
          ?.blocked)
    )
      throw new Fault("候補が変更されています", 409);
    if (t) archiveCatalog(d, t);
    const e = {
      ...base(),
      record_title: action === "manual" ? cmd.title : t.title,
      status: action === "manual" ? "completed" : "running",
      activity_date: cmd.date ?? today(d),
      task_id: cmd.task_id ?? null,
      catalog_id: cmd.catalog_id ?? (t?.source_catalog_id || null),
      snapshot: snap(action === "manual" ? { title: cmd.title } : t),
      started_at: action === "start" ? now() : null,
      ended_at: null,
      memo: cmd.memo ?? "",
      satisfaction: null,
      repeat_wish: null,
    };
    d.executions.push(e);
    if (cmd.task_id)
      for (const g of d.task_goals.filter(
        (g: Data) => g.task_id === cmd.task_id,
      ))
        d.execution_goals.push({ execution_id: e.id, goal_id: g.goal_id });
  } else if (action === "finish" || action === "cancel") {
    if (
      Object.keys(cmd).some(
        (k) =>
          !["action", "id", "revision", "status", "mark_tried"].includes(k),
      )
    )
      throw new Fault("終了時の追加入力は記録編集で保存してください");
    const e = d.executions.find((x: Data) => x.id === cmd.id);
    if (!e) throw new Fault("NOT_FOUND", 404);
    if (e.revision !== cmd.revision) throw new Fault("REVISION_CONFLICT", 409);
    if (action === "finish" && !["completed", "stopped"].includes(cmd.status))
      throw new Fault("終了状態が無効です");
    close(
      d,
      cmd.id,
      action === "cancel" ? "cancel" : cmd.status,
      cmd.mark_tried === true,
    );
  } else if (action === "edit-execution") {
    const e = d.executions.find((x: Data) => x.id === cmd.id);
    if (!e) throw new Fault("NOT_FOUND", 404);
    if (e.revision !== cmd.revision) throw new Fault("REVISION_CONFLICT", 409);
    const allowed = [
      "record_title",
      "memo",
      "activity_date",
      "satisfaction",
      "repeat_wish",
      "share_mode",
      "share_summary",
    ];
    if (e.status !== "running") allowed.push("status");
    if (
      Object.keys(cmd.patch).some((k) => !allowed.includes(k)) ||
      cmd.patch.status === "running"
    )
      throw new Fault("編集できない項目です");
    Object.assign(e, cmd.patch, {
      revision: e.revision + 1,
      updated_at: now(),
    });
    if (cmd.execution_goals) {
      if (cmd.execution_goals.some((g: Data) => g.execution_id !== e.id))
        throw new Fault("関連の親IDが違います");
      d.execution_goals = [
        ...d.execution_goals.filter((x: Data) => x.execution_id !== e.id),
        ...cmd.execution_goals,
      ];
    }
  } else if (action === "delete-execution") {
    const e = d.executions.find((x: Data) => x.id === cmd.id);
    if (!e) throw new Fault("NOT_FOUND", 404);
    if (e.revision !== cmd.revision) throw new Fault("REVISION_CONFLICT", 409);
    if (e.status === "running")
      throw new Fault("実行中は開始を取り消してください");
    d.executions = d.executions.filter((x: Data) => x.id !== cmd.id);
    d.execution_goals = d.execution_goals.filter(
      (x: Data) => x.execution_id !== cmd.id,
    );
    d.tombstones.push({
      entity_type: "execution",
      id: cmd.id,
      deleted_at: now(),
    });
  } else throw new Fault("操作が無効です");
}
export function parseBackup(raw: string) {
  if (new TextEncoder().encode(raw).length > LIMIT)
    throw new Fault("ファイルは5MiBまでです", 413);
  const d = JSON.parse(raw);
  for (const e of d.executions ?? []) e.record_title ??= e.snapshot?.title;
  check(d);
  return d;
}
const meaningful = (x: Data) => {
  const y = structuredClone(x);
  delete y.revision;
  delete y.updated_at;
  return JSON.stringify(sorted(y));
};
export function merge(current: Data, incoming: Data, choices: string[] = []) {
  const d = structuredClone(current);
  const conflicts: Data[] = [];
  const empty = arrays.every((k) => current[k].length === 0);
  if (empty)
    return {
      data: structuredClone(incoming),
      conflicts: [],
      added: arrays.reduce((n, k) => n + incoming[k].length, 0),
      empty: true,
    };
  let added = 0;
  for (const kind of arrays) {
    for (const row of incoming[kind]) {
      const id = key(kind, row),
        ck = kind + ":" + id;
      if (
        kind === "execution_goals" &&
        !d.executions.some((e: Data) => e.id === row.execution_id)
      )
        continue;
      const old = d[kind].find((r: Data) => key(kind, r) === id);
      const opposite =
        kind === "executions"
          ? d.tombstones.find((r: Data) => r.id === id)
          : kind === "tombstones"
            ? d.executions.find((r: Data) => r.id === id)
            : null;
      if (opposite) {
        conflicts.push({
          key: ck,
          kind,
          title: row.record_title ?? "削除との競合",
        });
        if (!choices.includes(ck)) continue;
        if (kind === "executions")
          d.tombstones = d.tombstones.filter((r: Data) => r.id !== id);
        else {
          d.executions = d.executions.filter((r: Data) => r.id !== id);
          d.execution_goals = d.execution_goals.filter(
            (r: Data) => r.execution_id !== id,
          );
        }
      }
      if (old && meaningful(old) !== meaningful(row)) {
        conflicts.push({
          key: ck,
          kind,
          title: row.title ?? row.record_title ?? id,
        });
        if (!choices.includes(ck)) continue;
      } else if (old) continue;
      else added++;
      const adopted = structuredClone(row);
      if (old && "revision" in adopted) {
        adopted.revision = Math.max(old.revision, adopted.revision) + 1;
        adopted.updated_at = now();
      }
      d[kind] = [...d[kind].filter((r: Data) => key(kind, r) !== id), adopted];
    }
  }
  if (
    JSON.stringify(current.interests) !== JSON.stringify(incoming.interests)
  ) {
    conflicts.push({ key: "interests", kind: "interests", title: "興味タグ" });
    d.interests = choices.includes("interests")
      ? structuredClone(incoming.interests)
      : structuredClone(current.interests);
  }
  if (current.settings.timezone !== incoming.settings.timezone) {
    conflicts.push({
      key: "settings",
      kind: "settings",
      title: "タイムゾーン",
    });
    if (choices.includes("settings"))
      d.settings = structuredClone(incoming.settings);
  }
  return { data: d, conflicts, added, empty: false };
}
const esc = (s: string) => s.replace(/[\\`*_{}\[\]<>#|]/g, "\\$&");
export function markdown(d: Data, ids: string[]) {
  return ids
    .map((id) => {
      const e = d.executions.find((e: Data) => e.id === id);
      if (!e || e.share_mode === "none") return "";
      if (e.share_mode === "summary")
        return e.share_summary ? esc(e.share_summary) : "";
      const task = e.task_id
        ? d.tasks.find((t: Data) => t.id === e.task_id)
        : null;
      const can = !task || (!task.deleted_at && task.share_mode === "full");
      const goals = d.execution_goals
        .filter((g: Data) => g.execution_id === id)
        .map((g: Data) => d.goals.find((r: Data) => r.id === g.goal_id))
        .filter((g: Data) => g && !g.deleted_at && g.share_mode === "full");
      return `## ${can ? esc(e.record_title) : "活動記録"}\n\n${e.activity_date}\n\n${esc(e.memo)}${goals.length ? "\n\n目標：" + goals.map((g: Data) => esc(g.title)).join("、") : ""}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
