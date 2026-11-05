"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Leaf,
  Sparkles,
  BookOpen,
  CalendarDays,
  Sprout,
} from "lucide-react";
import type { PublicPost } from "../../lib/publication";
export default function JournalView({
  posts,
  admin,
}: {
  posts: PublicPost[];
  admin: boolean;
}) {
  const [filter, F] = useState("all");
  const shown = posts.filter((p) => filter === "all" || p.kind === filter);
  const names = {
    tried: "試したこと",
    event: "余暇のできごと",
    note: "ひとこと",
  };
  return (
    <div className="journal">
      <header className="journal-header">
        <a className="journal-brand" href="/journal">
          <Sprout size={25} />
          <span>
            ひとつ、やってみる<small>THE LITTLE MOMENTS JOURNAL</small>
          </span>
        </a>
        <a className="journal-admin" href="/admin">
          {admin ? "管理画面へ" : "管理者ログイン"} <ArrowUpRight size={14} />
        </a>
      </header>
      <main className="journal-main">
        <section className="journal-hero">
          <div>
            <p className="eyebrow">NOTES FROM MY FREE TIME</p>
            <h1>
              やってみたこと。
              <br />
              なんでもない日のこと。
            </h1>
            <p>
              気になって試した、小さなこと。
              <br />
              余暇のなかで出会った、ちょっとした出来事。
              <br />
              そのひとつひとつを、ここに残しています。
            </p>
          </div>
          <div className="journal-art" aria-hidden="true">
            <div className="paper paper-back" />
            <div className="paper paper-front">
              <span>
                small things,
                <br />
                good moments.
              </span>
              <svg viewBox="0 0 170 130">
                <path
                  d="M85 120C82 80 98 50 80 15M85 90C47 90 35 61 38 43c36 2 49 23 47 47M88 64c35 1 45-22 43-42-28 1-42 20-43 42"
                  fill="#b5c09d"
                  stroke="#5d7257"
                  strokeWidth="2"
                />
                <path
                  d="M40 44l45 46m45-67L88 64"
                  stroke="#5d7257"
                  fill="none"
                />
              </svg>
              <small>日々の、ささやかな発見。</small>
            </div>
            <span className="journal-sun">✳</span>
          </div>
        </section>
        <section className="journal-feed">
          <div className="journal-feed-head">
            <div>
              <p className="eyebrow">THE JOURNAL</p>
              <h2>余暇の記録</h2>
            </div>
            <span className="journal-count">{posts.length} POSTS</span>
          </div>
          <div className="journal-tabs" role="group" aria-label="記録の種類">
            {[
              ["all", "すべて"],
              ["tried", "試したこと"],
              ["event", "余暇のできごと"],
              ["note", "ひとこと"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={filter === key}
                onClick={() => F(key)}
                className={filter === key ? "chosen" : ""}
              >
                {label}
              </button>
            ))}
          </div>
          {shown.length ? (
            <div className="journal-grid">
              {shown.map((post, index) => (
                <article className={"journal-card " + post.kind} key={post.id}>
                  <div className="journal-card-top">
                    <span>
                      {post.kind === "tried" ? (
                        <Sparkles size={16} />
                      ) : post.kind === "event" ? (
                        <Leaf size={16} />
                      ) : (
                        <BookOpen size={16} />
                      )}{" "}
                      {names[post.kind]}
                    </span>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                  </div>
                  {post.date && (
                    <time dateTime={post.date}>
                      <CalendarDays size={13} />
                      {post.date.replaceAll("-", " / ")}
                    </time>
                  )}
                  <h3>{post.title}</h3>
                  {post.body && <p>{post.body}</p>}
                  <span className="journal-card-end">✳</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="journal-empty">
              <Sprout size={38} />
              <h3>
                {posts.length
                  ? "この種類の記録は、まだありません。"
                  : "最初のひとつを、ここに。"}
              </h3>
              <p>
                {posts.length
                  ? "ほかの種類の記録も、のぞいてみてください。"
                  : "公開された記録が増えると、ここに並びます。"}
              </p>
              {admin && (
                <a href="/admin">
                  管理画面で記録を選ぶ <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          )}
        </section>
        <aside className="journal-note">
          <span>✳</span>
          <p>
            趣味と呼べなくても、続かなくても。
            <br />
            <strong>「ちょっとやってみた」も、大切な余暇。</strong>
          </p>
        </aside>
      </main>
      <footer className="journal-footer">
        <span>ひとつ、やってみる</span>
        <small>小さな体験と、余暇のできごとの記録。</small>
      </footer>
    </div>
  );
}
