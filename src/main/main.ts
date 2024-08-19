/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { app, BrowserWindow, shell, ipcMain, dialog, protocol, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { file } from './file';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('save', (_, filePath: string, data: ArrayBuffer) => {
  writeFile(filePath, new DataView(data)).then(console.log).catch(console.log);
});

ipcMain.on('setUndoContext', (_, canUndo: boolean, canRedo: boolean, undoAction?: string, redoAction?: string) => {
  const menu = Menu.getApplicationMenu()
  const undoItem = menu?.getMenuItemById('undo');
  if (undoItem) {
    undoItem.enabled = canUndo;
    undoItem.label = undoAction ? `Undo ${undoAction}` : 'Undo';
  }
  const redoItem = menu?.getMenuItemById('redo');
  if (redoItem) {
    redoItem.enabled = canRedo;
    redoItem.label = undoAction ? `Redo ${redoAction}` : 'Redo';
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

let openWindows = 0;
let newWindows = 0;

const createFileWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  openWindows++;
  const window = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    title: `Untitled-${++newWindows}`,
    icon: getAssetPath('icon.png'),
    fullscreen: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  window.setDocumentEdited(true);

  window.loadURL(resolveHtmlPath('index.html'));

  window.on('ready-to-show', () => {
    if (!window) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      window.minimize();
    } else {
      window.show();
    }
  });

  window.on('closed', () => {
    openWindows--;
  });

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
    }
  }
]);

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    const menuBuilder = new MenuBuilder({
      createFileWindow,
      saveFileWindow: (window) => {
        if (window.representedFilename) {
          // Save
          file.save(window, window.representedFilename);
        } else {
          // Save as
          dialog.showSaveDialog(window).then(({ filePath }) => {
            if (filePath) {
              file.save(window, filePath);
            }
          }).catch(console.log);
        }
      },
      openFileWindow: (window) => {
        dialog.showOpenDialog(window).then(({ filePaths }) => {
          if (filePaths.length) {
            return (
              readFile(filePaths[0])
              .then(data => data.buffer)
              .then(data => file.open(window, filePaths[0], data))
            );
          }
        }).catch(console.log);
      }
    });
    menuBuilder.buildMenu();

    protocol.handle('local', request => {
      const filePath = request.url.match(/^local:\/\/(.*)$/)?.[1];
      if (!filePath) return new Response(null, { status: 404 });
      return readFile(filePath).then(x => new Response(x)).catch(_ => new Response(null, { status: 404 }));
//      return fetch(request.url.replace(/^local:/, 'file:'));
    })

    createFileWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (openWindows === 0) createFileWindow();
    });
  })
  .catch(console.log);
