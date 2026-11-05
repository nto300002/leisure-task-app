# [IMP-08](https://github.com/nto300002/leisure-task-app/issues/8) 開始と終了と記録訂正を実装する

状態：実装反映済み・受け入れ検証継続

候補から活動を始め、終了と試した状態を一括保存し、記録を後から訂正できるようにする。

## 前提

依存Issue：[IMP-01](https://github.com/nto300002/leisure-task-app/issues/1), [IMP-04](https://github.com/nto300002/leisure-task-app/issues/4), [IMP-05](https://github.com/nto300002/leisure-task-app/issues/5), [IMP-06](https://github.com/nto300002/leisure-task-app/issues/6), [IMP-07](https://github.com/nto300002/leisure-task-app/issues/7)

設計根拠：初期版設計書v1.3 3章、4章3節、6章4節、7章2節1

## 作業TODO

- [x] startで実行中1件とsnapshotを作り、別端末から再開できるようにする。
- [x] finishは状態とmark_triedに限定し、完了または途中終了の明示指定と状態更新を一括確定する。
- [x] 開始取消、自由記録の追加、record_title・メモ・日付・関連・状態の訂正を実装する。
- [x] correct・edit・記録削除ではtriedを変えず、未経験へ戻す操作を分離する。
- [ ] S04の競合時に最新状態を示し、本人の再操作で終了用キーを置換する。
- [ ] 終了確定と感想保存を分け、通信失敗・容量超過・競合を区別して表示する。

## 完了条件

- [ ] 完了とtried、途中終了とON指定は全部保存か全部未保存となる。OFFは現在値を維持する。
- [ ] タイトル訂正はrecord_titleだけを変え、snapshotとtriedを変えない。
- [ ] 通常キー上限・容量境界・タブ間競合でも、設計した回復手順で活動を閉じられる。

## 検証

対応試験：T04, T12, T13, T17, T21, T22, T24

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
