import type { AppState, PrefectureId } from '../types';

const STORAGE_KEY = 'prefecture-moving-map-workspace';
const supportedPrefectures = new Set<PrefectureId>(['JP-01', 'JP-13', 'JP-37', 'JP-47']);

export type SavedWorkspace = {
  version: 1;
  state: AppState;
  camera: { zoom: number; centerX: number; centerY: number };
  onboardingStage?: 'ready' | 'placed' | 'done';
};

export function saveWorkspace(workspace: SavedWorkspace): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // The app remains usable when storage is disabled or full.
  }
}

export function loadWorkspace(): SavedWorkspace | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as SavedWorkspace;
    if (!isSavedWorkspace(parsed)) throw new Error('Invalid saved workspace');
    return parsed;
  } catch {
    clearWorkspace();
    return null;
  }
}

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

function isSavedWorkspace(value: SavedWorkspace): boolean {
  return value?.version === 1
    && supportedPrefectures.has(value.state?.selectedPrefectureId)
    && (value.state.selectedPieceId === null || typeof value.state.selectedPieceId === 'string')
    && Array.isArray(value.state.pieces)
    && value.state.pieces.every((piece) =>
      typeof piece.id === 'string'
      && supportedPrefectures.has(piece.prefectureId)
      && [piece.x, piece.y, piece.rotation, piece.zIndex].every(Number.isFinite),
    )
    && [value.camera?.zoom, value.camera?.centerX, value.camera?.centerY].every(Number.isFinite)
    && (value.onboardingStage === undefined || ['ready', 'placed', 'done'].includes(value.onboardingStage));
}
