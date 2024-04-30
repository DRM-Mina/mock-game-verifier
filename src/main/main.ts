/* eslint global-require: off, no-console: off, promise/always-return: off */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { platform } from 'os';
import { getLinuxSystemInfo } from './lib/linux';
import { getWindowsSystemInfo } from './lib/windows';
import { getMacOSSystemInfo } from './lib/macos';
import { createSession } from './drm';
import { Identifiers, RawIdentifiers } from './lib/Identifiers';

let isSystemInfoSet = false;
let system_info: RawIdentifiers = {
  cpuId: '',
  systemSerial: '',
  systemUUID: '',
  baseboardSerial: '',
  macAddress: [],
  diskSerial: '',
};

const ENDPOINT = 'http://localhost:3152';

let mainWindow: BrowserWindow | null = null;

ipcMain.on('new-session', async (event, gameId) => {
  if (isSystemInfoSet) {
    console.log('Creating new session for game:', gameId);
    const hash = Identifiers.fromRaw(system_info).hash().toString();
    console.log('Hash:', hash);
    const currentSession = await getSessionValue(gameId, hash);
    console.log('Current session:', currentSession);
    createSession(system_info, Number(currentSession), gameId).then((proof) => {
      submitSession(proof);
    });
  } else {
    console.error('System info not set.');
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

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1276,
    height: 728,
    minHeight: 728,
    minWidth: 1276,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const getIdentifiers = async () => {
  if (platform() === 'linux') {
    system_info = await getLinuxSystemInfo();
    setSystemInfo(system_info);
  } else if (platform() === 'win32') {
    system_info = await getWindowsSystemInfo();
    setSystemInfo(system_info);
  } else if (platform() === 'darwin') {
    system_info = await getMacOSSystemInfo();
    setSystemInfo(system_info);
  }
};

const setSystemInfo = (info: RawIdentifiers) => {
  system_info = info;
  isSystemInfoSet = true;
  console.log('System info set:', system_info);
  const hash = Identifiers.fromRaw(system_info).hash().toString();
  mainWindow?.webContents.send('device-set', hash);
};

const submitSession = async (proof: string) => {
  try {
    await fetch(ENDPOINT + '/submit-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proof }),
    });
    console.log('Submitted proof to server.');
  } catch (error) {
    console.error('Error submitting proof:', error);
  }
};

app
  .whenReady()
  .then(() => {
    createWindow();
    getIdentifiers();

    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

export interface BlockQueryResponse {
  data: {
    runtime: {
      DRM: {
        sessions: {
          value: string;
        };
      };
    };
  };
}

const getSessionValue = async (gameId: string, hash: string) => {
  const queryTemplate = `
  query GetCurrentSession {
    runtime {
      DRM {
        sessions(
          key: {gameId: {value: "$gameId"}, identifierHash: "$hash"}
        ) {
          value
        }
      }
    }
  }`;

  const query = queryTemplate
    .replace(/\$gameId/g, gameId)
    .replace(/\$hash/g, hash);

  const response = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
    }),
  });

  const { data } = (await response.json()) as BlockQueryResponse;

  return data.runtime.DRM.sessions.value;
};
