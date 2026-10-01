const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')


const MODEL = 'gpt-5.4-nano'
const LANG_NAMES = {
  uk:'Ukrainian', en:'English', de:'German', fr:'French', es:'Spanish',
  it:'Italian', pt:'Portuguese', pl:'Polish', tr:'Turkish', nl:'Dutch',
  sv:'Swedish', fi:'Finnish', cs:'Czech', ro:'Romanian', el:'Greek',
  be:'Belarusian', kk:'Kazakh', ar:'Arabic', he:'Hebrew',
  zh:'Chinese (Simplified)', ja:'Japanese', ko:'Korean', hi:'Hindi'
}


let puterMod = null
function readTokenFile() {
  try {
    const t = fs.readFileSync(path.join(root, '.puter-token'), 'utf8').trim()
    return t || ''
  } catch (e) { return '' }
}
async function getPuter() {
  if (puterMod) return puterMod
  const token = process.env.PUTER_AUTH_TOKEN || readTokenFile()
  if (token) {
    try {
      const { init } = require('@heyputer/puter.js/src/init.cjs')
      puterMod = init(token)
      return puterMod
    } catch (e) {
      console.error('init(token) не сработал:', e.message)
    }
  }
  try {
    const m = await import('@heyputer/puter.js')
    puterMod = m.puter || m.default || m
  } catch (e) {
    console.error('Puter не загрузился:', e.message)
    process.exit(1)
  }
  return puterMod
}


function clean(s) {
  let t = String(s||'').trim()
  t = t.replace(/^```[a-z]*\s*/i,'').replace(/\s*```$/,'')
  t = t.replace(/^(Вот перевод|Translation|Перевод|Ось переклад)[:\s]+/i,'')
  t = t.replace(/^["'«»]|["'«»]$/g,'')
  t = t.split(/\n{2,}/)[0].trim()
  return t
}


async function tr(puter, text, langName) {
  const prompt = 'Translate to '+langName+'. Keep placeholders %s, {}, ${}, <b>, <i>, \\n. Do not translate brands (Vio, Google, GitHub, YouTube). Output ONLY the translation:\n\n'+text
  for (let a=0;a<3;a++) {
    try {
      const r = await puter.ai.chat(prompt, { model: MODEL })
      const txt = typeof r==='string'?r:(r&&r.message&&r.message.content)||(r&&r.text)||''
      const c = clean(txt)
      if (c && c!==text) return c
    } catch(e) { await new Promise(r=>setTimeout(r,400*(a+1))) }
  }
  return null
}


async function main() {
  const puter = await getPuter()
  /* быстрая проверка авторизации: без токена все переводы упадут в 401 */
  try {
    await puter.ai.chat('ping', { model: MODEL })
  } catch (e) {
    if (String(e && e.message) === 'Unauthorized') {
      console.error('Puter: Unauthorized — нужен токен.')
      console.error('  puter.com/dashboard → Account → API token → Create token,')
      console.error('  затем: PUTER_AUTH_TOKEN=<token> node tools/i18n-puter.js [lang]')
      console.error('  (или положите токен в файл .puter-token в корне проекта)')
      process.exit(1)
    }
    /* прочие ошибки (429, сеть) — пробуем работать дальше, tr() ретраит */
  }
  const dictPath = path.join(root,'scripts','i18n-dict.js')
  const missingPath = path.join(root,'i18n-missing.json')
  let dict = {}
  try {
    const m = fs.readFileSync(dictPath,'utf8').match(/window\.I18N_DICT\s*=\s*(\{[\s\S]*\})/)
    if (m) dict = JSON.parse(m[1])
  } catch(e) { console.error('dict load', e.message); process.exit(1) }
  const missing = JSON.parse(fs.readFileSync(missingPath,'utf8'))
  const only = process.argv[2] || ''
  const langs = only ? [only] : Object.keys(LANG_NAMES)
  const t0 = Date.now()
  for (const lang of langs) {
    const name = LANG_NAMES[lang]
    if (!name) continue
    if (!dict[lang]) dict[lang] = {}
    const raw = missing[lang] || []
    const todo = raw.filter(s => s && s.length>=3 && s.length<=500 && !dict[lang][s])
    console.log('\n['+lang+'] todo: '+todo.length)
    let done=0, failed=0
    for (let i=0;i<todo.length;i++) {
      const s = todo[i]
      const t = await tr(puter, s, name)
      if (t) { dict[lang][s]=t; done++ } else failed++
      process.stdout.write('\r['+lang+'] '+(i+1)+'/'+todo.length+' ok='+done+' fail='+failed)
      if ((i+1)%10===0) {
        fs.writeFileSync(dictPath,'/* Vio — словарь интерфейса. */\nwindow.I18N_DICT = '+JSON.stringify(dict)+';\n','utf8')
      }
    }
    console.log('\n['+lang+'] done='+done+' failed='+failed)
    fs.writeFileSync(dictPath,'/* Vio — словарь интерфейса. */\nwindow.I18N_DICT = '+JSON.stringify(dict)+';\n','utf8')
  }
  const ms = Math.round((Date.now()-t0)/1000)
  console.log('\n=== done in '+ms+'s ===')
  for (const l of langs) console.log('  '+l+': '+Object.keys(dict[l]||{}).length)
}
main().catch(e=>{console.error(e);process.exit(1)})
