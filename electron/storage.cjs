const defaultFs = require('node:fs/promises')
const path = require('node:path')

function createStore(directory, validate, fs = defaultFs) {
  const target = path.join(directory, 'liubai.json')
  const temporary = `${target}.tmp`
  const backup = `${target}.bak`
  let queue = Promise.resolve()

  // A few managed Windows filesystems support read/write but not native rename/copy.
  // Keep a complete journal until promotion succeeds, so interrupted writes can recover.
  async function promote(text) {
    try { await fs.rename(temporary, target) }
    catch (error) {
      if (!['EXDEV', 'UNKNOWN', 'EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error
      await fs.writeFile(target, text, 'utf8')
    }
    await fs.unlink(temporary).catch(() => {})
  }

  async function load() {
    let original
    let missing = false
    let recoveryExists = false
    try { original = await fs.readFile(target, 'utf8'); return { data: validate(JSON.parse(original)) } }
    catch (error) { missing = error.code === 'ENOENT' }
    for (const candidate of [temporary, backup]) {
      try {
        const text = await fs.readFile(candidate, 'utf8')
        recoveryExists = true
        const data = validate(JSON.parse(text))
        if (original !== undefined) await fs.writeFile(`${target}.recovery-${Date.now()}`, original, 'utf8')
        await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf8')
        if (candidate === temporary) await fs.unlink(temporary).catch(() => {})
        return { data, warning: candidate === temporary ? '已恢复上次未完成的保存。' : '已从上一次备份恢复。原文件已保留。' }
      } catch (error) { if (error.code !== 'ENOENT') recoveryExists = true }
    }
    if (missing && !recoveryExists) return { data: null }
    throw new Error('本地数据暂时无法读取。请先保留数据文件，再重新打开留白。')
  }

  function save(input) {
    const data = validate(input)
    const text = JSON.stringify(data, null, 2)
    const job = queue.catch(() => {}).then(async () => {
      await fs.mkdir(directory, { recursive: true })
      await fs.writeFile(temporary, text, 'utf8')
      try {
        const previous = await fs.readFile(target, 'utf8')
        validate(JSON.parse(previous))
        await fs.writeFile(backup, previous, 'utf8')
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      await promote(text)
    })
    queue = job
    return job
  }
  return { load, save, flush: () => queue }
}
module.exports = { createStore }
