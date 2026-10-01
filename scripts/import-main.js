/* Импорт из Chrome/Firefox — чтение ЛОКАЛЬНЫХ файлов пользователя.
   Ничего не отправляется в сеть: только свои файлы на диске, как это делает
   сам браузер при переносе данных. Пароли Chromium расшифровываются через DPAPI
   Windows (тот же механизм, что у самого Chrome), Firefox хранит пароли в NSS —
   их не трогаем и честно сообщаем об этом. */
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const child = require('child_process')
const { DatabaseSync } = require('node:sqlite')

function home () { return os.homedir() }
function ex (p) { try { return fs.existsSync(p) } catch (e) { return false } }
function isDir (p) { try { return fs.statSync(p).isDirectory() } catch (e) { return false } }

/* ---------- где живут браузеры ---------- */
function chromiumBrowsers () {
  const L = process.env.LOCALAPPDATA || ''
  const A = process.env.APPDATA || ''
  const mac = process.platform === 'darwin'
  const lin = process.platform === 'linux'
  const list = [
    { id: 'chrome', name: 'Google Chrome', win: [L, 'Google', 'Chrome', 'User Data'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/Google/Chrome', lin: home() + '/.config/google-chrome' },
    { id: 'edge', name: 'Microsoft Edge', win: [L, 'Microsoft', 'Edge', 'User Data'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/Microsoft Edge', lin: home() + '/.config/microsoft-edge' },
    { id: 'brave', name: 'Brave', win: [L, 'BraveSoftware', 'Brave-Browser', 'User Data'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/BraveSoftware/Brave-Browser', lin: home() + '/.config/BraveSoftware/Brave-Browser' },
    { id: 'yandex', name: 'Яндекс Браузер', win: [L, 'Yandex', 'YandexBrowser', 'User Data'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/Yandex/YandexBrowser', lin: home() + '/.config/yandex-browser' },
    { id: 'vivaldi', name: 'Vivaldi', win: [L, 'Vivaldi', 'User Data'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/Vivaldi', lin: home() + '/.config/vivaldi' },
    { id: 'opera', name: 'Opera', win: [A, 'Opera Software', 'Opera Stable'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/com.operasoftware.Opera', lin: home() + '/.config/opera' },
    { id: 'chromium', name: 'Chromium', win: [L, 'Chromium', 'User Data'].filter(Boolean).join('\\'), mac: home() + '/Library/Application Support/Chromium', lin: home() + '/.config/chromium' }
  ]
  return list.map(b => Object.assign({}, b, { root: mac ? b.mac : (lin ? b.lin : b.win) }))
}

function firefoxRoot () {
  const A = process.env.APPDATA || ''
  if (process.platform === 'darwin') return home() + '/Library/Application Support/Firefox/Profiles'
  if (process.platform === 'linux') return home() + '/.mozilla/firefox'
  return [A, 'Mozilla', 'Firefox', 'Profiles'].filter(Boolean).join('\\')
}

function profileLabel (profileDir, fallback) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(profileDir, 'Preferences'), 'utf8'))
    if (p && p.profile && p.profile.name) return String(p.profile.name)
  } catch (e) {}
  return fallback
}

/* список браузеров с профилями — показывается в настройках */
function detect () {
  const out = []
  for (const b of chromiumBrowsers()) {
    if (!isDir(b.root)) continue
    const profiles = []
    const single = ['Opera', 'Opera GX'].some(n => b.name.indexOf(n) === 0)
    if (single && (ex(path.join(b.root, 'History')) || ex(path.join(b.root, 'Bookmarks')))) {
      profiles.push({ id: b.root, name: profileLabel(b.root, 'Профиль') })
    } else {
      let names = []
      try { names = fs.readdirSync(b.root) } catch (e) {}
      for (const n of names) {
        if (n === 'Default' || n === 'Guest Profile' || n === 'System Profile') {
          if (n !== 'Default') continue
        } else if (!/^Profile \d+$/.test(n)) continue
        const p = path.join(b.root, n)
        if (ex(path.join(p, 'History')) || ex(path.join(p, 'Bookmarks'))) profiles.push({ id: p, name: profileLabel(p, n) })
      }
    }
    if (profiles.length) out.push({ id: b.id, name: b.name, kind: 'chromium', root: b.root, profiles })
  }
  const froot = firefoxRoot()
  if (isDir(froot)) {
    const profiles = []
    try {
      for (const n of fs.readdirSync(froot)) {
        const p = path.join(froot, n)
        if (isDir(p) && ex(path.join(p, 'places.sqlite'))) profiles.push({ id: p, name: n })
      }
    } catch (e) {}
    profiles.sort((a, b) => {
      try { return fs.statSync(b.id).mtimeMs - fs.statSync(a.id).mtimeMs } catch (e) { return 0 }
    })
    if (profiles.length) out.push({ id: 'firefox', name: 'Mozilla Firefox', kind: 'firefox', root: froot, profiles })
  }
  return out
}

/* ---------- копия файла в temp (Chrome держит БД открытой) ---------- */
function copyForRead (file) {
  if (!ex(file)) return null
  const tmp = path.join(os.tmpdir(), 'vio-imp-' + crypto.randomBytes(6).toString('hex'))
  fs.mkdirSync(tmp, { recursive: true })
  const base = path.join(tmp, path.basename(file))
  fs.copyFileSync(file, base)
  for (const s of ['-wal', '-shm', '-journal']) {
    try { if (ex(file + s)) fs.copyFileSync(file + s, base + s) } catch (e) {}
  }
  return base
}

function openRo (file) {
  const tmp = copyForRead(file)
  if (!tmp) return null
  try { return { db: new DatabaseSync('file:' + tmp + '?mode=ro', { readOnly: true }), tmp } } catch (e) {
    try { return { db: new DatabaseSync(tmp, { readOnly: true }), tmp } } catch (e2) { return null }
  }
}

function closeRo (h) {
  if (!h) return
  try { h.db.close() } catch (e) {}
  try { fs.rmSync(h.tmp, { recursive: true, force: true }) } catch (e) {}
}

/* Chrome время: микросекунды с 1601-01-01 → Date.now() */
function chromeTime (us) {
  const n = Number(us)
  if (!n) return 0
  const ms = n / 1000 - 11644473600000
  return ms > 0 ? Math.round(ms) : 0
}
/* Firefox время: микросекунды с 1970-01-01 */
function ffTime (us) {
  const n = Number(us)
  if (!n) return 0
  return Math.round(n / 1000)
}

/* ---------- Chromium: закладки ---------- */
function chromiumBookmarks (profileDir) {
  const f = path.join(profileDir, 'Bookmarks')
  if (!ex(f)) return []
  let j = null
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { return [] }
  const out = []
  const walk = (node) => {
    if (!node) return
    if (node.type === 'url' && node.url) out.push({ url: String(node.url), title: String(node.name || node.url) })
    if (node.children) node.children.forEach(walk)
  }
  const roots = (j.roots || {})
  ;['bookmark_bar', 'other', 'managed'].forEach(k => walk(roots[k]))
  return out
}

/* ---------- Chromium: история ---------- */
function chromiumHistory (profileDir, limit) {
  const h = openRo(path.join(profileDir, 'History'))
  if (!h) return []
  try {
    /* время в БД — int64 микросекунды, без readBigInts node:sqlite бросает ошибку */
    const st = h.db.prepare('SELECT url, title, last_visit_time FROM urls WHERE last_visit_time > 0 ORDER BY last_visit_time DESC LIMIT ?')
    try { if (st.setReadBigInts) st.setReadBigInts(true) } catch (e) {}
    const rows = st.all(limit || 1000)
    return rows.map(r => ({ url: String(r.url), title: String(r.title || r.url), ts: chromeTime(Number(r.last_visit_time)) })).filter(r => /^https?:/i.test(r.url))
  } catch (e) { return [] } finally { closeRo(h) }
}

/* ================= БЛОК 4.5: ЮРИДИЧЕСКИ ВАЖНО — НЕ ОБХОДИТЬ App-Bound Encryption =================
   Обход App-Bound Encryption (через COM-сервис Chrome / IElevator, чтение
   app_bound_encrypted_key, подмена elevation-контракта) технически возможен,
   но это ровно тот паттерн, по которому антивирусы детектят инфостилеры;
   репутационно ставит Vio в одну корзину с ворующими пароли троянами;
   нарушает доверие пользователей — ради которого браузер вообще делается.
   НЕ РЕАЛИЗОВЫВАТЬ ОБХОД — только официальный DPAPI-путь: ключ из Local State
   с префиксом «DPAPI» → ProtectedData.Unprotect → AES-GCM (v10/v11).
   Всё, что лежит в новом формате v20/app-bound, молча пропускаем и честно
   сообщаем пользователю (notes в importProfile) — без единой попытки обойти. */
/* ---------- DPAPI (Windows) → ключ из Local State ---------- */
function dpapiUnprotect (buf) {
  if (process.platform !== 'win32') return null
  const b64 = buf.toString('base64')
  const script = "Add-Type -AssemblyName System.Security; " +
    "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect(" +
    "[Convert]::FromBase64String('" + b64 + "'), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))"
  try {
    const out = child.execFileSync(process.env.SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 1 << 22, encoding: 'utf8' })
    return Buffer.from(String(out).trim(), 'base64')
  } catch (e) { return null }
}

function chromiumKey (rootDir) {
  let st = null
  try { st = JSON.parse(fs.readFileSync(path.join(rootDir, 'Local State'), 'utf8')) } catch (e) { return null }
  const k = st && st.os_crypt && st.os_crypt.encrypted_key
  if (!k) return null
  const raw = Buffer.from(String(k), 'base64')
  if (raw.length <= 5) return null
  const head = raw.slice(0, 5).toString('latin1')
  if (head !== 'DPAPI') return null /* v20/app-bound — не поддерживаем, честно пропускаем */
  const key = dpapiUnprotect(raw.slice(5))
  return key && key.length >= 16 ? key.slice(0, 16) : null
}

function decryptLogin (blob, key) {
  if (!blob || !Buffer.isBuffer(blob)) return null
  const tag = blob.slice(0, 3).toString('latin1')
  if (tag !== 'v10' && tag !== 'v11') return null /* v20 (app-bound) — пропускаем */
  if (!key) return null
  const iv = blob.slice(3, 15)
  const pay = blob.slice(15, blob.length - 16)
  const at = blob.slice(blob.length - 16)
  try {
    const d = crypto.createDecipheriv('aes-128-gcm', key, iv)
    d.setAuthTag(at)
    return Buffer.concat([d.update(pay), d.final()]).toString('utf8')
  } catch (e) { return null }
}

/* ---------- Chromium: пароли ---------- */
function chromiumLogins (rootDir, profileDir) {
  const key = chromiumKey(rootDir)
  const h = openRo(path.join(profileDir, 'Login Data'))
  const out = []
  let skipped = 0
  if (!h) return { items: [], skipped: 0, dpapi: !!key }
  try {
    const rows = h.db.prepare('SELECT origin_url, username_value, password_value FROM logins').all()
    for (const r of rows) {
      const p = decryptLogin(r.password_value, key)
      if (p === null) { skipped++; continue }
      if (!p) continue
      out.push({ origin: String(r.origin_url || ''), username: String(r.username_value || ''), password: p })
    }
  } catch (e) {} finally { closeRo(h) }
  return { items: out, skipped, dpapi: !!key }
}

/* ---------- Firefox: places.sqlite ---------- */
function firefoxPlaces (profileDir, limit) {
  const h = openRo(path.join(profileDir, 'places.sqlite'))
  if (!h) return { bookmarks: [], history: [] }
  const bookmarks = []
  const history = []
  try {
    const bkSt = h.db.prepare("SELECT b.title AS t, p.url AS u FROM moz_bookmarks b JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND p.url LIKE 'http%' LIMIT 2000")
    const bk = bkSt.all()
    for (const r of bk) bookmarks.push({ url: String(r.u), title: String(r.t || r.u) })
    const hsSt = h.db.prepare('SELECT url, title, last_visit_date FROM moz_places WHERE last_visit_date IS NOT NULL ORDER BY last_visit_date DESC LIMIT ?')
    try { if (hsSt.setReadBigInts) hsSt.setReadBigInts(true) } catch (e) {}
    const hs = hsSt.all(limit || 1000)
    for (const r of hs) {
      const ts = ffTime(Number(r.last_visit_date))
      if (/^https?:/i.test(String(r.url)) && ts) history.push({ url: String(r.url), title: String(r.title || r.url), ts })
    }
  } catch (e) {} finally { closeRo(h) }
  return { bookmarks, history }
}

/* ---------- общий вход: детект + чтение выбранного профиля ---------- */
function importProfile (req) {
  req = req || {}
  const list = detect()
  const browser = list.find(b => b.id === req.browser)
  if (!browser) throw new Error('браузер не найден — возможно, он не установлен')
  const profile = browser.profiles.find(p => p.id === req.profile) || browser.profiles[0]
  if (!profile) throw new Error('профиль не найден')
  const what = Array.isArray(req.what) && req.what.length ? req.what : ['bookmarks', 'history', 'passwords']
  const res = { browser: browser.name, profile: profile.name, bookmarks: 0, history: 0, passwords: 0, skipped: 0, notes: [] }

  if (browser.kind === 'chromium') {
    if (what.indexOf('bookmarks') >= 0) {
      res._bookmarks = chromiumBookmarks(profile.id)
      res.bookmarks = res._bookmarks.length
    }
    if (what.indexOf('history') >= 0) {
      res._history = chromiumHistory(profile.id, 1000)
      res.history = res._history.length
    }
    if (what.indexOf('passwords') >= 0) {
      const r = chromiumLogins(browser.root, profile.id)
      res.passwords = r.items.length
      res.skipped = r.skipped
      res._logins = r.items
      if (!r.dpapi && process.platform === 'win32') res.notes.push('Ключ шифрования паролей не расшифрован (DPAPI) — пароли не импортированы')
      if (process.platform !== 'win32') res.notes.push('Импорт паролей Chromium работает только на Windows — остальное данные читаются полностью')
      if (r.skipped) res.notes.push('Часть паролей в новом формате (app-bound) пропущена: ' + r.skipped + ' шт.')
    }
  } else {
    const p = firefoxPlaces(profile.id, 1000)
    if (what.indexOf('bookmarks') >= 0) { res.bookmarks = p.bookmarks.length; res._bookmarks = p.bookmarks }
    if (what.indexOf('history') >= 0) { res.history = p.history.length; res._history = p.history }
    if (what.indexOf('passwords') >= 0) res.notes.push('Пароли Firefox защищены модулем NSS — Vio их не читает (и не должен): сохраните их из Firefox вручную')
  }
  return res
}

module.exports = { detect, importProfile }
