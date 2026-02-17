import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let quickAddWindow: BrowserWindow | null = null

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.disableHardwareAcceleration()

const sessionDataPath = path.join(app.getPath('userData'), 'SessionData')
fs.mkdirSync(sessionDataPath, { recursive: true })
app.setPath('sessionData', sessionDataPath)

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details)
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Renderer failed to load:', errorCode, errorDescription)
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function getQuickAddUrl() {
  if (VITE_DEV_SERVER_URL) {
    const quickAddUrl = new URL(VITE_DEV_SERVER_URL)
    quickAddUrl.searchParams.set('mode', 'quick-add')
    return quickAddUrl.toString()
  }

  return null
}

function createQuickAddWindow() {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    return quickAddWindow
  }

  quickAddWindow = new BrowserWindow({
    width: 760,
    height: 170,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  quickAddWindow.on('blur', () => {
    quickAddWindow?.hide()
  })

  quickAddWindow.on('closed', () => {
    quickAddWindow = null
  })

  const quickAddUrl = getQuickAddUrl()
  if (quickAddUrl) {
    quickAddWindow.loadURL(quickAddUrl)
  } else {
    quickAddWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      query: { mode: 'quick-add' },
    })
  }

  return quickAddWindow
}

function showQuickAddWindow() {
  const window = createQuickAddWindow()
  const cursorPoint = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursorPoint)
  const x = Math.round(workArea.x + (workArea.width - 760) / 2)
  const y = Math.round(workArea.y + 84)

  window.setPosition(x, y)
  window.show()
  window.focus()
}

function registerGlobalShortcuts() {
  const didRegister = globalShortcut.register('Control+E', () => {
    showQuickAddWindow()
  })

  if (!didRegister) {
    console.error('Failed to register global shortcut: Control+E')
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

ipcMain.on('quick-add:close', () => {
  quickAddWindow?.hide()
})

app.whenReady().then(() => {
  createWindow()
  createQuickAddWindow()
  registerGlobalShortcuts()
})
