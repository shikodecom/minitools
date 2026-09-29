import { PREFECTURES } from '../data/prefectures';
import type { AppState, Camera, OnboardingStage } from '../types';

const STORAGE_KEY = 'prefecture-moving-map-workspace';
const supportedPrefectures = new Set<string>(PREFECTURES.map(([id]) => id));

export type SavedWorkspace = {
  version: 1;
  state: AppState;
  camera: Camera;
  onboardingStage?: OnboardingStage;
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
    const parsed: unknown = JSON.parse(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrefectureId(value: unknown): boolean {
  return typeof value === 'string' && supportedPrefectures.has(value);
}

function isSavedWorkspace(value: unknown): value is SavedWorkspace {
  if (!isRecord(value) || !isRecord(value.state) || !isRecord(value.camera)) return false;
  const { state, camera } = value;
  return value.version === 1
    && isPrefectureId(state.selectedPrefectureId)
    && (state.selectedPieceId === null || typeof state.selectedPieceId === 'string')
    && Array.isArray(state.pieces)
    && state.pieces.every((piece: unknown) =>
      isRecord(piece)
      && typeof piece.id === 'string'
      && isPrefectureId(piece.prefectureId)
      && [piece.x, piece.y, piece.rotation, piece.zIndex].every(Number.isFinite),
    )
    && [camera.zoom, camera.centerX, camera.centerY].every(Number.isFinite)
    && (value.onboardingStage === undefined || value.onboardingStage === 'ready'
      || value.onboardingStage === 'placed' || value.onboardingStage === 'done');
}
