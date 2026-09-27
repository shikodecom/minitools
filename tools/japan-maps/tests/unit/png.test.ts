import { describe, expect, it } from 'vitest';
import { fitBoundsToViewport, pngFilename, shareMessage } from '../../src/export/png';
import type { Piece } from '../../src/types';

describe('pngFilename', () => {
  it('uses the prefecture slug and local timestamp', () => {
    expect(pngFilename('JP-47', new Date(2026, 6, 10, 10, 30))).toBe('prefecture-map-okinawa-20260710-1030.png');
  });
});

describe('fitBoundsToViewport', () => {
  it('centers the full artwork with a safe margin and one uniform scale', () => {
    const [x, y, width, height] = fitBoundsToViewport({ x: 100, y: 50, width: 400, height: 500 }, 1060, 620, 70);
    expect(width / height).toBeCloseTo(1060 / 620);
    expect(x + width / 2).toBeCloseTo(300);
    expect(y + height / 2).toBeCloseTo(300);
    const scale = 620 / height;
    expect(500 * scale).toBeCloseTo(480);
  });
});

describe('shareMessage', () => {
  const piece = (prefectureId: Piece['prefectureId'], id: string): Piece => ({ id, prefectureId, x: 0, y: 0, rotation: 0, zIndex: 1 });

  it('uses the prefecture name for one kind, even when duplicated', () => {
    expect(shareMessage([piece('JP-01', 'a'), piece('JP-01', 'b')])).toBe('北海道を、実際の縮尺のまま動かしました。');
  });

  it('uses a natural generic message for multiple kinds', () => {
    expect(shareMessage([piece('JP-01', 'a'), piece('JP-13', 'b')])).toBe('都道府県を、実際の縮尺のまま動かして遊びました。');
  });
});
