import { BrowserWindow } from 'electron';

export interface File {
  /** Instructs the window to save its current state to disk. */
  readonly save: (window: BrowserWindow, filePath: string) => void;
  /** Instructs the window to load from the given data. */
  readonly open: (window: BrowserWindow, filePath: string, data: ArrayBuffer) => void;
}

export const file: File = {
  save: (window, filePath) => window.webContents.send('save', filePath),
  open: (window, filePath, data) => window.webContents.send('open', filePath, data),
};
