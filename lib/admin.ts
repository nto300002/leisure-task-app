import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { matchesAdmin } from "./publication";
export async function administrator() {
  const user = await getChatGPTUser();
  return user && matchesAdmin(user.email, env.ADMIN_EMAIL) ? user : null;
}
