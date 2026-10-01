/* Синхронизация в СВОЁ облако — без сервера Vio.
   Данные → один JSON → AES-256-GCM на устройстве (ключ из пароля, scrypt) →
   ваш Google Drive / Dropbox / WebDAV. OAuth идёт через loopback на 127.0.0.1,
   HTTP — через main-процесс (мимо CORS). Никаких своих ключей и серверов нет. */
(function () {
  const FILE = 'vio-sync.bin'
  const st = () => Store.state.settings
  const toast = (m) => { try { App.toast(m) } catch (e) {} }

  function b64ToStr (b64) {
    const bin = atob(b64)
    const u = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
    return new TextDecoder().decode(u)
  }
  function parseRes (r) {
    if (!r || r.status === 0) throw new Error((r && r.error) || 'нет связи с облаком')
    if (r.status >= 400) {
      let msg = 'HTTP ' + r.status
      try { const j = JSON.parse(r.text); msg += ': ' + String((j.error && (j.error_description || j.error.message)) || j.error_summary || j.message || '').slice(0, 120) } catch (e) {}
      throw new Error(msg)
    }
    try { return JSON.parse(r.text) } catch (e) { throw new Error('облако вернуло не JSON') }
  }
  const http = (o) => vio.syncHttp(o)
  const utf8Bin = (s) => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i++) o += String.fromCharCode(b[i]); return o }
  const basic = (u, p) => 'Basic ' + btoa(utf8Bin(u + ':' + (p || '')))

  /* ---------- данные профиля ---------- */
  function collect () {
    const s = Object.assign({}, st())
    Object.keys(s).forEach(k => { if (k.indexOf('sync') === 0) delete s[k] })
    return JSON.stringify({
      app: 'vio', v: 1, ts: Date.now(),
      bookmarks: Store.state.bookmarks, history: Store.state.history,
      dial: Store.state.dial, services: Store.state.services, quotes: Store.state.quotes,
      settings: s
    })
  }
  function apply (json) {
    const d = JSON.parse(json)
    if (!d || d.app !== 'vio') throw new Error('это не файл данных Vio')
    if (Array.isArray(d.bookmarks)) { Store.state.bookmarks = d.bookmarks; Store.saveBookmarks() }
    if (Array.isArray(d.history)) { Store.state.history = d.history; Store.saveHistory() }
    if (Array.isArray(d.dial)) { Store.state.dial = d.dial; Store.saveDial() }
    if (Array.isArray(d.services)) { Store.state.services = d.services; Store.saveServices() }
    if (Array.isArray(d.quotes)) { Store.state.quotes = d.quotes; Store.saveQuotes() }
    if (d.settings && typeof d.settings === 'object') {
      const cur = Object.assign({}, st())
      const merged = Object.assign({}, cur, d.settings)
      /* локальное не трогаем: синхронизация, токены и ключи OAuth остаются своими */
      ;['syncProvider', 'syncPassphrase', 'syncWebdavUrl', 'syncWebdavUser', 'syncWebdavPass', 'syncClientId', 'syncToken', 'syncFileId', 'syncAuto', 'syncLast'].forEach(k => { merged[k] = cur[k] })
      Store.state.settings = merged
      Store.saveSettings()
    }
    if (window.App && App.rerenderPages) { try { App.rerenderPages() } catch (e) {} }
    if (window.App && App.syncRail) { try { App.syncRail() } catch (e) {} }
  }

  /* ---------- токены ---------- */
  function tokenObj () {
    try { return JSON.parse(st().syncToken || '{}') } catch (e) { return {} }
  }
  function saveToken (o) { st().syncToken = JSON.stringify(o || {}); Store.saveSettings() }
  function authHeaders () {
    const t = tokenObj()
    if (!t.access) throw new Error('аккаунт не подключён')
    return 'Bearer ' + t.access
  }

  async function tokenExchange (provider, clientId, redirect, code, verifier) {
    const body = new URLSearchParams({
      code, client_id: clientId, redirect_uri: redirect,
      grant_type: 'authorization_code', code_verifier: verifier
    }).toString()
    const url = provider === 'gdrive' ? 'https://oauth2.googleapis.com/token' : 'https://api.dropboxapi.com/oauth2/token'
    const r = await http({ method: 'POST', url, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, bodyText: body })
    const j = parseRes(r)
    if (!j.access_token) throw new Error('не выдали токен')
    saveToken({ access: j.access_token, refresh: j.refresh_token || '', exp: j.expires_in ? Date.now() + j.expires_in * 1000 : 0, provider })
    return true
  }

  async function freshToken () {
    const t = tokenObj()
    if (!t.access) throw new Error('аккаунт не подключён')
    if (!t.exp || Date.now() < t.exp - 60000) return t.access
    if (!t.refresh) return t.access
    const clientId = st().syncClientId
    const body = new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: t.refresh, client_id: clientId
    }).toString()
    const url = t.provider === 'dropbox' ? 'https://api.dropboxapi.com/oauth2/token' : 'https://oauth2.googleapis.com/token'
    try {
      const r = await http({ method: 'POST', url, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, bodyText: body })
      const j = parseRes(r)
      if (j.access_token) { t.access = j.access_token; t.exp = j.expires_in ? Date.now() + j.expires_in * 1000 : 0; if (j.refresh_token) t.refresh = j.refresh_token; saveToken(t) }
    } catch (e) {}
    return t.access
  }

  /* ---------- провайдеры ---------- */
  async function upload (b64) {
    const p = st().syncProvider
    if (p === 'gdrive') {
      const auth = { Authorization: await freshToken() }
      const q = encodeURIComponent("name = '" + FILE + "' and trashed = false")
      const list = parseRes(await http({ url: 'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)&pageSize=1', headers: auth }))
      let id = list.files && list.files[0] && list.files[0].id
      if (!id) {
        const cr = parseRes(await http({ method: 'POST', url: 'https://www.googleapis.com/drive/v3/files', headers: Object.assign({ 'Content-Type': 'application/json' }, auth), bodyText: JSON.stringify({ name: FILE, mimeType: 'application/octet-stream' }) }))
        id = cr.id
        st().syncFileId = id; Store.saveSettings()
      }
      const up = await http({ method: 'PATCH', url: 'https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', headers: Object.assign({ 'Content-Type': 'application/octet-stream' }, auth), bodyB64: b64 })
      if (up.status >= 400) throw new Error('Google Drive: HTTP ' + up.status)
      return id
    }
    if (p === 'dropbox') {
      const r = await http({
        method: 'POST', url: 'https://content.dropboxapi.com/2/files/upload',
        headers: {
          Authorization: await freshToken(),
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({ path: '/' + FILE, mode: 'overwrite', autorename: false, mute: true })
        },
        bodyB64: b64
      })
      const j = parseRes(r)
      return j.id || FILE
    }
    /* webdav */
    const url = String(st().syncWebdavUrl || '').trim()
    if (!/^https?:\/\//i.test(url)) throw new Error('укажите адрес файла WebDAV')
    const r = await http({ method: 'PUT', url, headers: { Authorization: basic(st().syncWebdavUser, st().syncWebdavPass), 'Content-Type': 'application/octet-stream' }, bodyB64: b64 })
    if (r.status >= 400) throw new Error('WebDAV: HTTP ' + r.status)
    return url
  }

  async function download () {
    const p = st().syncProvider
    let r = null
    if (p === 'gdrive') {
      const auth = { Authorization: await freshToken() }
      let id = st().syncFileId
      if (!id) {
        const q = encodeURIComponent("name = '" + FILE + "' and trashed = false")
        const list = parseRes(await http({ url: 'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)&pageSize=1', headers: auth }))
        id = list.files && list.files[0] && list.files[0].id
        if (id) { st().syncFileId = id; Store.saveSettings() }
      }
      if (!id) throw new Error('файла в облаке пока нет — нажмите «Сохранить»')
      r = await http({ url: 'https://www.googleapis.com/drive/v3/files/' + id + '?alt=media', headers: auth })
    } else if (p === 'dropbox') {
      r = await http({
        method: 'POST', url: 'https://content.dropboxapi.com/2/files/download',
        headers: { Authorization: await freshToken(), 'Dropbox-API-Arg': JSON.stringify({ path: '/' + FILE }) }
      })
    } else {
      const url = String(st().syncWebdavUrl || '').trim()
      if (!/^https?:\/\//i.test(url)) throw new Error('укажите адрес файла WebDAV')
      r = await http({ url, headers: { Authorization: basic(st().syncWebdavUser, st().syncWebdavPass) } })
    }
    if (!r || r.status === 0) throw new Error((r && r.error) || 'нет связи с облаком')
    if (r.status === 404) throw new Error('файла в облаке пока нет — нажмите «Сохранить»')
    if (r.status >= 400) throw new Error('облако ответило HTTP ' + r.status)
    if (!r.data) throw new Error('пустой файл')
    return r.data
  }

  /* ---------- действия ---------- */
  async function push () {
    const p = st().syncProvider
    if (!p || p === 'off') throw new Error('выберите облако')
    const pass = String(st().syncPassphrase || '')
    const packed = await vio.syncPack(pass, collect())
    await upload(packed)
    st().syncLast = Date.now()
    Store.saveSettings()
    return true
  }
  async function pull () {
    const p = st().syncProvider
    if (!p || p === 'off') throw new Error('выберите облако')
    const pass = String(st().syncPassphrase || '')
    const b64 = await download()
    const json = await vio.syncUnpack(pass, b64)
    apply(json)
    st().syncLast = Date.now()
    Store.saveSettings()
    return true
  }

  async function connect (statusEl) {
    const p = st().syncProvider
    const clientId = String(st().syncClientId || '').trim()
    if (p !== 'gdrive' && p !== 'dropbox') throw new Error('OAuth нужен только для Google Drive и Dropbox')
    if (!clientId) throw new Error('введите свой Client ID')
    if (String(st().syncPassphrase || '').length < 4) throw new Error('придумайте пароль шифрования (4+ символа)')
    if (statusEl) statusEl.textContent = 'Открываю страницу входа…'
    const s = await vio.oauthStart({ provider: p, clientId })
    vio.openExternal(s.url)
    if (statusEl) statusEl.textContent = 'Жду разрешения в браузере…'
    const r = await vio.oauthWait()
    if (!r || r.error || !r.code) throw new Error((r && r.error) || 'вход прерван')
    await tokenExchange(p, clientId, s.redirect, r.code, s.verifier)
    if (statusEl) statusEl.textContent = 'Аккаунт подключён'
    return true
  }

  /* ---------- UI ---------- */
  function bindInput (root, id, key) {
    const el = root.querySelector(id)
    if (!el) return
    el.addEventListener('change', () => { st()[key] = el.value; Store.saveSettings() })
  }

  function wire (root) {
    bindInput(root, '#sync-pass', 'syncPassphrase')
    bindInput(root, '#sync-url', 'syncWebdavUrl')
    bindInput(root, '#sync-user', 'syncWebdavUser')
    bindInput(root, '#sync-wpass', 'syncWebdavPass')
    bindInput(root, '#sync-client', 'syncClientId')

    const status = root.querySelector('#sync-status')
    const t = tokenObj()
    if (status && (t.access || t.refresh)) status.textContent = 'Аккаунт подключён'

    const conn = root.querySelector('#sync-connect')
    if (conn) conn.addEventListener('click', async () => {
      conn.disabled = true
      try {
        await connect(status)
        toast('Облако подключено')
      } catch (e) {
        if (status) status.textContent = String(e.message || e)
        toast('Не удалось подключить: ' + String(e.message || e).slice(0, 90))
      } finally { conn.disabled = false }
    })

    const pushBtn = root.querySelector('#sync-push')
    if (pushBtn) pushBtn.addEventListener('click', async () => {
      pushBtn.disabled = true
      const prev = pushBtn.textContent
      pushBtn.textContent = 'Шифрую…'
      try {
        await push()
        toast('Данные сохранены в облако')
        const last = root.querySelector('#sync-last')
        if (last) last.textContent = new Date().toLocaleString()
      } catch (e) { toast('Ошибка: ' + String(e.message || e).slice(0, 110)) } finally {
        pushBtn.disabled = false
        pushBtn.textContent = prev
      }
    })

    const pullBtn = root.querySelector('#sync-pull')
    if (pullBtn) pullBtn.addEventListener('click', async () => {
      pullBtn.disabled = true
      const prev = pullBtn.textContent
      pullBtn.textContent = 'Читаю…'
      try {
        await pull()
        toast('Данные загружены из облака')
        if (window.Pages && Pages.renderSettings) Pages.renderSettings()
      } catch (e) { toast('Ошибка: ' + String(e.message || e).slice(0, 110)) } finally {
        pullBtn.disabled = false
        pullBtn.textContent = prev
      }
    })
  }

  /* автосинк: раз в 15 минут, если включён */
  setInterval(async () => {
    try {
      const s = st()
      if (!s.syncAuto || !s.syncProvider || s.syncProvider === 'off') return
      if (Date.now() - (s.syncLast || 0) < 15 * 60000) return
      await push()
    } catch (e) {}
  }, 15 * 60000)

  window.VioSync = { wire, push, pull, collect, apply, connect }
})()
