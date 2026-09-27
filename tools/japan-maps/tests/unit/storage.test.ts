import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWorkspace, loadWorkspace, saveWorkspace, type SavedWorkspace } from '../../src/app/storage';

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

describe('workspace storage', () => {
  const workspace: SavedWorkspace = {
    version: 1,
    state: {
      selectedPrefectureId: 'JP-13',
      selectedPieceId: 'tokyo-1',
      pieces: [{ id: 'tokyo-1', prefectureId: 'JP-13', x: 12, y: 34, rotation: 5.5, zIndex: 1 }],
    },
    camera: { zoom: 4, centerX: 530, centerY: 360 },
  };

  it('saves, restores and clears a valid workspace', () => {
    saveWorkspace(workspace);
    expect(loadWorkspace()).toEqual(workspace);
    clearWorkspace();
    expect(loadWorkspace()).toBeNull();
  });

  it('discards malformed saved data', () => {
    values.set('prefecture-moving-map-workspace', '{"version":99}');
    expect(loadWorkspace()).toBeNull();
    expect(values.size).toBe(0);
  });
});
