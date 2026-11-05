import { published } from "../../lib/store";
import { administrator } from "../../lib/admin";
import JournalView from "./view";
export const dynamic = "force-dynamic";
export default async function Journal() {
  const [posts, admin] = await Promise.all([published(), administrator()]);
  return <JournalView posts={posts} admin={!!admin} />;
}
