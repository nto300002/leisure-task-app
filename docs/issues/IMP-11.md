# [IMP-11](https://github.com/nto300002/leisure-task-app/issues/11) 共有制限を適用したMarkdown出力を実装する

状態：実装反映済み・受け入れ検証継続

共有する本文と関連情報の範囲を本人が確認してファイルへ出力できるようにする。

## 前提

依存Issue：[IMP-01](https://github.com/nto300002/leisure-task-app/issues/1), [IMP-05](https://github.com/nto300002/leisure-task-app/issues/5), [IMP-06](https://github.com/nto300002/leisure-task-app/issues/6), [IMP-08](https://github.com/nto300002/leisure-task-app/issues/8), [IMP-10](https://github.com/nto300002/leisure-task-app/issues/10)

設計根拠：初期版設計書v1.3 6章2節

## 作業TODO

- [x] none・summary・fullをタイトル、タグ、リンク、関連先、snapshotへ適用する。
- [x] 要約欠落時の除外、非共有・削除済み参照先の除外、一般見出しへの置換を実装する。
- [x] 本人専用のプレビューを世代とデータ版に結び付け、更新後は確認をやり直す。
- [x] Markdownをエスケープし、HTTPS以外のリンクを拒否する。

## 完了条件

- [ ] 非共有情報はタイトルや関連ラベル経由でも混入しない。
- [ ] summaryで本文を代用しない。出力前の表示とファイル内容が一致する。
- [ ] 全削除後に旧共有プレビューを再利用できない。

## 検証

対応試験：T10, T22, T23

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
