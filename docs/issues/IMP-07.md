# [IMP-07](https://github.com/nto300002/leisure-task-app/issues/7) 候補集と抽選とセッションを実装する

状態：実装反映済み・受け入れ検証継続

選んだ入口と条件に合う候補を一つ出し、同じセッションでの重複提示を防ぐ。

## 前提

依存Issue：[IMP-01](https://github.com/nto300002/leisure-task-app/issues/1), [IMP-03](https://github.com/nto300002/leisure-task-app/issues/3), [IMP-05](https://github.com/nto300002/leisure-task-app/issues/5), [IMP-06](https://github.com/nto300002/leisure-task-app/issues/6)

設計根拠：初期版設計書v1.3 2章、5章

## 作業TODO

- [ ] 初期8候補の条件を手動確認し、確認済み候補だけ有効にする。
- [x] 入口別対象、停止、有効状態、必須条件、不明値、表示済みの除外を順に実装する。
- [x] いつもの候補は興味重み、新しい趣味は30%均等・70%興味重みで抽選する。
- [x] 30分のセッション、タブ内ID、サーバー履歴、再読み込みと条件変更を実装する。
- [ ] 候補ゼロを原因別に表示し、表示済みリセットは本人操作に限定する。

## 完了条件

- [ ] 省略条件と探索比率を固定乱数の境界試験で検証できる。
- [ ] 通信再送で候補が二重確定せず、同一セッションで重複しない。
- [ ] 未経験枯渇時も別入口へ自動で切り替わらない。

## 検証

対応試験：T01, T02, T03, T06, T07, T08

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
