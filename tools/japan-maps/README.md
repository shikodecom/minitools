# 都道府県移動まっぷす

都道府県を実際の縮尺のまま日本地図上へ出し、移動、回転、重ねて遊べる完全クライアントサイドのWebアプリです。47都道府県から選択できます。

## Phase 2の機能

- 日本全体と都道府県境界のSVG表示
- 47都道府県の選択と追加
- マウス・タッチ・ペンによるドラッグ移動と自由回転
- 地図背景の1本指パン、2本指ピンチズーム（1〜30倍）
- 背景とピースを共通ワールド座標のまま一体でパン・ズーム
- 地図内のボタンとピンチ操作による1〜30倍の拡大
- 現在表示中の画面中央へ都道府県を追加
- 既存ピースを残したまま別の都道府県を追加可能
- 選択中ピースの個別削除
- 追加・移動・回転・削除・リセットの「1つ戻す」（最大50履歴）
- Web Share APIによるPNGファイル共有と、非対応時のPNG保存
- 作業状態と地図カメラのlocalStorage保存・復元
- 北海道選択済み・ピース0個の初期状態へ即時に戻すリセット
- 初回の「北海道を出す」で表示中央へ出すオンボーディング
- MultiPolygonと離島を一つのピースとして保持
- 操作UIを除いた1200×1200px PNG生成・保存
- 320px幅からのレスポンシブ基本操作

背景とピースは、同じGeoJSONと同じ `d3-geo` の円錐正角投影 (`geoConicConformal`) から起動時に投影済みSVGパスを生成します。配置後のピースにはSVGの `translate` と `rotate` だけを適用し、再投影、拡大・縮小は行いません。

## セットアップと起動

Node.js 20以降を用意してください。

```sh
npm install
npm run dev
```

表示されたローカルURLをブラウザで開きます。

## ビルド

```sh
npm run build
```

静的成果物は `dist/` に生成されます。プレビューは `npm run preview` です。既定のVite baseは `./` のため、任意のサブディレクトリ配信に対応します。絶対baseが必要な環境では次のように指定できます。

```sh
VITE_BASE_PATH=/tools/prefecture-map/ npm run build
```

## テスト

```sh
npm run test
npx playwright install chromium
npm run test:e2e
```

- 単体テスト: Vitest（状態操作、上限、角度正規化、投影・移動制約、カメラ・ズーム、Undo履歴、47都道府県の保存復元、PNGファイル名）
- E2E: Playwright Chromium（PC・Pixel 7相当viewport、47都道府県、Undo、移動、回転、パン、ピンチ、MultiPolygon、PNG生成・共有）

## ソース構成

- `src/main.ts`: 初期化、操作イベントと状態更新の接続
- `src/app/state.ts`: ピースの追加・選択・移動・削除
- `src/app/camera.ts`: カメラの範囲制約、ズームの基準点、viewBox計算
- `src/app/history.ts`: 状態・カメラ・案内表示のスナップショットと最大50件のUndo履歴
- `src/app/storage.ts`: localStorageへの保存と復元時のデータ検証
- `src/ui/`: 画面テンプレート、SVG描画、ポインター操作、iframeの高さ通知
- `src/geo/`: 地理投影と座標変換
- `src/data/prefectures.ts`: 選択肢・保存検証で共用する47都道府県の一覧
- `src/export/`: PNG生成と共有

## WordPressサイト配下への配置

1. 配置先を例として `/tools/prefecture-map/` に決めます。
2. `VITE_BASE_PATH=/tools/prefecture-map/ npm run build` を実行します。
3. `dist/` の中身をWordPressサーバーの同じパスへ、FTP/SFTPまたはホスティング管理画面でアップロードします。
4. `https://example.com/tools/prefecture-map/` を直接開いて確認します。

WordPress本文へ埋め込む場合は、同一ドメインの上記URLを `iframe` で表示できます。テーマやセキュリティプラグインが `iframe`、Blob URL、ダウンロードを制限している場合は許可設定が必要です。アプリ自体にPHP、データベース、REST APIは不要です。

WordPressのカスタムHTMLブロックには次を貼り付けます。アプリはResizeObserverで高さを通知するため、画面幅や内容に合わせてiframeが自動調整されます。`allow="web-share"` はiframe内から共有シートを開くために必要です。

```html
<iframe
  src="https://www.shikode.com/tools/japan-maps/"
  title="都道府県移動まっぷす"
  data-japan-maps-iframe
  style="width:100%; height:1400px; border:0; display:block; overflow:hidden;"
  scrolling="no"
  loading="lazy"
  allow="web-share"
></iframe>
<script>
window.addEventListener('message', function (event) {
  if (event.origin !== 'https://www.shikode.com') return;
  if (!event.data || event.data.type !== 'japan-maps-height') return;
  var iframe = document.querySelector('[data-japan-maps-iframe]');
  if (!iframe) return;
  var height = Number(event.data.height);
  if (!Number.isFinite(height) || height < 320 || height > 5000) return;
  iframe.style.height = height + 'px';
});
</script>
```

## 地理データとライセンス

- Natural Earth 1:10m Cultural Vectors, Admin 1 – States, Provinces, version 5.1.1
- ライセンス: Public Domain
- 配布元: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
- Terms: https://www.naturalearthdata.com/about/terms-of-use/

日本の47フィーチャーを抽出し、必要なプロパティだけに整理しています。ジオメトリと座標は変更していません。詳細と再生成方法は `public/data/LICENSE.md` を参照してください。GeoJSONは約297KB（gzip約93KB）です。

## ライブラリ

- d3-geo: ISC License
- Vite: MIT License
- TypeScript: Apache-2.0 License
- Vitest: MIT License
- Playwright: Apache-2.0 License

## 現在の制約

- Natural Earth 1:10mは比較・表示向けの一般化データであり、測量・境界確定用途には使えません。
- 実機iPhone/Android、Safari、Firefoxでの手動確認は未実施です。
- 回転した大きなピースの画面内制約は未回転bboxを基準とするため、角が画面外へ出る場合があります。
- Undo履歴は再読み込み後には復元されません（作品とカメラ状態は復元されます）。

## 今後の拡張

Phase 3としてWordPressテーマへの追加調整、OGP・利用方法ページ、アクセス解析、実機検証、表示速度・データ精度の調整を行います。
