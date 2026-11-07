import { _electron as electron, expect } from '@playwright/test'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const root = process.cwd()
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const dataDir = path.join(root, '.test-data', `packaged-${Date.now()}`)
await mkdir(dataDir, { recursive: true })
const env = { ...process.env, LIUBAI_DATA_DIR: dataDir, LIUBAI_TEST_MODE: '1' }
delete env.ELECTRON_RUN_AS_NODE
const executablePath = path.join(root, 'release', 'win-unpacked', '留白.exe')
const launch = async () => {
  const app = await electron.launch({ executablePath, env, timeout: 30000 })
  const page = await app.firstWindow()
  page.setDefaultTimeout(12000)
  await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible()
  return { app, page }
}
let { app, page } = await launch()
try {
  const metadata = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, version: app.getVersion(), name: app.getName() }))
  assert.equal(metadata.packaged, true)
  assert.equal(metadata.version, version)
  await expect(page.locator('.local-status')).toHaveText('本地已保存')
  const initial = await page.evaluate(async () => (await window.desktop.load()).data)
  assert.deepEqual(initial.tasks, [])
  assert.deepEqual(initial.notes, [])
  await expect(page.locator('.task-row')).toHaveCount(0)
  await page.screenshot({ path: path.join(root, 'artifacts/01-today.png'), scale: 'css' })
  console.log('PASS · 正式原版首次启动无示例待办、无示例笔记')
  await expect(page.getByText('我的清单', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Control+n')
  await page.getByRole('textbox', { name: '待办内容', exact: true }).fill('打包程序的保存验证')
  await page.getByRole('textbox', { name: '待办内容', exact: true }).press('Enter')
  await expect(page.locator('.local-status')).toHaveText('本地已保存')
  await page.getByRole('checkbox', { name: '完成：打包程序的保存验证', exact: true }).click()
  await expect(page.locator('.local-status')).toHaveText('本地已保存')
  await app.close()
  const data = JSON.parse(await readFile(path.join(dataDir, 'liubai.json'), 'utf8'))
  assert.equal(data.version, 2)
  assert.equal('lists' in data, false)
  assert.equal(data.tasks.find(t => t.title === '打包程序的保存验证').completed, true)
  // Verify recovery using the actual packaged application and its automatic backup.
  await writeFile(path.join(dataDir, 'liubai.json'), '{ broken json', 'utf8')
  ;({ app, page } = await launch())
  await expect(page.locator('.toast')).toContainText('备份恢复')
  await expect(page.locator('.local-status')).toHaveText('本地已保存')
  assert.ok(JSON.parse(await readFile(path.join(dataDir, 'liubai.json'), 'utf8')).tasks.length > 0)
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(root, 'artifacts', '10-packaged.png'), scale: 'css' })
  console.log('PASS · 正式桌面程序启动、IPC 保存、关闭刷新、损坏主文件自动恢复')
  console.log(JSON.stringify(metadata))
} finally { await app.close().catch(() => {}) }
