# [IMP-03](https://github.com/nto300002/leisure-task-app/issues/3) 正規データ契約とDBスキーマを実装する

状態：実装反映済み・受け入れ検証継続

画面・API・JSONが同じ項目と関連付けを扱い、削除済み参照も復元できるようにする。

## 前提

依存Issue：[IMP-02](https://github.com/nto300002/leisure-task-app/issues/2)

設計根拠：初期版設計書v1.3 4章、6章、7章3節

## 作業TODO

- [x] settings、interest、goal、task、関連表、execution、activity_state、候補版、tombstoneのスキーマと移行を作る。
- [x] account_control、セッション、再送管理、取り込み計画、共有プレビューを業務データと区別して保存する。
- [x] 本人・活動ID、元候補の有効コピー、本人の実行中1件の一意制約を作る。
- [x] record_titleと不変snapshotを分離し、型・長さ・日時・列挙値・所有者参照を検証する。
- [x] JSONの正規シリアライザを一つに統一し、v1.2同梱例と旧record_title欠落例を検証する。

## 完了条件

- [ ] DB、API、JSONでgoal_idsを重複して持たず関係表に統一する。
- [ ] 削除済みtask・goalの本文と共有設定、関連を保持できる。
- [ ] operation statusにpending、succeeded、rejected_conflictを定義し、キー置換の対応を保存できる。

## 検証

対応試験：T15, T22

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
