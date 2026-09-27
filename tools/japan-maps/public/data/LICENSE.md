# 地理データ

- データセット: Natural Earth 1:10m Cultural Vectors, Admin 1 – States, Provinces
- バージョン: 5.1.1（2026-07-10取得）
- 配布元: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
- ソースリポジトリ: https://github.com/nvkelso/natural-earth-vector
- 利用条件: Public Domain
- Terms of Use: https://www.naturalearthdata.com/about/terms-of-use/

`japan-prefectures.geojson` は上記Admin 1 GeoJSONから、日本 (`adm0_a3 = JPN`) の47フィーチャーを抽出し、表示に必要なプロパティだけに整理したものです。座標とジオメトリは変更していません。

再生成:

```sh
node scripts/extract-natural-earth.mjs /path/to/ne_10m_admin_1_states_provinces.geojson
```
