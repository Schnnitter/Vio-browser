const { contextBridge, ipcRenderer } = require('electron')

/* preload идёт в песочнице: node-модули (path) и не всё из electron недоступны —
   добываем нужное аккуратно, чтобы падение одного вызова не убило весь мост. */
let webUtils = null
try { webUtils = require('electron').webUtils } catch (e) {}
let GUEST_PRELOAD = ''
try {
  GUEST_PRELOAD = (process.env && process.env.VIO_GUEST_PRELOAD) || ''
  if (!GUEST_PRELOAD) GUEST_PRELOAD = require('path').join(__dirname, 'scripts', 'guest-pass.js')
} catch (e) {
  try { GUEST_PRELOAD = String(__dirname || '').replace(/[\\/][^\\/]+$/, '') + '/scripts/guest-pass.js' } catch (e2) {}
}

contextBridge.exposeInMainWorld('vio', {
  min: () => ipcRenderer.send('win:min'),
  max: () => ipcRenderer.send('win:max'),
  close: () => ipcRenderer.send('win:close'),
  fullscreen: () => ipcRenderer.invoke('win:fullscreen'),
  winState: () => ipcRenderer.invoke('win:state'),
  openExternal: (u) => ipcRenderer.send('win:open-external', u),
  showItem: (p) => ipcRenderer.send('win:show-item', p),
  openPath: (p) => ipcRenderer.send('win:open-path', p),
  version: () => ipcRenderer.invoke('win:version'),
  osInfo: () => ipcRenderer.invoke('win:os-info'),
  notify: (opts) => ipcRenderer.invoke('win:notify', opts),
  permissionAnswer: (id, allow) => ipcRenderer.send('win:permission-answer', id, allow),
  askAnswer: (id, allow) => ipcRenderer.send('win:ask-answer', id, allow),
  flagList: () => ipcRenderer.invoke('win:flag-list'),
  clearPrivate: () => ipcRenderer.invoke('win:clear-private'),
  clearData: (what) => ipcRenderer.invoke('win:clear-data', what),
  devtools: (what) => ipcRenderer.send('win:devtools', what),
  fetchBytes: (url, opts) => ipcRenderer.invoke('win:fetch-bytes', url, opts),
  capture: (a) => ipcRenderer.invoke('win:capture', a),
  extSync: (list) => ipcRenderer.invoke('win:ext-sync', list),
  extPick: () => ipcRenderer.invoke('win:ext-pick'),
  extPath: (p) => ipcRenderer.invoke('win:ext-path', p),
  /* анализ manifest.json до установки: {ok, name, version, warnings, perms} */
  extScan: (p) => ipcRenderer.invoke('win:ext-scan', p),
  pathForFile: (file) => {
    try { if (webUtils && webUtils.getPathForFile) return webUtils.getPathForFile(file) } catch (e) {}
    try { return file && file.path ? file.path : '' } catch (e) { return '' }
  },
  flags: (f) => ipcRenderer.send('win:flags', f),
  /* пароли: список для origin, запрос на сохранение (показывает диалог main) */
  passList: (origin) => ipcRenderer.invoke('win:pass-list', origin),
  passSave: (rec) => ipcRenderer.invoke('win:pass-save', rec),
  passBulk: (items) => ipcRenderer.invoke('win:pass-bulk', items),
  passAll: () => ipcRenderer.invoke('win:pass-all'),
  passDel: (i) => ipcRenderer.invoke('win:pass-del', i),
  /* импорт данных из другого браузера */
  importDetect: () => ipcRenderer.invoke('win:import-detect'),
  importRun: (req) => ipcRenderer.invoke('win:import-run', req),
  /* синхронизация в своё облако: шифрование, HTTP, OAuth */
  syncPack: (pass, json) => ipcRenderer.invoke('win:sync-pack', pass, json),
  syncUnpack: (pass, b64) => ipcRenderer.invoke('win:sync-unpack', pass, b64),
  syncHttp: (o) => ipcRenderer.invoke('win:sync-http', o),
  oauthStart: (cfg) => ipcRenderer.invoke('win:oauth-start', cfg),
  oauthWait: () => ipcRenderer.invoke('win:oauth-wait'),
  oauthStop: () => ipcRenderer.send('win:oauth-stop'),
  /* preload, который подсовывается каждому webview (пароли) */
  webviewPreload: GUEST_PRELOAD,
  guestPreload: () => ipcRenderer.invoke('win:guest-preload'),
  mind: {
    savePage: (p) => ipcRenderer.invoke('mind:save-page', p),
    search: (q, n) => ipcRenderer.invoke('mind:search', q, n),
    stats: () => ipcRenderer.invoke('mind:stats'),
    clearOlder: (d) => ipcRenderer.invoke('mind:clear-older', d),
    export: () => ipcRenderer.invoke('mind:export'),
    import: (items) => ipcRenderer.invoke('mind:import', items),
    patternRecord: (from, to) => ipcRenderer.invoke('mind:pattern-record', from, to),
    embedSearch: (q, n) => ipcRenderer.invoke('mind:embed-search', q, n),
    indexAll: () => ipcRenderer.invoke('mind:index-all'),
    graph: () => ipcRenderer.invoke('mind:graph'),
  },
  /* печать: wcId вкладки/webview, пусто — главное окно; языки проверки орфографии */
  print: (wcId) => ipcRenderer.invoke('win:print', wcId),
  spell: (langs) => ipcRenderer.invoke('win:spell', langs),
  on: (ch, cb) => ipcRenderer.on(ch, (e, ...args) => cb(...args)),
  /* потоковый HTTP (SSE): invoke отдаёт id, дальше чанки приходят через on():
     'vio:stream-meta' / 'vio:stream-chunk' / 'vio:stream-done' / 'vio:stream-fail' */
  fetchStream: (o) => ipcRenderer.invoke('win:stream-start', o),
  streamAbort: (id) => ipcRenderer.send('win:stream-abort', id),
  platform: process.platform
})
