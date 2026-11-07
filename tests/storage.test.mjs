import { sampleData } from './fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { validateData } from '../shared/model.mjs'
const { createStore } = createRequire(import.meta.url)('../electron/storage.cjs')
const directory = async () => { const target = path.join(process.cwd(), '.test-data', `store-${crypto.randomUUID()}`); await fs.mkdir(target, { recursive: true }); return target }

test('Windows 不支持原生重命名时仍可保存、备份并重开', async () => {
  const dir = await directory()
  const unsupported = { ...fs, rename: async () => { throw Object.assign(new Error('unsupported filesystem'), { code: 'UNKNOWN' }) } }
  const store = createStore(dir, validateData, unsupported)
  const data = sampleData()
  await store.save(data)
  data.tasks[0].title = '已经保存的修改'
  await store.save(data)
  assert.equal((await createStore(dir, validateData).load()).data.tasks[0].title, '已经保存的修改')
  assert.notEqual(JSON.parse(await fs.readFile(path.join(dir, 'liubai.json.bak'), 'utf8')).tasks[0].title, '已经保存的修改')
})
test('中断首次保存时从完整临时文件恢复，而不是丢弃用户内容', async () => {
  const dir = await directory()
  const data = sampleData(); data.tasks[0].title = '未完成保存中的内容'
  await fs.writeFile(path.join(dir, 'liubai.json.tmp'), JSON.stringify(data))
  const result = await createStore(dir, validateData).load()
  assert.equal(result.data.tasks[0].title, '未完成保存中的内容')
  assert.match(result.warning, /未完成/)
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'liubai.json'), 'utf8')).tasks[0].title, '未完成保存中的内容')
})
test('损坏的主文件会保留原件并从有效备份恢复', async () => {
  const dir = await directory()
  const data = sampleData()
  const store = createStore(dir, validateData)
  await store.save(data); await store.save(data)
  await fs.writeFile(path.join(dir, 'liubai.json'), '{ broken')
  const result = await store.load()
  assert.equal(result.data.tasks.length, data.tasks.length)
  assert.ok((await fs.readdir(dir)).some(name => name.includes('.recovery-')))
})
test('保存请求按顺序提交，非法数据不会覆盖之前的有效内容', async () => {
  const dir = await directory()
  const store = createStore(dir, validateData)
  const data = sampleData()
  const first = store.save(data)
  const changed = structuredClone(data); changed.tasks[0].title = '最终版本'
  const last = store.save(changed)
  await Promise.all([first, last])
  assert.throws(() => store.save({ version: 99 }))
  assert.equal((await store.load()).data.tasks[0].title, '最终版本')
})
