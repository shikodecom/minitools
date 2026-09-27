export const PREFECTURES = [
  ['JP-01', '北海道', 'hokkaido'], ['JP-02', '青森県', 'aomori'], ['JP-03', '岩手県', 'iwate'],
  ['JP-04', '宮城県', 'miyagi'], ['JP-05', '秋田県', 'akita'], ['JP-06', '山形県', 'yamagata'],
  ['JP-07', '福島県', 'fukushima'], ['JP-08', '茨城県', 'ibaraki'], ['JP-09', '栃木県', 'tochigi'],
  ['JP-10', '群馬県', 'gunma'], ['JP-11', '埼玉県', 'saitama'], ['JP-12', '千葉県', 'chiba'],
  ['JP-13', '東京都', 'tokyo'], ['JP-14', '神奈川県', 'kanagawa'], ['JP-15', '新潟県', 'niigata'],
  ['JP-16', '富山県', 'toyama'], ['JP-17', '石川県', 'ishikawa'], ['JP-18', '福井県', 'fukui'],
  ['JP-19', '山梨県', 'yamanashi'], ['JP-20', '長野県', 'nagano'], ['JP-21', '岐阜県', 'gifu'],
  ['JP-22', '静岡県', 'shizuoka'], ['JP-23', '愛知県', 'aichi'], ['JP-24', '三重県', 'mie'],
  ['JP-25', '滋賀県', 'shiga'], ['JP-26', '京都府', 'kyoto'], ['JP-27', '大阪府', 'osaka'],
  ['JP-28', '兵庫県', 'hyogo'], ['JP-29', '奈良県', 'nara'], ['JP-30', '和歌山県', 'wakayama'],
  ['JP-31', '鳥取県', 'tottori'], ['JP-32', '島根県', 'shimane'], ['JP-33', '岡山県', 'okayama'],
  ['JP-34', '広島県', 'hiroshima'], ['JP-35', '山口県', 'yamaguchi'], ['JP-36', '徳島県', 'tokushima'],
  ['JP-37', '香川県', 'kagawa'], ['JP-38', '愛媛県', 'ehime'], ['JP-39', '高知県', 'kochi'],
  ['JP-40', '福岡県', 'fukuoka'], ['JP-41', '佐賀県', 'saga'], ['JP-42', '長崎県', 'nagasaki'],
  ['JP-43', '熊本県', 'kumamoto'], ['JP-44', '大分県', 'oita'], ['JP-45', '宮崎県', 'miyazaki'],
  ['JP-46', '鹿児島県', 'kagoshima'], ['JP-47', '沖縄県', 'okinawa'],
] as const;

export const PREFECTURE_INFO = Object.fromEntries(
  PREFECTURES.map(([id, name, slug]) => [id, { id, name, slug }]),
) as Record<(typeof PREFECTURES)[number][0], { id: (typeof PREFECTURES)[number][0]; name: string; slug: string }>;
