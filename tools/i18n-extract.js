/* Извлекает все русские тексты из UI и находит пропуски в i18n-dict
   для каждого языка. Пишет i18n-missing.json. */
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')


function read(f) {
  try { return fs.readFileSync(path.join(root, f), 'utf8') } catch (e) { return '' }
}


/* --- Загрузить словарь --- */
const dictSrc = read('scripts/i18n-dict.js')
let dict = {}
try {
  const m = dictSrc.match(/window\.I18N_DICT\s*=\s*(\{[\s\S]*\})/)
  if (m) dict = JSON.parse(m[1])
} catch (e) {}


const langs = Object.keys(dict)
if (!langs.length) { console.log('no langs in dict'); process.exit(1) }


/* --- Сканировать файлы --- */
const files = [
  'index.html',
  'scripts/pages.js',
  'scripts/renderer.js',
  'scripts/ai.js',
  'scripts/ai-agent.js',
  'scripts/store.js'
]


const found = new Set()
const CYR = /[а-яёА-ЯЁіїєґІЇЄҐ]/


function scanString(s) {
  /* Фильтр мусора: HTML-фрагменты, теги, CSS-классы */
  if (/<\/?[a-z][^>]*>/i.test(s)) return           // <div>, </span>
  if (/class=|id=|style=|href=|src=/.test(s)) return
  if (/[{}]/.test(s)) return                       // {js} шаблоны
  if (/^\s*[>·•\-–—]\s*/.test(s)) return           // начинается с >
  if (s.split(' ').length > 100) return             // слишком длинная
  if (!s) return
  if (!CYR.test(s)) return
  if (s.indexOf('${') >= 0) return
  if (s.indexOf('\\u') >= 0 || s.indexOf('\\n') >= 0) return
  if (s.length < 3 || s.length > 2000) return
  const clean = s.replace(/\s+/g, ' ').trim()
  if (/^[^а-яА-ЯёЁіїєґІЇЄҐ]{5,}/.test(clean)) return  // начинается не с кириллицы
  if (clean.length < 3) return
  /* Пропускаем строки, которые явно код */
  if (/^[const|let|var|function|if|else|return|import|export]/.test(clean)) return
  if (/^\d+$/.test(clean)) return
  found.add(clean)
}


function scanFile(content) {
  /* Одиночные, двойные, backtick строки */
  const re = /(['"`])((?:(?!\1)[^\\]|\\.){3,2000}?)\1/g
  let m
  while ((m = re.exec(content))) scanString(m[2])


  /* HTML: тексты между тегами */
  const reH = />([^<>{}]{3,500})</g
  while ((m = reH.exec(content))) scanString(m[1])


  /* HTML: атрибуты */
  const reA = /(?:title|placeholder|aria-label|alt|label)\s*[:=]\s*["']([^"']{3,500})["']/g
  while ((m = reA.exec(content))) scanString(m[1])


  /* JS: строки в кавычках как label/prompt/message */
  const reJ = /(?:label|prompt|message|title|text|placeholder|desc)\s*:\s*['"`]([^'"`]{3,500})['"`]/g
  while ((m = reJ.exec(content))) scanString(m[1])
}


for (const f of files) scanFile(read(f))


const allStrings = [...found]
console.log('total russian strings found: ' + allStrings.length)


/* --- Пропуски по языкам --- */
const missing = {}
for (const lang of langs) {
  const map = dict[lang] || {}
  const miss = allStrings.filter(s => !map[s])
  missing[lang] = miss
}


fs.writeFileSync(path.join(root, 'i18n-missing.json'), JSON.stringify(missing, null, 2))


console.log('')
console.log('=== i18n gaps report ===')
for (const lang of langs) {
  console.log(lang + ': ' + missing[lang].length + ' missing')
}
console.log('')
console.log('=== First 20 missing for uk ===')
;(missing.uk || []).slice(0, 20).forEach(s => console.log('  - ' + s.slice(0, 80)))
