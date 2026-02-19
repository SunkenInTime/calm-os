import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron'
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
let focusWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let focusInterval: NodeJS.Timeout | null = null

const FOCUS_BLOCK_DURATION_MS = 25 * 60 * 1000

type FocusStatus = 'idle' | 'running' | 'complete'

type FocusSessionState = {
  status: FocusStatus
  commitmentId: string | null
  commitmentTitle: string | null
  startedAt: number | null
  endsAt: number | null
}

function createIdleFocusSession(): FocusSessionState {
  return {
    status: 'idle',
    commitmentId: null,
    commitmentTitle: null,
    startedAt: null,
    endsAt: null,
  }
}

let focusSession: FocusSessionState = createIdleFocusSession()

app.setName('Calm OS')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.disableHardwareAcceleration()

const sessionDataPath = path.join(app.getPath('userData'), 'SessionData')
fs.mkdirSync(sessionDataPath, { recursive: true })
app.setPath('sessionData', sessionDataPath)

function getTrayIcon() {
  const publicPath = process.env.VITE_PUBLIC ?? ''
  const iconCandidates = [
    path.join(publicPath, 'trayTemplate.png'),
    path.join(publicPath, 'tray.png'),
    path.join(publicPath, 'electron-vite.svg'),
  ]

  for (const iconPath of iconCandidates) {
    if (!fs.existsSync(iconPath)) {
      continue
    }

    const icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty()) {
      return icon
    }
  }

  // Fallback keeps tray creation stable even when icon assets are missing.
  return nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aKkAAAAASUVORK5CYII=')
}

function showMainWindow() {
  if (!win || win.isDestroyed()) {
    createWindow()
    return
  }

  if (win.isMinimized()) {
    win.restore()
  }

  win.show()
  win.focus()
}

function createTray() {
  if (tray) {
    return
  }

  tray = new Tray(getTrayIcon())
  tray.setToolTip('Calm OS')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Calm OS',
      click: () => {
        showMainWindow()
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    showMainWindow()
  })
}

function createWindow() {
  win = new BrowserWindow({
    title: 'Calm OS',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  win.setMenuBarVisibility(false)

  win.on('close', (event) => {
    if (isQuitting) {
      return
    }

    event.preventDefault()
    win?.hide()
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

function getFocusBlockUrl() {
  if (VITE_DEV_SERVER_URL) {
    const focusUrl = new URL(VITE_DEV_SERVER_URL)
    focusUrl.searchParams.set('mode', 'focus-block')
    return focusUrl.toString()
  }

  return null
}

function createQuickAddWindow() {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    return quickAddWindow
  }

  quickAddWindow = new BrowserWindow({
    width: 980,
    height: 110,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
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

function createFocusWindow() {
  if (focusWindow && !focusWindow.isDestroyed()) {
    return focusWindow
  }

  focusWindow = new BrowserWindow({
    width: 360,
    height: 64,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  focusWindow.on('closed', () => {
    focusWindow = null
  })

  const focusUrl = getFocusBlockUrl()
  if (focusUrl) {
    focusWindow.loadURL(focusUrl)
  } else {
    focusWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      query: { mode: 'focus-block' },
    })
  }

  return focusWindow
}

function showFocusWindow() {
  const window = createFocusWindow()
  const windowWidth = 360
  const windowHeight = 64
  const cursorPoint = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursorPoint)
  const x = Math.round(workArea.x + workArea.width - windowWidth - 24)
  const y = Math.round(workArea.y + workArea.height - windowHeight - 24)

  window.setPosition(x, y)
  window.showInactive()
}

function showQuickAddWindow() {
  const window = createQuickAddWindow()
  const windowWidth = 980
  const windowHeight = 110
  const cursorPoint = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursorPoint)
  const x = Math.round(workArea.x + (workArea.width - windowWidth) / 2)
  const y = Math.round(workArea.y + (workArea.height - windowHeight) / 2)

  window.setPosition(x, y)
  window.show()
  window.focus()
}

function emitFocusState() {
  win?.webContents.send('focus:state', focusSession)
  focusWindow?.webContents.send('focus:state', focusSession)
}

function stopFocusInterval() {
  if (focusInterval) {
    clearInterval(focusInterval)
    focusInterval = null
  }
}

function runFocusInterval() {
  stopFocusInterval()
  focusInterval = setInterval(() => {
    if (focusSession.status !== 'running' || !focusSession.endsAt) {
      return
    }
    if (Date.now() >= focusSession.endsAt) {
      focusSession = {
        ...focusSession,
        status: 'complete',
        endsAt: Date.now(),
      }
      stopFocusInterval()
      showFocusWindow()
      emitFocusState()
      return
    }
    emitFocusState()
  }, 1000)
}

function startFocusSession(commitmentId: string, commitmentTitle: string) {
  const now = Date.now()
  focusSession = {
    status: 'running',
    commitmentId,
    commitmentTitle,
    startedAt: now,
    endsAt: now + FOCUS_BLOCK_DURATION_MS,
  }
  showFocusWindow()
  runFocusInterval()
  emitFocusState()
}

function stopFocusSession() {
  stopFocusInterval()
  focusSession = createIdleFocusSession()
  focusWindow?.hide()
  emitFocusState()
}

function continueFocusSession() {
  if (!focusSession.commitmentId || !focusSession.commitmentTitle) {
    return false
  }
  startFocusSession(focusSession.commitmentId, focusSession.commitmentTitle)
  return true
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
  win = null
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!win || win.isDestroyed() || BrowserWindow.getAllWindows().length === 0) {
    createWindow()
    return
  }

  showMainWindow()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopFocusInterval()
  tray?.destroy()
  tray = null
})

ipcMain.on('quick-add:close', () => {
  quickAddWindow?.hide()
})

ipcMain.handle('quick-add:read-clipboard-text', () => {
  return clipboard.readText()
})

ipcMain.handle(
  'focus:start',
  (
    _event,
    payload: { source?: string; commitmentId?: string; commitmentTitle?: string } | null,
  ) => {
    if (!payload || payload.source !== 'commitment-card') {
      return { ok: false }
    }

    const commitmentId = typeof payload.commitmentId === 'string' ? payload.commitmentId.trim() : ''
    const commitmentTitle =
      typeof payload.commitmentTitle === 'string' ? payload.commitmentTitle.trim() : ''

    if (!commitmentId || !commitmentTitle) {
      return { ok: false }
    }

    startFocusSession(commitmentId, commitmentTitle)
    return { ok: true }
  },
)

ipcMain.handle('focus:get-state', () => focusSession)

ipcMain.handle('focus:stop', () => {
  stopFocusSession()
  return { ok: true }
})

ipcMain.handle('focus:continue', () => {
  const ok = continueFocusSession()
  return { ok }
})

ipcMain.handle('focus:close-complete', () => {
  stopFocusSession()
  return { ok: true }
})

ipcMain.handle('shell:open-external-url', async (_event, rawUrl: string) => {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  if (!trimmed) {
    return false
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    await shell.openExternal(parsed.toString())
    return true
  } catch {
    return false
  }
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createTray()
  createWindow()
  createQuickAddWindow()
  createFocusWindow()
  registerGlobalShortcuts()

  try {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      app.setLoginItemSettings({ openAtLogin: true })
    }
  } catch (error) {
    console.error('Failed to enable launch at login:', error)
  }
})
