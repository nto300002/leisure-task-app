import { published } from "../../../lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { posts: await published() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
