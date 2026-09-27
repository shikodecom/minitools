import { describe, expect, it } from 'vitest';
import { addPiece, createInitialState, deleteSelectedPiece, duplicatePiece, normalizeRotation, PIECE_LIMIT, updatePiece } from '../../src/app/state';

describe('piece state', () => {
  it('adds, duplicates, updates and deletes an independently selected piece', () => {
    let state = addPiece(createInitialState(), 'JP-01', { x: 10, y: 20 }, 'one');
    state = updatePiece(state, 'one', { rotation: 22.75 });
    state = duplicatePiece(state, 'two');
    expect(state.pieces).toHaveLength(2);
    expect(state.pieces[1]).toMatchObject({ id: 'two', x: 34, y: 44, rotation: 22.75 });
    state = deleteSelectedPiece(state);
    expect(state.pieces.map((piece) => piece.id)).toEqual(['one']);
  });

  it('enforces the 20 piece limit', () => {
    let state = createInitialState();
    for (let index = 0; index < PIECE_LIMIT + 3; index += 1) {
      state = addPiece(state, 'JP-01', { x: index, y: index }, `piece-${index}`);
    }
    expect(state.pieces).toHaveLength(20);
  });
});

describe('normalizeRotation', () => {
  it.each([
    [360, 0], [-0.5, 359.5], [721.25, 1.25], [42.125, 42.125],
  ])('normalizes %s to %s without integer snapping', (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected);
  });
});
