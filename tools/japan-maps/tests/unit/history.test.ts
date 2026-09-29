import { describe, expect, it } from 'vitest';
import { createInitialCamera } from '../../src/app/camera';
import { HISTORY_LIMIT, WorkspaceHistory } from '../../src/app/history';
import { addPiece, createInitialState } from '../../src/app/state';
import type { WorkspaceSnapshot } from '../../src/types';

function workspace(): WorkspaceSnapshot {
  return {
    state: addPiece(createInitialState(), 'JP-20', { x: 10, y: 20 }, 'nagano'),
    camera: createInitialCamera(),
    onboardingStage: 'done',
  };
}

describe('workspace history', () => {
  it('retains independent state, camera and onboarding snapshots', () => {
    const history = new WorkspaceHistory();
    const current = workspace();
    history.push(current);
    current.state.pieces[0].x = 90;
    current.camera.zoom = 4;
    current.onboardingStage = 'ready';
    history.push(current);

    expect(history.pop()).toEqual(current);
    expect(history.pop()).toEqual(workspace());
    expect(history.length).toBe(0);
    expect(history.pop()).toBeUndefined();
  });

  it('keeps only the most recent 50 operations in reverse order', () => {
    const history = new WorkspaceHistory();
    const current = workspace();
    for (let index = 0; index < HISTORY_LIMIT + 3; index += 1) {
      current.state.pieces[0].x = index;
      history.push(current);
    }
    expect(history.length).toBe(HISTORY_LIMIT);
    for (let index = HISTORY_LIMIT + 2; index >= 3; index -= 1) {
      expect(history.pop()?.state.pieces[0].x).toBe(index);
    }
    expect(history.pop()).toBeUndefined();
  });
});
