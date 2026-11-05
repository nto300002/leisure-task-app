import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import Leisure from "./leisure";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getChatGPTUser();
  if (!user)
    return (
      <main className="signin">
        <span className="brand-mark">ひ</span>
        <p className="eyebrow">A LITTLE TIME, A LITTLE DISCOVERY</p>
        <h1>
          ひとつ、
          <br />
          やってみる。
        </h1>
        <p>
          遊ぶ。学ぶ。何もしない。
          <br />
          いまの自分にちょうどいい、ひとつを。
        </p>
        <a
          className="button primary"
          target="_top"
          href={chatGPTSignInPath("/")}
        >
          ChatGPTでログイン
        </a>
        <small>記録はあなた専用です。</small>
      </main>
    );
  return <Leisure />;
}
