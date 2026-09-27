# Phase 2 実装計画

## 実装順序

1. Phase 1以降の仕様変更と現状実装を要件表へ反映する。
2. 既存GeoJSONの全フィーチャーを検証し、47都道府県の選択肢・型・プレビューへ展開する。
3. 状態スナップショット方式のUndo履歴を実装し、追加・削除・移動・回転・リセットを記録する。
4. Undoボタンを現在の操作パネルへ馴染む形で追加し、履歴がない場合は無効化する。
5. localStorage、共有、PNG保存、レスポンシブ、エラー処理の回帰テストを拡充する。
6. README、ASSUMPTIONS、IMPLEMENTATION_STATUSを実装結果へ更新する。
7. build、単体テスト、E2Eテスト、主要画面幅のブラウザ確認を行い、公開先へ反映する。

## 使用技術

- Vite / TypeScript / Vanilla DOM
- SVG / Pointer Events / Canvas API
- d3-geo（背景とピースの共通投影）
- localStorage（現在状態の保存・復元）
- Web Share API / PNGダウンロード
- Vitest / Playwright

## テスト方針

- 47都道府県が重複・欠落なく選択でき、各形状を同じ投影で追加できることを単体・E2Eで検証する。
- Undoは操作開始前のスナップショットを1回だけ積み、pointermoveごとに履歴を増やさないことを確認する。
- 追加、削除、ドラッグ、回転、リセットをUndoでき、20操作以上保持できることを検証する。
- 既存のパン、ピンチ、共有画像、localStorage復元、スマホ幅のテストを維持する。
- 最終的に `npm run build`、`npm run test`、`npm run test:e2e` を成功させる。
