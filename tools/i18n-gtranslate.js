/* Перевод i18n через бесплатный Google Translate endpoint.
   Без ключа, без лимитов, ~10-15 мин на все 23 языка.
   Запуск: node tools/i18n-gtranslate.js [lang] */


const fs = require('fs')
const path = require('path')
const https = require('https')
const root = path.join(__dirname, '..')


const ONLY_LANG = process.argv[2] || ''
const CONCURRENCY = 8    // параллельных запросов
const BATCH = 5          // строк за запрос (endpoint ограничивает длину)


function gtx(text, toLang) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(text.slice(0, 1800))
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=' + toLang + '&dt=t&q=' + q
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const j = JSON.parse(data)
          const parts = j && j[0]
          if (!Array.isArray(parts)) return resolve(null)
          resolve(parts.map(p => p && p[0] || '').join(''))
        } catch (e) { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(15000, () => { try { req.destroy() } catch (e) {} resolve(null) })
    req.end()
  })
}


async function main() {
  const missing = JSON.parse(fs.readFileSync(path.join(root, 'i18n-missing.json'), 'utf8'))
  const dictPath = path.join(root, 'scripts', 'i18n-dict.js')
  let dictSrc = fs.readFileSync(dictPath, 'utf8')
  let dict = {}
  try {
    const m = dictSrc.match(/window\.I18N_DICT\s*=\s*(\{[\s\S]*\})/)
    if (m) dict = JSON.parse(m[1])
  } catch (e) { console.error('load fail', e.message); process.exit(1) }
  if (!Object.keys(dict).length) { console.error('dict empty'); process.exit(1) }


  const allLangs = Object.keys(missing).filter(l => /^[a-z]{2}$/.test(l))
  const langs = ONLY_LANG ? [ONLY_LANG] : allLangs
  const t0 = Date.now()


  for (const lang of langs) {
    if (!dict[lang]) dict[lang] = {}
    const todo = (missing[lang] || []).filter(s => s && s.length >= 3 && s.length <= 2000)
    console.log('[' + lang + '] todo: ' + todo.length)
    let done = 0
    let failed = 0


    for (let i = 0; i < todo.length; i += CONCURRENCY * BATCH) {
      const chunk = todo.slice(i, i + CONCURRENCY * BATCH)
      const jobs = []
      for (let k = 0; k < chunk.length; k += BATCH) {
        const batch = chunk.slice(k, k + BATCH)
        const joined = batch.map(s => s.replace(/\\n/g, ' ').replace(/\n/g, ' ')).join(' ||| ')
        jobs.push({ batch, joined })
      }
      const results = await Promise.all(jobs.map(async j => {
        const r = await gtx(j.joined, lang)
        return { batch: j.batch, r }
      }))
      for (const { batch, r } of results) {
        if (!r) { failed += batch.length; continue }
        const parts = r.split(' ||| ').map(s => s.trim())
        if (parts.length !== batch.length) {
          /* Fallback: перевести по одной */
          for (const s of batch) {
            const one = await gtx(s, lang)
            if (one) { dict[lang][s] = one.trim(); done++ }
            else failed++
          }
          continue
        }
        for (let k = 0; k < batch.length; k++) {
          if (parts[k] && parts[k] !== batch[k]) { dict[lang][batch[k]] = parts[k]; done++ }
        }
      }
      process.stdout.write('\r[' + lang + '] ' + (i + chunk.length) + '/' + todo.length + ' ok=' + done + ' fail=' + failed + '   ')
    }
    console.log('\n[' + lang + '] done=' + done + ' failed=' + failed)
  }


  const json = JSON.stringify(dict, null, 0)
  const out = '/* Vio — словарь интерфейса. Сгенерировано из dict/*.txt, правится там. */\nwindow.I18N_DICT = ' + json + ';\n'
  fs.writeFileSync(dictPath, out, 'utf8')


  const ms = Math.round((Date.now() - t0) / 1000)
  console.log('\n=== done in ' + ms + 's ===')
  for (const l of langs) console.log('  ' + l + ': ' + Object.keys(dict[l] || {}).length)
}


main().catch(e => { console.error(e); process.exit(1) })
