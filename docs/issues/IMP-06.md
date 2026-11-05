# [IMP-06](https://github.com/nto300002/leisure-task-app/issues/6) 興味と目標とタスクの管理を実装する

状態：実装反映済み・受け入れ検証継続

任意の入力だけで使い始められ、保存したタスクが抽選対象かを本人が判断できるようにする。

## 前提

依存Issue：[IMP-01](https://github.com/nto300002/leisure-task-app/issues/1), [IMP-03](https://github.com/nto300002/leisure-task-app/issues/3), [IMP-04](https://github.com/nto300002/leisure-task-app/issues/4), [IMP-05](https://github.com/nto300002/leisure-task-app/issues/5)

設計根拠：初期版設計書v1.3 1章、3章1節、4章、8章3節

## 作業TODO

- [x] 興味タグ最大20、有効目標最大10とタイムゾーンの編集を実装する。
- [x] タスクの必須4項目と任意条件、目標関連、共有設定の編集を実装する。
- [x] 条件確認待ちの案内と一画面での確認を作り、不明値を勝手に補完しない。
- [x] お試しコピーの保存・重複防止・復元確認と、同じ活動IDへの停止・再開を実装する。
- [ ] task・goalの論理削除と関連保持を実装する。

## 完了条件

- [ ] 必須4項目だけで保存でき、未回答条件と抽選利用可否が保存前後に分かる。
- [ ] 停止が両入口へ反映され、記録や興味の変更だけで解除されない。
- [ ] 削除した親の内容と共有設定を残し、通常一覧や抽選から除外する。

## 検証

対応試験：T05, T06, T11, T20

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
