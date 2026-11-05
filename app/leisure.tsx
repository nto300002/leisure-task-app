"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Plus,
  Shuffle,
  Compass,
  BookOpen,
  Settings,
  Database,
  Check,
  Clock,
  SlidersHorizontal,
  X,
  Sprout,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-react";
import {
  activity,
  base,
  defaults,
  ready,
  tagNames,
  today,
  type Data,
} from "../lib/domain";
const labels: Data = {
  home: "今日のひとつ",
  tasks: "いつもの候補",
  records: "活動の記録",
  settings: "興味と目標",
  data: "保存と共有",
};
const icons: Data = {
  home: Compass,
  tasks: Sprout,
  records: BookOpen,
  settings: Settings,
  data: Database,
};
function save(content: string, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([content], {
      type: name.endsWith(".json")
        ? "application/json"
        : "text/markdown;charset=utf-8",
    }),
  );
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const messages: Data = {
  REVISION_CONFLICT:
    "別の操作で内容が変わりました。最新の状態を確認して、もう一度保存してください。",
  QUOTA_EXCEEDED:
    "保存容量の上限です。記録を整理してからやり直してください。開始済みの活動は終了できます。",
  GENERATION_EXPIRED: "データが全削除されています。最新の画面に戻しました。",
  SESSION_EXPIRED: "候補の有効時間が過ぎました。入口から選び直してください。",
  OPERATION_EXPIRED: "操作キーが失効しました。最新の状態を確認してください。",
  BUSY_RETRY: "別の保存処理と重なりました。同じ操作を再送してください。",
  KEY_PAYLOAD_MISMATCH:
    "先の操作の結果を確認してから次の操作を行ってください。",
};
export default function Leisure() {
  const channel = useRef<BroadcastChannel | null>(null);
  const [state, S] = useState<Data | null>(null),
    [view, V] = useState("home"),
    [session, SS] = useState<Data | null>(null),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [notice, N] = useState(""),
    [modal, M] = useState<Data | null>(null),
    [cond, C] = useState<Data>(defaults),
    [showCond, SC] = useState(false),
    [showDeleted, SD] = useState(false),
    [pending, P] = useState<Data | null>(null),
    [conflict, CF] = useState<Data | null>(null),
    [raw, RAW] = useState(""),
    [plan, PL] = useState<Data | null>(null),
    [choices, CH] = useState<string[]>([]),
    [shared, SH] = useState<Data | null>(null);
  async function load() {
    const r = await fetch("/api/state", { cache: "no-store" });
    const x = (await r.json()) as Data;
    if (!r.ok) throw Error(x.error);
    const previous = sessionStorage.getItem("leisure-generation");
    if (previous && previous !== x.generation_id) {
      SS(null);
      M(null);
      P(null);
      CF(null);
      PL(null);
      SH(null);
      sessionStorage.removeItem("leisure-session");
      sessionStorage.removeItem("leisure-pending");
    }
    sessionStorage.setItem("leisure-generation", x.generation_id);
    S(x);
    return x;
  }
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel("leisure-dataset");
    channel.current = c;
    c.onmessage = () => {
      load().catch((e) => E(e.message));
    };
    return () => c.close();
  }, []);
  useEffect(() => {
    if (!modal) return;
    const el = document.querySelector<HTMLElement>("[role=dialog]");
    const prev = document.activeElement as HTMLElement;
    el?.querySelector<HTMLElement>("input,button,select,textarea")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        M(null);
        return;
      }
      if (e.key === "Tab" && el) {
        const nodes = [
          ...el.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select,textarea,a[href]",
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [modal?.kind, busy]);
  useEffect(() => {
    load()
      .then(async (x) => {
        const p = sessionStorage.getItem("leisure-pending");
        if (p) {
          const y = JSON.parse(p);
          if (y.generation_id === x.generation_id) P(y);
          else sessionStorage.removeItem("leisure-pending");
        }
        const id = sessionStorage.getItem("leisure-session");
        if (id) {
          try {
            const z = await request({ type: "session-read", id }, x);
            SS(z.session);
          } catch {
            sessionStorage.removeItem("leisure-session");
          }
        }
      })
      .catch((e) => E(e.message));
  }, []);
  async function request(body: Data, st = state) {
    const r = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generation_id: st?.generation_id, ...body }),
    });
    const x = (await r.json()) as Data;
    if (!r.ok)
      throw Object.assign(new Error(x.error), {
        code: x.error,
        status: r.status,
      });
    return x;
  }
  async function safe(fn: () => Promise<any>) {
    B(true);
    E("");
    N("");
    try {
      await fn();
    } catch (e: any) {
      E(messages[e.code] ?? e.message);
      if (e.code === "GENERATION_EXPIRED") {
        SS(null);
        M(null);
        P(null);
        CF(null);
        sessionStorage.clear();
        await load();
      }
    } finally {
      B(false);
    }
  }
  async function send(p: Data) {
    try {
      const r = await request({
        type: "mutate",
        operation_id: p.operation_id,
        command: p.command,
        generation_id: p.generation_id,
      });
      P(null);
      sessionStorage.removeItem("leisure-pending");
      CF(null);
      if (r.session) {
        SS(r.session);
        sessionStorage.setItem("leisure-session", r.session.id);
      }
      const fresh = await load();
      if (r.generation_id !== fresh.generation_id) {
        SS(null);
        M(null);
        sessionStorage.removeItem("leisure-session");
      }
      return r;
    } catch (e: any) {
      if (e.status && e.status < 500 && e.code !== "BUSY_RETRY") {
        P(null);
        sessionStorage.removeItem("leisure-pending");
        if (e.code === "REVISION_CONFLICT") {
          CF(p);
          await load();
        }
      }
      throw e;
    }
  }
  async function mutate(command: Data, replace?: string) {
    if (pending)
      throw Error(
        "結果が確認できていない操作があります。先に「同じ操作を再送」を押してください。",
      );
    const r = await request({
      type: "issue",
      action: command.action,
      target: command.id ?? "",
      replace,
      revision: command.revision,
    });
    const p = {
      operation_id: r.operation_id,
      command,
      generation_id: state?.generation_id,
    };
    P(p);
    sessionStorage.setItem("leisure-pending", JSON.stringify(p));
    return send(p);
  }
  const run = (command: Data, done?: () => void) =>
    safe(async () => {
      await mutate(command);
      done?.();
    });
  if (!state)
    return (
      <main className="loading">
        <Sprout />
        <h1>ひとつ、やってみる</h1>
        <p>{error || "準備しています…"}</p>
        {error && <button onClick={() => location.reload()}>再読み込み</button>}
      </main>
    );
  const d = state.data,
    running = d.executions.find((e: Data) => e.status === "running"),
    candidate = session?.candidate;
  const stat = (key: string) =>
    d.activity_states.find((s: Data) => s.activity_key === key) ?? {
      revision: 0,
      tried: false,
      blocked: false,
    };
  const toggle = (key: string, patch: Data) =>
    run({ action: "activity", key, revision: stat(key).revision, patch });
  function start(t: Data) {
    run(
      {
        action: "start",
        ...(session?.entry === "new"
          ? { catalog_id: t.source_catalog_id }
          : { task_id: t.id }),
      },
      () => N("始めました。小さな一歩だけでも大丈夫。"),
    );
  }
  async function endSession() {
    if (session) {
      await request({ type: "session-close", id: session.id });
      SS(null);
      sessionStorage.removeItem("leisure-session");
    }
    C(defaults);
  }
  function finish(status: string, mark = false) {
    const command = {
      action: "finish",
      id: running.id,
      revision: running.revision,
      status,
      mark_tried: mark,
    };
    safe(async () => {
      await mutate(
        command,
        conflict?.command.id === running.id
          ? conflict?.operation_id
          : state?.finish_conflicts?.find((o: Data) => o.target === running.id)
              ?.id,
      );
      M(null);
      await endSession();
      N(
        status === "completed"
          ? "おつかれさまでした。ひとつ、できました。"
          : "ここまでの活動を保存しました。",
      );
    });
  }
  function taskForm(t?: Data) {
    M({
      kind: "task",
      item: t
        ? structuredClone(t)
        : {
            ...base(),
            title: "",
            purpose: null,
            duration_min: 5,
            minimum_action: "",
            first_step: "",
            energy: null,
            focus: null,
            physical: null,
            places: null,
            tools: null,
            additional_cost_yen: null,
            preparation_min: null,
            tags: [],
            start_url: null,
            source_catalog_id: null,
            source_catalog_version: null,
            deleted_at: null,
          },
      goals: t
        ? d.task_goals
            .filter((g: Data) => g.task_id === t.id)
            .map((g: Data) => g.goal_id)
        : [],
    });
  }
  const update = (patch: Data) =>
    M((m) => (m ? { ...m, item: { ...m.item, ...patch } } : m));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            V("home");
          }}
        >
          <span className="brand-icon">
            <Sprout size={25} />
          </span>
          <span>
            ひとつ、
            <br />
            やってみる<span className="brand-sub">A LITTLE MOMENT</span>
          </span>
        </a>
        <nav>
          {Object.entries(labels).map(([k, label]) => {
            const Icon = icons[k];
            return (
              <button
                key={k}
                className={view === k ? "nav-item active" : "nav-item"}
                onClick={() => {
                  V(k);
                  E("");
                  N("");
                  if (k === "home" && view !== "home") safe(endSession);
                }}
              >
                <Icon size={19} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <span className="small-flower">✳</span>
          <p>
            ちゃんとした趣味に
            <br />
            ならなくても、いい。
          </p>
          <small>あなたのペースで、少しずつ。</small>
        </div>
        <div className="private-dot">自分だけのワークスペース</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            {new Intl.DateTimeFormat("ja-JP", {
              month: "long",
              day: "numeric",
              weekday: "long",
              timeZone: d.settings.timezone,
            }).format(new Date())}
          </span>
          <span className="top-note">
            <span /> 小さく始める、今日の余暇
          </span>
        </header>
        <div className="content">
          <div role="status" aria-live="polite">
            {(state.capacity.maxBytes >= 5242880 * 0.9 ||
              state.capacity.maxRows >= 9000) && (
              <p className="notice">
                保存量が上限の90%に達しています。バックアップを保存し、不要な記録を整理してください。
              </p>
            )}
            {notice && <p className="notice">{notice}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {pending && (
            <div className="notice">
              <b>保存結果を確認しています。</b>
              <p>同じ操作を再送しても、記録は重複しません。</p>
              <button disabled={busy} onClick={() => safe(() => send(pending))}>
                同じ操作を再送
              </button>
            </div>
          )}
          {running && (
            <section className="running">
              <div className="running-icon">
                <Play size={20} />
              </div>
              <div>
                <small>いま、取り組んでいること</small>
                <b>{running.record_title}</b>
              </div>
              <div className="actions">
                <button
                  disabled={busy}
                  onClick={() => finish("completed")}
                  className="primary small"
                >
                  <Check size={16} /> 完了
                </button>
                <button disabled={busy} onClick={() => M({ kind: "stop" })}>
                  途中で終える
                </button>
              </div>
            </section>
          )}
          {view === "home" && (
            <>
              <div className="hero">
                <div>
                  <p className="eyebrow">MAKE ROOM FOR A LITTLE JOY</p>
                  <h1>
                    空いた時間に、
                    <br />
                    ひとつ、やってみよう。
                  </h1>
                  <p className="intro">
                    何をしようか迷ったら、ここから。
                    <br />
                    今の自分に合う、小さなきっかけを選びます。
                  </p>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <svg viewBox="0 0 240 240">
                    <circle cx="120" cy="120" r="101" fill="#e8ecdd" />
                    <path
                      d="M122 189C110 146 134 112 120 68M120 147C65 148 56 120 62 95c42 0 62 17 58 52M122 113c47 3 61-21 61-45-37-2-60 13-61 45"
                      fill="#9da985"
                      stroke="#526647"
                      strokeWidth="2"
                    />
                    <path
                      d="M63 95l56 52m64-79-61 45"
                      stroke="#526647"
                      strokeWidth="2"
                    />
                    <circle cx="190" cy="163" r="15" fill="#e7b397" />
                    <path
                      d="M43 62v18m-9-9h18M190 30v14m-7-7h14"
                      stroke="#a17c5c"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>JUST ONE SMALL STEP</span>
                </div>
              </div>
              <div className="section-line">
                <h2>今日は、どちらから？</h2>
                <button className="text-button" onClick={() => SC(!showCond)}>
                  <SlidersHorizontal size={16} /> 条件を調整
                </button>
              </div>
              {showCond && (
                <div className="conditions panel">
                  <p>
                    この条件で候補を選びます。省略時は5分・追加費用なし・準備なし・低負荷です。
                  </p>
                  <div className="form-grid">
                    {[
                      ["minutes", "使える時間（分）", 240],
                      ["cost", "追加費用（円）", 100000],
                      ["prep", "準備時間（分）", 60],
                    ].map(([key, label, max]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="number"
                          min={key === "minutes" ? 1 : 0}
                          max={max}
                          value={cond[key]}
                          onChange={(e) =>
                            C({ ...cond, [key]: +e.target.value })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      場所
                      <select
                        value={cond.place}
                        onChange={(e) => C({ ...cond, place: e.target.value })}
                      >
                        <option value="any">指定なし</option>
                        <option value="home">家</option>
                        <option value="outside">外</option>
                      </select>
                    </label>
                    {[
                      ["energy", "気力"],
                      ["focus", "集中力"],
                      ["physical", "身体負荷"],
                    ].map(([k, l]) => (
                      <label key={k}>
                        {l}
                        <select
                          value={cond[k]}
                          onChange={(e) => C({ ...cond, [k]: +e.target.value })}
                        >
                          <option value={1}>低め（1）</option>
                          <option value={2}>普通まで（2）</option>
                          <option value={3}>高めまで（3）</option>
                        </select>
                      </label>
                    ))}
                    <label>
                      使える道具（読点区切り）
                      <input
                        value={cond.tools.join("、")}
                        onChange={(e) =>
                          C({
                            ...cond,
                            tools: e.target.value
                              .split(/[、,]/)
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      SC(false);
                      if (session)
                        run({
                          action: "draw",
                          id: session.id,
                          revision: session.revision,
                          conditions: cond,
                        });
                    }}
                  >
                    この条件を使う
                  </button>
                </div>
              )}
              <div className="entry-grid">
                <button
                  disabled={busy}
                  className="entry-card new"
                  onClick={() =>
                    run({ action: "session", entry: "new", conditions: cond })
                  }
                >
                  <span className="entry-top">
                    <span className="pill">NEW DISCOVERY</span>
                    <Compass size={25} />
                  </span>
                  <h2>新しい趣味を試す</h2>
                  <p>
                    まだ知らない「好き」に出会う。
                    <br />
                    準備いらずの小さなお試しから。
                  </p>
                  <span className="entry-bottom">
                    候補をひとつ見る <ArrowRight size={22} />
                  </span>
                </button>
                <button
                  disabled={busy}
                  className="entry-card usual"
                  onClick={() =>
                    run({ action: "session", entry: "usual", conditions: cond })
                  }
                >
                  <span className="entry-top">
                    <span className="pill">YOUR FAVORITES</span>
                    <Sprout size={25} />
                  </span>
                  <h2>いつもの候補から</h2>
                  <p>
                    登録した、やってみたいこと。
                    <br />
                    いまの気分に合うひとつを。
                  </p>
                  <span className="entry-bottom">
                    候補をひとつ見る <ArrowRight size={22} />
                  </span>
                </button>
              </div>
              {session && (
                <section className="proposal panel" aria-live="polite">
                  <div className="section-line">
                    <p className="eyebrow">
                      {session.entry === "new"
                        ? "はじめての小さな体験"
                        : "いつもの候補から"}
                    </p>
                    <span className="badge">
                      <Clock size={14} /> {session.conditions.minutes}分以内
                    </span>
                  </div>
                  {candidate ? (
                    <>
                      <h2>{candidate.title}</h2>
                      <p>{candidate.purpose}</p>
                      <div className="first-step">
                        <span>まずは、これだけ</span>
                        <p>{candidate.first_step}</p>
                        <small>小さな達成：{candidate.minimum_action}</small>
                      </div>
                      <div className="candidate-meta">
                        <span>{candidate.duration_min}分</span>
                        <span>追加 {candidate.additional_cost_yen}円</span>
                        <span>準備 {candidate.preparation_min}分</span>
                        {candidate.tags.map((t: string) => (
                          <span key={t}>{tagNames[t] ?? t}</span>
                        ))}
                      </div>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={busy || !!running}
                          onClick={() => start(candidate)}
                        >
                          <Play size={17} /> これを始める
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            run({
                              action: "draw",
                              id: session.id,
                              revision: session.revision,
                            })
                          }
                        >
                          <Shuffle size={17} /> 選び直す
                        </button>
                        {candidate.start_url && (
                          <a
                            href={candidate.start_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            関連ページを開く
                          </a>
                        )}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => safe(endSession)}
                      >
                        今回は見送る
                      </button>
                      <div className="proposal-footer">
                        <small>{session.reason}</small>
                        <div>
                          {session.entry === "new" && (
                            <button
                              disabled={busy}
                              className="text-button"
                              onClick={() =>
                                d.tasks.some((t:Data)=>t.source_catalog_id===candidate.source_catalog_id&&t.deleted_at)?M({kind:"restore-catalog",id:candidate.source_catalog_id}):run(
                                  {
                                    action: "save-catalog",
                                    id: candidate.source_catalog_id,
                                  },
                                  () => N("いつもの候補に保存しました。"),
                                )
                              }
                            >
                              <Plus size={15} /> いつもの候補に保存
                            </button>
                          )}
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => {
                              toggle(activity(candidate), { blocked: true });
                              SS({
                                ...session,
                                candidate: null,
                                reason: "この候補の提案を停止しました",
                              });
                            }}
                          >
                            提案を停止
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty">
                      <Sprout />
                      <h2>{session.reason}</h2>
                      <p>入口や条件を変えるか、登録した候補を見直せます。</p>
                      <div className="actions">
                        <button onClick={() => V("tasks")}>
                          候補を管理する
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            run({
                              action: "session",
                              entry: "usual",
                              conditions: cond,
                            })
                          }
                        >
                          いつもの候補へ
                        </button>
                        {session.reason?.includes("すべて") && (
                          <button
                            onClick={() =>
                              run({
                                action: "draw",
                                id: session.id,
                                revision: session.revision,
                                reset: true,
                              })
                            }
                          >
                            表示した候補を見直す
                          </button>
                        )}
                        <button onClick={() => V("settings")}>
                          試した候補を見直す
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
              <div className="gentle-note">
                <span>✳</span>
                <p>
                  ひとつ試せたら、それで十分。
                  <small>記録も、続けることも、あなたのペースで。</small>
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    M({
                      kind: "manual",
                      item: { title: "", memo: "", date: today(d) },
                    })
                  }
                >
                  自分で活動を記録する <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {view === "tasks" && (
            <>
              <PageHead
                title="いつもの候補"
                sub="好きなこと、やってみたいことを、少しずつ。"
              />
              <button className="primary" onClick={() => taskForm()}>
                <Plus size={18} /> 候補を登録
              </button>
              <label className="check-label"><input type="checkbox" checked={showDeleted} onChange={e=>SD(e.target.checked)}/>削除済みも表示する</label><div className="list">
                {d.tasks.filter((t: Data)=>showDeleted||!t.deleted_at).length === 0 ? (
                  <Empty
                    text="まだ候補がありません"
                    detail="自分で登録するか、新しい趣味のお試し候補を保存できます。"
                  />
                ) : (
                  d.tasks.filter((t: Data)=>showDeleted||!t.deleted_at).map((t: Data) => (
                    <article
                      className={"list-card " + (t.deleted_at ? "muted" : "")}
                      key={t.id}
                    >
                      <div>
                        <div className="tags">
                          <span className="badge">{t.duration_min}分</span>
                          <span className="badge">
                            {t.deleted_at
                              ? "削除済み"
                              : ready(t)
                                ? "抽選に使える"
                                : "条件の確認待ち"}
                          </span>
                          {stat(activity(t)).blocked && (
                            <span className="badge">提案停止中</span>
                          )}
                        </div>
                        <h3>{t.title}</h3>
                        <p>{t.first_step}</p>
                        {!ready(t) && !t.deleted_at && (
                          <small>
                            保存済みです。条件を確認すると抽選に使えます。
                          </small>
                        )}
                      </div>
                      <div className="actions">
                        <button onClick={() => taskForm(t)}>編集</button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            run({
                              action: "soft-delete",
                              kind: "tasks",
                              id: t.id,
                              revision: t.revision,
                              restore: !!t.deleted_at,
                            })
                          }
                        >
                          {t.deleted_at ? "復元" : "削除"}
                        </button>
                        {!t.deleted_at && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              toggle(activity(t), {
                                blocked: !stat(activity(t)).blocked,
                              })
                            }
                          >
                            {stat(activity(t)).blocked
                              ? "提案を再開"
                              : "提案を停止"}
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
          {view === "records" && (
            <>
              <PageHead
                title="活動の記録"
                sub="小さな一歩を、振り返る。記録の訂正では「試した」状態は変わりません。"
              />
              <button
                className="primary"
                onClick={() =>
                  M({
                    kind: "manual",
                    item: { title: "", date: today(d), memo: "" },
                  })
                }
              >
                <Plus size={18} /> 自由に記録する
              </button>
              <div className="list">
                {!d.executions.length ? (
                  <Empty
                    text="最初のひとつを、ここに"
                    detail="活動を終えると記録が残ります。自由な記録も追加できます。"
                  />
                ) : (
                  [...d.executions].reverse().map((e: Data) => (
                    <article className="list-card" key={e.id}>
                      <div>
                        <div className="tags">
                          <span>{e.activity_date}</span>
                          <span className="badge">
                            {
                              {
                                running: "実行中",
                                completed: "完了",
                                stopped: "途中終了",
                              }[e.status as string]
                            }
                          </span>
                        </div>
                        <h3>{e.record_title}</h3>
                        <p className="preserve">
                          {e.memo || "メモはありません"}
                        </p>
                        <details>
                          <summary>開始時の内容を見る</summary>
                          <p>{e.snapshot.title}</p>
                          <p>{e.snapshot.first_step}</p>
                        </details>
                        <small>
                          共有：
                          {
                            {
                              none: "含めない",
                              summary: "要約のみ",
                              full: "全文",
                            }[e.share_mode as string]
                          }
                        </small>
                      </div>
                      <div className="actions">
                        <button
                          onClick={() =>
                            M({
                              kind: "record",
                              item: { ...e },
                              goals: d.execution_goals
                                .filter((g: Data) => g.execution_id === e.id)
                                .map((g: Data) => g.goal_id),
                            })
                          }
                        >
                          編集
                        </button>
                        {e.status !== "running" && (
                          <button
                            onClick={() =>
                              M({ kind: "delete-record", item: e })
                            }
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
          {view === "settings" && (
            <>
              <PageHead
                title="興味と目標"
                sub="自分で設定した興味だけを、提案に反映します。履歴からの自動調整は行いません。"
              />
              <section className="panel">
                <h2>気になること</h2>
                <p>選ばなくても利用できます。</p>
                <div className="tag-picker">
                  {Object.entries(tagNames).map(([id, label]) => (
                    <button
                      disabled={busy}
                      aria-pressed={d.interests.some(
                        (x: Data) => x.tag_id === id,
                      )}
                      className={
                        d.interests.some((x: Data) => x.tag_id === id)
                          ? "selected"
                          : ""
                      }
                      key={id}
                      onClick={() =>
                        run({
                          action: "settings",
                          revision: state.data_revision,
                          timezone: d.settings.timezone,
                          tags: d.interests.some((x: Data) => x.tag_id === id)
                            ? d.interests
                                .filter((x: Data) => x.tag_id !== id)
                                .map((x: Data) => x.tag_id)
                            : [...d.interests.map((x: Data) => x.tag_id), id],
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label>
                  記録のタイムゾーン
                  <input
                    defaultValue={d.settings.timezone}
                    onBlur={(e) => {
                      if (e.target.value !== d.settings.timezone)
                        run({
                          action: "settings",
                          revision: state.data_revision,
                          timezone: e.target.value,
                          tags: d.interests.map((x: Data) => x.tag_id),
                        });
                    }}
                  />
                </label>
              </section>
              <section className="panel">
                <div className="section-line">
                  <h2>簡単な目標</h2>
                  <button
                    onClick={() =>
                      M({
                        kind: "goal",
                        item: { ...base(), title: "", deleted_at: null },
                      })
                    }
                  >
                    <Plus size={16} /> 追加
                  </button>
                </div>
                <label className="check-label"><input type="checkbox" checked={showDeleted} onChange={e=>SD(e.target.checked)}/>削除済みも表示する</label>{!d.goals.length && (
                  <p>目標の入力は任意です。最大10件まで登録できます。</p>
                )}
                {d.goals.filter((g: Data)=>showDeleted||!g.deleted_at).map((g: Data) => (
                  <div className="setting-row" key={g.id}>
                    <span>
                      {g.title}
                      {g.deleted_at ? "（削除済み）" : ""}
                    </span>
                    <div className="actions">
                      <button
                        onClick={() => M({ kind: "goal", item: { ...g } })}
                      >
                        編集
                      </button>
                      <button
                        onClick={() =>
                          run({
                            action: "soft-delete",
                            kind: "goals",
                            id: g.id,
                            revision: g.revision,
                            restore: !!g.deleted_at,
                          })
                        }
                      >
                        {g.deleted_at ? "復元" : "削除"}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>お試し候補の状態</h2>
                <p>未経験に戻しても、過去の実行記録は残ります。</p>
                {state.catalog.map((t: Data) => (
                  <div className="setting-row" key={t.id}>
                    <span>
                      {t.title}
                      <small>
                        {stat(activity(t)).tried ? "試した" : "未経験"} ·{" "}
                        {stat(activity(t)).blocked ? "提案停止中" : "提案対象"}
                      </small>
                    </span>
                    <div className="actions">
                      <button
                        disabled={busy}
                        onClick={() =>
                          toggle(activity(t), {
                            tried: !stat(activity(t)).tried,
                          })
                        }
                      >
                        {stat(activity(t)).tried
                          ? "未経験へ戻す"
                          : "試したにする"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          toggle(activity(t), {
                            blocked: !stat(activity(t)).blocked,
                          })
                        }
                      >
                        {stat(activity(t)).blocked ? "再開" : "停止"}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
          {view === "data" && (
            <>
              <PageHead
                title="保存と共有"
                sub="自分のデータを手元に。共有する内容は、書き出す前に確認できます。"
              />
              <section className="panel">
                <h2>完全バックアップ</h2>
                <p>
                  削除済みのタスク・目標、関連付け、設定を含むJSONを保存します。
                </p>
                <div className="meter">
                  <span
                    style={{
                      width:
                        Math.max(1, (state.capacity.maxBytes / 5242880) * 100) +
                        "%",
                    }}
                  />
                </div>
                <p className="caption">
                  {(state.capacity.bytes / 1024).toFixed(1)} KiB / 5 MiB ·{" "}
                  {state.capacity.rows} / 10,000行（終了用予約{" "}
                  {state.capacity.reservedBytes}バイト・
                  {state.capacity.reservedRows}行）
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    safe(async () => {
                      const r = await request({ type: "backup" });
                      save(r.content, r.filename);
                      N("バックアップを書き出しました。");
                    })
                  }
                >
                  <Download size={17} /> JSONを書き出す
                </button>
              </section>
              <section className="panel">
                <h2>バックアップを取り込む</h2>
                <p>
                  最大5MiB。内容を検証してから、まとめて反映します。同じIDの競合は保存先を優先します。
                </p>
                <input
                  aria-label="バックアップJSON"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) =>
                    safe(async () => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5242880)
                        throw Error("ファイルは5MiBまでです");
                      const text = await f.text();
                      RAW(text);
                      CH([]);
                      PL(await request({ type: "import-preview", raw: text }));
                    })
                  }
                />
                {plan && (
                  <div className="import-plan">
                    <p>
                      追加 {plan.added}行 ·{" "}
                      {plan.empty ? "空の保存先へ復元" : "既存データに統合"} ·
                      競合 {plan.conflicts.length}件
                    </p>
                    {plan.conflicts.map((c: Data) => (
                      <label className="check-label" key={c.key}>
                        <input
                          type="checkbox"
                          checked={choices.includes(c.key)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...choices, c.key]
                              : choices.filter((x) => x !== c.key);
                            CH(next);
                            safe(async () =>
                              PL(
                                await request({
                                  type: "import-preview",
                                  raw,
                                  choices: next,
                                }),
                              ),
                            );
                          }}
                        />
                        取り込み側を使用：{c.title}
                      </label>
                    ))}
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        run(
                          { action: "import-commit", plan_id: plan.plan_id },
                          () => {
                            PL(null);
                            SS(null);
                            N("取り込みが完了しました。");
                          },
                        )
                      }
                    >
                      確認した内容を取り込む
                    </button>
                  </div>
                )}
              </section>
              <section className="panel">
                <h2>記録をMarkdownで共有</h2>
                <p>
                  「共有しない」は除外、「要約のみ」は専用の要約だけを書き出します。公開投稿は行いません。
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    safe(async () =>
                      SH(
                        await request({
                          type: "share-preview",
                          ids: d.executions.map((e: Data) => e.id),
                        }),
                      ),
                    )
                  }
                >
                  共有内容をプレビュー
                </button>
                {shared && (
                  <>
                    <pre>
                      {shared.content ||
                        "共有対象がありません。記録の編集画面で共有範囲を設定してください。"}
                    </pre>
                    {shared.content && (
                      <button
                        onClick={() =>
                          safe(async () => {
                            const r = await request({
                              type: "share-export",
                              id: shared.preview_id,
                            });
                            save(r.content, r.filename);
                          })
                        }
                      >
                        確認したMarkdownを保存
                      </button>
                    )}
                  </>
                )}
              </section>
              <section className="panel danger-zone">
                <h2>全データを削除</h2>
                <p>
                  記録、候補、目標、設定を削除し、削除前の操作を無効にします。先にバックアップを保存してください。ダウンロード済みのファイルやサイト外の共有内容は残ります。
                </p>
                <button
                  className="danger"
                  onClick={() => M({ kind: "delete-all", confirm: "" })}
                >
                  <Trash2 size={16} /> 全データ削除へ
                </button>
              </section>
            </>
          )}
          <footer>
            ひとつ、やってみる <span>余暇は、自由でいい。</span>
          </footer>
        </div>
      </main>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) M(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="modal"
          >
            <button
              className="close"
              aria-label="閉じる"
              disabled={busy}
              onClick={() => M(null)}
            >
              <X />
            </button>
            <h2 id="dialog-title">
              {
                {
                  task: "候補を編集",
                  record: "記録を編集",
                  manual: "自由に記録する",
                  goal: "目標を編集",
                  stop: "ここまでで、ひと区切り",
                  "delete-record": "記録を削除",
                  "delete-all": "全データを削除",
 "restore-catalog":"保存した候補を復元",
                }[modal.kind as string]
              }
            </h2>
            {["task", "record", "manual", "goal"].includes(modal.kind) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const item = modal.item;
                  const command =
                    modal.kind === "task"
                      ? {
                          action: "task",
                          item,
                          task_goals: modal.goals.map((goal_id: string) => ({
                            task_id: item.id,
                            goal_id,
                          })),
                        }
                      : modal.kind === "goal"
                        ? { action: "goal", item }
                        : modal.kind === "manual"
                          ? { action: "manual", ...item }
                          : {
                              action: "edit-execution",
                              id: item.id,
                              revision: item.revision,
                              patch: Object.fromEntries(
                                [
                                  "record_title",
                                  "memo",
                                  "activity_date",
                                  "satisfaction",
                                  "repeat_wish",
                                  "share_mode",
                                  "share_summary",
                                  ...(item.status !== "running"
                                    ? ["status"]
                                    : []),
                                ].map((k) => [k, item[k]]),
                              ),
                              execution_goals: modal.goals.map(
                                (goal_id: string) => ({
                                  execution_id: item.id,
                                  goal_id,
                                }),
                              ),
                            };
                  run(command, () => {
                    M(null);
                    N("保存しました。");
                  });
                }}
              >
                <label>
                  タイトル（必須）
                  <input
                    required
                    maxLength={100}
                    value={
                      modal.item[
                        modal.kind === "record" ? "record_title" : "title"
                      ]
                    }
                    onChange={(e) =>
                      update({
                        [modal.kind === "record" ? "record_title" : "title"]:
                          e.target.value,
                      })
                    }
                  />
                </label>
                {modal.kind === "task" && (
                  <>
                    <label>
                      目安の時間（分・必須）
                      <input
                        required
                        type="number"
                        min={1}
                        max={240}
                        value={modal.item.duration_min}
                        onChange={(e) =>
                          update({ duration_min: +e.target.value })
                        }
                      />
                    </label>
                    <label>
                      最小の一歩（必須）
                      <input
                        required
                        maxLength={500}
                        value={modal.item.minimum_action}
                        onChange={(e) =>
                          update({ minimum_action: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      最初にすること（必須）
                      <textarea
                        required
                        maxLength={500}
                        value={modal.item.first_step}
                        onChange={(e) => update({ first_step: e.target.value })}
                      />
                    </label>
                    <p className="notice compact">
                      {ready(modal.item)
                        ? "✓ 保存すると抽選に使えます。"
                        : "このまま保存できます。抽選に使うには、下の条件確認が必要です。"}
                    </p>
                    <details open={!ready(modal.item)}>
                      <summary>抽選に使う条件を確認する</summary>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            energy: 1,
                            focus: 1,
                            physical: 1,
                            places: ["any"],
                            tools: [],
                            additional_cost_yen: 0,
                            preparation_min: 0,
                          })
                        }
                      >
                        低負荷・どこでも・道具／費用／準備なしと確認
                      </button>
                      <div className="form-grid">
                        {[
                          ["energy", "気力"],
                          ["focus", "集中力"],
                          ["physical", "身体負荷"],
                        ].map(([k, l]) => (
                          <label key={k}>
                            {l}
                            <select
                              value={modal.item[k] ?? ""}
                              onChange={(e) =>
                                update({
                                  [k]: e.target.value ? +e.target.value : null,
                                })
                              }
                            >
                              <option value="">不明</option>
                              <option value={1}>低い（1）</option>
                              <option value={2}>普通（2）</option>
                              <option value={3}>高い（3）</option>
                            </select>
                          </label>
                        ))}
                        <label>
                          場所
                          <select
                            value={modal.item.places?.[0] ?? ""}
                            onChange={(e) =>
                              update({
                                places: e.target.value
                                  ? [e.target.value]
                                  : null,
                              })
                            }
                          >
                            <option value="">不明</option>
                            <option value="any">どこでも</option>
                            <option value="home">家</option>
                            <option value="outside">外</option>
                          </select>
                        </label>
                        <label>
                          追加費用（円）
                          <input
                            type="number"
                            min={0}
                            max={100000}
                            value={modal.item.additional_cost_yen ?? ""}
                            onChange={(e) =>
                              update({
                                additional_cost_yen:
                                  e.target.value === ""
                                    ? null
                                    : +e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          準備（分）
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={modal.item.preparation_min ?? ""}
                            onChange={(e) =>
                              update({
                                preparation_min:
                                  e.target.value === ""
                                    ? null
                                    : +e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <label>
                        道具（読点区切り・空欄は道具なし）
                        <input
                          placeholder="未確認"
                          value={modal.item.tools?.join("、") ?? ""}
                          onChange={(e) =>
                            update({
                              tools: e.target.value
                                .split(/[、,]/)
                                .filter(Boolean),
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => update({ tools: [] })}
                      >
                        道具なしと確認
                      </button>
                    </details>
                    <label>
                      目的（任意）
                      <textarea
                        maxLength={500}
                        value={modal.item.purpose ?? ""}
                        onChange={(e) =>
                          update({ purpose: e.target.value || null })
                        }
                      />
                    </label>
                    <label>
                      関連ページ（HTTPS・任意）
                      <input
                        type="url"
                        value={modal.item.start_url ?? ""}
                        onChange={(e) =>
                          update({ start_url: e.target.value || null })
                        }
                      />
                    </label>
                    <div className="tag-picker">
                      {Object.entries(tagNames).map(([k, l]) => (
                        <button
                          type="button"
                          key={k}
                          className={
                            modal.item.tags.includes(k) ? "selected" : ""
                          }
                          onClick={() =>
                            update({
                              tags: modal.item.tags.includes(k)
                                ? modal.item.tags.filter((x: string) => x !== k)
                                : [...modal.item.tags, k],
                            })
                          }
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {["record", "manual"].includes(modal.kind) && (
                  <>
                    <label>
                      活動日
                      <input
                        type="date"
                        required
                        max={today(d)}
                        value={
                          modal.item[
                            modal.kind === "manual" ? "date" : "activity_date"
                          ]
                        }
                        onChange={(e) =>
                          update({
                            [modal.kind === "manual"
                              ? "date"
                              : "activity_date"]: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      メモ（任意）
                      <textarea
                        maxLength={2000}
                        value={modal.item.memo}
                        onChange={(e) => update({ memo: e.target.value })}
                      />
                    </label>
                  </>
                )}
                {modal.kind === "record" && modal.item.status !== "running" && (
                  <>
                    <label>
                      状態
                      <select
                        value={modal.item.status}
                        onChange={(e) => update({ status: e.target.value })}
                      >
                        <option value="completed">完了</option>
                        <option value="stopped">途中終了</option>
                      </select>
                    </label>
                    <label>
                      満足度（任意・抽選には反映しません）
                      <select
                        value={modal.item.satisfaction ?? ""}
                        onChange={(e) =>
                          update({
                            satisfaction: e.target.value
                              ? +e.target.value
                              : null,
                          })
                        }
                      >
                        <option value="">未入力</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      またやりたい？
                      <select
                        value={modal.item.repeat_wish ?? ""}
                        onChange={(e) =>
                          update({ repeat_wish: e.target.value || null })
                        }
                      >
                        <option value="">未入力</option>
                        <option value="yes">はい</option>
                        <option value="no">いいえ</option>
                      </select>
                    </label>
                  </>
                )}
                {["task", "record"].includes(modal.kind) &&
                  d.goals.some((g: Data) => !g.deleted_at) && (
                    <fieldset>
                      <legend>関連する目標（任意）</legend>
                      {d.goals
                        .filter((g: Data) => !g.deleted_at)
                        .map((g: Data) => (
                          <label className="check-label" key={g.id}>
                            <input
                              type="checkbox"
                              checked={modal.goals.includes(g.id)}
                              onChange={(e) =>
                                M({
                                  ...modal,
                                  goals: e.target.checked
                                    ? [...modal.goals, g.id]
                                    : modal.goals.filter(
                                        (x: string) => x !== g.id,
                                      ),
                                })
                              }
                            />
                            {g.title}
                          </label>
                        ))}
                    </fieldset>
                  )}
                {modal.kind !== "manual" && (
                  <>
                    <label>
                      共有範囲
                      <select
                        value={modal.item.share_mode}
                        onChange={(e) => update({ share_mode: e.target.value })}
                      >
                        <option value="none">共有しない</option>
                        <option value="summary">専用の要約のみ</option>
                        <option value="full">全文</option>
                      </select>
                    </label>
                    {modal.item.share_mode === "summary" && (
                      <label>
                        共有用の要約
                        <textarea
                          maxLength={500}
                          value={modal.item.share_summary ?? ""}
                          onChange={(e) =>
                            update({ share_summary: e.target.value || null })
                          }
                        />
                      </label>
                    )}
                  </>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => M(null)}>
                    キャンセル
                  </button>
                  <button className="primary" disabled={busy} type="submit">
                    保存する
                  </button>
                </div>
              </form>
            )}
            {modal.kind === "restore-catalog" && <><p>保存済みの候補は削除されています。同じ候補を復元しますか？</p><button className="primary" disabled={busy} onClick={()=>run({action:"save-catalog",id:modal.id,restore:true},()=>{M(null);N("候補を復元しました。");})}>候補を復元する</button></>}{modal.kind === "stop" && (
              <>
                <p>
                  途中で終えても大丈夫。試したことにするか、自分で選べます。
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={modal.mark ?? false}
                    onChange={(e) => M({ ...modal, mark: e.target.checked })}
                  />
                  この活動を「試した」にする
                </label>
                <div className="actions">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => finish("stopped", modal.mark ?? false)}
                  >
                    途中終了を保存
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      safe(async () => {
                        await mutate(
                          {
                            action: "cancel",
                            id: running.id,
                            revision: running.revision,
                          },
                          conflict?.command.id === running.id
                            ? conflict?.operation_id
                            : state?.finish_conflicts?.find(
                                (o: Data) => o.target === running.id,
                              )?.id,
                        );
                        M(null);
                      })
                    }
                  >
                    開始を取り消す
                  </button>
                </div>
                <small>開始を取り消すと、この実行記録を削除します。</small>
              </>
            )}
            {modal.kind === "delete-record" && (
              <>
                <p>
                  「{modal.item.record_title}
                  」を削除します。「試した」状態は変わりません。
                </p>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    run(
                      {
                        action: "delete-execution",
                        id: modal.item.id,
                        revision: modal.item.revision,
                      },
                      () => M(null),
                    )
                  }
                >
                  記録を削除する
                </button>
              </>
            )}
            {modal.kind === "delete-all" && (
              <>
                <p>
                  この操作は取り消せません。確認のため「全削除」と入力してください。
                </p>
                <input
                  aria-label="全削除の確認"
                  value={modal.confirm}
                  onChange={(e) => M({ ...modal, confirm: e.target.value })}
                />
                <button
                  disabled={busy || modal.confirm !== "全削除"}
                  className="danger"
                  onClick={() =>
                    safe(async () => {
                      await request({
                        type: "delete-all",
                        data_revision: state.data_revision,
                      });
                      P(null);
                      CF(null);
                      SS(null);
                      PL(null);
                      SH(null);
                      M(null);
                      sessionStorage.clear();
                      await load();
                      channel.current?.postMessage({ type: "deleted" });
                      N("全データを削除しました。");
                    })
                  }
                >
                  全データを削除する
                </button>
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="page-head">
      <p className="eyebrow">YOUR LITTLE MOMENTS</p>
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}
function Empty({ text, detail }: { text: string; detail: string }) {
  return (
    <div className="empty">
      <Sprout />
      <h2>{text}</h2>
      <p>{detail}</p>
    </div>
  );
}
