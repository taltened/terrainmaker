import type { Document } from './document';

interface Operation {
  (doc: Document): Document;
}

export interface DocumentState {
  readonly current: Document;
  readonly baseline: Document;
  readonly history: readonly Operation[];
  readonly index: number;
}

export const initialize = (doc: Document): DocumentState => ({
  baseline: doc,
  index: 0,
  history: [],
  current: doc,
});
export const canUndo = (s: DocumentState) => s.index > 0;
export const canRedo = (s: DocumentState) => s.index < s.history.length;
export const undo = (s: DocumentState) => canUndo(s) ? ({
  ...s,
  index: s.index-1,
  current: s.history.slice(0, s.index-1).reduce((doc, op) => op(doc), s.baseline),
}) : s;
export const redo = (s: DocumentState) => canRedo(s) ? ({
  ...s,
  index: s.index+1,
  current: s.history[s.index](s.current),
}) : s;
export const apply = (op: Operation) => (s: DocumentState) => ({
  ...s,
  index: s.index+1,
  history: [...s.history.slice(0, s.index), op],
  current: op(s.current),
});
