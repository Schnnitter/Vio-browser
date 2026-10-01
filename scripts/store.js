/* Vio store — настройки, закладки, история, быстрый доступ */
(function () {
  const K = {
    settings: 'vio.settings.v1',
    bookmarks: 'vio.bookmarks.v1',
    history: 'vio.history.v1',
    dial: 'vio.dial.v1',
    services: 'vio.services.v1',
    quotes: 'vio.quotes.v1',
    session: 'vio.session.v1',
    bangs: 'vio.bangs.v1'
  }

  const ACCENTS = [
    { id: 'orange', name: 'Оранжевый', a: '#FF8A3D', a2: '#7FC99B', on: '#241405' },
    { id: 'mint', name: 'Пастельно-зелёный', a: '#6FC49A', a2: '#FFA75C', on: '#08281B' },
    { id: 'amber', name: 'Янтарный', a: '#F5A623', a2: '#8FD6A8', on: '#2B1B00' },
    { id: 'coral', name: 'Коралловый', a: '#FF6B5E', a2: '#7FC99B', on: '#2B0806' },
    { id: 'rose', name: 'Розовый', a: '#F472B6', a2: '#FFB27A', on: '#33081F' },
    { id: 'violet', name: 'Лавандовый', a: '#9B8CFF', a2: '#7FC99B', on: '#150C33' },
    { id: 'ocean', name: 'Океанский', a: '#4FA3E3', a2: '#8FD6A8', on: '#031C2E' },
    { id: 'graphite', name: 'Графит', a: '#9AA0A6', a2: '#7FC99B', on: '#111314' }
  ]

  const WALLS = [
    { id: 'aurora', name: 'Аврора' },
    { id: 'mint', name: 'Мята' },
    { id: 'sunset', name: 'Закат' },
    { id: 'aurora-live', name: 'Живая аврора' },
    { id: 'ocean-live', name: 'Живой океан' },
    { id: 'sunset-live', name: 'Живой закат' },
    { id: 'plain', name: 'Чистый фон' }
  ]

  const DEFAULTS = {
    theme: 'light',
    accent: 'orange',
    accentCustom: '',
    accent2Custom: '',
    radius: 10,
    density: 1,
    uiScale: 1,
    font: 'system',
    motion: true,
    performanceMode: 'auto',
    tabPos: 'top',
    rail: true,
    bookmarksBar: false,
    homeGreeting: true,
    homeCompact: false,
    homeMode: 'balanced',
    quickActions: true,
    panelW: 320,
    aiOn: true,
    aiAgent: true,
    aiSeePage: true,
    aiActions: true,
    aiShot: true,
    aiVoice: false,
    aiSteps: 10,
    aiStyle: 'default',
    aiPrompt: '',
    aiProvider: 'auto',
    aiBaseUrl: '',
    aiApiKey: '',
    aiModel: '',
    aiGeminiKey: '',
    aiGroqKey: '',
    aiGeminiModel: '',
    aiGroqModel: '',
    extTypeback: true,
    extEnableCopy: true,
    /* пароли: хранилище ОС (DPAPI/Keychain), автозаполнение на обычных вкладках */
    passSave: true,
    /* синхронизация: своё облако + клиентское шифрование, своего сервера нет */
    syncProvider: 'off',
    syncPassphrase: '',
    syncWebdavUrl: '',
    syncWebdavUser: '',
    syncWebdavPass: '',
    syncClientId: '',
    syncToken: '',
    syncFileId: '',
    syncAuto: false,
    syncLast: 0,
    extSaveAs: true,
    extBgRemove: true,
    extOcr: true,
    extAdblock: true,
    extCookies: true,
    extensions: [],
    engine: 'auto',
    enabledEngines: ['google', 'yandex', 'bing', 'duckduckgo', 'wikipedia', 'youtube'],
    customEngines: [],
    wall: 'aurora',
    homeSearch: true,
    homeHints: true,
    historyLimit: 500,
    openInBackground: true,
    restoreSession: true,
    showTabAudio: true,
    mindOn: false,
    /* регион и язык: auto = определить по часовому поясу и локали, без сети */
    region: 'auto',
    lang: 'auto',
    omnipos: 'top',
    siteZoom: {},
    tabStacks: [],
    hotkeys: {},
    userCss: '',
    webPanels: []
  }

  /* быстрые команды в адресной строке: триггер → URL с %s (запрос).
     Пользовательские bangs из K.bangs накладываются поверх этих значений,
     поэтому таблица по умолчанию может расти с каждой версией */
  const DEFAULT_BANGS = {
    g: 'https://www.google.com/search?q=%s',
    ya: 'https://yandex.ru/search/?text=%s',
    y: 'https://yandex.ru/search/?text=%s',
    w: 'https://ru.wikipedia.org/wiki/Special:Search?search=%s',
    wiki: 'https://en.wikipedia.org/w/index.php?search=%s',
    yt: 'https://www.youtube.com/results?search_query=%s',
    gh: 'https://github.com/search?q=%s',
    so: 'https://stackoverflow.com/search?q=%s',
    npm: 'https://www.npmjs.com/search?q=%s',
    mdn: 'https://developer.mozilla.org/ru/search?q=%s',
    habr: 'https://habr.com/ru/search/?q=%s',
    hb: 'https://habr.com/ru/search/?q=%s',
    ddg: 'https://duckduckgo.com/?q=%s',
    b: 'https://www.baidu.com/s?wd=%s',
    sez: 'https://search.seznam.cz/?q=%s',
    qw: 'https://www.qwant.com/?q=%s',
    ec: 'https://www.ecosia.org/search?q=%s',
    yh: 'https://search.yahoo.com/search?p=%s',
    az: 'https://www.amazon.com/s?k=%s',
    ali: 'https://www.aliexpress.com/wholesale?SearchText=%s',
    av: 'https://www.avito.ru/all?q=%s',
    olx: 'https://www.olx.pl/oferty/q-%s/',
    kin: 'https://www.kinopoisk.ru/index.php?kp_query=%s',
    tw: 'https://x.com/search?q=%s',
    reddit: 'https://www.reddit.com/search/?q=%s',
    deepl: 'https://www.deepl.com/translator#auto/auto/%s',
    gtrans: 'https://translate.google.com/?sl=auto&tl=en&text=%s',
    tr: 'https://translate.google.com/?sl=auto&tl=en&text=%s',
    maps: 'https://www.google.com/maps/search/%s',
    weather: 'https://wttr.in/%s',
    arch: 'https://wiki.archlinux.org/index.php?search=%s',
    man: 'https://man7.org/linux/man-pages/man1/%s.1.html'
  }

  function read (key, fallback) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch (e) { return fallback }
  }
  function write (key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) {}
  }

  const listeners = {}
  function emit (name) { (listeners[name] || []).forEach(fn => { try { fn() } catch (e) { console.error(e) } }) }
  function on (name, fn) { (listeners[name] = listeners[name] || []).push(fn) }

  const state = {
    settings: Object.assign({}, DEFAULTS, read(K.settings, {})),
    bookmarks: read(K.bookmarks, []),
    history: read(K.history, []),
    dial: read(K.dial, []),
    services: read(K.services, []),
    quotes: read(K.quotes, []),
    /* открытые вкладки для восстановления: [{url, title, type}] или null */
    session: read(K.session, null),
    /* быстрые команды: пользовательские поверх таблицы по умолчанию */
    bangs: Object.assign({}, DEFAULT_BANGS, read(K.bangs, {}))
  }
  /* миграция: новым ключам из будущих версий — значения по умолчанию */
  Object.keys(DEFAULTS).forEach(k => { if (!(k in state.settings)) state.settings[k] = DEFAULTS[k] })

  function saveSettings () { write(K.settings, state.settings); emit('settings'); apply() }
  function saveBookmarks () { write(K.bookmarks, state.bookmarks); emit('bookmarks') }
  function saveHistory () { write(K.history, state.history); emit('history') }
  function saveDial () { write(K.dial, state.dial); emit('dial') }
  function saveServices () { write(K.services, state.services); emit('services') }
  function saveQuotes () { write(K.quotes, state.quotes); emit('quotes') }
  function saveSession () { write(K.session, state.session); emit('session') }
  /* в хранилище пишем только отличия от DEFAULT_BANGS — сами дефолты живут в коде */
  function saveBangs () {
    const user = {}
    Object.keys(state.bangs || {}).forEach(k => {
      if (state.bangs[k] !== DEFAULT_BANGS[k]) user[k] = state.bangs[k]
    })
    write(K.bangs, user); emit('bangs')
  }
  function session () { return state.session }
  function bangs () { return state.bangs }

  /* копилка цитат: выделенный текст с источником */
  function addQuote (item) {
    if (!item || !item.text) return null
    const q = {
      id: 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: String(item.text).slice(0, 2000),
      url: item.url || '',
      title: item.title || '',
      ts: Date.now()
    }
    state.quotes.unshift(q)
    if (state.quotes.length > 500) state.quotes.length = 500
    saveQuotes()
    return q
  }
  function removeQuote (id) {
    const n = state.quotes.length
    state.quotes = state.quotes.filter(q => q.id !== id)
    if (state.quotes.length !== n) { saveQuotes(); return true }
    return false
  }

  function isBookmarked (url) { return state.bookmarks.some(b => b.url === url) }

  function toggleBookmark (item) {
    const i = state.bookmarks.findIndex(b => b.url === item.url)
    if (i >= 0) { state.bookmarks.splice(i, 1); saveBookmarks(); return false }
    state.bookmarks.unshift({ url: item.url, title: item.title || item.url, fav: item.fav || '', ts: Date.now() })
    saveBookmarks(); return true
  }

  function addHistory (item) {
    if (!/^https?:/i.test(item.url)) return
    const exist = state.history.find(h => h.url === item.url)
    if (exist) {
      exist.ts = Date.now()
      exist.count = (exist.count || 1) + 1
      if (item.title) exist.title = item.title
      if (item.fav) exist.fav = item.fav
      state.history.sort((a, b) => b.ts - a.ts)
    } else {
      state.history.unshift({ url: item.url, title: item.title || item.url, fav: item.fav || '', ts: Date.now(), count: 1 })
    }
    if (state.history.length > state.settings.historyLimit) state.history.length = state.settings.historyLimit
    saveHistory()
  }

  function clearHistory () { state.history = []; saveHistory() }
  function clearBookmarks () { state.bookmarks = []; saveBookmarks() }

  /* ---------- быстрый доступ (только вручную) ---------- */
  function inDial (url) { return !!url && state.dial.some(d => d.url === url) }

  function addDial (item) {
    if (!item || !item.url || inDial(item.url)) return false
    state.dial.unshift({
      url: item.url,
      title: item.title || hostOf(item.url) || item.url,
      fav: item.fav || '',
      ts: Date.now(),
      manual: true
    })
    saveDial()
    return true
  }

  function removeDial (url) {
    const n = state.dial.length
    state.dial = state.dial.filter(d => d.url !== url)
    if (state.dial.length !== n) { saveDial(); return true }
    return false
  }

  /* настоящая фавиконка: из страницы → из истории → сервис фавиконок */
  function favicon (url, fav) {
    if (fav) return fav
    const h = hostOf(url)
    if (!h) return ''
    const fromHist = state.history.find(x => x.url === url && x.fav)
    if (fromHist) return fromHist.fav
    return 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(h)
  }

  /* ---------- сервисы боковой панели ---------- */
  const SERVICES = [
    { url: 'https://www.youtube.com', title: 'YouTube' },
    { url: 'https://www.instagram.com', title: 'Instagram' },
    { url: 'https://store.steampowered.com', title: 'Steam' },
    { url: 'https://www.twitch.tv', title: 'Twitch' },
    { url: 'https://vk.com', title: 'VK' },
    { url: 'https://t.me', title: 'Telegram' },
    { url: 'https://discord.com/app', title: 'Discord' },
    { url: 'https://github.com', title: 'GitHub' },
    { url: 'https://www.reddit.com', title: 'Reddit' },
    { url: 'https://x.com', title: 'X (Twitter)' },
    { url: 'https://open.spotify.com', title: 'Spotify' },
    { url: 'https://www.netflix.com', title: 'Netflix' }
  ]

  function servicesList () {
    return SERVICES.concat(state.services.filter(s => !SERVICES.some(b => b.url === s.url)))
  }
  function inServices (url) { return servicesList().some(s => s.url === url) }
  function addService (item) {
    if (!item || !item.url || inServices(item.url)) return false
    state.services.push({
      url: item.url,
      title: item.title || hostOf(item.url) || item.url,
      fav: item.fav || '',
      ts: Date.now()
    })
    saveServices()
    return true
  }
  function removeService (url) {
    const n = state.services.length
    state.services = state.services.filter(s => s.url !== url)
    if (state.services.length !== n) { saveServices(); return true }
    return false
  }

  function updateHistory (url, patch) {
    const h = state.history.find(x => x.url === url)
    if (!h) return
    let changed = false
    if (patch.title && patch.title !== h.title) { h.title = patch.title; changed = true }
    if (patch.fav && h.fav !== patch.fav) { h.fav = patch.fav; changed = true }
    if (changed) saveHistory()
  }

  function topSites (n) {
    const seen = new Map()
    state.history.forEach(h => {
      const host = hostOf(h.url)
      if (!host) return
      const cur = seen.get(host)
      const score = (h.count || 1) * 1000 + h.ts / 1e6
      if (!cur || cur.score < score) seen.set(host, { url: h.url, title: h.title, fav: h.fav, score })
    })
    return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, n || 8)
  }

  function hostOf (url) {
    try { return new URL(url).hostname.replace(/^www\./, '') } catch (e) { return '' }
  }

  function engines () {
    const s = state.settings
    const custom = (s.customEngines || []).map(c => Object.assign({ custom: true }, c))
    return ENGINES.concat(custom)
  }
  function enabledEngines () {
    const all = engines()
    const list = state.settings.enabledEngines.map(id => all.find(e => e.id === id)).filter(Boolean)
    const custom = (state.settings.customEngines || []).filter(c => state.settings.enabledEngines.includes(c.id))
    const merged = list.filter(e => !e.custom)
    const out = merged.concat(custom)
    /* активный движок всегда виден в меню, даже если выбран режим «auto» */
    const act = engine()
    if (act && !out.some(e => e.id === act.id)) out.push(act)
    return out
  }
  function engine () {
    const all = engines()
    const id = state.settings.engine
    const hit = id && id !== 'auto' ? all.find(e => e.id === id) : null
    if (hit) return hit
    /* «auto», пусто или неизвестный id — выбираем по стране пользователя */
    let want = ''
    try {
      if (typeof Engine !== 'undefined' && Engine.defaultFor && typeof Region !== 'undefined' && Region.get) {
        want = Engine.defaultFor((Region.get() || {}).code)
      }
    } catch (e) {}
    return (want && all.find(e => e.id === want)) || ENGINES[0]
  }

  /* ---------- применение оформления ---------- */
  const FONTS = {
    system: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"Cascadia Code", "Consolas", "SF Mono", monospace',
    rounded: '"Segoe UI Variable", "Segoe UI", Tahoma, sans-serif'
  }

  let mq = null
  function accentPair () {
    const s = state.settings
    const preset = ACCENTS.find(a => a.id === s.accent) || ACCENTS[0]
    const a = s.accentCustom || preset.a
    const a2 = s.accent2Custom || preset.a2
    return { a, a2, on: bestOn(a) }
  }

  function bestOn (hex) {
    const c = hex.replace('#', '')
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c
    const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return lum > 0.62 ? '#141713' : '#FFFFFF'
  }

  function resolveTheme () {
    const t = state.settings.theme
    if (t === 'system') {
      if (!mq) mq = window.matchMedia('(prefers-color-scheme: dark)')
      return mq.matches ? 'dark' : 'light'
    }
    return t
  }

  function apply () {
    const s = state.settings
    const html = document.documentElement
    html.dataset.theme = resolveTheme()
    html.dataset.motion = s.motion ? 'on' : 'off'
    html.dataset.perf = ['auto', 'full', 'save'].includes(s.performanceMode) ? s.performanceMode : 'auto'
    html.dataset.tabpos = s.tabPos || 'top'
    html.dataset.omnipos = s.omnipos || 'top'
    html.dataset.rail = s.rail ? 'on' : 'off'
    html.dataset.wall = s.wall
    const { a, a2, on } = accentPair()
    const st = html.style
    st.setProperty('--accent', a)
    st.setProperty('--accent-2', a2)
    st.setProperty('--on-accent', on)
    st.setProperty('--r', s.radius + 'px')
    st.setProperty('--m', String(s.density))
    st.setProperty('--scale', String(s.uiScale))
    st.setProperty('--panel-w', s.panelW + 'px')
    st.setProperty('--font', FONTS[s.font] || FONTS.system)
    document.title = 'Vio'
  }

  if (window.matchMedia) {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => { if (state.settings.theme === 'system') apply() }
    m.addEventListener ? m.addEventListener('change', h) : m.addListener(h)
  }

  window.Store = {
    state, ACCENTS, WALLS, FONTS, DEFAULTS, SERVICES,
    on, apply, saveSettings,
    saveBookmarks, saveHistory, saveDial, saveServices,
    isBookmarked, toggleBookmark, addHistory, updateHistory, clearHistory, clearBookmarks,
    inDial, addDial, removeDial, favicon,
    servicesList, inServices, addService, removeService, saveQuotes, addQuote, removeQuote,
    topSites, hostOf, engines, enabledEngines, engine,
    session, saveSession, bangs, saveBangs
  }
})()
