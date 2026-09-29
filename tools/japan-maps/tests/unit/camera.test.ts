import { describe, expect, it } from 'vitest';
import { cameraFromAnchor, cameraViewBox, constrainCamera, createInitialCamera } from '../../src/app/camera';

describe('map camera', () => {
  it('fits the map at its initial center', () => {
    const camera = constrainCamera(createInitialCamera());
    const [x, y, width, height] = cameraViewBox(camera).split(' ').map(Number);
    expect(x + width / 2).toBe(500);
    expect(y + height / 2).toBe(380);
    expect(width).toBeCloseTo(1000 / 1.1);
    expect(height).toBeCloseTo(760 / 1.1);
  });

  it('clamps zoom and recenters when the entire map fits', () => {
    expect(constrainCamera({ zoom: 0.5, centerX: -100, centerY: 2000 }))
      .toEqual({ zoom: 1, centerX: 500, centerY: 380 });
    expect(constrainCamera({ zoom: 100, centerX: 500, centerY: 380 }).zoom).toBe(30);
  });

  it('keeps a zoomed viewport within the projected map bounds', () => {
    expect(constrainCamera({ zoom: 4, centerX: -100, centerY: -100 }))
      .toEqual({ zoom: 4, centerX: 181, centerY: 139 });
    expect(constrainCamera({ zoom: 4, centerX: 2000, centerY: 2000 }))
      .toEqual({ zoom: 4, centerX: 819, centerY: 609 });
  });

  it('preserves the world point under the pointer while zooming', () => {
    const rect = { left: 100, top: 200, width: 500, height: 380 };
    const camera = cameraFromAnchor(4, { x: 500, y: 380 }, { x: 450, y: 300 }, rect);
    const [x, y, width, height] = cameraViewBox(camera).split(' ').map(Number);
    expect(x + (450 - rect.left) / rect.width * width).toBeCloseTo(500);
    expect(y + (300 - rect.top) / rect.height * height).toBeCloseTo(380);
  });
});
