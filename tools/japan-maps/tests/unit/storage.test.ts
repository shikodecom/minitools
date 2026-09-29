import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWorkspace, loadWorkspace, saveWorkspace, type SavedWorkspace } from '../../src/app/storage';
import { PREFECTURES } from '../../src/data/prefectures';

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

  it.each(PREFECTURES)('restores selection and pieces for %s (%s)', (prefectureId) => {
    const saved = structuredClone(workspace);
    saved.state.selectedPrefectureId = prefectureId;
    saved.state.pieces[0].prefectureId = prefectureId;
    saved.onboardingStage = 'done';
    saveWorkspace(saved);
    expect(loadWorkspace()).toEqual(saved);
  });

  it.each([
    null,
    [],
    { ...workspace, state: null },
    { ...workspace, camera: { zoom: '4', centerX: 500, centerY: 380 } },
    { ...workspace, onboardingStage: 'invalid' },
    { ...workspace, state: { ...workspace.state, selectedPrefectureId: 'JP-99' } },
    { ...workspace, state: { ...workspace.state, pieces: [null] } },
    { ...workspace, state: { ...workspace.state, pieces: [{ ...workspace.state.pieces[0], x: null }] } },
    { ...workspace, state: { ...workspace.state, pieces: [{ ...workspace.state.pieces[0], prefectureId: 'JP-99' }] } },
  ])('discards invalid saved structures: %j', (value) => {
    values.set('prefecture-moving-map-workspace', JSON.stringify(value));
    expect(loadWorkspace()).toBeNull();
    expect(values.size).toBe(0);
  });

  it('ignores unavailable browser storage', () => {
    const unavailable = () => { throw new Error('Storage disabled'); };
    vi.stubGlobal('localStorage', { getItem: unavailable, setItem: unavailable, removeItem: unavailable });
    expect(() => saveWorkspace(workspace)).not.toThrow();
    expect(loadWorkspace()).toBeNull();
    expect(() => clearWorkspace()).not.toThrow();
  });
});
