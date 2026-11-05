import { publicPost } from "../../../lib/publication";
import { administrator } from "../../../lib/admin";
import { getChatGPTUser } from "../../chatgpt-auth";
import { read, commit } from "../../../lib/store";
import {
  Data,
  Fault,
  arrays,
  blank,
  canonical,
  capacity,
  catalog,
  check,
  conditions,
  draw,
  execute,
  markdown,
  merge,
  now,
  parseBackup,
  uid,
} from "../../../lib/domain";
export const dynamic = "force-dynamic";
const reply = (data: Data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const err = (e: any) =>
  reply(
    {
      error:
        e instanceof Fault
          ? e.code
          : e?.issues
            ? "入力項目を確認してください"
            : "保存処理に失敗しました",
      ...(e.extra ?? {}),
    },
    e instanceof Fault ? e.status : e?.issues ? 400 : 500,
  );
function clean(a: Data) {
  const t = Date.now();
  for (const name of ["ops", "sessions", "plans", "shares"])
    for (const [id, v] of Object.entries(a[name]) as [string, Data][])
      if (v.expires < t) delete a[name][id];
}
function generation(a: Data, b: Data) {
  if (!b.generation_id) throw new Fault("GENERATION_REQUIRED");
  if (a.generation_id !== b.generation_id)
    throw new Fault("GENERATION_EXPIRED", 410);
}
async function hash(x: Data) {
  const bytes = new TextEncoder().encode(JSON.stringify(x));
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(h))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    if (!(await administrator())) return reply({ error: "ADMIN_ONLY" }, 403);
    const s = await read(user.userId);
    return reply({
      data: s.data,
      published_ids: s.account.published_ids ?? [],
      generation_id: s.account.generation_id,
      data_revision: s.account.data_revision,
      capacity: capacity(s.data),
      finish_conflicts: Object.values(s.account.ops)
        .filter(
          (o: any) =>
            o.special &&
            o.status === "rejected_conflict" &&
            !o.next &&
            o.expires > Date.now(),
        )
        .map((o: any) => ({ id: o.id, target: o.target })),
      catalog,
    });
  } catch (e) {
    return err(e);
  }
}
export async function POST(req: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return reply({ error: "SIGN_IN_REQUIRED" }, 401);
    if (!(await administrator())) return reply({ error: "ADMIN_ONLY" }, 403);
    if (req.headers.get("origin") !== new URL(req.url).origin)
      return reply({ error: "ORIGIN_REJECTED" }, 403);
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 12 * 1024 * 1024)
      throw new Fault("ファイルが大きすぎます", 413);
    let b: Data;
    try {
      b = JSON.parse(text);
    } catch {
      throw new Fault("JSONが不正です");
    }
    for (let retry = 0; retry < 4; retry++) {
      const before = await read(user.userId);
      const s = structuredClone(before),
        a = s.account;
      generation(a, b);
      clean(a);
      let result: Data = {},
        status = 200;
      try {
        if (b.type === "issue") {
          const target = b.target ?? "";
          const special = ["finish", "cancel"].includes(b.action);
          let id: string | undefined;
          if (special) {
            const e = s.data.executions.find((e: Data) => e.id === target);
            if (!e || e.status !== "running")
              throw new Fault("ALREADY_CLOSED", 409);
            const current = a.slots[target],
              op = a.ops[current];
            if (b.replace) {
              const old = a.ops[b.replace];
              if (!old) throw new Fault("OPERATION_EXPIRED", 410);
              if (old.next) {
                if (!a.ops[old.next]) throw new Fault("OPERATION_EXPIRED", 410);
                id = old.next;
              } else {
                if (old.status !== "rejected_conflict" || current !== b.replace)
                  throw new Fault("結果を確認してからやり直してください", 409);
                if (e.revision !== b.revision)
                  throw new Fault("REVISION_CONFLICT", 409);
              }
            } else if (op) {
              if (op.action !== b.action && op.hash)
                throw new Fault("先の終了操作の結果を確認してください", 409);
              if (!op.hash) op.action = b.action;
              id = current;
            }
          }
          if (!id) {
            if (
              !special &&
              Object.values(a.ops).filter((o: any) => !o.special).length >= 2000
            )
              throw new Fault("操作キーの上限です。時間をおいてください", 429);
            id = uid();
            a.ops[id] = {
              id,
              action: b.action,
              target,
              status: "pending",
              hash: null,
              expires: Date.now() + 86400000,
              special,
            };
            if (special) {
              a.slots[target] = id;
              if (b.replace) a.ops[b.replace].next = id;
            }
          }
          result = { operation_id: id };
        } else if (b.type === "session-close") {
          delete a.sessions[b.id];
          result = { closed: true };
        } else if (b.type === "session-read") {
          const sess = a.sessions[b.id];
          if (!sess) throw new Fault("SESSION_EXPIRED", 410);
          result = { session: sess };
        } else if (b.type === "backup") {
          result = {
            content: canonical(s.data),
            filename: "leisure-backup-" + now().slice(0, 10) + ".json",
          };
        } else if (b.type === "import-preview") {
          const incoming = parseBackup(b.raw);
          const m = merge(s.data, incoming, b.choices ?? []);
          check(m.data);
          const id = uid();
          a.plans = {};
          a.plans[id] = {
            incoming,
            choices: b.choices ?? [],
            data_revision: a.data_revision,
            expires: Date.now() + 900000,
          };
          result = {
            plan_id: id,
            conflicts: m.conflicts,
            added: m.added,
            empty: m.empty,
            capacity: capacity(m.data),
          };
        } else if (b.type === "share-preview") {
          const content = markdown(s.data, b.ids ?? []);
          const id = uid();
          a.shares = {};
          a.shares[id] = {
            content,
            data_revision: a.data_revision,
            expires: Date.now() + 900000,
          };
          result = { preview_id: id, content };
        } else if (b.type === "share-export") {
          const p = a.shares[b.id];
          if (!p) throw new Fault("PREVIEW_EXPIRED", 410);
          if (p.data_revision !== a.data_revision)
            throw new Fault("プレビュー後に内容が変わりました", 409);
          result = { content: p.content, filename: "leisure-share.md" };
        } else if (b.type === "delete-all") {
          if (b.data_revision !== a.data_revision)
            throw new Fault("REVISION_CONFLICT", 409);
          const d = blank();
          s.data = d;
          s.account = {
            generation_id: uid(),
            dataset_id: d.dataset_id,
            settings: d.settings,
            data_revision: 1,
            ops: {},
            slots: {},
            sessions: {},
            plans: {},
            shares: {},
          };
          result = { deleted: true };
        } else if (b.type === "mutate") {
          const op = a.ops[b.operation_id];
          if (!op) throw new Fault("OPERATION_EXPIRED", 410);
          const cmd = b.command;
          if (op.action !== cmd.action || op.target !== (cmd.id ?? ""))
            throw new Fault("KEY_PAYLOAD_MISMATCH", 409);
          const h = await hash(cmd);
          if (op.hash && op.hash !== h)
            throw new Fault("KEY_PAYLOAD_MISMATCH", 409);
          op.hash = h;
          if (op.status === "succeeded")
            return reply({ ...op.result, generation_id: a.generation_id });
          if (op.status === "rejected_conflict")
            return reply(
              {
                error: "REVISION_CONFLICT",
                generation_id: a.generation_id,
                operation_id: op.id,
              },
              409,
            );
          try {
            if (cmd.action === "session" || cmd.action === "draw") {
              let sess =
                cmd.action === "session"
                  ? {
                      id: uid(),
                      entry: cmd.entry === "usual" ? "usual" : "new",
                      conditions: conditions(cmd.conditions),
                      shown: [],
                      revision: 1,
                      expires: Date.now() + 1800000,
                    }
                  : a.sessions[cmd.id];
              if (!sess) throw new Fault("SESSION_EXPIRED", 410);
              if (cmd.action === "draw" && sess.revision !== cmd.revision)
                throw new Fault("REVISION_CONFLICT", 409);
              if (cmd.reset) sess.shown = [];
              if (cmd.conditions) sess.conditions = conditions(cmd.conditions);
              Object.assign(sess, draw(s.data, sess), {
                revision: sess.revision + 1,
                expires: Date.now() + 1800000,
              });
              a.sessions[sess.id] = sess;
              const sessionIds = Object.keys(a.sessions);
              for (const id of sessionIds.slice(
                0,
                Math.max(0, sessionIds.length - 20),
              ))
                delete a.sessions[id];
              result = { session: sess };
            } else if (cmd.action === "import-commit") {
              const p = a.plans[cmd.plan_id];
              if (!p) throw new Fault("PLAN_EXPIRED", 410);
              if (p.data_revision !== a.data_revision)
                throw new Fault("REVISION_CONFLICT", 409);
              const m = merge(s.data, p.incoming, p.choices);
              check(m.data);
              s.data = m.data;
              a.published_ids = [];
              a.data_revision++;
              result = { imported: true };
            } else {
              if (cmd.action === "settings" && cmd.revision !== a.data_revision)
                throw new Fault("REVISION_CONFLICT", 409);
              execute(s.data, cmd);
              if (
                cmd.action === "edit-execution" &&
                cmd.publish !== undefined
              ) {
                if (typeof cmd.publish !== "boolean")
                  throw new Fault("公開指定が不正です");
                const ids = new Set<string>(a.published_ids ?? []);
                if (cmd.publish) ids.add(cmd.id);
                else ids.delete(cmd.id);
                a.published_ids = [...ids];
              }
              a.published_ids = (a.published_ids ?? []).filter((id: string) =>
                s.data.executions.some(
                  (e: Data) => e.id === id && publicPost(s.data, e) !== null,
                ),
              );
              check(s.data);
              a.data_revision++;
              result = { saved: true };
            }
            op.status = "succeeded";
            op.result = result;
          } catch (e) {
            if (e instanceof Fault && e.code === "REVISION_CONFLICT") {
              s.data = structuredClone(before.data);
              a.published_ids = before.account.published_ids ?? [];
              a.data_revision = before.account.data_revision;
              op.status = "rejected_conflict";
              result = { error: e.code, operation_id: op.id };
              status = 409;
            } else if (e instanceof Fault || (e as any)?.issues) {
              s.data = structuredClone(before.data);
              a.published_ids = before.account.published_ids ?? [];
              a.data_revision = before.account.data_revision;
              status = e instanceof Fault ? e.status : 400;
              result = {
                error:
                  e instanceof Fault ? e.code : "入力項目を確認してください",
              };
            } else throw e;
          }
        } else throw new Fault("操作が不明です");
        await commit(before, s);
        return reply(
          { ...result, generation_id: s.account.generation_id },
          status,
        );
      } catch (e) {
        if (e instanceof Fault && e.code === "BUSY_RETRY") continue;
        throw e;
      }
    }
    throw new Fault("BUSY_RETRY", 409);
  } catch (e) {
    return err(e);
  }
}
