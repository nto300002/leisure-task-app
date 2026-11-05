# 実装契約 — v1.3設計の試用実装

## API

設計のAPI表は案だったため、実装は同一オリジンの `GET/POST /api/state` に集約。すべての分岐に同じ認証・世代検査が適用される。外部API互換性を約束する版ではない。

GETは data、generation_id、data_revision、capacity、catalog、finish_conflicts を返す。POSTは generation_id と type を必須とする。

| type | 入力 / 役割 |
|---|---|
| issue | action、target。操作キー発行。finish/cancelは実行中ごとの別枠。replace・revisionによる競合後の置換 |
| mutate | operation_id、command。業務更新と再送結果の一括確定 |
| session-read / session-close | id。候補・表示済み履歴の取得／明示終了 |
| backup | 完全JSON文字列とfilename |
| import-preview | raw、choices。検証・競合一覧・15分の計画ID |
| share-preview / share-export | ids / id。世代とdata_revisionに固定した共有内容 |
| delete-all | data_revision。全業務データ・runtimeを消去して新しい世代へ |

command.action は session、draw、settings、task、goal、soft-delete、activity、save-catalog、start、manual、finish、cancel、edit-execution、delete-execution、import-commit。型・制約の実体は `lib/domain.ts`。

タスク関連は `task_goals: [{task_id,goal_id}]`、記録関連は `execution_goals: [{execution_id,goal_id}]`。省略は維持、明示空配列は解除。snapshotは開始時にサーバー生成し、record_titleだけを後から編集できる。settings更新はdata_revision、個々の編集はrevisionを送信する。

## データとDB

バックアップの正規形は設計書と同じ配列構造。DBはowner＋IDを主キーに持つ行単位JSON方式を採用し、関連表は独立した複合IDで保存。全列を個別のSQL列へ展開する方式から変更した。JSONは所有者・操作世代・再送情報を含めない。

`accounts` はowner、version、確定token、メタデータ。再送キー・セッション・取り込み計画・共有プレビューは `runtime_chunks` に分割して保存し、D1の単一行サイズへ5MiBの取り込み内容を押し込まない。取り込み計画と共有プレビューは本人ごとに最新1件、セッションは最新20件まで。期限はそれぞれ15分、15分、30分。再送キーは24時間。

SQLの一意制約は本人ごとの実行中1件、有効な元候補コピー1件、本人＋活動キー。参照・列挙値・容量はサーバーで全体検証。D1の外部キー制約でJSON内参照を保証しているわけではない。

確定はD1 batchで行う。最初のアカウントversion比較更新が成功した場合のみ、一意なtokenを条件として後続の削除／挿入を実行する。競合したbatchの行更新はすべて無効となり、再読み込みして世代・revision・容量を再検査する。SQL制約違反はbatch全体がロールバックする。

`0002` の式インデックスはDrizzle出力の式引用が不正だったため、未適用SQLを修正した。以降の移行生成時には式インデックスのSQLを確認すること。

## 終了と容量

canonical JSONのUTF-8バイト数と最上位配列の行数を数える。現在値と、完了・途中終了tried ON/OFF・取消後の値を比較し、最大値が5,242,880バイト／10,000行を超える更新を拒否する。終了時は自由文を受け取らず、感想は終了後の記録編集で保存する。

通常キー2,000件と終了用別枠を分離。revision競合が未適用で確定するとrejected_conflictになり、旧キーは再実行しない。最新revisionを確認した置換だけを許可し、旧キー.nextに新IDを保存するため、置換要求の再送も同じIDになる。本文違いと結果不明のpendingは置換不可。GETで未置換の終了競合を取得でき、ブラウザ再読み込み後も回復できる。

## 復元・共有・全削除

空へ復元するとdataset_idと業務値を保持する。既存データへの統合では同ID競合を表示し、既存保持を既定とする。明示して取り込み側を選んだ変更はrevisionを進める。削除済みのtask/goalと共有設定・関連を含めて保存し、executionのtombstoneは古い記録の自動復活を防ぐ。

ファイルは5MiBまで。JSON文字列をリクエストJSON内へ入れた際のエスケープ増加を許容するためHTTP全体は12MiBまで。適用後も同じ容量検証を行う。

共有はnoneを除外、summaryは専用要約のみ。fullでも非共有／削除済みタスク由来の記録タイトルを一般見出しにし、非共有／削除済み目標は出力しない。snapshotの追加本文やリンクを共有へ自動展開しない。プレビュー後にdata_revisionが変われば書き出しを拒否する。

全削除はアカウントversionとdata_revisionを条件に実施。新しいgeneration_idへ移り、旧操作・旧result・旧計画は利用不可。別タブへBroadcastChannelで再取得を通知し、古い世代の画面状態を捨てる。ダウンロード済みのサイト外ファイルは削除対象外。

## 残る確認

初期候補8件は設計書の候補案を実装したもの。人による負荷・実行時間の評価は未了であり、beginner_verifiedの実証済みフラグは付けていない。試用のフィードバックをIssue #7/#13で扱う。

本番の別アカウント認可と全T01〜T24の障害注入を完了するまでは、試用版として扱う。詳細はACCEPTANCE.md。
