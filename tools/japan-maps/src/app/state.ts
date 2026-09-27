import type { AppState, Piece, PrefectureId } from '../types';

export const PIECE_LIMIT = 20;

export function normalizeRotation(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function createInitialState(): AppState {
  return { selectedPrefectureId: 'JP-01', selectedPieceId: null, pieces: [] };
}

export function addPiece(
  state: AppState,
  prefectureId: PrefectureId,
  position: { x: number; y: number },
  id: string = crypto.randomUUID(),
): AppState {
  if (state.pieces.length >= PIECE_LIMIT) return state;
  const zIndex = Math.max(0, ...state.pieces.map((piece) => piece.zIndex)) + 1;
  const piece: Piece = { id, prefectureId, x: position.x, y: position.y, rotation: 0, zIndex };
  return { ...state, selectedPrefectureId: prefectureId, selectedPieceId: id, pieces: [...state.pieces, piece] };
}

export function duplicatePiece(state: AppState, id: string = crypto.randomUUID()): AppState {
  if (state.pieces.length >= PIECE_LIMIT || !state.selectedPieceId) return state;
  const source = state.pieces.find((piece) => piece.id === state.selectedPieceId);
  if (!source) return state;
  const zIndex = Math.max(0, ...state.pieces.map((piece) => piece.zIndex)) + 1;
  const copy = { ...source, id, x: source.x + 24, y: source.y + 24, zIndex };
  return { ...state, selectedPieceId: id, pieces: [...state.pieces, copy] };
}

export function deleteSelectedPiece(state: AppState): AppState {
  if (!state.selectedPieceId) return state;
  return {
    ...state,
    pieces: state.pieces.filter((piece) => piece.id !== state.selectedPieceId),
    selectedPieceId: null,
  };
}

export function selectPiece(state: AppState, id: string | null): AppState {
  if (!id) return { ...state, selectedPieceId: null };
  const zIndex = Math.max(0, ...state.pieces.map((piece) => piece.zIndex)) + 1;
  return {
    ...state,
    selectedPieceId: id,
    pieces: state.pieces.map((piece) => (piece.id === id ? { ...piece, zIndex } : piece)),
  };
}

export function updatePiece(state: AppState, id: string, patch: Partial<Pick<Piece, 'x' | 'y' | 'rotation'>>): AppState {
  return {
    ...state,
    pieces: state.pieces.map((piece) =>
      piece.id === id
        ? { ...piece, ...patch, rotation: patch.rotation === undefined ? piece.rotation : normalizeRotation(patch.rotation) }
        : piece,
    ),
  };
}
