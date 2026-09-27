import { describe, expect, it } from 'vitest';
import { constrainTranslation, projectShapes } from '../../src/geo/projection';
import type { JapanGeoJson } from '../../src/types';

const data: JapanGeoJson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { id: 'JP-01', name: '北海道', nameEn: 'Hokkaido', slug: 'hokkaido' }, geometry: { type: 'Polygon', coordinates: [[[140, 41], [146, 41], [146, 45], [140, 45], [140, 41]]] } },
    { type: 'Feature', properties: { id: 'JP-13', name: '東京都', nameEn: 'Tokyo', slug: 'tokyo' }, geometry: { type: 'Polygon', coordinates: [[[138, 35], [140, 35], [140, 36], [138, 36], [138, 35]]] } },
  ],
};

describe('projection', () => {
  it('projects every shape once and records a finite bbox center', () => {
    const shapes = projectShapes(data);
    expect(shapes.size).toBe(2);
    expect(shapes.get('JP-01')?.path).toMatch(/^M/);
    expect(shapes.get('JP-01')?.center.every(Number.isFinite)).toBe(true);
  });

  it('keeps at least a margin of a translated shape within the viewBox', () => {
    const result = constrainTranslation(-9999, 9999, [[100, 200], [300, 400]], 24);
    expect(result).toEqual({ x: -276, y: 536 });
  });
});
