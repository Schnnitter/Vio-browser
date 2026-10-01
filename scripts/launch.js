#!/usr/bin/env node
/* Запуск Vio из обычного node/npm.  Окружение может содержать ELECTRON_RUN_AS_NODE=1 —
   тогда electron.exe стартует как обычный node и падает на app.setName. Снимаем флаг
   и запускаем electron.exe напрямую. */
const { spawn } = require('child_process')
const path = require('path')

let exe
try {
  exe = require('electron')
} catch (e) {
  console.error('[Vio] Не найден electron: ' + e.message)
  process.exit(1)
}
if (typeof exe !== 'string') exe = exe.default || String(exe)

const args = process.argv.slice(2)
if (!args.length) args.push(path.join(__dirname, '..'))

const env = Object.assign({}, process.env)
delete env.ELECTRON_RUN_AS_NODE
delete env.NODE_OPTIONS

const child = spawn(exe, args, { stdio: 'inherit', env })
child.on('error', (err) => {
  console.error('[Vio] Не удалось запустить electron: ' + err.message)
  process.exit(1)
})
child.on('exit', (code, sig) => process.exit(sig ? 1 : (code == null ? 0 : code)))
