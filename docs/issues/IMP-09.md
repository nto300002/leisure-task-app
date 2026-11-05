# [IMP-09](https://github.com/nto300002/leisure-task-app/issues/9) 完全バックアップと確認付き取り込みを実装する

状態：実装反映済み・受け入れ検証継続

本人の全業務データを出力し、削除済み参照と実行中の終了保証も含めて復元する。

## 前提

依存Issue：[IMP-03](https://github.com/nto300002/leisure-task-app/issues/3), [IMP-04](https://github.com/nto300002/leisure-task-app/issues/4), [IMP-05](https://github.com/nto300002/leisure-task-app/issues/5), [IMP-06](https://github.com/nto300002/leisure-task-app/issues/6), [IMP-08](https://github.com/nto300002/leisure-task-app/issues/8)

設計根拠：初期版設計書v1.3 6章〜6章1節、6章3〜4節

## 作業TODO

- [x] 整合したDBスナップショットから共有不可・論理削除済みも含む完全JSONを出力する。
- [x] 5MiB受信制限、型、ID、参照、旧形式補完、予約込みの結果量を検証する。
- [x] 空への復元と既存への統合を分け、競合は既存保持を初期選択にする。
- [x] 15分の取り込み計画を世代・data_revision・入力ハッシュに結び付ける。
- [x] 差分確認後に原子的commitを行い、通信再送と確定前競合を処理する。

## 完了条件

- [ ] 同版の自己出力は空へ復元でき、exported_atとDB専用値を除く業務値が一致する。
- [ ] 削除済みtask・goalを参照する記録、共有設定、関連、triedが一致する。
- [ ] 無効データ・超過・途中失敗は無変更。実行中の復元後も終了できる。

## 検証

対応試験：T09, T15, T16, T17, T19, T21

実施環境・操作手順・期待値と実測値・証跡を残す。完了条件を満たすまでは未完了とする。

## 実装証跡（2026-11-05）

[実装契約](https://github.com/nto300002/leisure-task-app/blob/main/docs/IMPLEMENTATION.md)・[試験台帳](https://github.com/nto300002/leisure-task-app/blob/main/docs/ACCEPTANCE.md)を参照。未検証の受け入れ条件は完了扱いにせず、このIssueで追跡します。
