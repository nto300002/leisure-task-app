import { env } from "cloudflare:workers";
import { arrays, blank, key, uid, Data, Fault } from "./domain";
import { publicPosts, type PublicPost } from "./publication";
export type Store = {
  owner: string;
  version: number;
  account: Data;
  data: Data;
};
export async function read(owner: string): Promise<Store> {
  const db = env.DB!;
  if (!db) throw new Error("DB binding missing");
  const d = blank();
  const a = {
    generation_id: uid(),
    dataset_id: d.dataset_id,
    settings: d.settings,
    data_revision: 1,
    ops: {},
    slots: {},
    sessions: {},
    plans: {},
    shares: {},
    published_ids: [],
  };
  await db
    .prepare(
      "INSERT OR IGNORE INTO accounts(owner,version,token,payload) VALUES (?,1,?,?)",
    )
    .bind(owner, uid(), JSON.stringify(a))
    .run();
  const result = await db.batch([
    db
      .prepare("SELECT version,payload FROM accounts WHERE owner=?")
      .bind(owner),
    ...[...arrays, "runtime_chunks"].map((k) =>
      db.prepare(`SELECT id,payload FROM ${k} WHERE owner=?`).bind(owner),
    ),
  ]);
  const row = result[0].results[0] as any;
  const account = JSON.parse(row.payload);
  const chunks = result[result.length - 1].results as any[];
  if (chunks.length)
    Object.assign(
      account,
      JSON.parse(
        chunks
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((r) => r.payload)
          .join(""),
      ),
    );
  d.dataset_id = account.dataset_id;
  d.settings = account.settings;
  arrays.forEach(
    (k, i) =>
      (d[k] = result[i + 1].results.map((r: any) => JSON.parse(r.payload))),
  );
  return { owner, version: row.version, account, data: d };
}
export async function commit(before: Store, after: Store) {
  const db = env.DB!,
    token = uid(),
    a = after.account;
  a.dataset_id = after.data.dataset_id;
  a.settings = after.data.settings;
  const guard = "EXISTS (SELECT 1 FROM accounts WHERE owner=? AND token=?)";
  const runtimeNames = ["ops", "slots", "sessions", "plans", "shares"];
  const metadata = { ...a };
  const runtime: Data = {};
  for (const k of runtimeNames) {
    runtime[k] = a[k];
    delete metadata[k];
  }
  const serialized = JSON.stringify(runtime);
  const statements = [
    db
      .prepare(
        "UPDATE accounts SET version=version+1,token=?,payload=? WHERE owner=? AND version=?",
      )
      .bind(token, JSON.stringify(metadata), before.owner, before.version),
  ];
  for (const k of arrays) {
    const old = new Map(
      before.data[k].map((r: Data) => [key(k, r), JSON.stringify(r)]),
    );
    const next = new Map(
      after.data[k].map((r: Data) => [key(k, r), JSON.stringify(r)]),
    );
    for (const [id] of old)
      if (!next.has(id))
        statements.push(
          db
            .prepare(`DELETE FROM ${k} WHERE owner=? AND id=? AND ${guard}`)
            .bind(before.owner, id, before.owner, token),
        );
    for (const [id, payload] of next)
      if (old.get(id) !== payload)
        statements.push(
          db
            .prepare(
              `INSERT INTO ${k}(owner,id,payload) SELECT ?,?,? WHERE ${guard} ON CONFLICT(owner,id) DO UPDATE SET payload=excluded.payload`,
            )
            .bind(before.owner, id, payload, before.owner, token),
        );
  }
  statements.push(
    db
      .prepare(`DELETE FROM runtime_chunks WHERE owner=? AND ${guard}`)
      .bind(before.owner, before.owner, token),
  );
  for (let i = 0; i < serialized.length; i += 150000)
    statements.push(
      db
        .prepare(
          `INSERT INTO runtime_chunks(owner,id,payload) SELECT ?,?,? WHERE ${guard}`,
        )
        .bind(
          before.owner,
          String(i).padStart(12, "0"),
          serialized.slice(i, i + 150000),
          before.owner,
          token,
        ),
    );
  // Visibility is replaced in the same transaction as record edits/deletion.
  statements.push(
    db
      .prepare(`DELETE FROM public_entries WHERE owner=? AND ${guard}`)
      .bind(before.owner, before.owner, token),
  );
  for (const post of publicPosts(after.data, a.published_ids ?? []))
    statements.push(
      db
        .prepare(
          `INSERT INTO public_entries(owner,id,payload) SELECT ?,?,? WHERE ${guard}`,
        )
        .bind(before.owner, post.id, JSON.stringify(post), before.owner, token),
    );
  const result = await db.batch(statements);
  if (!result[0].meta.changes) throw new Fault("BUSY_RETRY", 409);
}

export async function published(): Promise<PublicPost[]> {
  const rows = await env
    .DB!.prepare("SELECT payload FROM public_entries")
    .all<{ payload: string }>();
  return rows.results
    .map((r) => JSON.parse(r.payload))
    .sort(
      (a, b) =>
        (b.date ?? " ").localeCompare(a.date ?? " ") ||
        a.id.localeCompare(b.id),
    );
}
