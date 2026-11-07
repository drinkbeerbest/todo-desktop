import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
await mkdir('build', { recursive: true })
const source = await readFile('public/icon.svg')
const png = await sharp(source).resize(256, 256).png().toBuffer()
await writeFile('build/icon.png', png)
const header = Buffer.alloc(22)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(22, 18)
await writeFile('build/icon.ico', Buffer.concat([header, png]))
