import { geoConicConformal, geoPath, type GeoProjection } from 'd3-geo';
import type { JapanGeoJson, ProjectedShape } from '../types';

export const VIEWBOX = { width: 1000, height: 760 } as const;
export const MAP_BOUNDS: [[number, number], [number, number]] = [[56, 44], [944, 704]];

export function createJapanProjection(data: JapanGeoJson): GeoProjection {
  return geoConicConformal()
    .parallels([30, 40])
    .rotate([-138, 0])
    .center([0, 36])
    .fitExtent(MAP_BOUNDS, data);
}

export function projectShapes(data: JapanGeoJson, projection = createJapanProjection(data)): Map<string, ProjectedShape> {
  const pathGenerator = geoPath(projection);
  const shapes = new Map<string, ProjectedShape>();
  for (const feature of data.features) {
    const path = pathGenerator(feature);
    const bounds = pathGenerator.bounds(feature);
    if (!path || !Number.isFinite(bounds[0][0])) continue;
    shapes.set(feature.properties.id, {
      id: feature.properties.id,
      name: feature.properties.name,
      slug: feature.properties.slug,
      path,
      bounds,
      center: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2],
    });
  }
  return shapes;
}

export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: clientX, y: clientY };
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function constrainTranslation(
  x: number,
  y: number,
  bounds: [[number, number], [number, number]],
  margin = 24,
): { x: number; y: number } {
  return {
    x: Math.min(VIEWBOX.width - bounds[0][0] - margin, Math.max(margin - bounds[1][0], x)),
    y: Math.min(VIEWBOX.height - bounds[0][1] - margin, Math.max(margin - bounds[1][1], y)),
  };
}
