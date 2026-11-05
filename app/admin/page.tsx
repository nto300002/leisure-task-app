import { administrator } from "../../lib/admin";
import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import Leisure from "../leisure";
export const dynamic = "force-dynamic";
export default async function Admin() {
  if (await administrator()) return <Leisure />;
  const user = await getChatGPTUser();
  return (
    <main className="signin">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>管理者のページ</h1>
      <p>
        {user
          ? "このアカウントでは管理画面を利用できません。"
          : "記録の編集・公開には管理者のログインが必要です。"}
      </p>
      {!user && (
        <a href={chatGPTSignInPath("/admin")} target="_top">
          管理者としてログイン
        </a>
      )}
      <p>
        <a href="/journal">公開ページへ戻る</a>
      </p>
    </main>
  );
}
