/* Vio — синтаксическая проверка всех исходников (npm run check).
   node --check не умеет glob, поэтому обходим файлы сами: один процесс
   node --check на файл, первый же сбой — сообщаем и выходим с кодом 1. */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const files = ['main.js', 'preload.js']
  .concat(list('scripts'))
  .concat(list('tools'))

function list (dir) {
  try {
    return fs.readdirSync(path.join(root, dir))
      .filter(f => f.endsWith('.js'))
      .map(f => dir + '/' + f)
  } catch (e) { return [] }
}

let bad = 0
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' })
  if (r.status !== 0) {
    bad++
    console.error('FAIL ' + f)
    console.error(String(r.stderr || '').trim())
  }
}
console.log(bad
  ? 'ошибок: ' + bad + ' из ' + files.length + ' файлов'
  : 'ok: ' + files.length + ' файлов синтаксически верны')
process.exit(bad ? 1 : 0)
