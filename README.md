# Vio

Настольный браузер на Electron: быстрый старт, предсказуемое поведение и никакой
телеметрии. Встроенный ИИ работает по содержимому текущей страницы (без ключа и
регистрации), есть автозаполнение и хранение паролей, импорт данных из Chrome /
Edge / Brave / Яндекс / Vivaldi / Opera / Firefox и синхронизация в **своё** облако
(Google Drive, Dropbox, WebDAV) с клиентским шифрованием.

## Запуск

```bash
npm install
npm start          # или: node scripts/launch.js
```

Скрипт запуска снимает `ELECTRON_RUN_AS_NODE`, если он попал в окружение,
и поднимает `electron.exe` напрямую.

## Структура

| Файл | Что делает |
| --- | --- |
| `main.js` | главный процесс: окно, разрешения сайтов, блокировка телеметрии, хранилище паролей, импорт, распаковка `.crx`, шифрование и HTTP для синхронизации, OAuth по loopback |
| `preload.js` | мост `window.vio` (contextBridge, всё поимённо) |
| `index.html`, `styles.css` | разметка и стили |
| `scripts/renderer.js` | окно, вкладки, панели, настройки, диалоги |
| `scripts/pages.js` | экраны настроек (включая Импорт и Синхронизация) |
| `scripts/store.js` | состояние профиля в `localStorage` |
| `scripts/ai-agent.js`, `scripts/ai.js` | ИИ-агент: разметка страницы, подтверждения опасных действий, вижн-модели |
| `scripts/guest-pass.js` | preload каждой веб-страницы: автозаполнение и сбор паролей (изолированный мир) |
| `scripts/import-main.js` | чтение закладок/истории/паролей из профилей других браузеров |
| `scripts/import.js`, `scripts/sync.js` | логика экранов «Импорт» и «Синхронизация» |
| `scripts/ocr.js` | распознавание текста на картинках |
| `tools/make-icon.js` | сборка иконки |

## Приватность: что именно отключено

Эти флаги Chromium ставятся **до старта сессии** (`app.commandLine.appendSwitch`
в `main.js`), а хосты ниже режутся на уровне сети в обеих сессиях.
Ничего из этого не «включается обратно» — перечень кодируется в одном месте.

### Флаги запуска

```
--disable-background-networking        фоновые запросы Chromium: обновления, Variation Services, отчёты
--disable-component-update            скачивание компонентов (Safe Browsing, MEI-предсказания)
--disable-domain-reliability          отправка диагностики сбоев в Google
--disable-sync                        синхронизация аккаунта Google
--no-pings                            hyperlink auditing — «пинг» по клику на ссылку
--safebrowsing-disable-auto-update    фоновые обновления Safe Browsing
--disable-client-side-phishing-detection   проверка фишинга уходит в Google — отключена
--disable-breakpad                    отправка краш-дампов
--disable-crash-reporter
--disable-search-engine-choice-screen
--disable-offer-to-uninstall
```

### Выключенные функции (`--disable-features`)

```
Translate, MediaRouter, OptimizationHints, InterestFeedContentSuggestions,
AutofillServerCommunication, CertificateTransparencyComponentUpdater,
PrivacySandboxSettings4, NetworkTimeServiceQuerying, HttpsFirstBalancedModeAutoEnable,
CalculateNativeWinOcclusion
```

### Заблокированные хосты

```
clients2.google.com            clients4.google.com         clients5.google.com
update.googleapis.com          tools.google.com            safebrowsing.googleapis.com
optimizationguide-pa.googleapis.com                         www.google-analytics.com
analytics.google.com           stats.g.doubleclick.net     ssl.google-analytics.com
crash.corp.google.com          chromium-browser-crash-reporting.appspot.com
app-measurement.com            graph.facebook.net
```

Запрос к этим хостам обрывается до соединения; сайты, которые вы сами открываете,
работают как обычно.

## Пароли и синхронизация

* Пароли лежат в `logins.bin` рядом с профилем и шифруются `safeStorage`
  (на Windows это DPAPI, на macOS — Keychain): расшифровать файл можно только
  от имени владельца учётной записи ОС. Автозаполнение происходит внутри
  страницы, данные хост получает только после обращения к конкретному сайту.
* Синхронизация — один зашифрованный файл (`AES-256-GCM`, ключ из вашего пароля
  через `scrypt`), который кладётся в ваш Google Drive / Dropbox / WebDAV.
  Общих ключей и сервера Vio нет: OAuth-клиент создаёте вы, HTTP идёт через
  главный процесс (мимо CORS), пароль шифрования в облако не попадает.

## Лицензия

MIT — см. [LICENSE](LICENSE).
