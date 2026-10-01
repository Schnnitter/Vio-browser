const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')


// Live scan
const live = JSON.parse(fs.readFileSync(path.join(root, 'vio-live-ru.json'), 'utf8'))


// Dict
const dictSrc = fs.readFileSync(path.join(root, 'scripts', 'i18n-dict.js'), 'utf8')
let dict = {}
try {
  const m = dictSrc.match(/window\.I18N_DICT\s*=\s*(\{[\s\S]*\})/)
  if (m) dict = JSON.parse(m[1])
} catch (e) { console.error('load fail'); process.exit(1) }


const langs = Object.keys(dict).filter(l => /^[a-z]{2}$/.test(l))
const missing = {}


for (const lang of langs) {
  const map = dict[lang] || {}
  const miss = []
  for (const s of live) {
    if (!s || typeof s !== 'string') continue
    const t = s.replace(/\s+/g, ' ').trim()
    if (t.length < 3 || t.length > 500) continue
    if (!map[t]) miss.push(t)
  }
  missing[lang] = [...new Set(miss)]
}


fs.writeFileSync(path.join(root, 'i18n-missing-live.json'), JSON.stringify(missing, null, 2))


console.log('=== live strings: ' + live.length + ' ===')
for (const lang of langs) {
  console.log(lang + ': ' + missing[lang].length + ' missing')
}
console.log('')
console.log('=== First 30 missing for uk ===')
;(missing.uk || []).slice(0, 30).forEach(s => console.log('  - ' + s.slice(0, 80)))
