import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { initDatabase, databaseHandlers } from './database'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 768,
    title: 'AI 会议助理',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

Object.entries(databaseHandlers).forEach(([channel, handler]) => {
  ipcMain.handle(channel, (_event, ...args) => handler(...args))
})

ipcMain.handle('dialog:openFile', async (_event, filters: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters
  })
  return result
})

ipcMain.handle('dialog:saveFile', async (_event, options: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: options.defaultPath,
    filters: options.filters
  })
  return result
})

ipcMain.handle('app:getPath', async (_event, name: any) => {
  return app.getPath(name)
})

ipcMain.handle('file:write', async (_event, filePath: string, data: string | Uint8Array, encoding?: BufferEncoding) => {
  await fs.writeFile(filePath, data, encoding as any)
  return { success: true }
})

ipcMain.handle('file:open', async (_event, filePath: string) => {
  const res = await shell.openPath(filePath)
  return { success: !res, error: res }
})

ipcMain.handle('file:showInFolder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
  return { success: true }
})
