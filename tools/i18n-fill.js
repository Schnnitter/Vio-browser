/* i18n-fill — переводит в словарь ТОЛЬКО ключи из i18n-audit.json
   (списки A «нет перевода» и B «смешанные»), построчным патчем значений:
   форматирование, порядок и структура файла сохраняются байт-в-байт.

   Запуск:
     node tools/i18n-fill.js                    # dry: печатает, что переводилось бы (без API)
     node tools/i18n-fill.js --provider=none    # то же самое явно
     node tools/i18n-fill.js --provider=openai --apply
     node tools/i18n-fill.js --provider=mock --apply     # тест патчера по i18n-mock-<lang>.json

   Провайдеры (ENV или --provider=):
     llm-chain — groq → gemini, OpenAI-совместимые /chat/completions;
                 ENV VIO_GROQ_URL/KEY/MODEL и VIO_GEMINI_URL/KEY/MODEL
     deepl   — DEEPL_API_KEY (+ DEEPL_URL, по умолчанию api-free.deepl.com)
     google  — GOOGLE_TRANSLATE_KEY (или VIO_TRANSLATE_KEY)
     openai  — VIO_TRANSLATE_URL (…/chat/completions), VIO_TRANSLATE_KEY, VIO_TRANSLATE_MODEL
     custom  — то же, что openai (VIO_TRANSLATE_URL/KEY/MODEL)
     mock    — i18n-mock-<lang>.json в корне (без сети, без ключа)
     none    — только список, без API-вызовов

   Флаги:
     --dry            печатать, не менять файл (по умолчанию)
     --apply          реально править словарь (сначала бэкап *.js.bak.<timestamp>)
     --lang=en,de     только эти языки
     --dict=<путь>    другой словарь (для тестов)

   Один запрос на язык (не на строку): system-промпт просит перевести ТОЛЬКО
   значения, сохранить ключи, вернуть строго JSON {"ключ": "значение"}.
   Ответ парсится строго (JSON.parse); если ключи не совпали с запрошенными —
   ошибка с диагностикой, для этого языка ничего не пишется.
   Ключ, потерявший плейсхолдеры (%s, %1, {count}, <b>…), отклоняется и
   возвращается в очередь (повторный запрос). Латинские токены (Vio, Ctrl+T,
   /login) не переводятся. При невозможности патча словарь не трогается,
   изменения уходят в i18n-dict.patch.json. */
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const AUDIT = path.join(root, 'i18n-audit.json')
const DEFAULT_DICT = path.join(root, 'scripts', 'i18n-dict.js')
const PATCH_OUT = path.join(root, 'i18n-dict.patch.json')

const CYR = /[Ѐ-ӿ]/
const CYR_LANGS = new Set(['ru', 'uk', 'be', 'kk'])
const PROVIDERS = ['llm-chain', 'deepl', 'google', 'openai', 'custom', 'mock']
const MAX_ROUNDS = 2 /* 1 запрос на язык + 1 повтор для отклонённых ключей */
const LANG_NAMES = {
  uk: 'Ukrainian', en: 'English', de: 'German', fr: 'French', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', pl: 'Polish', tr: 'Turkish', nl: 'Dutch',
  sv: 'Swedish', fi: 'Finnish', cs: 'Czech', ro: 'Romanian', el: 'Greek',
  be: 'Belarusian', kk: 'Kazakh', ar: 'Arabic', he: 'Hebrew',
  zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean', hi: 'Hindi'
}
const DEEPL_TARGET = { zh: 'ZH', pt: 'PT-BR', en: 'EN', uk: 'UK', el: 'EL' }
const GOOGLE_TARGET = { zh: 'zh-CN', pt: 'pt', en: 'en' }

/* ============================ аргументы ============================ */

function parseArgs (argv) {
  const o = { provider: '', apply: false, langs: [], dict: process.env.VIO_DICT_PATH || DEFAULT_DICT }
  for (const a of argv) {
    if (a === '--apply') o.apply = true
    else if (a === '--dry') o.apply = false
    else if (a.startsWith('--provider=')) o.provider = a.slice('--provider='.length).toLowerCase()
    else if (a.startsWith('--lang=')) o.langs = a.slice('--lang='.length).split(',').map(s => s.trim()).filter(Boolean)
    else if (a.startsWith('--dict=')) o.dict = path.resolve(root, a.slice('--dict='.length))
    else { console.error('неизвестный флаг: ' + a); process.exit(2) }
  }
  if (!o.provider) o.provider = (process.env.VIO_TRANSLATE_PROVIDER || '').toLowerCase()
  if (o.provider === 'none') o.provider = ''
  return o
}

/* ==================== разбор словаря (текст → объект) ==================== */

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

/* ============ позиционный сканер JSON: где что лежит в файле ============ */

function skipWs (t, i) {
  while (i < t.length && (t[i] === ' ' || t[i] === '\n' || t[i] === '\r' || t[i] === '\t')) i++
  return i
}

function readString (t, i) {
  i++
  while (i < t.length) {
    const c = t[i]
    if (c === '\\') { i += 2; continue }
    if (c === '"') return i + 1
    i++
  }
  throw new Error('незакрытая строка у позиции ' + i)
}

function scanValue (t, i) {
  const c = t[i]
  if (c === '"') {
    const e = readString(t, i)
    return { end: e, value: JSON.parse(t.slice(i, e)) }
  }
  if (c === '{') {
    const o = scanObject(t, i)
    return { end: o.end, value: o }
  }
  if (c === '[') return { end: scanArray(t, i), value: null }
  const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(t.slice(i))
  if (!m) throw new Error('неожиданный символ значения у позиции ' + i)
  return { end: i + m[0].length, value: m[0] }
}

function scanArray (t, i) {
  i++
  for (;;) {
    i = skipWs(t, i)
    if (t[i] === ']') return i + 1
    const r = scanValue(t, i)
    i = skipWs(t, r.end)
    if (t[i] === ',') { i++; continue }
    if (t[i] === ']') return i + 1
    throw new Error('ожидался "," или "]" у позиции ' + i)
  }
}

function scanObject (t, i) {
  const children = new Map()
  const start = i
  i++
  for (;;) {
    i = skipWs(t, i)
    if (t[i] === '}') { i++; break }
    if (t[i] !== '"') throw new Error('ожидался ключ-строка у позиции ' + i)
    const ks = i
    const ke = readString(t, i)
    const key = JSON.parse(t.slice(ks, ke))
    i = skipWs(t, ke)
    if (t[i] !== ':') throw new Error('ожидался ":" у позиции ' + i)
    i = skipWs(t, i + 1)
    const vs = i
    const r = scanValue(t, i)
    children.set(key, { keyStart: ks, keyEnd: ke, valueStart: vs, valueEnd: r.end, value: r.value })
    i = skipWs(t, r.end)
    if (t[i] === ',') { i++; continue }
    if (t[i] === '}') { i++; break }
    throw new Error('ожидался "," или "}" у позиции ' + i)
  }
  return { start, end: i, children }
}

/* ======================= патч: только значения ======================= */

function patchDict (text, changes) {
  try {
    const at = text.indexOf('window.I18N_DICT')
    if (at < 0) throw new Error('нет window.I18N_DICT')
    const gs = text.indexOf('{', at)
    const tree = scanObject(text, gs)
    const edits = []
    const missing = []
    for (const c of changes) {
      const langNode = tree.children.get(c.lang)
      const node = langNode && langNode.value && langNode.value.children.get(c.key)
      if (!node) { missing.push(c.lang + '::' + c.key); continue }
      edits.push({ s: node.valueStart, e: node.valueEnd, v: JSON.stringify(String(c.value)) })
    }
    if (missing.length) {
      return { ok: false, reason: 'в файле не найдено ключей: ' + missing.length + ' (первые: ' + preview(missing) + ')', missing }
    }
    if (!edits.length) return { ok: false, reason: 'нет изменений', missing: [] }
    edits.sort((a, b) => b.s - a.s) /* с конца — смещения не поедут */
    let out = text
    for (const ed of edits) out = out.slice(0, ed.s) + ed.v + out.slice(ed.e)
    /* контроль: файл разбирается и каждое новое значение на месте */
    const parsed = loadDict(out)
    for (const c of changes) {
      if (!parsed[c.lang] || parsed[c.lang][c.key] !== String(c.value)) {
        throw new Error('контроль не прошёл: ' + c.lang + '::' + c.key)
      }
    }
    return { ok: true, text: out }
  } catch (e) {
    return { ok: false, reason: e.message, missing: [] }
  }
}

function applyPatch (dictPath, changes) {
  const res = patchDict(fs.readFileSync(dictPath, 'utf8'), changes)
  if (!res.ok) {
    const byLang = {}
    for (const c of changes) {
      if (!byLang[c.lang]) byLang[c.lang] = {}
      byLang[c.lang][c.key] = c.value
    }
    fs.writeFileSync(PATCH_OUT, JSON.stringify({
      generated: new Date().toISOString(),
      dict: rel(dictPath),
      error: res.reason,
      missing: res.missing || [],
      changes: byLang
    }, null, 2), 'utf8')
    console.log('ПАТЧ НЕВОЗМОЖЕН (' + res.reason + ')')
    console.log('словарь НЕ тронут, правки записаны в i18n-dict.patch.json — примените руками')
    return false
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const bak = dictPath + '.bak.' + stamp
  fs.copyFileSync(dictPath, bak)
  fs.writeFileSync(dictPath, res.text, 'utf8')
  console.log('бэкап: ' + rel(bak))
  return true
}

/* ==================== плейсхолдеры и проверка ответа ==================== */

const TOKEN_RE = /%(?:\d+\$)?[sdf]|%\d+|\{[^{}]*\}|<\/?[A-Za-z][^<>]*>/g

function countTokens (s) {
  const m = String(s).match(TOKEN_RE)
  const c = new Map()
  for (const t of m || []) c.set(t, (c.get(t) || 0) + 1)
  return c
}

function requiredTokens (key, source) {
  const out = countTokens(key)
  for (const [t, n] of countTokens(source)) out.set(t, Math.max(out.get(t) || 0, n))
  return out
}

function missingTokens (req, value) {
  const have = countTokens(value)
  const miss = []
  for (const [t, n] of req) if ((have.get(t) || 0) < n) miss.push(t)
  return miss
}

function validateValue (it, v, lang) {
  if (typeof v !== 'string' || !v.trim()) return 'пустой перевод'
  const miss = missingTokens(requiredTokens(it.key, it.source), v)
  if (miss.length) return 'потеряны плейсхолдеры/теги: ' + miss.join(' ')
  const same = v.trim() === it.source.trim()
  if (same) {
    /* uk/be/kk делят с русским множество слов (Меню, Закладки, Ключ, Аврора) —
       identical здесь нормален: помечаем и принимаем, но считаем отдельно.
       Для en/de/fr/… value === source с кириллицей — реальный косяк. */
    if (!CYR_LANGS.has(lang) && CYR.test(it.source)) return 'не переведено (value === source)'
    it.identical = true
    return ''
  }
  if (!CYR_LANGS.has(lang) && CYR.test(v)) return 'в переводе осталась кириллица'
  return ''
}

function checkKeys (requested, got) {
  if (!got || typeof got !== 'object' || Array.isArray(got)) return 'ответ не объект {"ключ": "значение"}'
  const want = new Set(requested)
  const have = Object.keys(got)
  const haveSet = new Set(have)
  const missing = requested.filter(k => !haveSet.has(k))
  const extra = have.filter(k => !want.has(k))
  if (!missing.length && !extra.length) return ''
  return 'ключи ответа не совпали с запросом: запрошено ' + requested.length +
    ', получено ' + have.length +
    (missing.length ? '; нет в ответе ' + missing.length + ': ' + preview(missing) : '') +
    (extra.length ? '; лишние ' + extra.length + ': ' + preview(extra) : '') +
    ' — для этого языка ничего не пишется'
}

/* ============================== провайдеры ============================== */

function systemPrompt (langName) {
  return [
    'You translate UI strings of the Vio desktop browser into ' + langName + '.',
    'Input: JSON array of {"key": ..., "source": ...} — key is the identifier (Russian UI string), source is the current value to translate.',
    'Output: STRICT JSON object {"<key from input>": "<translation>"} — every input key, exactly once, no extra keys.',
    'No markdown, no code fences, no comments, no explanations — only the JSON object.',
    'Rules:',
    'IMPORTANT for Ukrainian, Belarusian, Kazakh:',
    '- The input "source" is ALWAYS in Russian, even if it looks like Ukrainian.',
    '- Translate it to the target language, EVEN IF some words look similar.',
    '- Ukrainian has distinct spellings: "Лицензия"→"Ліцензія", "Загрузка"→"Завантаження", "Страница"→"Сторінка", "Настройки"→"Налаштування".',
    '- If a word is genuinely identical in the target language (proper nouns like "Меню", "Аврора", "Ключ", abbreviations, country names) — return it unchanged.',
    '- DO NOT default to "return source as-is". Only return source if you are sure the target language uses the exact same spelling.',
    '- Translate ONLY natural language. Keep the keys exactly as given, do not alter them.',
    '- Do NOT translate or alter brands: Vio, GitHub, Google, Yandex, DuckDuckGo, YouTube, Telegram.',
    '- Do NOT alter hotkeys: Ctrl+T, Alt+E, Ctrl+Shift+N, F11, Ctrl+C, Shift.',
    '- Do NOT alter paths and URLs: /login, /password, https://..., file paths.',
    '- Do NOT alter tech terms: DPAPI, Keychain, WebDAV, OAuth, OpenAI, Groq, Gemini, Chromium, Electron, CSS, HTML, OCR, JSON, API, SQL.',
    '- Keep placeholders %s, %1, {count}, {name} and HTML tags <b>, </b>, <kbd> exactly as in source.',
    '- Keep brand/tech tokens inside sentences as-is.'
  ].join('\n')
}

async function fetchOpenAI (langName, items) {
  const url = process.env.VIO_TRANSLATE_URL
  if (!url) throw new Error('не задан VIO_TRANSLATE_URL (адрес …/chat/completions)')
  const model = process.env.VIO_TRANSLATE_MODEL || 'gpt-4o-mini'
  const key = process.env.VIO_TRANSLATE_KEY || ''
  const body = {
    model,
    temperature: 0.2,
    max_tokens: Number(process.env.VIO_TRANSLATE_MAX_TOKENS || 16384),
    messages: [
      { role: 'system', content: systemPrompt(langName) },
      { role: 'user', content: JSON.stringify(items) }
    ]
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200))
  let data
  try { data = JSON.parse(text) } catch (e) { throw new Error('ответ сервера не JSON: ' + text.slice(0, 200)) }
  const ch = data && data.choices && data.choices[0]
  const content = ch && ((ch.message && ch.message.content) || ch.text)
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('нет choices[0].message.content; ключи ответа: ' + Object.keys(data || {}).join(', '))
  }
  const trimmed = content.trim()
  try {
    const obj = JSON.parse(trimmed)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('не объект')
    return obj
  } catch (e) {
    throw new Error('JSON.parse не удался (' + e.message + '); длина ' + trimmed.length +
      ', начало: ' + JSON.stringify(trimmed.slice(0, 160)) +
      (trimmed.length >= 160 ? ' — вероятно, ответ обрезан, увеличьте VIO_TRANSLATE_MAX_TOKENS или уменьшите число строк' : ''))
  }
}

async function fetchDeepl (lang, items) {
  const key = process.env.DEEPL_API_KEY || process.env.VIO_TRANSLATE_KEY
  if (!key) throw new Error('не задан DEEPL_API_KEY')
  const url = process.env.DEEPL_URL || 'https://api-free.deepl.com/v2/translate'
  const target = (DEEPL_TARGET[lang] || lang).toUpperCase()
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: 'DeepL-Key ' + key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: items.map(i => i.source), source_lang: 'RU', target_lang: target })
  })
  const text = await res.text()
  if (!res.ok) throw new Error('DeepL HTTP ' + res.status + ': ' + text.slice(0, 200))
  let data
  try { data = JSON.parse(text) } catch (e) { throw new Error('DeepL: ответ не JSON: ' + text.slice(0, 200)) }
  const tr = data.translations
  if (!Array.isArray(tr) || tr.length !== items.length) {
    throw new Error('DeepL: ожидалось переводов ' + items.length + ', получено ' + (Array.isArray(tr) ? tr.length : typeof tr))
  }
  const out = {}
  items.forEach((it, i) => { out[it.key] = String(tr[i].text || '') })
  return out
}

async function fetchGoogle (lang, items) {
  const key = process.env.GOOGLE_TRANSLATE_KEY || process.env.VIO_TRANSLATE_KEY
  if (!key) throw new Error('не задан GOOGLE_TRANSLATE_KEY')
  const url = 'https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(key)
  const target = GOOGLE_TARGET[lang] || lang
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: items.map(i => i.source), source: 'ru', target: target, format: 'text' })
  })
  const text = await res.text()
  if (!res.ok) throw new Error('Google HTTP ' + res.status + ': ' + text.slice(0, 200))
  let data
  try { data = JSON.parse(text) } catch (e) { throw new Error('Google: ответ не JSON: ' + text.slice(0, 200)) }
  const tr = data && data.data && data.data.translations
  if (!Array.isArray(tr) || tr.length !== items.length) {
    throw new Error('Google: ожидалось переводов ' + items.length + ', получено ' + (Array.isArray(tr) ? tr.length : typeof tr))
  }
  const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const out = {}
  items.forEach((it, i) => { out[it.key] = unesc(tr[i].translatedText || '') })
  return out
}

function fetchMock (lang, items) {
  const file = path.join(root, 'i18n-mock-' + lang + '.json')
  let raw
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) {
    throw new Error('не удалось прочитать ' + path.basename(file) + ': ' + e.message)
  }
  const entries = Array.isArray(raw)
    ? raw.map(e => [e && e.key, e && (e.value !== undefined ? e.value : e.translation)])
    : Object.entries(raw)
  const want = new Set(items.map(i => i.key))
  const out = {}
  const outside = []
  for (const [k, v] of entries) {
    if (!k || !want.has(k)) { outside.push(String(k)); continue }
    out[k] = String(v)
  }
  if (outside.length) console.log('  [mock] ключей вне списка: ' + outside.length + ': ' + preview(outside))
  return out
}

async function fetchTranslations (provider, lang, langName, items) {
  if (provider === 'mock') return fetchMock(lang, items)
  if (provider === 'openai' || provider === 'custom') return fetchOpenAI(langName, items)
  if (provider === 'deepl') return fetchDeepl(lang, items)
  if (provider === 'google') return fetchGoogle(lang, items)
  throw new Error('неизвестный провайдер: ' + provider)
}

/* ========================= llm-chain: groq → gemini =========================
   Два OpenAI-совместимых LLM-провайдера подряд. Один запрос на батч ключей.
   Сбой (network, 429, 5xx, timeout, невалидный JSON) → следующий в цепочке
   с тем же батчем. Все ключи берутся из env, в коде не хранятся.
   Перед checkKeys: ключи ответа нормализуются (пробелы/тире), битый JSON
   чинится (неэкранированные кавычки, сырые переводы строк). Невосстановимый
   ответ пишется в i18n-fill-error.log, провайдер считается упавшим. */

const CHAIN = [
  { name: 'groq', urlEnv: 'VIO_GROQ_URL', keyEnv: 'VIO_GROQ_KEY', modelEnv: 'VIO_GROQ_MODEL' },
  { name: 'gemini', urlEnv: 'VIO_GEMINI_URL', keyEnv: 'VIO_GEMINI_KEY', modelEnv: 'VIO_GEMINI_MODEL', reasoning: true }
]
const ERRLOG = path.join(root, 'i18n-fill-error.log')
const CHAIN_TIMEOUT = Number(process.env.VIO_TRANSLATE_TIMEOUT || 120000)

function logBadResponse (provider, lang, text) {
  const head = '--- ' + new Date().toISOString() + ' provider=' + provider + ' lang=' + lang + '\n'
  fs.appendFileSync(ERRLOG, head + String(text).slice(0, 300) + '\n', 'utf8')
}

/* нормализация ключа для сопоставления ответа с запросом:
   без пробелов (вкл. NBSP), с едиными тире. Регистр сохраняется —
   в словаре есть «Готово» и «ГОТОВО», их путать нельзя. */
const normKey = s => String(s)
  .replace(/\s+/g, '')
  .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')

/* модель вернула ключи, отличные от запрошенных («текст | ru» вместо
   «текст|ru»): пытаемся однозначно сопоставить. Неоднозначное и лишнее
   остаются как есть — их отловит checkKeys, цепочка уйдёт к следующему. */
function remapResponseKeys (items, obj) {
  const wanted = items.map(i => i.key)
  const wantSet = new Set(wanted)
  const extras = Object.keys(obj).filter(k => !wantSet.has(k))
  const missing = wanted.filter(k => !(k in obj))
  if (!extras.length || !missing.length) return obj
  const normMap = new Map()
  for (const k of wanted) {
    const n = normKey(k)
    if (!normMap.has(n)) normMap.set(n, [])
    normMap.get(n).push(k)
  }
  const missSet = new Set(missing)
  const taken = new Set()
  const remap = new Map()
  for (const ek of extras) {
    const cands = (normMap.get(normKey(ek)) || []).filter(k => missSet.has(k) && !taken.has(k))
    if (cands.length === 1) { remap.set(ek, cands[0]); taken.add(cands[0]) }
  }
  if (!remap.size) return obj
  const out = {}
  for (const k of Object.keys(obj)) out[remap.get(k) || k] = obj[k]
  return out
}

/* починка JSON с неэкранированными кавычками внутри строк (модель пишет
   «Поля пароля: "+ pwd +"») и сырыми переводами строк. Кавычка считается
   закрывающей, только если после неё (с пробелами) идёт : , } ] — иначе
   это содержимое, её нужно экранировать. Не починилось → null. */
function repairJson (s) {
  let out = ''
  let inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (!inStr) {
      if (c === '"') inStr = true
      out += c
      continue
    }
    if (c === '\\') { out += c + (s[i + 1] || ''); i++; continue }
    if (c === '"') {
      let j = i + 1
      while (j < s.length && /\s/.test(s[j])) j++
      const next = s[j]
      if (j >= s.length || next === ':' || next === ',' || next === '}' || next === ']') {
        inStr = false
        out += c
      } else out += '\\"'
      continue
    }
    if (c === '\n') { out += '\\n'; continue }
    if (c === '\r') { out += '\\r'; continue }
    if (c === '\t') { out += '\\t'; continue }
    if (c.charCodeAt(0) < 0x20) { out += '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'); continue }
    out += c
  }
  return inStr ? null : out
}

function chainCfg (p) {
  const url = process.env[p.urlEnv]
  const key = process.env[p.keyEnv]
  const model = process.env[p.modelEnv]
  if (!key) throw new Error(p.name + ': не задан ' + p.keyEnv)
  if (!url) throw new Error(p.name + ': не задан ' + p.urlEnv)
  if (!model) throw new Error(p.name + ': не задан ' + p.modelEnv)
  return { url, key, model, reasoning: !!p.reasoning }
}

async function fetchChainChat (p, cfg, lang, langName, items) {
  const body = {
    model: cfg.model,
    temperature: 0.2,
    max_tokens: Number(process.env.VIO_TRANSLATE_MAX_TOKENS || 16384),
    messages: [
      { role: 'system', content: systemPrompt(langName) },
      { role: 'user', content: JSON.stringify(items) }
    ]
  }
  /* gemini-2.5-flash: гасим thinking — для перевода он жжёт токены впустую */
  if (cfg.reasoning) body.reasoning_effort = 'none'
  let res
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHAIN_TIMEOUT)
    })
  } catch (e) {
    throw new Error(p.name + ': ' + (e.message || e.name || String(e)))
  }
  const text = await res.text()
  if (!res.ok) throw new Error(p.name + ' HTTP ' + res.status + ': ' + text.slice(0, 200))
  let data
  try { data = JSON.parse(text) } catch (e) {
    logBadResponse(p.name, lang, text)
    throw new Error(p.name + ': ответ не JSON (' + e.message + ')')
  }
  const ch = data && data.choices && data.choices[0]
  const content = ch && ((ch.message && ch.message.content) || ch.text)
  if (typeof content !== 'string' || !content.trim()) {
    logBadResponse(p.name, lang, text)
    throw new Error(p.name + ': нет choices[0].message.content; ключи ответа: ' + Object.keys(data || {}).join(', '))
  }
  const trimmed = content.trim()
  /* модели любят оборачивать ответ в ```json ```: сначала честный JSON.parse,
     затем снятие fences/извлечение {...}, затем ремонт неэкранированных
     кавычек. Если и это не помогло — в error.log и провайдер считается упавшим. */
  const candidates = [trimmed]
  if (trimmed.startsWith('```')) {
    candidates.push(trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim())
  }
  const bs = trimmed.indexOf('{')
  const be = trimmed.lastIndexOf('}')
  if (bs >= 0 && be > bs) candidates.push(trimmed.slice(bs, be + 1))
  let obj = null
  let parsed = false
  for (const cand of candidates) {
    try { obj = JSON.parse(cand); parsed = true; break } catch (e) { /* дальше */ }
    try {
      const fixed = repairJson(cand)
      if (fixed) { obj = JSON.parse(fixed); parsed = true; break }
    } catch (e) { /* дальше */ }
  }
  if (!parsed) {
    logBadResponse(p.name, lang, trimmed)
    throw new Error(p.name + ': содержимое не JSON; начало: ' + JSON.stringify(trimmed.slice(0, 160)))
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    logBadResponse(p.name, lang, trimmed)
    throw new Error(p.name + ': содержимое не объект {"ключ": "значение"}')
  }
  obj = remapResponseKeys(items, obj)
  const keyErr = checkKeys(items.map(i => i.key), obj)
  if (keyErr) {
    logBadResponse(p.name, lang, trimmed)
    throw new Error(p.name + ': ' + keyErr)
  }
  return obj
}

/* один раунд цепочки: сначала groq; при сбое — gemini с тем же батчем.
   fatal = сколько провайдеров упало до того, как ответ пришёл. */
async function chainRound (lang, langName, items) {
  const failed = []
  for (const p of CHAIN) {
    try {
      const cfg = chainCfg(p)
      const got = await fetchChainChat(p, cfg, lang, langName, items)
      return { got, by: p.name, fatal: failed.length }
    } catch (e) {
      failed.push(e.message)
    }
  }
  throw new Error(failed.join('; '))
}

/* ==================== перевод одного языка (пакет) ==================== */

async function translateLang (provider, lang, queue) {
  const langName = LANG_NAMES[lang] || lang
  const rounds = provider === 'mock' ? 1 : MAX_ROUNDS
  const accepted = {}
  const rejected = {}
  let translated = 0 /* value изменился */
  let identical = 0  /* value === source, для uk/be/kk это валидный перевод */
  let pending = queue
  let fatal = ''
  for (let round = 1; round <= rounds && pending.length; round++) {
    let got
    try {
      got = await fetchTranslations(provider, lang, langName, pending)
    } catch (e) {
      /* раунд 1: ошибка провайдера → для языка ничего не пишем, ключи просто
         остаются в очереди. раунд 2+: уже проверенные переводы раунда 1
         остаются, непроверенный хвост тоже уходит обратно в очередь. */
      fatal = 'раунд ' + round + ': ' + e.message
      break
    }
    const keyErr = checkKeys(pending.map(i => i.key), got)
    if (keyErr) {
      fatal = 'раунд ' + round + ': ' + keyErr
      break
    }
    const next = []
    for (const it of pending) {
      const reason = validateValue(it, got[it.key], lang)
      if (!reason) {
        accepted[it.key] = got[it.key]
        if (it.identical) identical++; else translated++
      } else {
        rejected[it.key] = reason
        if (round < rounds) next.push(it)
      }
    }
    pending = next
  }
  return { accepted, rejected, fatal, translated, identical }
}

/* перевод языка цепочкой: каждый раунд начинается с начала цепочки (groq);
   отклонённые validateValue ключи уходят в следующий раунд, принятые
   остаются. MAX_ROUNDS — общий для всех провайдеров. */
async function translateLangChain (lang, queue) {
  const langName = LANG_NAMES[lang] || lang
  const accepted = {}
  const rejected = {}
  const report = []
  let translated = 0
  let identical = 0
  let pending = queue
  let fatal = ''
  for (let round = 1; round <= MAX_ROUNDS && pending.length; round++) {
    let r
    try {
      r = await chainRound(lang, langName, pending)
    } catch (e) {
      fatal = 'раунд ' + round + ': ' + e.message
      break
    }
    const next = []
    let roundTranslated = 0
    let roundIdentical = 0
    let rej = 0
    for (const it of pending) {
      const reason = validateValue(it, r.got[it.key], lang)
      if (!reason) {
        accepted[it.key] = r.got[it.key]
        delete rejected[it.key] /* раунд 2 принял ключ, отклонённый в раунде 1 */
        if (it.identical) { identical++; roundIdentical++ } else { translated++; roundTranslated++ }
      } else {
        rejected[it.key] = reason
        rej++
        if (round < MAX_ROUNDS) next.push(it)
      }
    }
    const label = round === 1 ? r.by : r.by + ' (round ' + round + ')'
    report.push('     ' + label + ': ' + roundTranslated + ' translated, ' + roundIdentical + ' identical, ' +
      rej + ' rejected' + (round === 1 ? ', ' + r.fatal + ' fatal' : ''))
    pending = next
  }
  return { accepted, rejected, fatal, report, translated, identical }
}

/* =============================== утилиты =============================== */

const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v))
const rel = p => path.relative(root, p) || p
const shortKey = s => { s = String(s); return JSON.stringify(s.length > 60 ? s.slice(0, 59) + '\u2026' : s) }
function preview (arr) {
  return arr.slice(0, 3).map(shortKey).join(', ') + (arr.length > 3 ? ' \u2026' : '')
}

/* ================================ main ================================ */

async function main () {
  const opts = parseArgs(process.argv.slice(2))
  const provider = opts.provider
  if (provider && !PROVIDERS.includes(provider)) {
    console.error('неизвестный провайдер: ' + provider + ' (нужен deepl|google|openai|custom|mock|none)')
    process.exit(2)
  }
  if (!fs.existsSync(AUDIT)) { console.error('нет i18n-audit.json — сначала: node tools/i18n-audit.js'); process.exit(1) }
  if (!fs.existsSync(opts.dict)) { console.error('нет словаря: ' + rel(opts.dict)); process.exit(1) }

  const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'))
  const dictText = fs.readFileSync(opts.dict, 'utf8')
  const dict = loadDict(dictText)

  console.log('i18n-fill: ' + rel(opts.dict) + ' ← ' + rel(AUDIT))
  console.log(provider
    ? 'провайдер: ' + provider + (opts.apply ? ', режим: --apply' : ', режим: --dry (не пишет)')
    : 'провайдер не задан — печатаю, что переводилось бы, API не вызывается')

  const allAccepted = {}
  const langs = Object.keys(audit).filter(l => /^[a-z]{2}$/.test(l))
    .filter(l => !opts.langs.length || opts.langs.includes(l))
  let fatalLangs = 0
  let totalRejected = 0

  for (const lang of langs) {
    const rep = audit[lang] || {}
    const map = (dict[lang] && typeof dict[lang] === 'object') ? dict[lang] : {}

    /* очередь: A + B + identical (для uk/be/kk identical — валидный перевод,
       модель должна перепроверить и вернуть как есть → фильтр в changes),
       дедуп, только существующие ключи, только кириллица
       (Vio, Ctrl+T, /login — не «непереведённое», их не трогаем) */
    let candidates
    if (provider === 'mock') {
      /* mock: правим ровно те ключи, что названы в файле и есть в словаре */
      const mf = path.join(root, 'i18n-mock-' + lang + '.json')
      if (!fs.existsSync(mf)) { console.log('[' + lang + '] пропущен: нет ' + path.basename(mf)); continue }
      try {
        const raw = JSON.parse(fs.readFileSync(mf, 'utf8'))
        const entries = Array.isArray(raw)
          ? raw.map(e => e && e.key)
          : Object.keys(raw)
        candidates = entries.filter(k => typeof k === 'string')
      } catch (e) { console.log('[' + lang + '] ОШИБКА: ' + path.basename(mf) + ' не JSON: ' + e.message); fatalLangs++; continue }
    } else {
      candidates = [...(rep.untranslated || []), ...(rep.mixed || []), ...(rep.identical || [])]
    }

    const seen = new Set()
    const queue = []
    let skippedTech = 0
    let skippedNoKey = 0
    for (const k of candidates) {
      if (seen.has(k)) continue
      seen.add(k)
      if (!(k in map)) { skippedNoKey++; continue }
      if (!CYR.test(k)) { skippedTech++; continue }
      queue.push({ key: k, source: str(map[k]) || k })
    }

    if (!queue.length) {
      if (opts.langs.length || provider === 'mock') {
        console.log('[' + lang + '] нет ключей для перевода (нет в словаре: ' + skippedNoKey + ', тех.токенов: ' + skippedTech + ')')
      }
      continue
    }

    /* dry без провайдера: просто список */
    if (!provider) {
      console.log('')
      console.log('[' + lang + '] к переводу: ' + queue.length +
        ' (A=' + (rep.untranslated || []).length + ', I=' + (rep.identical || []).length +
        ', B=' + (rep.mixed || []).length +
        '; пропущено: тех.токенов ' + skippedTech + ', нет ключа ' + skippedNoKey + ')')
      queue.slice(0, 5).forEach(it => console.log('    ' + shortKey(it.key) + ' = ' + shortKey(it.source)))
      continue
    }

    const chain = provider === 'llm-chain'
    if (chain) {
      console.log('')
      console.log('[' + lang + '] к переводу: ' + queue.length +
        ' (A=' + (rep.untranslated || []).length + ', I=' + (rep.identical || []).length +
        ', B=' + (rep.mixed || []).length + ')')
    }
    const res = chain ? await translateLangChain(lang, queue) : await translateLang(provider, lang, queue)
    const accKeys = Object.keys(res.accepted)
    const rejKeys = Object.keys(res.rejected)
    totalRejected += rejKeys.length
    if (chain) {
      res.report.forEach(l => console.log(l))
      if (res.fatal) { fatalLangs++; console.log('[' + lang + '] ОШИБКА: ' + res.fatal) }
      console.log('     итог: ' + accKeys.length + ' ok (' + res.translated + ' изм., ' + res.identical +
        ' без изм.) / ' + rejKeys.length + ' rejected')
    } else {
      if (res.fatal) { fatalLangs++; console.log('[' + lang + '] ОШИБКА: ' + res.fatal) }
      console.log('[' + lang + '] прошли проверку: ' + accKeys.length +
        ' (' + res.translated + ' изм., ' + res.identical + ' без изм.), отклонено (в очередь): ' + rejKeys.length +
        (skippedTech || skippedNoKey ? ', пропущено: тех.токенов ' + skippedTech + ', нет ключа ' + skippedNoKey : ''))
      rejKeys.slice(0, 5).forEach(k => console.log('    отклонено: ' + shortKey(k) + ' — ' + res.rejected[k]))
      if (rejKeys.length > 5) console.log('    ... ещё ' + (rejKeys.length - 5) + ' отклонённых')
    }

    allAccepted[lang] = res.accepted
    if (!opts.apply && accKeys.length) {
      /* в первых 10 парах показываем ИЗМЕНЁННЫЕ значения (translated),
         identical добавляем только если изменённых меньше 10 */
      const identSet = new Set(queue.filter(i => i.identical).map(i => i.key))
      const changedKeys = accKeys.filter(k => !identSet.has(k))
      const sameKeys = accKeys.filter(k => identSet.has(k))
      const showKeys = changedKeys.slice(0, 10)
      if (showKeys.length < 10) showKeys.push(...sameKeys.slice(0, 10 - showKeys.length))
      if (!changedKeys.length) console.log('  --dry: все ' + accKeys.length + ' принятых identical (без изменений) — нечего применять, --apply не тронет файл')
      console.log('  --dry: не применяется, первые ' + showKeys.length + ' пар было → станет:')
      showKeys.forEach(k => {
        console.log('    ' + shortKey(k) + ': ' + shortKey(str(map[k])) + '  →  ' + shortKey(res.accepted[k]))
      })
    }
  }

  if (!provider) {
    console.log('')
    console.log('ничего не изменено. чтобы перевести: --provider=deepl|google|openai|custom (нужен ключ),')
    console.log('или --provider=mock --apply для теста патчера по i18n-mock-<lang>.json')
    return
  }

  const changes = []
  for (const lang of Object.keys(allAccepted)) {
    const map = (dict[lang] && typeof dict[lang] === 'object') ? dict[lang] : {}
    for (const k of Object.keys(allAccepted[lang])) {
      /* identical (модель вернула ровно то, что уже в словаре) — не гоняем впустую */
      if (str(map[k]) === str(allAccepted[lang][k])) continue
      changes.push({ lang, key: k, value: allAccepted[lang][k] })
    }
  }
  console.log('')
  if (!changes.length) {
    if (fatalLangs) {
      console.log('менять нечего (ошибок провайдера: ' + fatalLangs + ')' +
        (totalRejected ? ', отклонено: ' + totalRejected + ' — вернулись в очередь' : ''))
      process.exitCode = 1
    } else {
      console.log('изменений нет (все identical) — бэкап не создан, файл не тронут' +
        (totalRejected ? '; отклонено: ' + totalRejected + ' — вернулись в очередь' : ''))
    }
    return
  }
  if (!opts.apply) {
    console.log('итог (--dry): к изменению ' + changes.length + ' значений, файл не тронут. запустите с --apply, чтобы записать')
    if (fatalLangs) process.exitCode = 1
    return
  }
  const ok = applyPatch(opts.dict, changes)
  console.log('применено: ' + (ok ? changes.length : 0) + ' из ' + changes.length + ' значений; отклонено и в очереди: ' + totalRejected)
  if (fatalLangs) {
    console.log('языков с ошибкой провайдера: ' + fatalLangs + ' — их ключи не тронуты')
    process.exitCode = 1
  }
  if (!ok) process.exitCode = 1
}

main().catch(e => { console.error(e); process.exit(1) })
