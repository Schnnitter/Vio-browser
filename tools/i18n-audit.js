/* i18n-audit — аудит scripts/i18n-dict.js: три списка на каждый язык.
   Запуск: node tools/i18n-audit.js
   Пишет: i18n-audit.json → { en: { untranslated, mixed, dup }, de: {...}, ... }
   Только node:fs / node:path, без npm-зависимостей.

   A (untranslated): value === key без учёта пробелов, при этом ключ содержит
      кириллицу. Латинские токены (Vio, Ctrl+T, /login) совпадают со значением
      осознанно — это не «непереведённое», в A они не попадают.
   I (identical): то же самое, но для uk/be/kk — перевод совпадает с русским
      по правилам языка («Меню» = «Меню»), это валидный перевод, не косяк.
      В A такие ключи НЕ идут (A падает), в очередь заполнения не попадают
      как проблема, но fill может перепроверить их моделью.
   B (mixed): язык не из ru/uk/be/kk, а value содержит кириллицу — проскакивает
      русский текст. Для uk/be/kk кириллица нормальна, B у них не считается.
   C (dup): value содержит кириллицу и встречается символ в символ сразу в двух
      и более языках — забыли перевести, скопировали как есть. */
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const DICT = path.join(root, 'scripts', 'i18n-dict.js')
const OUT = path.join(root, 'i18n-audit.json')
const EXAMPLES = ['en', 'de'] /* для этих языков печатаем первые 10 примеров */

const CYR = /[Ѐ-ӿ]/
const CYR_LANGS = new Set(['ru', 'uk', 'be', 'kk'])

function loadDict (src) {
  const at = src.indexOf('window.I18N_DICT')
  if (at < 0) throw new Error('в файле нет window.I18N_DICT')
  const s = src.indexOf('{', at)
  const e = src.lastIndexOf('}')
  if (s < 0 || e <= s) throw new Error('объект словаря не найден')
  try {
    const o = JSON.parse(src.slice(s, e + 1))
    if (o && typeof o === 'object') return o
  } catch (e1) { /* не чистый JSON — пробуем new Function */ }
  const fn = new Function('window', src + '\n;return window.I18N_DICT;')
  const w = {}
  fn(w)
  if (!w.I18N_DICT || typeof w.I18N_DICT !== 'object') throw new Error('словарь разобрать не удалось')
  return w.I18N_DICT
}

const norm = s => String(s).replace(/\s+/g, '')
const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v))
const pad = (s, n) => { s = String(s); return s + ' '.repeat(Math.max(1, n - s.length)) }
const short = (s, n) => JSON.stringify(s.length > n ? s.slice(0, n - 1) + '\u2026' : s)
const show = (map, k) => short(k, 60) + ' = ' + short(str(map[k]), 60)

function main () {
  const src = fs.readFileSync(DICT, 'utf8')
  const dict = loadDict(src)
  const langs = Object.keys(dict).filter(l => /^[a-z]{2}$/.test(l))

  /* value -> в каких языках встречается (для C) */
  const where = new Map()
  for (const l of langs) {
    const map = (dict[l] && typeof dict[l] === 'object') ? dict[l] : {}
    for (const k of Object.keys(map)) {
      const v = str(map[k])
      let set = where.get(v)
      if (!set) where.set(v, (set = new Set()))
      set.add(l)
    }
  }

  const report = {}
  const rows = []
  for (const lang of langs) {
    const map = (dict[lang] && typeof dict[lang] === 'object') ? dict[lang] : {}
    const untranslated = []
    const identical = []
    const mixed = []
    const dup = []
    for (const key of Object.keys(map)) {
      const val = str(map[key])
      const same = norm(val) === norm(key)
      if (CYR.test(key) && same) {
        if (CYR_LANGS.has(lang)) identical.push(key) /* валидный identical */
        else untranslated.push(key) /* en/de/... — реальный косяк */
      }
      if (!CYR_LANGS.has(lang) && CYR.test(val)) mixed.push(key)
      const langsOf = where.get(val)
      if (CYR.test(val) && langsOf && langsOf.size > 1) dup.push(key)
    }
    report[lang] = { untranslated, identical, mixed, dup }
    const uniq = new Set([...untranslated, ...mixed].filter(k => CYR.test(k)))
    rows.push({
      lang,
      keys: Object.keys(map).length,
      a: untranslated.length,
      identical: identical.length,
      b: mixed.length,
      c: dup.length,
      todo: uniq.size
    })
  }

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8')

  console.log('=== i18n-audit: scripts/i18n-dict.js ===')
  console.log('языков: ' + langs.length + ', ключей всего: ' + rows.reduce((n, r) => n + r.keys, 0))
  console.log('')
  console.log('lang  keys     A     I     B     C   к переводу')
  for (const r of rows) {
    console.log(pad(r.lang, 5) + pad(r.keys, 6) + pad(r.a, 6) + pad(r.identical, 6) +
      pad(r.b, 6) + pad(r.c, 7) + ' ' + r.todo)
  }

  for (const lang of EXAMPLES) {
    const rep = report[lang]
    if (!rep) continue
    const map = dict[lang] || {}
    console.log('')
    console.log('--- ' + lang + ': A непереведённые (первые 10 из ' + rep.untranslated.length + ') ---')
    rep.untranslated.slice(0, 10).forEach(k => console.log('  - ' + show(map, k)))
    console.log('--- ' + lang + ': B смешанные, value с кириллицей (первые 10 из ' + rep.mixed.length + ') ---')
    rep.mixed.slice(0, 10).forEach(k => console.log('  - ' + show(map, k)))
    console.log('--- ' + lang + ': C копипаст, value одинаков в 2+ языках (первые 10 из ' + rep.dup.length + ') ---')
    rep.dup.slice(0, 10).forEach(k => console.log('  - ' + show(map, k)))
  }

  console.log('')
  console.log('отчёт: i18n-audit.json')
}

main()
