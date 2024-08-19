import {
  app,
  Menu,
  shell,
  MenuItemConstructorOptions,
  BrowserWindow,
} from 'electron';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export interface MenuHandler {
  readonly createFileWindow: () => void;
  readonly saveFileWindow: (window: BrowserWindow) => void;
  readonly openFileWindow: (window: BrowserWindow) => void;
}

export default class MenuBuilder {

  constructor(private readonly handler: MenuHandler) {}

  buildMenu(): Menu {
    // if (
    //   process.env.NODE_ENV === 'development' ||
    //   process.env.DEBUG_PROD === 'true'
    // ) {
    //   this.setupDevelopmentEnvironment();
    // }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  // setupDevelopmentEnvironment(): void {
  //   this.mainWindow.webContents.on('context-menu', (_, props) => {
  //     const { x, y } = props;

  //     Menu.buildFromTemplate([
  //       {
  //         label: 'Inspect element',
  //         click: () => {
  //           this.mainWindow.webContents.inspectElement(x, y);
  //         },
  //       },
  //     ]).popup({ window: this.mainWindow });
  //   });
  // }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'Electron',
      submenu: [
        {
          label: 'About ElectronReact',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide ElectronReact',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuFile: DarwinMenuItemConstructorOptions = {
      role: 'fileMenu',
      submenu: [
        {
          label: 'New Canvas',
          accelerator: 'Command+N',
          selector: 'new:',
          click: () => {
            this.handler.createFileWindow();
          },
        },
        {
          label: 'Open',
          accelerator: 'Command+O',
          selector: 'open:',
          click: (_, window) => {
            if (window) {
              this.handler.openFileWindow(window);
            } else {
              // TODO:
              this.handler.createFileWindow();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'Command+S',
          selector: 'save:',
          click: (_, window) => {
            if (window) {
              this.handler.saveFileWindow(window);
            }
          },
        },
      ],
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        {
          id: 'undo',
          label: 'Undo',
          accelerator: 'Command+Z',
          selector: 'undo:',
          enabled: false,
          click: (_, window) => window?.webContents.send('undo'),
        },
        {
          id: 'redo',
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          selector: 'redo:',
          enabled: false,
          click: (_, window) => window?.webContents.send('redo'),
        },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: (_, window) => {
            window?.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: (_, window) => {
            window?.setFullScreen(!window.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: (_, window) => {
            window?.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: (_, window) => {
            window?.setFullScreen(!window.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://electronjs.org');
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal(
              'https://github.com/electron/electron/tree/main/docs#readme',
            );
          },
        },
        {
          label: 'Community Discussions',
          click() {
            shell.openExternal('https://www.electronjs.org/community');
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/electron/electron/issues');
          },
        },
      ],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [subMenuAbout, subMenuFile, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const templateDefault: MenuItemConstructorOptions[] = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: (_, window) => {
              window?.close();
            },
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: (_, window) => {
                    window?.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: (_, window) => {
                    window?.setFullScreen(
                      !window.isFullScreen(),
                    );
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: (_, window) => {
                    window?.webContents.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: (_, window) => {
                    window?.setFullScreen(
                      !window.isFullScreen(),
                    );
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://electronjs.org');
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal(
                'https://github.com/electron/electron/tree/main/docs#readme',
              );
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://www.electronjs.org/community');
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/electron/electron/issues');
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
