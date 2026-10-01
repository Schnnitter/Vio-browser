/* Окружение с ELECTRON_RUN_AS_NODE=1 заставляет electron.exe работать как обычный node,
   тогда require('electron') возвращает путь-строку и приложение падает на app.setName.
   Ловим это и объясняем, вместо нечитаемого краша. */
const _electron = require('electron')
if (!_electron || typeof _electron !== 'object') {
  console.error('[Vio] Запуск вне Electron (ELECTRON_RUN_AS_NODE=1?).\n' +
    '       Используйте:  npm start      или      node scripts/launch.js')
  process.exit(1)
}
const { app, BrowserWindow, ipcMain, session, shell, Menu, dialog, net, nativeImage, webContents, safeStorage } = _electron
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')
const crypto = require('crypto')
const http = require('http')
const VioImport = require('./scripts/import-main.js')
const VioMind = require('./scripts/mind/db.js')
const VioEmbed = require('./scripts/mind/embed.js')
const VioGraph = require('./scripts/mind/graph.js')

const SMOKE = process.env.VIO_SMOKE === '1'

const os = require('os')
const WIN_VER = (() => {
  try {
    const v = os.release() || '10.0.0'
    const p = v.split('.').map(Number)
    if ((p[0] || 10) >= 10 && (p[2] || 0) >= 22000) return 'win11'
    return 'win10'
  } catch (e) { return 'win10' }
})()
const TOTAL_RAM_MB = Math.round((os.totalmem() || 0) / 1048576)
let win = null

app.setName('Vio')
try {
  const { app: _a } = require('electron')
  _a.setUserTasks([
    { program: process.execPath, arguments: '--new-tab', iconPath: process.execPath, iconIndex: 0, title: 'Новая вкладка', description: 'Открыть новую вкладку в Vio' },
    { program: process.execPath, arguments: '--private', iconPath: process.execPath, iconIndex: 0, title: 'Приватная вкладка', description: 'Открыть приватную вкладку' },
    { program: process.execPath, arguments: '--settings', iconPath: process.execPath, iconIndex: 0, title: 'Настройки', description: 'Открыть настройки Vio' }
  ])
} catch (e) {}
if (process.platform === 'win32') app.setAppUserModelId('com.vio.browser')

/* Путь к preload веб-вью (пароли) отдаём через env: preload идёт в песочнице
   и не умеет require('path'), а env унаследуют все процессы рендерера. */
try { process.env.VIO_GUEST_PRELOAD = path.join(__dirname, 'scripts', 'guest-pass.js') } catch (e) {}

/* ——— Приватность: телеметрия, автообновления и фоновые службы Google отключены ———
   Это ключи Chromium (работают до старта сессии): ничего не уходит в Google без явного действия. */
const TELEMETRY_SWITCHES = [
  ['disable-background-networking', ''],   /* фоновые запросы Chromium: обновления, Variation Services, отчёты */
  ['disable-component-update', ''],        /* закачка компонентов (Safe Browsing, MEI-предсказания) */
  ['disable-domain-reliability', ''],      /* отправка диагностики сбоев в Google */
  ['disable-sync', ''],                    /* синхронизация аккаунта Google */
  ['no-pings', ''],                        /* hyperlink auditing — «пинг» при клике по ссылке */
  ['safebrowsing-disable-auto-update', ''],/* фоновые проверки Safe Browsing */
  ['disable-client-side-phishing-detection', ''], /* фишинг-проверка уходит в Google — отключена */
  ['disable-breakpad', ''],                /* отправка краш-дампов */
  ['disable-crash-reporter', ''],
  ['disable-search-engine-choice-screen', ''],
  ['disable-offer-to-uninstall', ''],
  ['disable-features', [
    'Translate', 'MediaRouter', 'OptimizationHints', 'InterestFeedContentSuggestions',
    'AutofillServerCommunication', 'CertificateTransparencyComponentUpdater',
    'PrivacySandboxSettings4', 'NetworkTimeServiceQuerying', 'HttpsFirstBalancedModeAutoEnable',
    'CalculateNativeWinOcclusion'
  ].join(',')]
]
TELEMETRY_SWITCHES.forEach(([k, v]) => {
  try { if (v) app.commandLine.appendSwitch(k, v); else app.commandLine.appendSwitch(k) } catch (e) {}
})

try {
  app.commandLine.appendSwitch('high-dpi-support', '1')
  app.commandLine.appendSwitch('no-first-run')
  app.commandLine.appendSwitch('no-default-browser-check')
  app.commandLine.appendSwitch('disk-cache-size', '104857600')
  if (TOTAL_RAM_MB > 0 && TOTAL_RAM_MB < 4096) {
    app.commandLine.appendSwitch('disable-gpu-compositing')
    app.commandLine.appendSwitch('renderer-process-limit', '2')
  }
} catch (e) {}

/* Хосты телеметрии Google/Chromium: режем на уровне сети в обеих сессиях */
const TELEMETRY_SUFFIXES = [
  'clients2.google.com', 'clients4.google.com', 'clients5.google.com',
  'update.googleapis.com', 'tools.google.com', 'safebrowsing.googleapis.com',
  'optimizationguide-pa.googleapis.com', 'www.google-analytics.com',
  'analytics.google.com', 'stats.g.doubleclick.net', 'ssl.google-analytics.com',
  'crash.corp.google.com', 'chromium-browser-crash-reporting.appspot.com',
  'app-measurement.com', 'graph.facebook.net'
]
function telemetryBlocked (hostname) {
  const h = String(hostname || '').toLowerCase()
  return TELEMETRY_SUFFIXES.some(s => h === s || h.endsWith('.' + s))
}


/* Горячие клавиши внутри webview: guest не отдаёт события хосту, ловим здесь */
const ACCELS = [
  { k: 't', ctrl: 1, cmd: 'tab:new' },
  { k: 'w', ctrl: 1, cmd: 'tab:close' },
  { k: 'n', ctrl: 1, shift: 1, cmd: 'tab:private' },
  { k: 'r', ctrl: 1, cmd: 'page:reload' },
  { k: 'l', ctrl: 1, cmd: 'omni:focus' },
  { k: 'e', ctrl: 1, cmd: 'omni:focus' },
  { k: 'f', ctrl: 1, cmd: 'page:find' },
  { k: 'p', ctrl: true, cmd: 'page:print' },
  { k: 'r', ctrl: 1, alt: 1, cmd: 'page:reader' },
  { k: 'd', ctrl: 1, cmd: 'tab:bookmark' },
  { k: 'h', ctrl: 1, cmd: 'panel:history' },
  { k: 'j', ctrl: 1, cmd: 'panel:downloads' },
  { k: 'o', ctrl: 1, shift: 1, cmd: 'panel:bookmarks' },
  { k: 'b', ctrl: 1, cmd: 'panel:toggle' },
  { k: ',', ctrl: 1, cmd: 'settings' },
  { k: '=', ctrl: 1, cmd: 'zoom:in' },
  { k: '+', ctrl: 1, cmd: 'zoom:in' },
  { k: '-', ctrl: 1, cmd: 'zoom:out' },
  { k: '0', ctrl: 1, cmd: 'zoom:reset' },
  { k: 'tab', ctrl: 1, cmd: 'tab:next' },
  { k: 'tab', ctrl: 1, shift: 1, cmd: 'tab:prev' },
  { k: 'arrowleft', alt: 1, cmd: 'nav:back' },
  { k: 'arrowright', alt: 1, cmd: 'nav:fwd' },
  { k: 'e', alt: 1, cmd: 'menu' },
  { k: 'f11', cmd: 'win:fullscreen' },
  { k: 'i', ctrl: 1, shift: 1, cmd: 'devtools' },
  { k: 'z', ctrl: 1, shift: 1, cmd: 'zen' },
  { k: 'escape', cmd: 'esc' },
  { k: 'f5', cmd: 'page:reload' },
  { k: 'f6', cmd: 'omni:focus' }
]
for (let i = 1; i <= 8; i++) ACCELS.push({ k: String(i), ctrl: 1, cmd: 'tab:' + i })
ACCELS.push({ k: '9', ctrl: 1, cmd: 'tab:last' })

function matchAccel (input) {
  const key = String(input.key || '').toLowerCase()
  const ctrl = !!(input.control || input.meta)
  const shift = !!input.shift
  const alt = !!input.alt
  const always = ['f11', 'f5', 'f6', 'escape']
  for (const a of ACCELS) {
    if (a.k !== key) continue
    if (!!a.ctrl !== ctrl) continue
    if (!!a.shift !== shift) continue
    if (!!a.alt !== alt) continue
    if (ctrl || alt || always.includes(a.k)) return a.cmd
  }
  return null
}

function iconPath () {
  const p = path.join(__dirname, 'assets', 'icon.ico')
  return fs.existsSync(p) ? p : undefined
}

function createWindow () {
  win = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 880,
    minHeight: 540,
    show: false,
    frame: false,
    backgroundColor: '#0d0d0d',
    title: 'Vio',
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: true
    }
  })

  win.loadFile('index.html')
  win.once('ready-to-show', () => win.show())
  win.on('maximize', () => send('vio:win-state', { maximized: true }))
  win.on('unmaximize', () => send('vio:win-state', { maximized: false }))

  if (SMOKE) {
    win.webContents.on('console-message', (e, a, b, c) => {
      const msg = typeof a === 'object' && a !== null ? a.message : b
      if (msg && !msg.includes('Content-Security-Policy') && !msg.includes('Security Warning')) console.log('[renderer]', msg)
    })
    win.webContents.once('did-finish-load', () => {
      win.webContents.executeJavaScript(`console.log('[vio] guest-preload=' + ((window.vio && vio.webviewPreload) || '(пусто)'))`).catch(() => {})
      try { smokeCrxFlow().then(r => console.log('[smoke] crx: ' + r)).catch(e => console.log('[smoke] crx ERR: ' + String(e.message || e))) } catch (e) { console.log('[smoke] crx ERR: ' + String(e.message || e)) }
      const q = process.env.VIO_TEST
      const QUIT = { ai: 7000, ext: 9000, feat: 7000, caps: 7000, ai2: 11000, ai3: 55000, ai4: 65000, ai5: 13000, ai6: 16000, ai7: 75000, ai8: 60000, ai9: 75000, ai10: 60000, ai11: 90000, ai12: 12000, ai13: 14000, ai14: 26000, ai15: 18000, aifix: 24000, ai16: 60000, ai17: 55000, imp: 5000, sync: 4000, strip: 5000, vault: 4500, about: 4000, imprun: 15000, syncrun: 15000, passio: 6000 }
      const quitAfter = QUIT[q] || 2600
      if (process.env.VIO_TEST) setTimeout(() => send('vio:test', process.env.VIO_TEST), 600)
      setTimeout(async () => {
        try {
          const img = await win.webContents.capturePage()
          const out = process.env.VIO_SHOT || path.join(__dirname, 'shot.png')
          fs.writeFileSync(out, img.toPNG())
          console.log('[smoke] screenshot ->', out)
        } catch (err) { console.error('[smoke]', err) }
        app.quit()
      }, quitAfter)
    })
  }
}

function send (ch, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(ch, payload)
}

/* ================= встроенные «расширения»: картинки ================= */
async function extSettings () {
  try {
    const raw = await win.webContents.executeJavaScript(`localStorage.getItem('vio.settings.v1')`)
    return JSON.parse(raw || '{}')
  } catch (e) { return {} }
}
const extOn = (s, k) => s[k] !== false

/* ---------- язык нативных меню (контекстное меню картинок, диалоги) ----------
   По настройкам браузера, иначе по часовому поясу и локали системы. */
const MAIN_TZ_LANG = { 'Europe/Kyiv': 'uk', 'Europe/Kiev': 'uk', 'Asia/Kolkata': 'hi', 'Asia/Calcutta': 'hi' }
const MAIN_REGION_LANG = {
  UA: 'uk', RU: 'ru', BY: 'be', KZ: 'kk', MD: 'ro',
  US: 'en', GB: 'en', IE: 'en', CA: 'en', AU: 'en', NZ: 'en',
  IN: 'hi', DE: 'de', AT: 'de', FR: 'fr', ES: 'es', IT: 'it',
  PT: 'pt', PL: 'pl', TR: 'tr', CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  JP: 'ja', KR: 'ko', NL: 'nl', SE: 'sv', FI: 'fi', CZ: 'cs',
  GR: 'el', IL: 'he', SA: 'ar', AE: 'ar', EG: 'ar', DZ: 'ar', MA: 'ar'
}
const MAIN_L = {
  uk: { 'Сохранить цитату': 'Зберегти цитату', 'Сохранить картинку как…': 'Зберегти картинку як…', 'Убрать фон…': 'Прибрати фон…', 'Распознать текст': 'Розпізнати текст', 'Папка распакованного расширения (с manifest.json)': 'Папка розпакованого розширення (з manifest.json)' },
  hi: { 'Сохранить цитату': 'कोट सहेजें', 'Сохранить картинку как…': 'चित्र को ऐसे सहेजें…', 'Убрать фон…': 'बैकग्राउंड हटाएँ…', 'Распознать текст': 'टेक्स्ट पहचानें', 'Папка распакованного расширения (с manifest.json)': 'अनपैक किया एक्सटेंशन फ़ोल्डर (manifest.json के साथ)' },
  en: { 'Сохранить цитату': 'Save quote', 'Сохранить картинку как…': 'Save image as…', 'Убрать фон…': 'Remove background…', 'Распознать текст': 'Recognize text', 'Папка распакованного расширения (с manifest.json)': 'Unpacked extension folder (with manifest.json)' },
  de: { 'Сохранить цитату': 'Zitat speichern', 'Сохранить картинку как…': 'Bild speichern als…', 'Убрать фон…': 'Hintergrund entfernen…', 'Распознать текст': 'Text erkennen', 'Папка распакованного расширения (с manifest.json)': 'Entpackter Erweiterungsordner (mit manifest.json)' },
  fr: { 'Сохранить цитату': 'Enregistrer la citation', 'Сохранить картинку как…': 'Enregistrer l’image sous…', 'Убрать фон…': 'Retirer le fond…', 'Распознать текст': 'Reconnaître le texte', 'Папка распакованного расширения (с manifest.json)': 'Dossier d’extension décompressée (avec manifest.json)' },
  es: { 'Сохранить цитату': 'Guardar cita', 'Сохранить картинку как…': 'Guardar imagen como…', 'Убрать фон…': 'Quitar fondo…', 'Распознать текст': 'Reconocer texto', 'Папка распакованного расширения (с manifest.json)': 'Carpeta de extensión descomprimida (con manifest.json)' },
  it: { 'Сохранить цитату': 'Salva citazione', 'Сохранить картинку как…': 'Salva immagine come…', 'Убрать фон…': 'Rimuovi sfondo…', 'Распознать текст': 'Riconosci testo', 'Папка распакованного расширения (с manifest.json)': 'Cartella estensione decompressa (con manifest.json)' },
  pt: { 'Сохранить цитату': 'Guardar citação', 'Сохранить картинку как…': 'Guardar imagem como…', 'Убрать фон…': 'Remover fundo…', 'Распознать текст': 'Reconhecer texto', 'Папка распакованного расширения (с manifest.json)': 'Pasta de extensão descompactada (com manifest.json)' },
  pl: { 'Сохранить цитату': 'Zapisz cytat', 'Сохранить картинку как…': 'Zapisz obrazek jako…', 'Убрать фон…': 'Usuń tło…', 'Распознать текст': 'Rozpoznaj tekst', 'Папка распакованного расширения (с manifest.json)': 'Folder rozpakowanego rozszerzenia (z manifest.json)' },
  tr: { 'Сохранить цитату': 'Alıntıyı kaydet', 'Сохранить картинку как…': 'Resmi farklı kaydet…', 'Убрать фон…': 'Arka planı kaldır…', 'Распознать текст': 'Metni tanı', 'Папка распакованного расширения (с manifest.json)': 'Paketlenmemiş eklenti klasörü (manifest.json ile)' },
  nl: { 'Сохранить цитату': 'Citaat opslaan', 'Сохранить картинку как…': 'Afbeelding opslaan als…', 'Убрать фон…': 'Achtergrond verwijderen…', 'Распознать текст': 'Tekst herkennen', 'Папка распакованного расширения (с manifest.json)': 'Uitgepakte extensiemap (met manifest.json)' },
  sv: { 'Сохранить цитату': 'Spara citat', 'Сохранить картинку как…': 'Spara bild som…', 'Убрать фон…': 'Ta bort bakgrund…', 'Распознать текст': 'Känn igen text', 'Папка распакованного расширения (с manifest.json)': 'Uppackad tilläggsmapp (med manifest.json)' },
  fi: { 'Сохранить цитату': 'Tallenna sitaatti', 'Сохранить картинку как…': 'Tallenna kuva nimellä…', 'Убрать фон…': 'Poista tausta…', 'Распознать текст': 'Tunnista teksti', 'Папка распакованного расширения (с manifest.json)': 'Puretun laajennuksen kansio (manifest.json mukana)' },
  cs: { 'Сохранить цитату': 'Uložit citát', 'Сохранить картинку как…': 'Uložit obrázek jako…', 'Убрать фон…': 'Odebrat pozadí…', 'Распознать текст': 'Rozpoznat text', 'Папка распакованного расширения (с manifest.json)': 'Složka rozbaleného rozšíření (s manifest.json)' },
  ro: { 'Сохранить цитату': 'Salvează citatul', 'Сохранить картинку как…': 'Salvează imaginea ca…', 'Убрать фон…': 'Elimină fundalul…', 'Распознать текст': 'Recunoaște textul', 'Папка распакованного расширения (с manifest.json)': 'Dosar de extensie despachetat (cu manifest.json)' },
  el: { 'Сохранить цитату': 'Αποθήκευση απόφθεγματος', 'Сохранить картинку как…': 'Αποθήκευση εικόνας ως…', 'Убрать фон…': 'Αφαίρεση φόντου…', 'Распознать текст': 'Αναγνώριση κειμένου', 'Папка распакованного расширения (с manifest.json)': 'Φάκελος αποσυμπιεσμένης επέκτασης (με manifest.json)' },
  be: { 'Сохранить цитату': 'Захаваць цытату', 'Сохранить картинку как…': 'Захаваць карцінку як…', 'Убрать фон…': 'Прыбраць фон…', 'Распознать текст': 'Распазнаць тэкст', 'Папка распакованного расширения (с manifest.json)': 'Папка распакаванага пашырэння (з manifest.json)' },
  kk: { 'Сохранить цитату': 'Дәйексөзді сақтау', 'Сохранить картинку как…': 'Суретті басқаша сақтау…', 'Убрать фон…': 'Фонды алып тастау…', 'Распознать текст': 'Мәтінді тану', 'Папка распакованного расширения (с manifest.json)': 'Қаптамасы ашылған кеңейтім қалтасы (manifest.json бар)' },
  ar: { 'Сохранить цитату': 'احفظ الاقتباس', 'Сохранить картинку как…': 'احفظ الصورة باسم…', 'Убрать фон…': 'أزل الخلفية…', 'Распознать текст': 'تعرّف على النص', 'Папка распакованного расширения (с manifest.json)': 'مجلد الإضافة المفكوكة (مع manifest.json)' },
  he: { 'Сохранить цитату': 'שמור ציטוט', 'Сохранить картинку как…': 'שמור תמונה בשם…', 'Убрать фон…': 'הסר רקע…', 'Распознать текст': 'זהה טקסט', 'Папка распакованного расширения (с manifest.json)': 'תיקיית הרחבה פרוסה (עם manifest.json)' },
  zh: { 'Сохранить цитату': '保存引用', 'Сохранить картинку как…': '图片另存为…', 'Убрать фон…': '去除背景…', 'Распознать текст': '识别文字', 'Папка распакованного расширения (с manifest.json)': '解压的扩展文件夹（含 manifest.json）' },
  ja: { 'Сохранить цитату': '引用を保存', 'Сохранить картинку как…': '画像を名前を付けて保存…', 'Убрать фон…': '背景を除去…', 'Распознать текст': 'テキストを認識', 'Папка распакованного расширения (с manifest.json)': '解凍した拡張機能フォルダ（manifest.json 付き）' },
  ko: { 'Сохранить цитату': '인용 저장', 'Сохранить картинку как…': '이미지를 다른 이름으로 저장…', 'Убрать фон…': '배경 제거…', 'Распознать текст': '텍스트 인식', 'Папка распакованного расширения (с manifest.json)': '압축 푼 확장 폴더 (manifest.json 포함)' }
}
/* подписи действий ИИ для контекстного меню выделения */
const MAIN_AI_L = {
  uk: { 'Объяснить (ИИ)': 'Пояснити (ШІ)', 'Перевести': 'Перекласти', 'Сократить': 'Скоротити', 'Перефразировать': 'Перефразувати', 'Создать чек-лист (ИИ)': 'Створити список дій (ШІ)', 'Карточки для запоминания (ИИ)': 'Картки для запам’ятовування (ШІ)' },
  hi: { 'Объяснить (ИИ)': 'समझाइए (AI)', 'Перевести': 'अनुवाद करें', 'Сократить': 'संक्षिप्त करें', 'Перефразировать': 'दूसरे शब्दों में कहें', 'Создать чек-лист (ИИ)': 'कार्य सूची बनाएँ (AI)', 'Карточки для запоминания (ИИ)': 'याद करने के लिए कार्ड बनाएँ (AI)' },
  en: { 'Объяснить (ИИ)': 'Explain (AI)', 'Перевести': 'Translate', 'Сократить': 'Summarize', 'Перефразировать': 'Rephrase', 'Создать чек-лист (ИИ)': 'Make a checklist (AI)', 'Карточки для запоминания (ИИ)': 'Make study cards (AI)' },
  de: { 'Объяснить (ИИ)': 'Erklären (KI)', 'Перевести': 'Übersetzen', 'Сократить': 'Zusammenfassen', 'Перефразировать': 'Umformulieren', 'Создать чек-лист (ИИ)': 'Checkliste erstellen (KI)', 'Карточки для запоминания (ИИ)': 'Lernkarten erstellen (KI)' },
  fr: { 'Объяснить (ИИ)': 'Expliquer (IA)', 'Перевести': 'Traduire', 'Сократить': 'Résumer', 'Перефразировать': 'Reformuler', 'Создать чек-лист (ИИ)': 'Créer une liste d’actions (IA)', 'Карточки для запоминания (ИИ)': 'Créer des fiches mémo (IA)' },
  es: { 'Объяснить (ИИ)': 'Explicar (IA)', 'Перевести': 'Traducir', 'Сократить': 'Resumir', 'Перефразировать': 'Reformular', 'Создать чек-лист (ИИ)': 'Crear una lista de tareas (IA)', 'Карточки для запоминания (ИИ)': 'Crear tarjetas de estudio (IA)' },
  it: { 'Объяснить (ИИ)': 'Spiegare (IA)', 'Перевести': 'Tradurre', 'Сократить': 'Riassumere', 'Перефразировать': 'Riformulare', 'Создать чек-лист (ИИ)': 'Crea una lista di attività (IA)', 'Карточки для запоминания (ИИ)': 'Crea schede di studio (IA)' },
  pt: { 'Объяснить (ИИ)': 'Explicar (IA)', 'Перевести': 'Traduzir', 'Сократить': 'Resumir', 'Перефразировать': 'Reformular', 'Создать чек-лист (ИИ)': 'Criar uma lista de tarefas (IA)', 'Карточки для запоминания (ИИ)': 'Criar cartões de estudo (IA)' },
  pl: { 'Объяснить (ИИ)': 'Wyjaśnij (AI)', 'Перевести': 'Przetłumacz', 'Сократить': 'Podsumuj', 'Перефразировать': 'Sformułuj inaczej', 'Создать чек-лист (ИИ)': 'Utwórz listę zadań (AI)', 'Карточки для запоминания (ИИ)': 'Utwórz fiszki (AI)' },
  tr: { 'Объяснить (ИИ)': 'Açıkla (YZ)', 'Перевести': 'Çevir', 'Сократить': 'Özetle', 'Перефразировать': 'Yeniden ifade et', 'Создать чек-лист (ИИ)': 'Kontrol listesi oluştur (YZ)', 'Карточки для запоминания (ИИ)': 'Çalışma kartları oluştur (YZ)' },
  nl: { 'Объяснить (ИИ)': 'Uitleggen (AI)', 'Перевести': 'Vertalen', 'Сократить': 'Samenvatten', 'Перефразировать': 'Anders formuleren', 'Создать чек-лист (ИИ)': 'Actielijst maken (AI)', 'Карточки для запоминания (ИИ)': 'Studiekaarten maken (AI)' },
  sv: { 'Объяснить (ИИ)': 'Förklara (AI)', 'Перевести': 'Översätta', 'Сократить': 'Sammanfatta', 'Перефразировать': 'Omskriva', 'Создать чек-лист (ИИ)': 'Skapa en att göra-lista (AI)', 'Карточки для запоминания (ИИ)': 'Skapa instuderingskort (AI)' },
  fi: { 'Объяснить (ИИ)': 'Selitä (AI)', 'Перевести': 'Käännä', 'Сократить': 'Tiivistä', 'Перефразировать': 'Sanoita uudelleen', 'Создать чек-лист (ИИ)': 'Luo tehtävälista (AI)', 'Карточки для запоминания (ИИ)': 'Luo opiskelukortteja (AI)' },
  cs: { 'Объяснить (ИИ)': 'Vysvětlit (AI)', 'Перевести': 'Přeložit', 'Сократить': 'Shrnout', 'Перефразировать': 'Přeformulovat', 'Создать чек-лист (ИИ)': 'Vytvořit seznam úkolů (AI)', 'Карточки для запоминания (ИИ)': 'Vytvořit studijní kartičky (AI)' },
  ro: { 'Объяснить (ИИ)': 'Explică (IA)', 'Перевести': 'Tradu', 'Сократить': 'Rezumă', 'Перефразировать': 'Reformulează', 'Создать чек-лист (ИИ)': 'Creează o listă de sarcini (IA)', 'Карточки для запоминания (ИИ)': 'Creează carduri de studiu (IA)' },
  el: { 'Объяснить (ИИ)': 'Εξήγηση (AI)', 'Перевести': 'Μετάφραση', 'Сократить': 'Σύνοψη', 'Перефразировать': 'Διατύπωση ξανά', 'Создать чек-лист (ИИ)': 'Δημιουργία λίστας ενεργειών (AI)', 'Карточки для запоминания (ИИ)': 'Δημιουργία καρτών μελέτης (AI)' },
  be: { 'Объяснить (ИИ)': 'Растлумачыць (ШІ)', 'Перевести': 'Перакласці', 'Сократить': 'Скараціць', 'Перефразировать': 'Пераказаць', 'Создать чек-лист (ИИ)': 'Стварыць спіс задач (ШІ)', 'Карточки для запоминания (ИИ)': 'Стварыць карткі для навучання (ШІ)' },
  kk: { 'Объяснить (ИИ)': 'Түсіндіру (ЖА)', 'Перевести': 'Аудару', 'Сократить': 'Қысқарту', 'Перефразировать': 'Басқаша айту', 'Создать чек-лист (ИИ)': 'Тапсырмалар тізімін жасау (ЖИ)', 'Карточки для запоминания (ИИ)': 'Оқу карточкаларын жасау (ЖИ)' },
  ar: { 'Объяснить (ИИ)': 'اشرح (ذكاء اصطناعي)', 'Перевести': 'ترجمة', 'Сократить': 'لخّص', 'Перефразировать': 'أعد الصياغة', 'Создать чек-лист (ИИ)': 'أنشئ قائمة مهام (AI)', 'Карточки для запоминания (ИИ)': 'أنشئ بطاقات للمذاكرة (AI)' },
  he: { 'Объяснить (ИИ)': 'הסבר (AI)', 'Перевести': 'תרגם', 'Сократить': 'תמצת', 'Перефразировать': 'נסח מחדש', 'Создать чек-лист (ИИ)': 'צור רשימת משימות (AI)', 'Карточки для запоминания (ИИ)': 'צור כרטיסיות לימוד (AI)' },
  zh: { 'Объяснить (ИИ)': '解释（AI）', 'Перевести': '翻译', 'Сократить': '总结', 'Перефразировать': '改写', 'Создать чек-лист (ИИ)': '生成行动清单（AI）', 'Карточки для запоминания (ИИ)': '生成学习卡片（AI）' },
  ja: { 'Объяснить (ИИ)': '説明（AI）', 'Перевести': '翻訳', 'Сократить': '要約', 'Перефразировать': '言い換え', 'Создать чек-лист (ИИ)': '行動リストを作成（AI）', 'Карточки для запоминания (ИИ)': '暗記カードを作成（AI）' },
  ko: { 'Объяснить (ИИ)': '설명 (AI)', 'Перевести': '번역', 'Сократить': '요약', 'Перефразировать': '다시 표현', 'Создать чек-лист (ИИ)': '작업 목록 만들기 (AI)', 'Карточки для запоминания (ИИ)': '학습 카드 만들기 (AI)' }
}
async function menuLang (s) {
  try {
    const st = s || await extSettings()
    if (st && st.lang && st.lang !== 'auto' && MAIN_L[st.lang]) return st.lang
    if (st && st.region && st.region !== 'auto' && MAIN_REGION_LANG[st.region]) return MAIN_REGION_LANG[st.region]
  } catch (e) {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (MAIN_TZ_LANG[tz]) return MAIN_TZ_LANG[tz]
  } catch (e) {}
  try {
    const loc = String(app.getLocale() || '').toLowerCase().slice(0, 2)
    if (MAIN_L[loc]) return loc
  } catch (e) {}
  return 'ru'
}
function mlabel (ru, lang) {
  const t = MAIN_L[lang]
  if (t && t[ru]) return t[ru]
  const a = MAIN_AI_L[lang]
  if (a && a[ru]) return a[ru]
  return ru
}

/* Заголовок Accept-Language: браузер сам сообщает свой язык (локально, без запросов к Google) */
let LANG_HDR = null
function acceptLang () {
  if (LANG_HDR) return LANG_HDR
  try {
    const l = app.getLocale() || 'en'
    const base = String(l).split(/[-_]/)[0]
    LANG_HDR = l + ',' + base + ';q=0.9,en;q=0.7'
  } catch (e) { LANG_HDR = 'en' }
  return LANG_HDR
}

async function fetchBytes (url, opts) {
  if (!/^https?:/i.test(url || '')) throw new Error('bad url')
  opts = opts || {}
  const ctl = new AbortController()
  let timedOut = false
  const timer = opts.timeoutMs ? setTimeout(() => { timedOut = true; try { ctl.abort() } catch (e) {} }, opts.timeoutMs) : null
  try {
    const init = { signal: ctl.signal }
    if (opts.method) init.method = opts.method
    init.headers = Object.assign({ 'Accept-Language': acceptLang() }, opts.headers || {})
    if (opts.body != null) init.body = opts.body
    const res = await net.fetch(url, init)
    if (!res.ok && !opts.allowFail) throw new Error('http ' + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 15 * 1024 * 1024) throw new Error('bad size')
    if (!buf.length && !opts.allowFail) throw new Error('empty')
    const hdrs = {}
    try { res.headers.forEach((v, k) => { hdrs[String(k).toLowerCase()] = v }) } catch (e) {}
    return { data: buf.toString('base64'), type: res.headers.get('content-type') || '', status: res.status, headers: hdrs }
  } catch (e) {
    if (timedOut) throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/* ---------- потоковая загрузка (SSE для Ии): main только пересылает чанки ----------
   Тело ответа целиком в main НЕ копим — чанки уходят в рендерер событиями,
   запросы и тела в логи не пишем (приватность). */
let streamSeq = 0
const streamCtl = new Map() /* id → AbortController */

function streamSend (sender, ch, payload) {
  try { if (sender && !sender.isDestroyed()) sender.send(ch, payload) } catch (e) {}
}

function sniffMime (buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png'
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg'
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif'
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf[0] === 0x42 && buf[1] === 0x4D) return 'image/bmp'
  return 'image/png'
}

function baseName (url, ext) {
  try {
    const p = new URL(url).pathname.split('/').pop().split(/[?#]/)[0]
    const clean = p.replace(/[^\w\-.а-яёА-ЯЁ]+/gi, '_').replace(/\.[a-z0-9]+$/i, '').slice(0, 80)
    if (clean) return clean + '.' + ext
  } catch (e) {}
  return 'image.' + ext
}

/* убрать фон: flood-fill от углов, выполняется в странице (RGBA известен) */
async function vioBgRemoveFn (dataUrl, tol) {
  tol = tol == null ? 40 : tol
  const img = await new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = rej
    im.src = dataUrl
  })
  const max = 1600
  const sc = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * sc))
  const h = Math.max(1, Math.round(img.height * sc))
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const cx = cv.getContext('2d', { willReadFrequently: true })
  cx.drawImage(img, 0, 0, w, h)
  const id = cx.getImageData(0, 0, w, h)
  const d = id.data
  let fr = 0, fg = 0, fb = 0, n = 0
  const corner = (x, y) => {
    const o = (y * w + x) * 4
    if (d[o + 3] < 128) return
    fr += d[o]; fg += d[o + 1]; fb += d[o + 2]; n++
  }
  corner(0, 0); corner(w - 1, 0); corner(0, h - 1); corner(w - 1, h - 1)
  if (!n) { fr = 255; fg = 255; fb = 255; n = 1 }
  fr = Math.round(fr / n); fg = Math.round(fg / n); fb = Math.round(fb / n)
  const tol2 = tol * tol * 3
  const seen = new Uint8Array(w * h)
  const stack = [0, w - 1, (h - 1) * w, h * w - 1]
  while (stack.length) {
    const p = stack.pop()
    if (seen[p]) continue
    seen[p] = 1
    const o = p * 4
    const dr = d[o] - fr, dg = d[o + 1] - fg, db = d[o + 2] - fb
    if ((dr * dr + dg * dg + db * db) > tol2) continue
    d[o + 3] = 0
    const x = p % w, y = (p / w) | 0
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - w)
    if (y < h - 1) stack.push(p + w)
  }
  cx.putImageData(id, 0, 0)
  return cv.toDataURL('image/png')
}

async function guestToDataUrl (contents, dataUrl, mime, quality) {
  const code = `(async (dataUrl, mime, quality) => {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = dataUrl
    })
    const max = 4096
    const sc = Math.min(1, max / Math.max(img.width, img.height))
    const cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(img.width * sc))
    cv.height = Math.max(1, Math.round(img.height * sc))
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
    return cv.toDataURL(mime, quality)
  })(${JSON.stringify(dataUrl)}, ${JSON.stringify(mime)}, ${quality})`
  const out = await contents.executeJavaScript(code)
  if (typeof out !== 'string' || out.indexOf('data:') !== 0) throw new Error('convert')
  return out
}

async function saveImageAs (contents, srcURL, fmt) {
  try {
    const { data, type } = await fetchBytes(srcURL)
    const buf = Buffer.from(data, 'base64')
    let out
    if (fmt === 'webp') {
      const mime = /image\/(png|jpe?g|gif|webp|bmp)/i.test(type || '') ? type.split(';')[0] : sniffMime(buf)
      const dataUrl = await guestToDataUrl(contents, 'data:' + mime + ';base64,' + data, 'image/webp', 0.9)
      out = Buffer.from(dataUrl.split(',')[1], 'base64')
    } else {
      let img = nativeImage.createFromBuffer(buf)
      if (img.isEmpty()) throw new Error('decode')
      const sz = img.getSize()
      if (Math.max(sz.width, sz.height) > 4096) {
        const k = 4096 / Math.max(sz.width, sz.height)
        img = img.resize({ width: Math.max(1, Math.round(sz.width * k)), height: Math.max(1, Math.round(sz.height * k)), quality: 'best' })
      }
      out = fmt === 'jpg' ? img.toJPEG(92) : img.toPNG()
    }
    const pick = await dialog.showSaveDialog(win, {
      defaultPath: baseName(srcURL, fmt === 'jpg' ? 'jpg' : fmt),
      filters: [{ name: (fmt === 'jpg' ? 'JPEG' : fmt.toUpperCase()), extensions: [fmt === 'jpg' ? 'jpg' : fmt] }]
    })
    if (!pick.canceled && pick.filePath) fs.writeFileSync(pick.filePath, out)
  } catch (e) { send('vio:img-err', 'Не получилось сохранить картинку') }
}

async function bgRemoveFlow (contents, srcURL) {
  try {
    const { data, type } = await fetchBytes(srcURL)
    const buf = Buffer.from(data, 'base64')
    const mime = /image\/(png|jpe?g|gif|webp|bmp)/i.test(type || '') ? type.split(';')[0] : sniffMime(buf)
    const outUrl = await contents.executeJavaScript(`(${vioBgRemoveFn.toString()})(${JSON.stringify('data:' + mime + ';base64,' + data)}, 40)`)
    if (typeof outUrl !== 'string' || outUrl.indexOf('data:image/png') !== 0) throw new Error('process')
    const outBuf = Buffer.from(outUrl.split(',')[1], 'base64')
    const pick = await dialog.showSaveDialog(win, {
      defaultPath: baseName(srcURL, 'png').replace(/\.png$/i, '') + '-nobg.png',
      filters: [{ name: 'PNG', extensions: ['png'] }]
    })
    if (!pick.canceled && pick.filePath) fs.writeFileSync(pick.filePath, outBuf)
  } catch (e) { send('vio:img-err', 'Не получилось убрать фон') }
}

/* ---------- свои расширения (режим разработчика, как chrome://extensions) ----------
   Распакованные папки грузятся напрямую; .crx и .zip распаковываются на лету
   (см. unpackExtension ниже), MV3-фон и API меню/загрузок в Electron отсутствуют. */
function vioSession () { return session.fromPartition('persist:vio') }

/* ---------- .crx / .zip → папка с manifest.json ----------
   .crx = заголовок «Cr24» + zip. Заголовок режем сами, zip разбираем на node:zlib —
   сторонние зависимости не нужны. Каталог центральных записей читаем по EOCD. */
function crxToZip (buf) {
  if (buf.length < 16 || buf.toString('ascii', 0, 4) !== 'Cr24') return buf /* обычный zip */
  const version = buf.readUInt32LE(4)
  if (version === 2) {
    const pubLen = buf.readUInt32LE(8)
    const sigLen = buf.readUInt32LE(12)
    const off = 16 + pubLen + sigLen
    if (off <= 16 || off >= buf.length) throw new Error('повреждённый заголовок Cr24')
    return buf.slice(off)
  }
  if (version === 3) {
    const headerLen = buf.readUInt32LE(8)
    const off = 12 + headerLen
    if (off <= 12 || off >= buf.length) throw new Error('повреждённый заголовок Cr24')
    return buf.slice(off)
  }
  throw new Error('неизвестная версия CRX (v' + version + ')')
}

function unzipBuf (buf) {
  let eocd = -1
  const from = Math.max(0, buf.length - 66000)
  for (let i = buf.length - 22; i >= from; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('не найден конец архива zip')
  let count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  if (count === 0xffff || off === 0xffffffff) throw new Error('zip64 не поддерживается')
  const out = []
  let total = 0
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const csize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const cmtLen = buf.readUInt16LE(off + 32)
    const lho = buf.readUInt32LE(off + 42)
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen)
    off += 46 + nameLen + extraLen + cmtLen
    if (!name || /(^|\/)\.\.(\/|$)/.test(name) || name[0] === '/') continue /* защита от path traversal */
    if (name.endsWith('/')) continue
    if (lho + 30 > buf.length || buf.readUInt32LE(lho) !== 0x04034b50) continue
    const lNameLen = buf.readUInt16LE(lho + 26)
    const lExtraLen = buf.readUInt16LE(lho + 28)
    const dataStart = lho + 30 + lNameLen + lExtraLen
    if (dataStart + csize > buf.length) throw new Error('архив повреждён')
    const raw = buf.slice(dataStart, dataStart + csize)
    let data
    if (method === 0) data = raw
    else if (method === 8) data = zlib.inflateRawSync(raw)
    else throw new Error('неподдерживаемое сжатие zip (метод ' + method + ')')
    total += data.length
    if (total > 64 * 1024 * 1024) throw new Error('архив больше 64 МБ')
    out.push({ name, data })
  }
  if (!out.length) throw new Error('в архиве нет файлов')
  return out
}

function safeDirName (s) {
  const t = String(s || '').replace(/[^\w\-. ]+/g, '_').trim().slice(0, 60)
  return t || 'extension'
}

function unpackExtension (filePath) {
  const buf = fs.readFileSync(filePath)
  const files = unzipBuf(crxToZip(buf))
  let list = files
  let prefix = ''
  if (!files.some(f => f.name === 'manifest.json')) {
    const roots = [...new Set(files.map(f => f.name.split('/')[0]))]
    if (roots.length === 1 && files.some(f => f.name === roots[0] + '/manifest.json')) {
      prefix = roots[0] + '/'
      list = files.map(f => ({ name: f.name.slice(prefix.length), data: f.data })).filter(f => f.name)
    }
  }
  const mf = list.find(f => f.name === 'manifest.json')
  if (!mf) throw new Error('manifest.json не найден')
  let manifest = {}
  try { manifest = JSON.parse(mf.data.toString('utf8')) } catch (e) { throw new Error('manifest.json не читается') }
  const dirName = safeDirName(manifest.name || path.basename(filePath).replace(/\.(crx|zip)$/i, ''))
  const dest = path.join(app.getPath('userData'), 'extensions', dirName + '-' + Date.now().toString(36))
  fs.mkdirSync(dest, { recursive: true })
  for (const f of list) {
    const target = path.join(dest, f.name)
    if (!path.resolve(target).startsWith(path.resolve(dest) + path.sep)) continue
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, f.data)
  }
  if (!fs.existsSync(path.join(dest, 'manifest.json'))) throw new Error('распаковка не удалась')
  return dest
}

/* путь из диалога или из drag&drop: папка — как есть (нужен manifest.json), файл — распаковать */
function extFromPath (p) {
  if (!p) return null
  let st = null
  try { st = fs.statSync(p) } catch (e) { throw new Error('файл не найден') }
  if (st.isDirectory()) {
    if (!fs.existsSync(path.join(p, 'manifest.json'))) throw new Error('в папке нет manifest.json')
    return p
  }
  if (!/\.(crx|zip)$/i.test(p)) throw new Error('нужен файл .crx, .zip или папка расширения')
  return unpackExtension(p)
}

/* ---------- анализ manifest.json ДО установки (в сессию ничего не грузим) ----------
   .crx/.zip читаем в памяти теми же crxToZip/unzipBuf, что и при установке,
   но только ради manifest.json: ни распаковки на диск, ни loadExtension. */
function manifestTextFromArchive (filePath) {
  const files = unzipBuf(crxToZip(fs.readFileSync(filePath)))
  let mf = files.find(f => f.name === 'manifest.json')
  if (!mf) {
    const roots = [...new Set(files.map(f => f.name.split('/')[0]))]
    if (roots.length === 1) mf = files.find(f => f.name === roots[0] + '/manifest.json')
  }
  if (!mf) throw new Error('manifest.json не найден')
  return mf.data.toString('utf8')
}

function manifestStrings (v) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x) : []
}

/* опасные сочетания прав — по-русски, показываем до установки расширения */
function extScanManifest (m) {
  const ALL = '<all_urls>'
  const permissions = manifestStrings(m.permissions)
  const hosts = manifestStrings(m.host_permissions)
  const csMatches = []
  const csWarn = []
  for (const s of (Array.isArray(m.content_scripts) ? m.content_scripts : [])) {
    if (!s || typeof s !== 'object') continue
    const matches = manifestStrings(s.matches)
    for (const x of matches) csMatches.push(x)
    if (matches.indexOf(ALL) >= 0 && manifestStrings(s.js).length) csWarn.push('Внедряет скрипты на все сайты')
  }
  /* perms — всё, до чего расширение дотянется: API-права + хосты + совпадения content scripts */
  const perms = [...new Set([...permissions, ...hosts, ...csMatches])].sort()
  const allSites = perms.indexOf(ALL) >= 0
  const hasHosts = allSites || hosts.length > 0 || csMatches.length > 0
  const mv = Number(m.manifest_version) || 2
  const warnings = []
  const add = (t) => { if (warnings.indexOf(t) < 0) warnings.push(t) }
  if (allSites && permissions.indexOf('cookies') >= 0) add('Доступ ко всем сайтам + читает куки')
  if (allSites && permissions.indexOf('scripting') >= 0 && permissions.indexOf('tabs') >= 0) add('Внедряет скрипты на все сайты и видит все вкладки')
  if (mv < 3 && permissions.indexOf('webRequestBlocking') >= 0 && allSites) add('Перехватывает все запросы')
  if (permissions.indexOf('nativeMessaging') >= 0 && allSites) add('Разговор с локальными программами отовсюду')
  if (typeof m.key === 'string' && m.key.length > 300) add('Ключ расширения обфусцирован')
  csWarn.forEach(add)
  if (hasHosts) {
    const scope = allSites ? 'все сайты' : (hosts.length ? hosts.slice(0, 4).join(', ') + (hosts.length > 4 ? '…' : '') : 'указанные сайты')
    if (permissions.indexOf('debugger') >= 0) add('Полный доступ к браузеру (debugger): ' + scope)
    if (permissions.indexOf('proxy') >= 0) add('Меняет прокси браузера (proxy): ' + scope)
    if (permissions.indexOf('webRequest') >= 0) add('Перехватывает сетевые запросы (webRequest): ' + scope)
  }
  return { ok: true, name: String(m.name || ''), version: String(m.version || ''), warnings, perms }
}

/* ---------- самопроверка .crx в дымовом режиме ---------- */
function smokeCrxTest () {
  const manifest = Buffer.from(JSON.stringify({ manifest_version: 3, name: 'Vio Smoke Test', version: '1.0' }), 'utf8')
  const fname = Buffer.from('manifest.json', 'utf8')
  const lh = Buffer.alloc(30)
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 8)
  lh.writeUInt32LE(0, 14); lh.writeUInt32LE(manifest.length, 18); lh.writeUInt32LE(manifest.length, 22)
  lh.writeUInt16LE(fname.length, 26)
  const local = Buffer.concat([lh, fname, manifest])
  const ch = Buffer.alloc(46)
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6)
  ch.writeUInt32LE(0, 16); ch.writeUInt32LE(manifest.length, 20); ch.writeUInt32LE(manifest.length, 24)
  ch.writeUInt16LE(fname.length, 28); ch.writeUInt32LE(0, 42)
  const central = Buffer.concat([ch, fname])
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length, 16)
  const zip = Buffer.concat([local, central, eocd])
  const hdr = Buffer.alloc(16)
  hdr.writeUInt32LE(0x34327243, 0) /* 'Cr24' */
  hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(4, 8); hdr.writeUInt32LE(0, 12)
  const crxPath = path.join(require('os').tmpdir(), 'vio-smoke.crx')
  fs.writeFileSync(crxPath, Buffer.concat([hdr, Buffer.from('FAKE'), zip]))
  const dir = extFromPath(crxPath)
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) throw new Error('нет manifest.json после распаковки')
  return { crxPath, dir }
}

/* полный путь как при установке: распаковка .crx → загрузка расширения в сессию → чистка */
async function smokeCrxFlow () {
  const { crxPath, dir } = smokeCrxTest()
  let id = ''
  try {
    const list = await extSync([{ path: dir, id: '', name: 'Vio Smoke Test', version: '', enabled: true }])
    const ex = list[0] || {}
    if (ex.error) throw new Error('extSync: ' + ex.error)
    id = ex.id || ''
    return 'unpack ok, loadExtension ok (id ' + (id ? 'есть' : 'нет') + ')'
  } finally {
    if (id) { try { vioSession().extensions.removeExtension(id) } catch (e) {} }
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch (e) {}
    try { fs.rmSync(crxPath, { force: true }) } catch (e) {}
  }
}

/* ---------- своя блокировка рекламы (домены из scripts/blocklists.js) ---------- */
let VioBlock = { adBlocked: () => false }
try { VioBlock = require('./scripts/blocklists.js') } catch (e) {}
const FLAGS = { adblock: true }
function setupAdblock (ses) {
  try {
    ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
      try {
        const h = new URL(details.url).hostname.toLowerCase()
        if (telemetryBlocked(h)) return cb({ cancel: true })  /* телеметрия Google/Chromium — всегда */
        if (FLAGS.adblock) {
          if (VioBlock.adBlocked(h)) return cb({ cancel: true })
        }
      } catch (e) {}
      cb({})
    })
  } catch (e) {}
}
async function extSync (list) {
  let ses = null
  try { ses = vioSession() } catch (e) { return list }
  if (!ses || !ses.extensions) return list
  let have = {}
  try { ses.extensions.getAllExtensions().forEach(x => { have[x.id] = 1 }) } catch (e) {}
  for (const ex of list) {
    try {
      delete ex.error
      if (ex.enabled === false) {
        if (ex.id && have[ex.id]) { try { ses.extensions.removeExtension(ex.id) } catch (e) {} }
        continue
      }
      if (!ex.path || !fs.existsSync(path.join(ex.path, 'manifest.json'))) { ex.error = 'Нет manifest.json в папке'; continue }
      if (!ex.id || !have[ex.id]) {
        const loaded = await ses.extensions.loadExtension(ex.path)
        ex.id = loaded.id
        ex.name = loaded.name || ex.name
        ex.version = loaded.version || ''
        have[ex.id] = 1
      }
    } catch (e) { ex.error = String((e && e.message) || e).slice(0, 160) }
  }
  return list
}

async function onGuestContextMenu (contents, params) {
  try {
    if (!win || win.isDestroyed()) return
    if (!params || (!params.srcURL && !(params.selectionText && params.selectionText.trim()))) return
    const s = await extSettings()
    const ml = await menuLang(s)
    const items = []
    if (params.selectionText && params.selectionText.trim()) {
      const text = params.selectionText.trim().slice(0, 2000)
      const url = params.pageURL || ''
      items.push({ label: mlabel('Сохранить цитату', ml), click: () => send('vio:quote', { text, url }) })
      items.push({ type: 'separator' })
      items.push({ label: mlabel('Объяснить (ИИ)', ml), click: () => send('vio:ai-action', { action: 'explain', text }) })
      items.push({ label: mlabel('Перевести', ml), click: () => send('vio:ai-action', { action: 'translate', text }) })
      items.push({ label: mlabel('Сократить', ml), click: () => send('vio:ai-action', { action: 'summarize', text }) })
      items.push({ label: mlabel('Перефразировать', ml), click: () => send('vio:ai-action', { action: 'rephrase', text }) })
      items.push({ label: mlabel('Создать чек-лист (ИИ)', ml), click: () => send('vio:ai-action', { action: 'checklist', text }) })
      items.push({ label: mlabel('Карточки для запоминания (ИИ)', ml), click: () => send('vio:ai-action', { action: 'flashcards', text }) })
    }
    if (params.mediaType !== 'image' || !/^https?:/i.test(params.srcURL || '')) {
      if (!items.length) return
      Menu.buildFromTemplate(items).popup({ window: win })
      return
    }
    if (extOn(s, 'extSaveAs')) {
      items.push({ label: mlabel('Сохранить картинку как…', ml), submenu: [
        { label: 'PNG', click: () => saveImageAs(contents, params.srcURL, 'png') },
        { label: 'JPEG', click: () => saveImageAs(contents, params.srcURL, 'jpg') },
        { label: 'WebP', click: () => saveImageAs(contents, params.srcURL, 'webp') }
      ] })
    }
    if (extOn(s, 'extBgRemove')) items.push({ label: mlabel('Убрать фон…', ml), click: () => bgRemoveFlow(contents, params.srcURL) })
    if (extOn(s, 'extOcr')) items.push({ label: mlabel('Распознать текст', ml), click: () => send('vio:ocr', { srcURL: params.srcURL }) })
    if (!items.length) return
    Menu.buildFromTemplate(items).popup({ window: win })
  } catch (e) {}
}

const handledSessions = new WeakSet()
function trackDownloads (contents) {
  const ses = contents.session
  if (!ses || handledSessions.has(ses)) return
  handledSessions.add(ses)
  const priv = ses === session.fromPartition('vio-private')

  ses.on('will-download', (event, item, webContents) => {
    const id = 'dl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const rec = {
      id,
      url: item.getURL(),
      private: priv,
      filename: item.getFilename(),
      savePath: '',
      total: item.getTotalBytes(),
      received: item.getReceivedBytes(),
      state: 'progress',
      started: Date.now()
    }
    send('vio:download', rec)

    item.on('updated', (e, state) => {
      try {
        if (win && !win.isDestroyed()) {
          if (state === 'progressing' && rec.total > 0) win.setProgressBar(Math.min(1, rec.received / rec.total))
          else win.setProgressBar(-1)
        }
      } catch (e2) {}
      rec.received = item.getReceivedBytes()
      rec.total = item.getTotalBytes()
      rec.state = state
      send('vio:download', rec)
    })
    item.once('done', (e, state) => {
      rec.state = state
      rec.received = item.getReceivedBytes()
      rec.savePath = item.getSavePath() || ''
      send('vio:download', rec)
      if (state === 'completed') send('vio:download-done', rec)
    })
  })
}

app.whenReady().then(() => {
  VioMind.init(app.getPath('userData'))
  createWindow()

  /* разрешения сайтов: раньше всё разрешалось молча (allow-all) — теперь обычный
     запрос: безобидные — сразу, остальное (камера, микрофон, геолокация, уведомления,
     буфер обмена, захват экрана…) — через диалог с пользователем; без окна — отказ. */
  const PERM_SILENT = new Set(['fullscreen', 'pointerLock', 'pointer-lock', 'clipboard-sanitized-write', 'keyboard-lock', 'openExternal', 'mediaKeySystem', 'media-key-system'])
  const permPending = {}

  const PERM_TXT = {
    media: 'камеру и микрофон',
    geolocation: 'геолокацию (местоположение)',
    notifications: 'уведомления',
    'clipboard-read': 'чтение буфера обмена',
    clipboardSanitizedWrite: 'запись в буфер обмена',
    midi: 'MIDI-устройства',
    midiSysex: 'MIDI-устройства',
    displayCapture: 'захват экрана',
    'display-capture': 'захват экрана',
    idleDetection: 'детектор простоя',
    'idle-detection': 'детектор простоя',
    'window-management': 'управление окнами',
    'storage-access': 'доступ к хранилищу сторонних сайтов',
    serial: 'последовательные устройства',
    hid: 'HID-устройства',
    usb: 'USB-устройства',
    bluetooth: 'Bluetooth',
    'payment-handler': 'платежи',
    unknown: 'неизвестное разрешение'
  }
function setupPermissions (ses) {
  if (!ses) return
  try {
    ses.setPermissionRequestHandler((wc, perm, cb) => {
      const allow = (v) => { try { cb(!!v) } catch (e) {} }
      try {
        if (PERM_SILENT.has(perm)) return allow(true)
        if (!win || win.isDestroyed()) return allow(false)
        let host = ''
        try { host = new URL(wc.getURL()).hostname } catch (e) {}
        const id = 'perm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        permPending[id] = allow
        send('vio:permission-ask', {
          id,
          perm,
          host,
          label: PERM_TXT[perm] || ('разрешение «' + perm + '»')
        })
        setTimeout(() => {
          if (permPending[id]) {
            try { permPending[id](false) } catch (e) {}
            delete permPending[id]
          }
        }, 60000)
      } catch (e) { allow(false) }
    })
  } catch (e) {}
}
  try { setupPermissions(session.defaultSession) } catch (e) {}
  try { setupPermissions(session.fromPartition('persist:vio')) } catch (e) {}
  try { setupPermissions(session.fromPartition('vio-private')) } catch (e) {}

  app.on('web-contents-created', (e, contents) => {
    if (contents.getType() === 'webview') {
      trackDownloads(contents)
      contents.on('context-menu', (ev, params) => onGuestContextMenu(contents, params))
      contents.setWindowOpenHandler(({ url }) => {
        send('vio:new-window', { url })
        return { action: 'deny' }
      })
      contents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return
        const cmd = matchAccel(input)
        if (cmd) { event.preventDefault(); send('vio:accel', cmd) }
      })
      contents.on('media-started-playing', () => send('vio:audio', { wcId: contents.id, audible: true }))
      contents.on('media-paused', () => send('vio:audio', { wcId: contents.id, audible: false }))
    } else if (contents === win.webContents) {
      trackDownloads(contents)
    }
  })

  const priv = session.fromPartition('vio-private')
  priv.on('will-download', (event, item) => {
    send('vio:download', {
      id: 'dl_' + Date.now().toString(36),
      url: item.getURL(),
      private: true,
      filename: item.getFilename(),
      savePath: '',
      total: item.getTotalBytes(),
      received: item.getReceivedBytes(),
      state: 'progress',
      started: Date.now()
    })
  })

  ipcMain.on('win:min', () => win && win.minimize())
  ipcMain.on('win:max', () => {
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('win:close', () => win && win.close())
  ipcMain.handle('win:fullscreen', () => {
    if (!win) return false
    win.setFullScreen(!win.isFullScreen())
    return win.isFullScreen()
  })
  ipcMain.handle('win:state', () => ({ maximized: win ? win.isMaximized() : false }))
  ipcMain.on('win:open-external', (e, url) => {
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url)
  })
  ipcMain.on('win:show-item', (e, p) => { if (p) shell.showItemInFolder(p) })
  ipcMain.on('win:open-path', (e, p) => { if (p) shell.openPath(p) })
  ipcMain.handle('win:notify', async (e, opts) => {
    try {
      const { Notification } = require('electron')
      if (!Notification.isSupported()) return false
      const n = new Notification({
        title: String((opts && opts.title) || 'Vio').slice(0, 100),
        body: String((opts && opts.body) || '').slice(0, 500),
        silent: !!(opts && opts.silent),
        icon: iconPath()
      })
      n.on('click', () => { if (win && !win.isDestroyed()) { win.show(); win.focus() } })
      n.show()
      return true
    } catch (err) { return false }
  })
ipcMain.on('win:ask-answer', (e, id, allow) => {
  if (permPending[id]) {
    try { permPending[id](!!allow) } catch (err) {}
    delete permPending[id]
  }
})
ipcMain.on('win:permission-answer', (e, id, allow) => {
  if (permPending[id]) {
    try { permPending[id](!!allow) } catch (err) {}
    delete permPending[id]
  }
})
  ipcMain.handle('win:os-info', () => ({ winVersion: WIN_VER, totalRamMB: TOTAL_RAM_MB }))
ipcMain.handle('win:version', () => ({
  app: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  platform: process.platform,
  winVersion: WIN_VER,
  totalRamMB: TOTAL_RAM_MB
}))
  ipcMain.handle('win:clear-private', async () => {
    const s = session.fromPartition('vio-private')
    await s.clearStorageData()
    await s.clearCache()
    try { await s.clearAuthCache() } catch (e) {}
    return true
  })
  ipcMain.handle('win:clear-data', async (e, what) => {
    const s = session.fromPartition('persist:vio')
    if (what === 'cookies') {
      const cookies = await s.cookies.get({})
      await Promise.all(cookies.map(c => s.cookies.remove(`http${c.secure ? 's' : ''}://${c.domain}${c.path}`, c.name)))
    } else {
      await s.clearStorageData(what === 'cache' ? { cache: true } : {})
      if (what !== 'cache') await s.clearCache()
    }
    return true
  })
  ipcMain.handle('win:fetch-bytes', async (e, url, opts) => fetchBytes(url, opts))

  /* ---------- потоковый HTTP (SSE): meta → чанки → done/fail ----------
     Обработчик отдаёт id сразу, а ответ читается в фоне: рендерер знает id,
     когда приходят первые чанки, и может прервать скачивание.
     Тело не копим — чанк за чанком уходит событиями; тела в логи не пишем. */
  ipcMain.handle('win:stream-start', (e, { method, url, headers, body, timeoutMs } = {}) => {
    const target = String(url || '')
    if (!/^https?:/i.test(target)) throw new Error('bad url') /* тот же guard, что у fetchBytes */
    const sender = e.sender
    const id = 'st' + (++streamSeq)
    const ctl = new AbortController()
    streamCtl.set(id, ctl)
    const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : 45000
    const timer = setTimeout(() => { try { ctl.abort() } catch (err) {} }, ms)
    ;(async () => {
      try {
        const init = { signal: ctl.signal }
        if (method) init.method = method
        if (headers) init.headers = headers
        if (body != null) init.body = body /* строка JSON — net.fetch сам проставит content-type */
        const res = await net.fetch(target, init)
        streamSend(sender, 'vio:stream-meta', { id, status: res.status, headers: Object.fromEntries(res.headers.entries()) })
        if (res.body) {
          const reader = res.body.getReader()
          const dec = new TextDecoder('utf-8', { stream: true })
          for (;;) {
            const r = await reader.read()
            if (r.done) break
            if (r.value) streamSend(sender, 'vio:stream-chunk', { id, data: dec.decode(r.value, { stream: true }) })
          }
          const tail = dec.decode()
          if (tail) streamSend(sender, 'vio:stream-chunk', { id, data: tail })
        }
        streamSend(sender, 'vio:stream-done', { id })
      } catch (err) {
        streamSend(sender, 'vio:stream-fail', { id, err: String((err && err.message) || err) })
      } finally {
        clearTimeout(timer)
        streamCtl.delete(id)
      }
    })().catch(() => {})
    return id
  })
  ipcMain.on('win:stream-abort', (e, id) => {
    const ctl = streamCtl.get(String(id || ''))
    if (ctl) { try { ctl.abort() } catch (err) {} }
  })

  ipcMain.handle('win:capture', async (e, arg) => {
    try {
      let img = null
      if (arg && arg.wcId) {
        try {
          const c = webContents.fromId(arg.wcId)
          if (c && !c.isDestroyed()) img = await c.capturePage()
        } catch (e2) {}
      }
      if ((!img || img.isEmpty()) && win && !win.isDestroyed()) {
        const r = arg && arg.rect
        img = await win.webContents.capturePage(r && r.width > 4
          ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
          : undefined)
      }
      if (!img || img.isEmpty()) return null
      let sz = img.getSize()
      const max = 1280
      if (Math.max(sz.width, sz.height) > max) {
        const k = max / Math.max(sz.width, sz.height)
        img = img.resize({ width: Math.max(1, Math.round(sz.width * k)), height: Math.max(1, Math.round(sz.height * k)), quality: 'best' })
        sz = img.getSize()
      }
      /* JPEG вместо PNG: снимок 1920×1080 ~2 МБ → 1280px JPEG ~300 КБ,
         это экономит 1–2 секунды на загрузке в vision/OCR */
      return { dataUrl: 'data:image/jpeg;base64,' + img.toJPEG(82).toString('base64'), w: sz.width, h: sz.height }
    } catch (e) { return null }
  })
  /* печать: wcId — id webContents (вкладка/webview), пусто — главное окно */
  ipcMain.handle('win:print', async (e, wcId) => {
    let wc = null
    if (wcId) {
      let all = []
      try { all = win.webContents.getAllWebContents() || [] } catch (err) { all = [] }
      if (!Array.isArray(all) || !all.length) { try { all = webContents.getAllWebContents() || [] } catch (err) { all = [] } }
      wc = (Array.isArray(all) ? all : []).find(c => c && !c.isDestroyed() && c.id === Number(wcId)) || null
      if (!wc) throw new Error('webContents с id ' + wcId + ' не найден — печать отменена')
    } else {
      if (!win || win.isDestroyed()) throw new Error('главное окно недоступно — печать отменена')
      wc = win.webContents
    }
    return new Promise((resolve, reject) => {
      try {
        wc.print({ silent: false, printBackground: true, deviceName: undefined }, (ok, reason) => {
          if (!ok) console.error('[Vio] печать не удалась: ' + String(reason || 'причина неизвестна'))
          resolve({ ok: !!ok })
        })
      } catch (err) { reject(err) }
    })
  })
  /* языки проверки орфографии: до 4 кодов вида ru / en-US; незнакомые Chromium
     просто ругается в лог — поэтому try/catch вокруг каждой сессии */
  ipcMain.handle('win:spell', (e, langs) => {
    const list = (Array.isArray(langs) ? langs : [])
      .filter(s => typeof s === 'string' && /^[a-z]{2}(-[A-Za-z]{2,8})?$/.test(s))
      .slice(0, 4)
    try { session.fromPartition('persist:vio').setSpellCheckerLanguages(list) } catch (err) {}
    try { session.defaultSession.setSpellCheckerLanguages(list) } catch (err) {}
    return { ok: true, list }
  })
  ipcMain.handle('win:ext-sync', async (e, list) => extSync(Array.isArray(list) ? list : []))
  ipcMain.on('win:flags', (e, f) => { try { Object.assign(FLAGS, f || {}) } catch (e2) {} })
  try { setupAdblock(session.fromPartition('persist:vio')) } catch (e) {}
  try { setupAdblock(session.fromPartition('vio-private')) } catch (e) {}
  ipcMain.handle('win:ext-pick', async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'openFile'],
      filters: [{ name: 'CRX / ZIP', extensions: ['crx', 'zip'] }],
      title: mlabel('Папка распакованного расширения (с manifest.json)', await menuLang())
    })
    if (r.canceled || !r.filePaths[0]) return null
    return extFromPath(r.filePaths[0])
  })
  /* путь пришёл из drag&drop (файл .crx/.zip или папка) — грузим так же, как из диалога */
  ipcMain.handle('win:ext-path', async (e, p) => extFromPath(p))
  /* анализ прав расширения ДО установки: только чтение manifest.json, ничего не грузим */
  ipcMain.handle('win:ext-scan', async (e, p) => {
    try {
      if (!p) throw new Error('путь не указан')
      const target = String(p)
      let st = null
      try { st = fs.statSync(target) } catch (err) { throw new Error('файл не найден') }
      let raw = null
      if (st.isDirectory()) raw = fs.readFileSync(path.join(target, 'manifest.json'), 'utf8')
      else if (/\.(crx|zip)$/i.test(target)) raw = manifestTextFromArchive(target)
      else throw new Error('нужен файл .crx, .zip или папка расширения')
      return extScanManifest(JSON.parse(raw))
    } catch (err) {
      const msg = String((err && err.message) || err)
      console.error('[Vio] ext-scan: ' + msg)
      return { ok: false, name: '', version: '', warnings: [], perms: [], error: msg }
    }
  })

  /* ================= хранилище паролей (хранилище ОС: DPAPI/Keychain/secret service) =================
     Chromium не отдаёт Electron API для менеджера паролей, поэтому храним сами:
     всё зашифровано через safeStorage (на Windows это тот же DPAPI, что у Chrome).
     Автозаполнение работает в самой странице — см. scripts/guest-pass.js. */
  const PASS_FILE = () => path.join(app.getPath('userData'), 'logins.bin')
  const PASS_MAGIC_ENC = Buffer.from('VIOENC1')
  const PASS_MAGIC_PLAIN = Buffer.from('VIOPLAIN1')

  function passEncrypt (json) {
    const buf = Buffer.from(json, 'utf8')
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
        return Buffer.concat([PASS_MAGIC_ENC, safeStorage.encryptString(json)])
      }
    } catch (e) {}
    return Buffer.concat([PASS_MAGIC_PLAIN, buf])
  }
  function passDecrypt (buf) {
    if (!buf || buf.length < 4) return '{}'
    if (buf.slice(0, PASS_MAGIC_ENC.length).equals(PASS_MAGIC_ENC)) {
      try { return safeStorage.decryptString(buf.slice(PASS_MAGIC_ENC.length)) } catch (e) { return '{}' }
    }
    if (buf.slice(0, PASS_MAGIC_PLAIN.length).equals(PASS_MAGIC_PLAIN)) return buf.slice(PASS_MAGIC_PLAIN.length).toString('utf8')
    return '{}'
  }
  function passLoad () {
    try {
      const j = JSON.parse(passDecrypt(fs.readFileSync(PASS_FILE())))
      return Array.isArray(j.items) ? j.items : []
    } catch (e) { return [] }
  }
  function passStore (items) {
    try { fs.writeFileSync(PASS_FILE(), passEncrypt(JSON.stringify({ items })), { mode: 0o600 }); return true } catch (e) { return false }
  }
  const passHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch (e) { return String(u || '').replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] } }
  function passMerge (items) {
    const cur = passLoad()
    let added = 0
    for (const it of items) {
      if (!it || !it.origin || !it.password) continue
      const h = passHost(it.origin)
      const same = cur.find(x => passHost(x.origin) === h && x.username === it.username && x.password === it.password)
      if (same) continue
      const dup = cur.findIndex(x => passHost(x.origin) === h && x.username === it.username)
      const rec = { origin: it.origin, username: String(it.username || ''), password: String(it.password), host: h, created: Date.now() }
      if (dup >= 0) cur[dup] = rec; else { cur.push(rec); added++ }
    }
    passStore(cur)
    return added
  }

  ipcMain.handle('win:pass-list', async (e, origin) => {
    const h = passHost(origin)
    if (!h) return []
    try { return passLoad().filter(x => x.host === h).map(x => ({ username: x.username, password: x.password })) } catch (err) { return [] }
  })
ipcMain.handle('win:pass-save', async (e, req) => {
  try {
    const s = await extSettings()
    if (s && s.passSave === false) return { saved: false, reason: 'off' }
    if (!req || !req.password) return { saved: false, reason: 'empty' }
    const h = passHost(req.origin)
    const id = 'ask_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const answer = await new Promise((resolve) => {
      permPending[id] = (v) => resolve(!!v)
      send('vio:ask', {
        id,
        title: 'Сохранить пароль?',
        message: 'Сохранить пароль для ' + h + '?',
        detail: 'Логин: ' + (req.username || '(без логина)') + '\nХранится только на этом устройстве, зашифрован ключом ОС.',
        okLabel: 'Сохранить',
        cancelLabel: 'Не сохранять',
        danger: false
      })
      setTimeout(() => {
        if (permPending[id]) { try { permPending[id](false) } catch (err) {} delete permPending[id] }
      }, 60000)
    })
    if (!answer) return { saved: false, reason: 'declined' }
    const added = passMerge([req])
    return { saved: true, added }
  } catch (err) { return { saved: false, reason: String(err.message || err) } }
})
  ipcMain.handle('win:pass-bulk', async (e, items) => {
    try { return { added: passMerge(Array.isArray(items) ? items : []) } } catch (err) { return { added: 0, error: String(err.message || err) } }
  })
  ipcMain.handle('win:pass-all', async () => {
    try {
      return passLoad().map((x, i) => ({ i, origin: x.origin, host: x.host, username: x.username, password: x.password }))
    } catch (err) { return [] }
  })
  ipcMain.handle('win:pass-del', async (e, i) => {
    try {
      const cur = passLoad()
      const n = Number(i)
      if (!Number.isInteger(n) || n < 0 || n >= cur.length) return { ok: false, error: 'нет такой записи' }
      cur.splice(n, 1)
      if (!passStore(cur)) return { ok: false, error: 'не удалось записать файл' }
      return { ok: true }
    } catch (err) { return { ok: false, error: String(err.message || err) } }
  })

  /* ================= импорт из Chrome / Firefox ================= */
  ipcMain.handle('win:import-detect', async () => {
    try { return VioImport.detect() } catch (e) { return [] }
  })
  ipcMain.handle('win:import-run', async (e, req) => {
    try {
      const res = VioImport.importProfile(req)
      const logins = res._logins || []
      delete res._logins
      if (logins.length) res.stored = passMerge(logins)
      return { ok: true, res }
    } catch (err) { return { ok: false, error: String(err.message || err) } }
  })

  /* путь к preload веб-вью для рендерера (он в песочнице и не умеет require('path')) */
  ipcMain.handle('win:guest-preload', () => path.join(__dirname, 'scripts', 'guest-pass.js'))

  /* список отключённых флагов и хостов — один источник правды, экран «О Vio» и README */
  ipcMain.handle('win:flag-list', () => ({
    switches: TELEMETRY_SWITCHES.map(([k, v]) => k + (v ? '=' + v : '')),
    hosts: TELEMETRY_SUFFIXES.slice()
  }))

  ipcMain.handle('mind:save-page', (e, p) => VioMind.savePage(p))
  ipcMain.handle('mind:search', (e, q, n) => VioMind.searchPages(q, n))
  ipcMain.handle('mind:stats', () => VioMind.getStats())
  ipcMain.handle('mind:clear-older', (e, d) => VioMind.clearOlderThan(d))
  ipcMain.handle('mind:export', () => VioMind.exportAll())
  ipcMain.handle('mind:import', (e, items) => VioMind.importMany(items))
  ipcMain.handle('mind:pattern-record', (e, from, to) => { VioMind.recordPattern(from, to); return true })
  ipcMain.handle('mind:index-all', async () => {
  try {
    const pages = VioMind.exportAll()
    let indexed = 0
    for (const p of pages) {
      try {
        if (VioMind.getVectorForPage && VioMind.getVectorForPage(p.id)) continue
        const v = await VioEmbed.embed(String(p.title || '') + '\n' + String(p.text || '').slice(0, 400))
        if (v) { VioMind.saveVector(p.id, v); indexed++ }
      } catch (err) {}
    }
    return { indexed, total: pages.length }
  } catch (err) { return { indexed: 0, error: String(err.message || err) } }
})
ipcMain.handle('mind:embed-search', async (e, q, n) => {
  try {
    if (!q) return []
    const qv = await VioEmbed.embed(String(q).slice(0, 400))
    if (!qv) return []
    const vecs = VioMind.getVectors(5000)
    const scored = []
    for (const row of vecs) {
      try {
        const v = JSON.parse(row.vec)
        const sc = VioEmbed.cosine(qv, v)
        if (sc > 0.25) scored.push({ id: row.page_id, score: sc })
      } catch (err) {}
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, Math.min(10, +n || 5)).map(t => {
      const p = VioMind.getPageById(t.id)
      return p ? { url: p.url, title: p.title, text: String(p.text || '').slice(0, 800), score: t.score } : null
    }).filter(Boolean)
  } catch (err) { return [] }
})
ipcMain.handle('mind:graph', () => {
    try {
      const pages = VioMind.exportAll().map((p, i) => ({ id: i, ...p }))
      return VioGraph.buildGraph(pages)
    } catch (e) { return { pages: [], edges: [] } }
  })

  /* ================= синхронизация в своё облако =================
     Своего сервера нет: клиентское шифрование (AES-256-GCM, ключ из пароля
     через scrypt), OAuth по loopback, HTTP идёт через main (мимо CORS). */
  ipcMain.handle('win:sync-pack', (e, passphrase, json) => {
    const pass = String(passphrase || '')
    if (pass.length < 4) throw new Error('пароль шифрования — минимум 4 символа')
    const salt = crypto.randomBytes(16)
    const key = crypto.scryptSync(pass, salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 1 << 26 })
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([c.update(String(json), 'utf8'), c.final()])
    return Buffer.concat([Buffer.from('VIOSYNC1'), salt, iv, c.getAuthTag(), enc]).toString('base64')
  })
  ipcMain.handle('win:sync-unpack', (e, passphrase, b64) => {
    const buf = Buffer.from(String(b64 || ''), 'base64')
    if (buf.length < 45 || buf.slice(0, 8).toString('latin1') !== 'VIOSYNC1') throw new Error('файл не похож на данные Vio')
    const salt = buf.slice(8, 24)
    const iv = buf.slice(24, 36)
    const tag = buf.slice(36, 52)
    const enc = buf.slice(52)
    const key = crypto.scryptSync(String(passphrase || ''), salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 1 << 26 })
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
  })

  /* HTTP для синхронизации: принимает/отдаёт base64, тело не трогаем в JSON */
  ipcMain.handle('win:sync-http', async (e, o) => {
    const ctl = new AbortController()
    const timer = setTimeout(() => { try { ctl.abort() } catch (err) {} }, (o && o.ms) || 45000)
    try {
      const init = { method: (o.method || 'GET'), headers: o.headers || {}, signal: ctl.signal }
      if (o.bodyB64 != null) init.body = Buffer.from(String(o.bodyB64), 'base64')
      else if (o.bodyText != null) init.body = String(o.bodyText)
      const res = await net.fetch(o.url, init)
      const ct = res.headers.get('content-type') || ''
      const buf = Buffer.from(await res.arrayBuffer())
      return { status: res.status, contentType: ct, text: /json|text|xml|javascript|form/i.test(ct) || buf.length < 200000 ? buf.toString('utf8') : '', data: buf.toString('base64') }
    } catch (err) { return { status: 0, error: String((err && err.message) || err) } } finally { clearTimeout(timer) }
  })

  /* OAuth через loopback: открываем страницу провайдера, ловим код на 127.0.0.1 */
  let oauth = null
  function oauthStop () {
    if (!oauth) return
    try { clearTimeout(oauth.timer) } catch (e) {}
    try { oauth.server.close() } catch (e) {}
    if (oauth.resolver) { try { oauth.resolver({ error: 'отменено' }) } catch (e) {} }
    oauth = null
  }
  ipcMain.handle('win:oauth-start', async (e, cfg) => {
    oauthStop()
    const provider = String(cfg && cfg.provider || '')
    const clientId = String(cfg && cfg.clientId || '').trim()
    if (!clientId) throw new Error('нужен свой Client ID')
    const state = crypto.randomBytes(16).toString('hex')
    const verifier = crypto.randomBytes(48).toString('base64url')
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1')
        if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return }
        const bad = u.searchParams.get('error')
        const code = u.searchParams.get('code')
        const st = u.searchParams.get('state')
        const ok = !bad && code && st === state
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(ok
          ? '<meta charset="utf-8"><body style="font-family:sans-serif;padding:40px"><h2>Готово</h2><p>Можно закрыть это окно и вернуться в Vio.</p></body>'
          : '<meta charset="utf-8"><body style="font-family:sans-serif;padding:40px"><h2>Не удалось</h2><p>Можно закрыть это окно.</p></body>')
        const r = oauth && oauth.resolver
        if (r) { oauth.resolver = null; setTimeout(() => { try { r({ code, state: st, error: bad || (code ? '' : 'код не получен') }) } catch (e) {} }, 150) }
        setTimeout(oauthStop, 800)
      } catch (err) { try { res.writeHead(500); res.end() } catch (e) {} }
    })
    return new Promise((resolve, reject) => {
      server.on('error', (err) => reject(new Error('не удалось поднять localhost: ' + err.message)))
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port
        const redirect = 'http://127.0.0.1:' + port + '/callback'
        let url = ''
        if (provider === 'gdrive') {
          url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
            client_id: clientId, redirect_uri: redirect, response_type: 'code',
            scope: 'https://www.googleapis.com/auth/drive.file',
            access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256'
          }).toString()
        } else if (provider === 'dropbox') {
          url = 'https://www.dropbox.com/oauth2/authorize?' + new URLSearchParams({
            client_id: clientId, redirect_uri: redirect, response_type: 'code',
            state, code_challenge: challenge, code_challenge_method: 'S256', token_access_type: 'offline'
          }).toString()
        } else { server.close(); reject(new Error('неизвестный провайдер')); return }
        oauth = { server, state, resolver: null, timer: null }
        oauth.timer = setTimeout(() => { const r = oauth && oauth.resolver; if (r) { oauth.resolver = null; try { r({ error: 'время ожидания вышло' }) } catch (err) {} } oauthStop() }, 180000)
        resolve({ url, redirect, verifier, state })
      })
    })
  })
  ipcMain.handle('win:oauth-wait', async () => new Promise((resolve) => {
    if (!oauth) { resolve({ error: 'вход не запущен' }); return }
    if (oauth.resolver) { resolve({ error: 'вход уже идёт' }); return }
    oauth.resolver = resolve
  }))
  ipcMain.on('win:oauth-stop', () => oauthStop())
  ipcMain.on('win:devtools', (e, arg) => {
    if (arg === 'app') win.webContents.openDevTools({ mode: 'detach' })
    else if (arg && win) {
      const wv = win.webContents.getAllWebContents().find(c => c.getType() === 'webview' && c.getURL() === arg)
      if (wv) wv.openDevTools({ mode: 'detach' })
    }
  })
})

app.on('window-all-closed', () => app.quit())

app.on('before-quit', async () => {
  try {
    const s = session.fromPartition('vio-private')
    await s.clearStorageData()
    await s.clearCache()
  } catch (e) {}
})
