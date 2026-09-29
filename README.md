# minitools

ブラウザで使う小さなツールをまとめたリポジトリです。各ツールは個別に起動・配置できます。

| ツール | 内容 | 起動方法 |
| --- | --- | --- |
| [都道府県移動まっぷす](tools/japan-maps/README.md) | 都道府県を移動・回転・重ねて比較する地図 | `tools/japan-maps` で `npm ci` → `npm run dev` |
| [マイル計算機](tools/mile-simulator/README.md) | ポイントのJAL・ANAマイル換算を比較 | `tools/mile-simulator/mile.html` をブラウザで開く |
| [家計の支払めも](tools/home-payment/README.md) | 独立リポジトリへの移転案内 | リンク先を参照 |

## 開発・検証

地図アプリのビルドとテストは、次のコマンドで実行します。

```sh
cd tools/japan-maps
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

各ツールの設置方法、動作の前提、制約はリンク先のREADMEを参照してください。
