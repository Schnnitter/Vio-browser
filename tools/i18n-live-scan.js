/* i18n-live-scan — русские тексты из живого DOM Vio, которых нет в i18n-dict.

   Режим 1 — рендер (F12 → Console или Sources/Snippets):
     вставить этот файл, затем выполнить:
       window.__vioI18nLiveScan()
     — сканирует реальный DOM, сверяет с window.I18N_DICT
       и скачает i18n-live-missing.json (пропуски по каждому языку).
     Отдельно в renderer.js: window.__vioI18nScan() — сырой список
     русских строк текущего экрана (без сверки со словарём),
     его можно сохранить как vio-live-ru.json.

   Режим 2 — Node (после сохранения списка из рендера):
     node tools/i18n-live-scan.js [vio-live-ru.json]
     читает файл, сверяет с scripts/i18n-dict.js,
     пишет i18n-live-missing.json и отчёт в консоль. */

;(function () {
  'use strict'

  const CYR = /[а-яёА-ЯЁіїєґІЇЄҐ]/
  const IN_FILE = 'vio-live-ru.json'
  const OUT_FILE = 'i18n-live-missing.json'


  /* --- фильтр мусора (как в i18n-extract / i18n-fill) --- */
  function isRealText (s) {
    if (!s || s.length < 3 || s.length > 500) return false
    if (!CYR.test(s)) return false
    if (/[{}]/.test(s)) return false                 /* ${}, {js} шаблоны */
    if (/[<>]/.test(s)) return false                 /* HTML-фрагменты */
    if (/class=|id=|style=|href=|src=/.test(s)) return false
    if (/console\.|window\.|document\./.test(s)) return false
    if (/^\d+$/.test(s)) return false
    return true
  }


  /* --- 1. скан реального DOM: тексты листовых элементов --- */
  function scanDom () {
    if (typeof document === 'undefined') return []
    const out = new Set()
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length) return
      const t = String(el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!isRealText(t)) return
      out.add(t)
    })
    return [...out]
  }


  /* --- 2. сверка со словарём: не хватает перевода на язык? --- */
  function missingPerLang (list, dict) {
    const missing = {}
    const has = Object.prototype.hasOwnProperty
    for (const lang of Object.keys(dict || {})) {
      const map = dict[lang] || {}
      missing[lang] = list.filter(s => !has.call(map, s))
    }
    return missing
  }


  function download (text, name) {
    const blob = new Blob([text], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => { try { URL.revokeObjectURL(a.href) } catch (e) {} }, 5000)
  }


  /* ================= режим 1: рендер ================= */
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.__vioI18nLiveScan = function () {
      const list = scanDom()
      const dict = window.I18N_DICT || {}
      const missing = missingPerLang(list, dict)
      download(JSON.stringify(missing, null, 2), OUT_FILE)
      console.log('[i18n-live-scan] строк в DOM: ' + list.length)
      for (const lang of Object.keys(dict)) {
        console.log('  ' + lang + ': ' + missing[lang].length + ' missing')
      }
      console.log('[i18n-live-scan] сохранено: ' + OUT_FILE)
      return missing
    }
    console.log('[i18n-live-scan] ready → window.__vioI18nLiveScan()')
  }


  /* ================= режим 2: node ================= */
  function main () {
    const fs = require('fs')
    const path = require('path')
    const root = path.join(__dirname, '..')
    const inFile = process.argv[2] || IN_FILE
    const inPath = path.isAbsolute(inFile) ? inFile : path.join(root, inFile)

    if (!fs.existsSync(inPath)) {
      console.error('нет файла ' + inFile)
      console.error('открой Vio (npm start), пройди настройки и выполни в F12:')
      console.error('  const list = window.__vioI18nScan()')
      console.error('  ... скачать как ' + IN_FILE + ' (см. шапку файла)')
      process.exit(1)
    }

    let list = JSON.parse(fs.readFileSync(inPath, 'utf8'))
    if (!Array.isArray(list)) list = (list && (list.list || list.strings)) || []

    const dictSrc = fs.readFileSync(path.join(root, 'scripts/i18n-dict.js'), 'utf8')
    const m = dictSrc.match(/window\.I18N_DICT\s*=\s*(\{[\s\S]*\})/)
    const dict = m ? JSON.parse(m[1]) : {}
    const langs = Object.keys(dict)
    if (!langs.length) { console.error('в i18n-dict нет языков'); process.exit(1) }

    const clean = [...new Set(
      list.map(s => String(s || '').replace(/\s+/g, ' ').trim()).filter(isRealText)
    )]
    const missing = missingPerLang(clean, dict)

    fs.writeFileSync(path.join(root, OUT_FILE), JSON.stringify(missing, null, 2))

    console.log('живой скан: ' + clean.length + ' русских строк из ' + inFile)
    console.log('')
    console.log('=== i18n live gaps ===')
    for (const lang of langs) console.log(lang + ': ' + missing[lang].length + ' missing')
    console.log('')
    console.log('записан: ' + OUT_FILE)

    const sample = missing.uk || []
    if (sample.length) {
      console.log('')
      console.log('=== первые 20 (uk) ===')
      sample.slice(0, 20).forEach(s => console.log('  - ' + s.slice(0, 80)))
    }
  }


  const isNode = (typeof module !== 'undefined') && module.exports && (typeof require === 'function')
  if (isNode) {
    module.exports = { isRealText, scanDom, missingPerLang }
    if (require.main === module) main()
  }
})()
