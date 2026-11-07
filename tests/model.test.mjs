import { createInitialData } from '../shared/model.mjs'
import { sampleData } from './fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, dayKey, validateData, taskMatchesView, sortTasks } from '../shared/model.mjs'

test('日期在本地时区计算，正确处理月底、闰年和年末', () => {
  assert.equal(dayKey(new Date(2026, 10, 7, 0, 1)), '2026-11-07')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})
test('初始数据可以无损备份、恢复', () => {
  const data = sampleData('2026-11-07')
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))), data)
})
test('拒绝损坏文件、未知版本和重复编号，避免覆盖本地内容', () => {
  for (const input of [null, {}, { ...sampleData(), version: 99 }, { ...sampleData(), tasks: null }]) assert.throws(() => validateData(input))
  const duplicate = sampleData(); duplicate.tasks.push(duplicate.tasks[0])
  assert.throws(() => validateData(duplicate), /重复/)
  const noteDuplicate = sampleData(); noteDuplicate.notes.push(noteDuplicate.notes[0])
  assert.throws(() => validateData(noteDuplicate), /重复/)
})
test('恢复时清理无效日期和时间', () => {
  const data = sampleData(); data.tasks[0].dueDate = '2026-02-30'; data.tasks[0].dueTime = '28:65'
  const result = validateData(data)
  assert.equal(result.tasks[0].dueDate, null)
  assert.equal(result.tasks[0].dueTime, '')
})
test('旧版分类数据自动合并，待办、备注、日期、完成状态和笔记完整保留', () => {
  const expected = sampleData('2026-11-07')
  const legacy = {
    ...expected, version: 1,
    lists: [{ id: 'work', name: '工作与学习', color: '#9b9bb9' }, { id: 'life', name: '生活日常', color: '#8da58e' }],
    tasks: expected.tasks.map((t, index) => ({ ...t, listId: index % 2 ? 'life' : 'work' })),
  }
  assert.deepEqual(validateData(legacy), expected)
  assert.deepEqual(validateData({ ...legacy, lists: [], tasks: legacy.tasks.map(t => ({ ...t, listId: 'deleted-category' })) }), expected)
})
test('今天包含未完成的过期事项，未来事项不会混入，已完成按原日期归档', () => {
  const base = sampleData('2026-11-07').tasks[0]
  assert.equal(Boolean(taskMatchesView({ ...base, dueDate: '2026-11-06' }, 'today', '2026-11-07')), true)
  assert.equal(Boolean(taskMatchesView({ ...base, dueDate: '2026-11-06', completed: true }, 'today', '2026-11-07')), false)
  assert.equal(Boolean(taskMatchesView({ ...base, dueDate: '2026-11-08' }, 'upcoming', '2026-11-07')), true)
  assert.equal(Boolean(taskMatchesView({ ...base, dueDate: null }, 'today', '2026-11-07')), false)
})
test('重要事项优先，已完成排在最后，日期排序不会将无日期放在前面', () => {
  const base = sampleData('2026-11-07').tasks[0]
  const tasks = [{ ...base, id: '1', starred: false, dueDate: null }, { ...base, id: '2', completed: true }, { ...base, id: '3', starred: true, dueDate: '2026-11-08' }]
  assert.deepEqual(sortTasks(tasks).map(t => t.id), ['3', '1', '2'])
  assert.deepEqual(sortTasks(tasks, 'date').map(t => t.id), ['3', '1', '2'])
  assert.deepEqual(tasks.map(t => t.id), ['1', '2', '3'])
})

test('首次启动为空白，不创建示例待办或笔记', () => {
  const data = createInitialData()
  assert.deepEqual(data.tasks, [])
  assert.deepEqual(data.notes, [])
  assert.deepEqual(validateData(data), data)
})
