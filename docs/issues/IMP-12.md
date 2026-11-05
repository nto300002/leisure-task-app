# [IMP-12](https://github.com/nto300002/leisure-task-app/issues/12) 全受け入れ試験と操作確認を完了する

状態：検証継続

保存処理の失敗経路と実際の画面操作を確認し、初期版を本人が使える状態にする。

## 前提

依存Issue：[IMP-07](https://github.com/nto300002/leisure-task-app/issues/7), [IMP-08](https://github.com/nto300002/leisure-task-app/issues/8), [IMP-09](https://github.com/nto300002/leisure-task-app/issues/9), [IMP-10](https://github.com/nto300002/leisure-task-app/issues/10), [IMP-11](https://github.com/nto300002/leisure-task-app/issues/11)

設計根拠：初期版設計書v1.3 8章〜8章4節、7章2節1

## 作業TODO

- [x] T01〜T24の試験台帳を作り、前提・入力・操作・期待値・実測・証跡・修正先を記入する。
- [ ] T21の予約境界、T23の確定順序、T24の通常キー満杯と競合後の期限前置換を障害注入で確認する。
- [ ] 別ユーザーと未認証による全APIの認可確認を行う。
- [ ] PC・360px幅・キーボードで候補選択から記録・バックアップ復元まで手動確認する。
- [ ] 通常条件の候補表示と保存の2秒目標を測定し、未達や不具合を修正して関係試験を再実行する。

## 完了条件

- [ ] 認可・整合性・一括保存の失敗が解消され、T01〜T24の結果が記録されている。
- [ ] 画面試作だけで保存・復元試験を合格扱いにしない。
- [ ] 実環境の認証・原子的更新・復元を確認し、残件があれば利用範囲と影響を明示する。

## 検証

対応試験：T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22, T23, T24

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
