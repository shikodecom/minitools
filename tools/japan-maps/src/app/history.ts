import type { WorkspaceSnapshot } from '../types';

export const HISTORY_LIMIT = 50;

export class WorkspaceHistory {
  private entries: WorkspaceSnapshot[] = [];

  get length(): number {
    return this.entries.length;
  }

  push(entry: WorkspaceSnapshot): void {
    this.entries.push(structuredClone(entry));
    if (this.entries.length > HISTORY_LIMIT) this.entries.shift();
  }

  pop(): WorkspaceSnapshot | undefined {
    return this.entries.pop();
  }
}
