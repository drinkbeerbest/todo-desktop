const { app, BrowserWindow, ipcMain, dialog, Notification, nativeTheme } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const { pathToFileURL } = require('node:url')
const { createStore } = require('./storage.cjs')

app.setName('留白')
app.setPath('userData', process.env.LIUBAI_DATA_DIR ? path.resolve(process.env.LIUBAI_DATA_DIR) : path.join(app.getPath('appData'), '留白'))
app.setAppUserModelId('studio.liubai.todo')
const lock = app.requestSingleInstanceLock()
if (!lock) app.quit()

let window
let latestData
let writeQueue = Promise.resolve()
let validateData
let store
const notified = new Set()
async function loadData() {
  const result = await store.load()
  latestData = result.data
  return result
}

function saveData(input) {
  const data = validateData(input)
  latestData = data
  const job = store.save(data)
  writeQueue = job
  return job
}

function createWindow() {
  window = new BrowserWindow({
    width: 1210, height: 830, minWidth: 880, minHeight: 600,
    backgroundColor: '#fbfbf9', frame: false, show: false,
    autoHideMenuBar: true, title: '留白',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: process.env.LIUBAI_TEST_MODE !== '1' },
  })
  window.setMenu(null)
  window.once('ready-to-show', () => { if (process.env.LIUBAI_TEST_MODE === '1') window.showInactive(); else window.show() })
  window.on('maximize', () => window.webContents.send('window:maximized', true))
  window.on('unmaximize', () => window.webContents.send('window:maximized', false))
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  let closing = false
  window.on('close', (event) => {
    if (closing) return
    event.preventDefault()
    closing = true
    writeQueue.catch(() => {}).finally(() => window.destroy())
  })
  if (process.env.LIUBAI_DEV_URL === 'http://127.0.0.1:5173') window.loadURL(process.env.LIUBAI_DEV_URL)
  else window.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus() } })
app.on('window-all-closed', () => app.quit())

if (lock) app.whenReady().then(async () => {
  const model = await import(pathToFileURL(path.join(__dirname, '../shared/model.mjs')).href)
  validateData = model.validateData
  store = createStore(app.getPath('userData'), validateData)
  const trusted = (event) => window && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame
  function handle(channel, callback) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!trusted(event)) throw new Error('无法访问此操作。')
      return callback(...args)
    })
  }
  handle('data:load', loadData)
  handle('data:save', saveData)
  handle('data:export', async (input) => {
    const data = validateData(input)
    const result = await dialog.showSaveDialog(window, { title: '备份留白', defaultPath: `留白备份-${model.dayKey()}.json`, filters: [{ name: '留白备份', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return false
    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  })
  handle('data:import', async () => {
    const result = await dialog.showOpenDialog(window, { title: '选择留白备份', properties: ['openFile'], filters: [{ name: '留白备份', extensions: ['json'] }] })
    if (result.canceled || !result.filePaths[0]) return null
    const stat = await fs.stat(result.filePaths[0])
    if (stat.size > 25 * 1024 * 1024) throw new Error('备份文件超过 25 MB。')
    return validateData(JSON.parse(await fs.readFile(result.filePaths[0], 'utf8')))
  })
  for (const [channel, action] of Object.entries({ 'window:minimize': () => window.minimize(), 'window:maximize': () => window.isMaximized() ? window.unmaximize() : window.maximize(), 'window:close': () => window.close() })) {
    ipcMain.on(channel, (event) => { if (trusted(event)) action() })
  }
  createWindow()
  nativeTheme.themeSource = 'system'
  setInterval(() => {
    if (!latestData?.settings.notifications || !Notification.isSupported()) return
    const now = Date.now()
    for (const task of latestData.tasks) {
      if (task.completed || !task.dueDate || !task.dueTime) continue
      const stamp = `${task.id}:${task.dueDate}:${task.dueTime}`
      const delta = now - new Date(`${task.dueDate}T${task.dueTime}:00`).getTime()
      if (delta < 0 || delta > 90000 || notified.has(stamp)) continue
      notified.add(stamp)
      const notification = new Notification({ title: '留白 · 到时间了', body: task.title, silent: false, icon: path.join(__dirname, '../build/icon.png') })
      notification.on('click', () => { if (window.isMinimized()) window.restore(); window.show(); window.focus(); window.webContents.send('task:open', task.id) })
      notification.show()
    }
  }, 15000).unref()
})
