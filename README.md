# ひとつ、やってみる

余暇に迷ったとき、候補をひとつ出して始めるための個人用アプリ。初期版設計書 v1.3 に基づく試用実装です。

- **新しい趣味**：8件の小さなお試しから未経験の候補を提案。
- **いつもの候補**：自分で登録・保存したタスクを条件に沿って抽選。
- 開始、完了、途中終了、任意の記録・感想。履歴からの好みの自動推測なし。
- 興味タグ・目標、提案停止／再開、独立した「試した」状態。
- 完全JSONバックアップ・検証付き取り込み・共有範囲を守るMarkdown出力。
- 容量上限5MiB／10,000行、終了用予約、409競合後の終了キー置換、全削除時の操作世代更新。

GitHubのソースは公開。Sitesアプリのアクセス範囲は本人限定です。個人記録や実行環境のDB、認証情報はこのリポジトリに含めません。`fixtures/` は架空の試験データです。

## 実装・検証の記録

- [実装TODO](docs/TODO.md)
- [API・データ・保存方式](docs/IMPLEMENTATION.md)
- [T01〜T24の検証状況](docs/ACCEPTANCE.md)
- [ローカルAPI試験結果](docs/api-test-results.json)
- [GitHub Issues](https://github.com/nto300002/leisure-task-app/issues)

公開直後は試用版です。実際のお試し活動の負荷評価、別アカウントを使った本番認可試験、全障害注入ケース、1週間程度の本人評価は未完了です。未確認の項目を合格扱いにしていません。

## 開発

Node.js 22.22以降を使用します。

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Sitesの提供するVinextスターターとビルド手順を使用します。`npm run dev` はローカルプレビューです。ローカルDBは、ビルド後に `drizzle/` のSQLを番号順に次の形で適用します。

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_low_senator_kelly.sql
# 同じ形式で0001、0002も適用（初回のみ）
npm run dev
```

ローカルでは `/signin-with-chatgpt?return_to=/` からスターターのモック本人ID `local_seedy` で利用できます。本番ではSitesの認証を使用し、モック認証は提供されません。

`python3 tests/api-integration.py` は起動中の **127.0.0.1:5173 とローカルD1だけ** を使う統合試験です。現在のローカルデータをメモリへ退避し、容量境界・再送上限・全削除を試験した後に復元します。検証専用チェックアウトで実行してください。テスト失敗時の自動復旧は保証しません。

## 技術構成

React / TypeScript / Vinext、Cloudflare Workers、D1、Zod。すべての個人データ操作を認証済み本人IDに限定し、同一オリジン検査を行います。D1 batch内でアカウント版の比較更新と行更新を確定します。履歴からの自動調整、外部アクセス解析、R2保存はありません。

Sitesへの公開はプラグインのsource helperでソース同期と成果物のパッケージを行い、そのcommitに対応するprivate deploymentを作成します。`.openai/hosting.json` のproject_idはこのサイトの識別子であり、認証資格情報ではありません。別サイトへ複製する場合は、新規登録で返されたIDへ変更してください。
