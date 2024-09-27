import { BrowserWindow } from 'electron';

/** Represents an active document editor. */
export interface File {
  /** Instructs the window to load from the given data. */
  readonly open: (window: BrowserWindow, filePath: string, data: ArrayBuffer) => void;
  /** Instructs the window to save its current state to disk. */
  readonly save: (window: BrowserWindow, filePath: string) => void;
  /** Instructs the window to save its current image data to disk. */
  readonly export: (window: BrowserWindow, filePath: string) => void;
}

export const file: File = {
  open: (window, filePath, data) => window.webContents.send('open', filePath, data),
  save: (window, filePath) => window.webContents.send('save', filePath),
  export: (window, filePath) => window.webContents.send('export', filePath),
};
