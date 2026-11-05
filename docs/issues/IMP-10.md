# [IMP-10](https://github.com/nto300002/leisure-task-app/issues/10) 全データ削除と旧世代の失効を実装する

状態：実装反映済み・受け入れ検証継続

削除前の遅延要求や再送でデータが再作成されることを防ぐ。

## 前提

依存Issue：[IMP-05](https://github.com/nto300002/leisure-task-app/issues/5), [IMP-08](https://github.com/nto300002/leisure-task-app/issues/8), [IMP-09](https://github.com/nto300002/leisure-task-app/issues/9)

設計根拠：初期版設計書v1.3 6章1節、7章3節

## 作業TODO

- [x] 削除対象とサイト外ファイルが残ることを確認画面に示す。
- [x] 世代・data_revision条件付きで業務値、一時計画、セッション、キーとresultを全削除し世代を更新する。
- [x] 処理中の作成・取り込みも確定時に世代を再検査する。
- [ ] 削除応答断ではbootstrapで復帰し、新世代へ旧削除要求を付け替えない。
- [x] 別タブ通知、旧画面・入力破棄、旧世代の遅延応答無視を実装する。

## 完了条件

- [ ] 旧作成・取込・キー発行・再送・削除は410となり、旧resultを返さない。
- [ ] 旧更新が先なら削除409で再確認、削除が先なら旧更新を確定できない。
- [ ] 削除後の新しい記録を旧削除の再送で消さない。

## 検証

対応試験：T23

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
