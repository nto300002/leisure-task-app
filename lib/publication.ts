import type { Data } from "./domain";
export type PublicPost = {
  id: string;
  title: string;
  body: string;
  date: string | null;
  kind: "tried" | "event" | "note";
};
/** Only this allowlist of fields may cross the public boundary. */
export function publicPost(data: Data, record: Data): PublicPost | null {
  if (record.status === "running" || record.share_mode === "none") return null;
  if (record.share_mode === "summary")
    return record.share_summary?.trim()
      ? {
          id: record.id,
          title: "余暇のひとこと",
          body: record.share_summary,
          date: null,
          kind: "note",
        }
      : null;
  if (record.share_mode !== "full") return null;
  const source = record.task_id
    ? data.tasks.find((t: Data) => t.id === record.task_id)
    : null;
  const hiddenSource =
    record.task_id &&
    (!source || source.deleted_at || source.share_mode !== "full");
  return {
    id: record.id,
    title: hiddenSource ? "小さな活動の記録" : record.record_title,
    body: record.memo,
    date: record.activity_date,
    kind: record.task_id || record.catalog_id ? "tried" : "event",
  };
}
export function publicPosts(data: Data, ids: string[]): PublicPost[] {
  const selected = new Set(ids);
  return data.executions
    .filter((r: Data) => selected.has(r.id))
    .map((r: Data) => publicPost(data, r))
    .filter((r: PublicPost | null): r is PublicPost => r !== null)
    .sort(
      (a: PublicPost, b: PublicPost) =>
        (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id),
    );
}
export function matchesAdmin(
  email: string | undefined | null,
  configured: string | undefined,
) {
  return (
    !!email &&
    !!configured &&
    email.trim().toLowerCase() === configured.trim().toLowerCase()
  );
}
