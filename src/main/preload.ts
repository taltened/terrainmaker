import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example' | 'tada';

interface Incoming {
  readonly open: readonly [filePath: string, data: ArrayBuffer];
  readonly save: readonly [filePath: string];
  readonly undo: readonly [];
  readonly redo: readonly [];
}

interface Outgoing {
  readonly save: readonly [filePath: string, data: ArrayBuffer];
  readonly setUndoContext: readonly [canUndo: boolean, canRedo: boolean, undoAction?: string, redoAction?: string];
}

const receive = <T extends keyof Incoming>(key: T) => (handler: (...args: Incoming[T]) => void) => {
  const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => handler(...args as unknown as Incoming[T]);
  ipcRenderer.on(key, subscription);
  return () => {
    ipcRenderer.removeListener(key, subscription);
  };
};
const send = <T extends keyof Outgoing>(key: T) => (...args: Outgoing[T]) => ipcRenderer.send(key, ...args);

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  onOpen: receive('open'),
  onSave: (handler: (filePath: string) => Promise<ArrayBuffer>) => {
    return receive('save')((filePath) => handler(filePath).then(data => send('save')(filePath, data)));
  },
  onUndo: receive('undo'),
  onRedo: receive('redo'),
  setUndoContext: send('setUndoContext'),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
