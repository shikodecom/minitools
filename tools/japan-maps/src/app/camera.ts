import { MAP_BOUNDS, VIEWBOX } from '../geo/projection';
import type { Camera, Point } from '../types';

export const INITIAL_ZOOM = 1.1;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 30;

export function createInitialCamera(): Camera {
  return { zoom: INITIAL_ZOOM, centerX: VIEWBOX.width / 2, centerY: VIEWBOX.height / 2 };
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function cameraRange(min: number, max: number, viewportSize: number, fallbackCenter: number): { min: number; max: number } {
  if (viewportSize >= max - min) return { min: fallbackCenter, max: fallbackCenter };
  return { min: min + viewportSize / 2, max: max - viewportSize / 2 };
}

export function constrainCamera(camera: Camera): Camera {
  const zoom = clampZoom(camera.zoom);
  const [[minX, minY], [maxX, maxY]] = MAP_BOUNDS;
  const horizontal = cameraRange(minX, maxX, VIEWBOX.width / zoom, VIEWBOX.width / 2);
  const vertical = cameraRange(minY, maxY, VIEWBOX.height / zoom, VIEWBOX.height / 2);
  return {
    zoom,
    centerX: Math.min(horizontal.max, Math.max(horizontal.min, camera.centerX)),
    centerY: Math.min(vertical.max, Math.max(vertical.min, camera.centerY)),
  };
}

export function cameraViewBox(camera: Camera): string {
  const width = VIEWBOX.width / camera.zoom;
  const height = VIEWBOX.height / camera.zoom;
  return `${camera.centerX - width / 2} ${camera.centerY - height / 2} ${width} ${height}`;
}

export function cameraFromAnchor(
  nextZoom: number,
  anchor: Point,
  client: Point,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): Camera {
  const zoom = clampZoom(nextZoom);
  const worldPerPixel = (VIEWBOX.width / zoom) / rect.width;
  return constrainCamera({
    zoom,
    centerX: anchor.x - (client.x - (rect.left + rect.width / 2)) * worldPerPixel,
    centerY: anchor.y - (client.y - (rect.top + rect.height / 2)) * worldPerPixel,
  });
}
