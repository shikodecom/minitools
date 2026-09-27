import { readFile, writeFile } from 'node:fs/promises';

const [input, output = 'public/data/japan-prefectures.geojson'] = process.argv.slice(2);
if (!input) throw new Error('Usage: node scripts/extract-natural-earth.mjs <Natural Earth Admin 1 GeoJSON> [output]');

const source = JSON.parse(await readFile(input, 'utf8'));
const slugByCode = {
  'JP-01': 'hokkaido', 'JP-02': 'aomori', 'JP-03': 'iwate', 'JP-04': 'miyagi', 'JP-05': 'akita',
  'JP-06': 'yamagata', 'JP-07': 'fukushima', 'JP-08': 'ibaraki', 'JP-09': 'tochigi', 'JP-10': 'gunma',
  'JP-11': 'saitama', 'JP-12': 'chiba', 'JP-13': 'tokyo', 'JP-14': 'kanagawa', 'JP-15': 'niigata',
  'JP-16': 'toyama', 'JP-17': 'ishikawa', 'JP-18': 'fukui', 'JP-19': 'yamanashi', 'JP-20': 'nagano',
  'JP-21': 'gifu', 'JP-22': 'shizuoka', 'JP-23': 'aichi', 'JP-24': 'mie', 'JP-25': 'shiga',
  'JP-26': 'kyoto', 'JP-27': 'osaka', 'JP-28': 'hyogo', 'JP-29': 'nara', 'JP-30': 'wakayama',
  'JP-31': 'tottori', 'JP-32': 'shimane', 'JP-33': 'okayama', 'JP-34': 'hiroshima', 'JP-35': 'yamaguchi',
  'JP-36': 'tokushima', 'JP-37': 'kagawa', 'JP-38': 'ehime', 'JP-39': 'kochi', 'JP-40': 'fukuoka',
  'JP-41': 'saga', 'JP-42': 'nagasaki', 'JP-43': 'kumamoto', 'JP-44': 'oita', 'JP-45': 'miyazaki',
  'JP-46': 'kagoshima', 'JP-47': 'okinawa',
};

const features = source.features
  .filter((feature) => feature.properties.adm0_a3 === 'JPN')
  .map((feature) => ({
    type: 'Feature',
    properties: {
      id: feature.properties.iso_3166_2,
      name: feature.properties.name_ja,
      nameEn: feature.properties.name_en,
      slug: slugByCode[feature.properties.iso_3166_2],
    },
    geometry: feature.geometry,
  }))
  .sort((a, b) => a.properties.id.localeCompare(b.properties.id));

if (features.length !== 47) throw new Error(`Expected 47 Japanese prefectures, received ${features.length}`);
await writeFile(output, `${JSON.stringify({ type: 'FeatureCollection', features })}\n`);
