/* Vio — внутренние страницы: «Новая вкладка» и «Настройки» */
(function () {
  const $ = (s, r) => (r || document).querySelector(s)

  /* ============================ ГЛАВНАЯ ============================ */
  function getHomeGreeting () {
    const h = new Date().getHours()
    if (h < 6) return 'Ночь — тишина и быстрые решения.'
    if (h < 12) return 'Доброе утро — начните с одного важного дела.'
    if (h < 18) return 'День в работе — держите фокус и быстрые ответы.'
    return 'Вечер — время спокойных вкладок и чистого мышления.'
  }

  function renderHome () {
    const page = $('#page-home')
    const s = Store.state.settings
    const eng = Store.engine()
    page.dataset.wall = s.wall
    const dial = Store.state.dial
    const heroClass = s.homeCompact ? 'compact' : ''

    page.innerHTML = `
      <div class="home-wrap">
        <div class="home-hero ${heroClass}">
          ${s.homeGreeting ? `<div class="home-greeting">${getHomeGreeting()}</div>` : ''}
          <div class="home-logo">${LOGO(74)}</div>
          <h1 class="home-title">Vio</h1>
          <div class="home-sub">Настольный браузер для работы: скорость, приватность и ИИ без регистрации</div>
          ${s.homeSearch ? `
          <form class="home-search" id="home-form">
            ${ICON('search')}
            <input id="home-q" type="text" placeholder="Поиск в ${eng.name} или введите адрес" autocomplete="off" spellcheck="false">
            <button class="btn primary" type="submit">Найти</button>
          </form>` : ''}
          ${s.quickActions ? `
          <div class="home-quick">
            <button class="quick-pill" data-home-action="private">Приватная вкладка</button>
            <button class="quick-pill" data-home-action="settings">Настройки</button>
            <button class="quick-pill" data-home-action="wall">Сменить фон</button>
          </div>` : ''}
        </div>

        <div class="home-sec">
          <div class="sec-head"><h2>Быстрый доступ</h2><div class="line"></div>
            <button class="btn mini" id="sd-add">${ICON('plus')} Добавить</button>
          </div>
          <div class="sd-grid" id="sd-grid">
            ${dial.map((t, i) => tile(t, i)).join('')}
            <button class="sd-tile add" id="sd-add-2" style="animation-delay:${dial.length * 35}ms">${ICON('plus')}<span>Добавить сайт</span></button>
          </div>
          ${dial.length ? '' : `<div class="sd-hint">${ICON('plus')} Сайты не добавляются сами — нажмите <b>+</b> в адресной строке или «Добавить сайт»</div>`}
        </div>

        ${s.homeHints ? `
        <div class="home-sec">
          <div class="sec-head"><h2>Горячие клавиши</h2><div class="line"></div></div>
          <div class="hints">
            <span><kbd>Ctrl</kbd>+<kbd>T</kbd> — новая вкладка</span>
            <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd> — приватная</span>
            <span><kbd>Ctrl</kbd>+<kbd>L</kbd> — адрес</span>
            <span><kbd>Ctrl</kbd>+<kbd>D</kbd> — в закладки</span>
            <span><kbd>Ctrl</kbd>+<kbd>H</kbd> — история</span>
            <span><kbd>Ctrl</kbd>+<kbd>B</kbd> — панель</span>
          </div>
        </div>` : ''}

        <div class="home-foot">
          <button class="btn" id="home-private">${ICON('private')} Приватная вкладка</button>
          <button class="btn" id="home-settings">${ICON('settings')} Настройки</button>
          <button class="btn" id="home-wall">${ICON('image')} Фон: ${Store.WALLS.find(w => w.id === s.wall).name}</button>
        </div>
      </div>`

    const form = $('#home-form', page)
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        const q = $('#home-q', page).value.trim()
        if (q) App.search(q)
      })
      setTimeout(() => {
        if (window.__focusHome) {
          window.__focusHome = false
          const i = $('#home-q', page)
          if (i) { i.focus(); i.select() }
        }
      }, 40)
    }

    const grid = $('#sd-grid', page)
    if (grid) {
      grid.addEventListener('click', (e) => {
        const del = e.target.closest('.sd-del')
        const tileEl = e.target.closest('.sd-tile')
        if (!tileEl || tileEl.classList.contains('add')) return
        if (del) {
          e.stopPropagation()
          Store.removeDial(tileEl.dataset.url)
          renderHome()
          toast('Удалено из быстрого доступа', 'close')
          return
        }
        App.navigate(tileEl.dataset.url)
      })
    }
    const add = () => App.dialog('Добавить в быстрый доступ', [
      { key: 'title', label: 'Название', placeholder: 'Например: Почта' },
      { key: 'url', label: 'Адрес', placeholder: 'https://example.com' }
    ], 'Добавить').then(v => {
      if (!v) return
      const url = App.normalizeUrl(v.url)
      if (!Store.addDial({ url, title: v.title || Store.hostOf(url) })) { toast('Этот сайт уже есть в быстром доступе'); return }
      renderHome(); toast('Добавлено в быстрый доступ', 'plus')
    })
    $('#sd-add', page).addEventListener('click', add)
    $('#sd-add-2', page).addEventListener('click', add)

    $('#home-private', page).addEventListener('click', () => App.newTab({ private: true }))
    $('#home-settings', page).addEventListener('click', () => App.openSettings())
    $('#home-wall', page).addEventListener('click', () => {
      const i = Store.WALLS.findIndex(w => w.id === Store.state.settings.wall)
      Store.state.settings.wall = Store.WALLS[(i + 1) % Store.WALLS.length].id
      Store.saveSettings(); renderHome()
    })
    page.querySelectorAll('[data-home-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.homeAction
        if (action === 'private') App.newTab({ private: true })
        else if (action === 'settings') App.openSettings()
        else if (action === 'wall') {
          const i = Store.WALLS.findIndex(w => w.id === Store.state.settings.wall)
          Store.state.settings.wall = Store.WALLS[(i + 1) % Store.WALLS.length].id
          Store.saveSettings(); renderHome()
        }
      })
    })
  }

  function tile (t, i) {
    const host = Store.hostOf(t.url)
    const letter = esc((t.title || host || '?')[0].toUpperCase())
    const src = Store.favicon(t.url, t.fav)
    const img = src
      ? `<img src="${esc(src)}" alt="${letter}" onerror="window.__favFallback(this)">`
      : `<span>${letter}</span>`
    return `
      <div class="sd-tile" data-url="${esc(t.url)}" title="${esc(t.url)}" style="animation-delay:${(i || 0) * 35}ms">
        <div class="sd-fav">${img}</div>
        <div class="sd-name">${esc(t.title || host || t.url)}</div>
        <button class="sd-del" title="Удалить">${ICON('close')}</button>
      </div>`
  }

  /* ============================ НАСТРОЙКИ ============================ */
  let section = 'appearance'

  const NAV = [
    ['appearance', 'palette', 'Внешний вид'],
    ['language', 'globe', 'Язык'],
    ['search', 'search', 'Поиск'],
    ['ai', 'sparkle', 'ИИ'],
    ['home', 'home', 'Начальная страница'],
    ['tabs', 'layers', 'Вкладки'],
    ['shortcuts', 'keyboard', 'Клавиши'],
    ['extensions', 'apps', 'Расширения'],
    ['import', 'download', 'Импорт'],
    ['sync', 'link', 'Синхронизация'],
    ['mind', 'brain', 'Память'],
    ['webPanels', 'layout', 'Web-панели'],
    ['usercss', 'palette', 'Свой CSS'],
    ['hotkeys', 'keyboard', 'Клавиши Vio'],
    ['auto', 'zap', 'Автоматизация'],
    ['person', 'sparkle', 'Личный контекст'],
    ['about', 'info', 'О Vio']
  ]

  function renderSettings (sec) {
    if (sec) section = sec
    const page = $('#page-settings')
    page.innerHTML = `
      <div class="settings-layout">
        <nav class="set-nav">
          <div class="brand">${LOGO(22)} Vio <span style="font-weight:400;color:var(--text-3);font-size:11px;margin-left:auto">настройки</span></div>
          ${NAV.map(n => `<button class="set-nav-item ${n[0] === section ? 'active' : ''}" data-sec="${n[0]}">${ICON(n[1])}<span>${n[2]}</span></button>`).join('')}
        </nav>
        <div class="set-main" id="set-main"></div>
      </div>`

    $('.set-nav', page).addEventListener('click', (e) => {
      const b = e.target.closest('[data-sec]')
      if (b) renderSettings(b.dataset.sec)
    })

    const main = $('#set-main', page)
    const R = {
      appearance: sectionAppearance,
      language: sectionLanguage,
      search: sectionSearch,
      ai: sectionAI,
      home: sectionHome,
      tabs: sectionTabs,
      shortcuts: sectionShortcuts,
      extensions: sectionExtensions,
      import: sectionImport,
      sync: sectionSync,
      mind: sectionMind,
      webPanels: sectionWebPanels,
      usercss: sectionUserCss,
      hotkeys: sectionHotkeys,
      auto: sectionAuto,
      person: sectionPerson,
      about: sectionAbout
    }[section]
    main.innerHTML = R()
    wire(main)
    /* секции из отдельных модулей дозаполняют себя сами (списки из main, кнопки) */
    if (section === 'webPanels') {
      const add = main.querySelector('#wp-add')
      if (add) add.addEventListener('click', () => {
        App.dialog('Новая web-панель', [
          { key: 'title', label: 'Название', placeholder: 'ChatGPT' },
          { key: 'url', label: 'URL', placeholder: 'https://chat.openai.com' }
        ], 'Добавить').then(v => {
          if (!v || !v.url) return
          const list = Store.state.settings.webPanels || []
          list.push({ title: v.title || v.url, url: v.url })
          Store.state.settings.webPanels = list
          Store.saveSettings()
          renderSettings('webPanels')
        })
      })
      main.querySelectorAll('[data-wp-open]').forEach(b => b.addEventListener('click', () => {
        const p = (Store.state.settings.webPanels || [])[+b.dataset.wpOpen]
        if (p) App.navigate(p.url)
      }))
      main.querySelectorAll('[data-wp-del]').forEach(b => b.addEventListener('click', () => {
        const list = Store.state.settings.webPanels || []
        list.splice(+b.dataset.wpDel, 1)
        Store.state.settings.webPanels = list
        Store.saveSettings()
        renderSettings('webPanels')
      }))
    }
    if (section === 'usercss') {
      const ta = main.querySelector('#usercss-text')
      const hint = main.querySelector('#usercss-hint')
      const saveCss = () => {
        if (!ta) return
        let v = String(ta.value || '').slice(0, 50000)
        v = v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
        Store.state.settings.userCss = v
        Store.saveSettings()
        if (hint) hint.textContent = v.length + ' / 50000'
        try { if (window.UserCss) {
          const tabs = Array.from(document.querySelectorAll('webview'))
          tabs.forEach(w => {
            try {
              const css = UserCss.forUrl(w.getURL ? w.getURL() : '', v)
              if (css) w.insertCSS(css)
            } catch (e) {}
          })
        } } catch (e) {}
      }
      if (ta) {
        ta.addEventListener('input', saveCss)
        ta.addEventListener('blur', saveCss)
      }
      const rs = main.querySelector('#usercss-reset')
      if (rs) rs.addEventListener('click', () => {
        Store.state.settings.userCss = ''
        Store.saveSettings()
        renderSettings('usercss')
      })
    }


    if (section === 'hotkeys') {
      main.querySelectorAll('[data-hk]').forEach(inp => {
        inp.addEventListener('change', () => {
          const cmd = inp.dataset.hk
          const v = String(inp.value || '').trim()
          const hk = Store.state.settings.hotkeys || {}
          if (!v) delete hk[cmd]
          else if (/^(Ctrl|Shift|Alt)(\+(Ctrl|Shift|Alt))*\+[A-Za-z0-9]$/i.test(v)) hk[cmd] = v
          else { toast('Формат: Ctrl+Shift+X'); inp.value = hk[cmd] || ''; return }
          Store.state.settings.hotkeys = hk
          Store.saveSettings()
        })
      })
      const rr = main.querySelector('#hotkeys-reset')
      if (rr) rr.addEventListener('click', () => {
        Store.state.settings.hotkeys = {}
        Store.saveSettings()
        renderSettings('hotkeys')
      })
    }


    if (section === 'auto') {
      const cl = main.querySelector('#auto-clear')
      if (cl) cl.addEventListener('click', () => {
        try { if (window.VioAuto) VioAuto.clear() } catch (e) {}
        renderSettings('auto')
      })
    }
    if (section === 'person') {
      const cl = main.querySelector('#person-clear')
      if (cl) cl.addEventListener('click', () => {
        try { if (window.VioPerson) VioPerson.clear() } catch (e) {}
        renderSettings('person')
      })
    }
    try { if (section === 'import' && window.VioImport) VioImport.wire(main) } catch (e) {}
    try { if (section === 'sync' && window.VioSync) VioSync.wire(main) } catch (e) {}
  }

  /* ---- куски разметки ---- */
  function row (title, desc, control, cls) {
    return `<div class="set-row">
      <div class="sr-main"><div class="sr-title">${title}</div>${desc ? `<div class="sr-desc">${desc}</div>` : ''}</div>
      ${control ? `<div class="sr-control${cls ? ' ' + cls : ''}">${control}</div>` : ''}
    </div>`
  }
  function group (title, inner) {
    return `<div class="set-group"><h3>${title}</h3><div class="set-card">${inner}</div></div>`
  }
  function seg (key, opts) {
    const val = Store.state.settings[key]
    return `<div class="seg" data-seg="${key}">${opts.map(o => `<button data-val="${o[0]}" class="${String(val) === String(o[0]) ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`
  }
  function sw (key, desc) {
    const on = !!Store.state.settings[key]
    return `<label class="switch" data-switch="${key}"><input type="checkbox" ${on ? 'checked' : ''}><i></i></label>`
  }
  function range (key, min, max, step, fmt) {
    const v = Store.state.settings[key]
    return `<input type="range" data-range="${key}" min="${min}" max="${max}" step="${step}" value="${v}">`
  }

  function sectionAppearance () {
    const s = Store.state.settings
    const pres = Store.ACCENTS
    return `
      <h1>Внешний вид</h1>
      <p class="set-desc">Тема, цвета, плотность интерфейса — всё настраивается.</p>

      ${group('Тема', [
        row('Режим', 'Светлая (белая) или тёмная (чёрно-серая) тема', seg('theme', [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']])),
        row('Анимации', 'Плавные переходы и открытие меню', sw('motion')),
        row('Производительность', 'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения',
          `<select data-select="performanceMode">
            <option value="auto" ${s.performanceMode === 'auto' || !s.performanceMode ? 'selected' : ''}>Авто</option>
            <option value="full" ${s.performanceMode === 'full' ? 'selected' : ''}>Полные эффекты</option>
            <option value="save" ${s.performanceMode === 'save' ? 'selected' : ''}>Максимальная экономия</option>
          </select>`),
        row('Шрифт интерфейса', 'Гарнитура элементов управления браузера',
          `<select data-select="font">${Object.keys(Store.FONTS).map(f => `<option value="${f}" ${s.font === f ? 'selected' : ''}>${({ system: 'Системный', serif: 'С засечками', mono: 'Моноширинный', rounded: 'Скруглённый' })[f]}</option>`).join('')}</select>`)
      ].join(''))}

      ${group('Цвета', [
        row('Акцентный цвет', 'Кнопки, активные вкладки, выделение',
          `<div class="swatches">${pres.map(p => `<span class="swatch ${s.accent === p.id && !s.accentCustom ? 'on' : ''}" data-accent="${p.id}" style="background:${p.a}" title="${p.name}"></span>`).join('')}
            <span class="swatch duo ${s.accentCustom ? 'on' : ''}" data-accent="custom" title="Свой цвет"></span>
            <input type="color" id="accent-custom" value="${s.accentCustom || pres[0].a}" title="Выбрать свой цвет">
          </div>`),
        row('Вторичный цвет', 'Пастельный акцент для градиентов и логотипа',
          `<div class="swatches">${pres.map(p => `<span class="swatch ${s.accent2Custom === p.a2 ? 'on' : ''}" data-accent2="${p.a2}" style="background:${p.a2}" title="${p.name}"></span>`).join('')}
            <input type="color" id="accent2-custom" value="${s.accent2Custom || pres[0].a2}" title="Свой цвет">
          </div>`)
      ].join(''))}

      ${group('Форма и размер', [
        row('Скругление углов', 'Вкладки, поля, карточки', range('radius', 2, 18, 1)),
        row('Плотность интерфейса', 'От компактного до просторного', range('density', 0.82, 1.2, 0.02)),
        row('Масштаб интерфейса', 'Размер элементов браузера (не страниц)', range('uiScale', 0.9, 1.2, 0.02))
      ].join(''))}

      ${group('Панели', [
        row('Позиция вкладок', 'Где показывать вкладки', seg('tabPos', [['top', 'Сверху'], ['bottom', 'Снизу'], ['left', 'Слева'], ['right', 'Справа']])),
        row('Адресная строка', 'Сверху или снизу', seg('omnipos', [['top', 'Сверху'], ['bottom', 'Снизу']])),
        row('Боковая панель', 'Левая панель с закладками, историей и загрузками', sw('rail')),
        row('Панель закладок', 'Строка под адресной строкой', sw('bookmarksBar')),
        row('Ширина панели', 'Боковая панель и вкладки', range('panelW', 240, 460, 10))
      ].join(''))}

      ${group('Персонализация рабочего стола', [
        row('Режим запуска', 'Баланс, фокус или творчество', seg('homeMode', [['balanced', 'Баланс'], ['focus', 'Фокус'], ['creative', 'Творчество']])),
        row('Приветствие на стартовой странице', 'Смена фраз по времени суток', sw('homeGreeting')),
        row('Компактная стартовая страница', 'Плотнее и меньше лишних блоков', sw('homeCompact')),
        row('Быстрые действия', 'Панель с приватной вкладкой и настройками', sw('quickActions'))
      ].join(''))}
    `
  }

  function sectionLanguage () {
    const s = Store.state.settings
    const hasRegion = typeof Region !== 'undefined' && Region && Region.get
    const R = hasRegion ? Region.get() : null
    const LANGS = (hasRegion && Region.LANGS) || {}
    /* названия на родном языке: English, Українська, Қазақша… */
    const nameOf = (hasRegion && Region.nativeName) ? Region.nativeName : (k => LANGS[k] || k)
    const langs = [['auto', 'Авто — язык системы']]
      .concat(Object.keys(LANGS).map(k => [k, nameOf(k)]))
    const opts = langs.map(o => `<option value="${o[0]}" ${(s.lang || 'auto') === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')
    const note = 'Авто — определяется по региону (текущий: ' + (R ? esc(R.country) + ' / ' + esc(R.langName) : '—') + ')'
    const now = R
      ? esc(R.langName) + ' (' + esc(R.lang) + ') · ' + esc(R.country) + (R.city ? ' · ' + esc(R.city) : '') + ' · ' + esc(R.source)
      : '—'
    return `
      <h1>Язык</h1>
      <p class="set-desc">Язык интерфейса, подсказки поисковиков и ответы ИИ.</p>

      ${group('Язык интерфейса', [
        row('Язык', 'Язык подсказок поисковиков и язык ответов ИИ',
          `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:5px;max-width:320px">
            <select data-select="lang">${opts}</select>
            <span class="sr-desc" style="margin-top:0">${note}</span>
          </div>`),
        row('Определено сейчас', 'Откуда взяты регион и язык',
          `<span class="set-note">${now}</span>`)
      ].join(''))}
    `
  }

  function sectionSearch () {
    const s = Store.state.settings
    const all = Store.engines()
    const enabled = new Set(Store.enabledEngines().map(e => e.id))
    const autoOn = !s.engine || s.engine === 'auto' || !all.some(e => e.id === s.engine)
    return `
      <h1>Поиск</h1>
      <p class="set-desc">Поисковые системы для адресной строки и стартовой страницы.</p>

      ${group('По умолчанию', [
        row('Основной поисковик', 'Используется при вводе запроса в адресную строку',
          `<select data-select="engine"><option value="auto" ${autoOn ? 'selected' : ''}>Авто (по стране)</option>${all.map(e => `<option value="${e.id}" ${s.engine === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}</select>`)
      ].join(''))}

      ${(() => {
        const R = (typeof Region !== 'undefined' && Region.get && Region.get()) || null
        if (!R) return ''
        const codes = ['RU', 'UA', 'BY', 'KZ', 'AM', 'GE', 'AZ', 'MD', 'UZ', 'KG', 'TJ', 'TM',
          'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'PL', 'TR', 'CN', 'JP', 'IN', 'BR']
          .filter(c => Region.COUNTRIES[c])
        const extra = Object.keys(Region.COUNTRIES).filter(c => codes.indexOf(c) < 0).sort((a, b) => Region.COUNTRIES[a].localeCompare(Region.COUNTRIES[b], 'ru'))
        const list = [['auto', 'Авто — по часовому поясу']]
          .concat(codes.map(c => [c, Region.COUNTRIES[c]]))
          .concat(extra.map(c => [c, Region.COUNTRIES[c]]))
        const opts = (arr, cur) => arr.map(o => `<option value="${o[0]}" ${cur === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')
        return group('Регион', [
          row('Регион', 'Определяется сам по часовому поясу и локали — без сети и без запросов наружу. Влияет на выдачу поисковиков, Википедию и город для погоды',
            `<select data-select="region">${opts(list, s.region || 'auto')}</select>`),
          row('Определено сейчас', 'Откуда взяты регион и язык',
            `<span class="set-note">${esc(R.country)}${R.city ? ' · ' + esc(R.city) : ''} · ${esc(R.tz || '—')} · ${esc(R.langName)} · ${esc(R.source)}</span>`)
        ].join(''))
      })()}

      ${group('Список систем', all.map(e => `
        <div class="engine-row" data-eng-row="${e.id}">
          <div class="er-main">
            <div class="er-name">${Engine.mark(e)} ${e.name} ${e.id === Store.engine().id ? '<span class="dot" title="По умолчанию"></span>' : ''}</div>
            <div class="er-url">${e.url}</div>
          </div>
          <label class="switch"><input type="checkbox" data-eng-toggle="${e.id}" ${enabled.has(e.id) ? 'checked' : ''}><i></i></label>
          ${e.custom ? `<button class="btn mini danger" data-eng-del="${e.id}">Удалить</button>` : ''}
        </div>`).join(''))}

      <div class="set-group">
        <button class="btn" id="eng-add">${ICON('plus')} Добавить свою поисковую систему</button>
      </div>
    `
  }

  function sectionAI () {
    const s = Store.state.settings
    const steps = Math.max(3, Math.min(20, +s.aiSteps || 10))
    const A = (window.AI && AI.settings) ? AI.settings : null
    const styleNames = A ? A.styleNames : { default: 'По умолчанию' }
    const style = A ? A.styleKey() : (s.aiStyle || 'default')
    const prov = s.aiProvider || 'auto'
    const custom = prov === 'custom'
    const prompt = String(s.aiPrompt || '')
    return `
      <h1>ИИ и агент</h1>
      <p class="set-desc">Бесплатный помощник без ключа и регистрации. Здесь можно полностью выключить ИИ, ограничить его возможности, задать свой базовый промпт, стиль общения и подключить свою модель.</p>

      ${group('Главное', [
        row('ИИ включён', 'Полное отключение: чат, агент и озвучка выключаются, браузер работает без ИИ', sw('aiOn')),
        row('Стиль общения', 'Как ИИ формулирует ответы: кратко, подробно, делово, дружелюбно',
          `<select data-select="aiStyle">${Object.keys(styleNames).map(k => `<option value="${k}" ${style === k ? 'selected' : ''}>${esc(styleNames[k])}</option>`).join('')}</select>`)
      ].join(''))}

      ${group('Базовый промпт', [
        row('Свои инструкции', 'Добавляются поверх системного промпта: роль, тон, длина, ограничения. Максимум 3000 знаков, вставки очищаются автоматически.',
          `<textarea class="set-area" id="ai-prompt" rows="5" placeholder="Например: Отвечай как опытный наставник: сначала короткий ответ, потом пояснение. Всегда приводи пример.">${esc(prompt)}</textarea>
           <div class="set-hint" id="ai-prompt-hint">${prompt.length} / 3000</div>`, 'sr-control--grow'),
        row('Промпт по умолчанию', 'Убрать свой промпт и вернуть стандартный стиль Vio',
          `<button class="btn mini" id="ai-prompt-reset">Сбросить</button>`)
      ].join(''))}

      ${group('Возможности', [
        row('Поиск и действия', 'ИИ ищет в интернете, открывает сайты, меняет оформление браузера', sw('aiAgent')),
        row('ИИ видит сайт', 'Адрес, текст и список элементов текущей страницы попадают в контекст ИИ', sw('aiSeePage')),
        row('Снимки экрана', 'Распознавание текста со скриншота — капчи, картинки, графики', sw('aiShot')),
        row('Действия на странице', 'Клики, заполнение форм, клавиши, выбор пунктов и чекбоксов', sw('aiActions')),
        row('Лимит шагов', 'Сколько действий агент может выполнить за один запрос',
          `<select data-select="aiSteps">${[5, 10, 15, 20].map(v => `<option value="${v}" ${steps === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`),
        row('Озвучка ответов', 'ИИ читает свои ответы вслух голосом системы', sw('aiVoice'))
      ].join(''))}

      ${group('Распознавание экрана (vision)', [
        row('Gemini — основной', 'Бесплатный ключ Google AI Studio (aistudio.google.com → Get API key): модель читает текст со скриншотов, капчи и графики. Если ключ заполнен — снимок экрана уходит в Google; ключа нет — снимок не покидает устройство',
          `<input class="set-input" id="ai-gemini" type="password" placeholder="AIza…" value="${esc(String(s.aiGeminiKey || ''))}">`),
        row('Groq — запасной', 'Бесплатный ключ console.groq.com (Llama 4 Scout/Maverick): срабатывает, если Gemini не ответил. Тожа отправляет снимок только при заполненном ключе',
          `<input class="set-input" id="ai-groq" type="password" placeholder="gsk_…" value="${esc(String(s.aiGroqKey || ''))}">`),
        row('Без ключей', 'Работает локальный OCR — распознаёт текст на устройстве, без интернета и регистрации',
          `<span class="set-hint">OCR — последний рубеж</span>`),
        `<p class="set-hint">⚠️ Если ключ заполнен — снимки экрана уходят провайдеру (Google/Groq). Без ключа снимки не покидают устройство (локальный OCR).</p>`
      ].join(''))}

      ${group('Модель', [
        row('Провайдер', '«Авто» — бесплатные модели без ключа; «Свой» — ваш адрес и ключ (API в формате OpenAI)',
          `<select data-select="aiProvider">${[
            ['auto', 'Авто (бесплатные, без ключа)'],
            ['custom', 'Свой эндпоинт (API-ключ)']
          ].map(o => `<option value="${o[0]}" ${prov === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`),
        ...(custom ? [
          row('Адрес API', 'Например https://openrouter.ai/api/v1 — должен отвечать форматом OpenAI',
            `<input class="set-input" id="ai-baseurl" type="text" placeholder="https://api.example.com/v1/chat/completions" value="${esc(String(s.aiBaseUrl || ''))}"><div class="set-hint" id="ai-url-hint"></div>`),
          row('Ключ', 'Хранится только на этом устройстве и уходит только на ваш адрес',
            `<input class="set-input" id="ai-apikey" type="password" placeholder="sk-…" value="${esc(String(s.aiApiKey || ''))}">`),
          row('Модель', 'Идентификатор модели, например gpt-4o-mini',
            `<input class="set-input" id="ai-model" type="text" placeholder="gpt-4o-mini" value="${esc(String(s.aiModel || ''))}">`),
          row('Проверка', 'Если адрес или ключ неверные, ИИ автоматически вернётся на бесплатные провайдеры',
            `<span class="set-hint">запасной вариант: бесплатные без ключа</span>`)
        ] : [])
      ].join(''))}

      ${group('Данные', [
        row('История чатов', 'Все диалоги хранятся только на этом устройстве',
          `<span style="color:var(--text-3);font-size:12px" id="ai-chats-count">${(window.AI && AI.chats ? AI.chats().length : 1)} шт.</span>`),
        row('Очистить', 'Удалить все чаты и начать заново',
          `<button class="btn mini danger" id="ai-clear">Очистить</button>`)
      ].join(''))}
    `
  }

  function sectionHome () {
    const s = Store.state.settings
    return `
      <h1>Начальная страница</h1>
      <p class="set-desc">Оформление новой вкладки и быстрый доступ.</p>

      ${group('Оформление', [
        row('Фон', 'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности',
          `<div class="swatches">${Store.WALLS.map(w => `<button class="btn mini ${s.wall === w.id ? 'primary' : ''}" data-wall="${w.id}" style="margin-right:6px">${w.name}</button>`).join('')}</div>`),
        row('Поисковая строка', 'Поле поиска в центре новой вкладки', sw('homeSearch')),
        row('Подсказки', 'Список горячих клавиш внизу страницы', sw('homeHints'))
      ].join(''))}

      ${group('Быстрый доступ', [
        row('Как добавить сайт', 'Кнопка <b>+</b> справа в адресной строке или подсказка при вводе адреса — автоматически ничего не сохраняется'),
        row('Свои плитки', 'Сайты, добавленные вручную',
          `<span style="color:var(--text-3);font-size:12px">${Store.state.dial.length} шт.</span>`),
        row('Очистить', 'Удалить все добавленные вручную плитки',
          `<button class="btn mini danger" id="dial-clear">Очистить</button>`)
      ].join(''))}
    `
  }

  function sectionTabs () {
    const s = Store.state.settings
    return `
      <h1>Вкладки</h1>
      <p class="set-desc">Поведение вкладок и ссылок.</p>
      ${group('Поведение', [
        row('Восстанавливать вкладки после запуска/сбоя', 'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия', sw('restoreSession')),
        row('Ссылки на других сайтах', 'Открывать в фоне не мешая работе', sw('openInBackground')),
        row('Индикатор звука', 'Иконка у вкладки, которая играет звук', sw('showTabAudio')),
        row('Позиция вкладок', 'Можно перенести влево', seg('tabPos', [['top', 'Сверху'], ['left', 'Слева']]))
      ].join(''))}
      ${group('Приватные вкладки', [
        row('Что это?', 'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.'),
        row('Сбросить сейчас', 'Очистить данные приватного режима вручную', `<button class="btn mini" id="priv-reset">Сбросить</button>`)
      ].join(''))}
    `
  }

  const SHORTCUTS = [
    ['Новая вкладка', 'Ctrl + T'],
    ['Закрыть вкладку', 'Ctrl + W'],
    ['Вернуть закрытую вкладку', 'Ctrl + Shift + T'],
    ['Приватная вкладка', 'Ctrl + Shift + N'],
    ['Перейти в адресную строку', 'Ctrl + L'],
    ['Обновить страницу', 'Ctrl + R'],
    ['Найти на странице', 'Ctrl + F'],
    ['Следующая вкладка', 'Ctrl + Tab'],
    ['Вкладка 1…8', 'Ctrl + 1…8'],
    ['Последняя вкладка', 'Ctrl + 9'],
    ['В закладки', 'Ctrl + D'],
    ['История', 'Ctrl + H'],
    ['Загладки', 'Ctrl + Shift + O'],
    ['Загрузки', 'Ctrl + J'],
    ['Боковая панель', 'Ctrl + B'],
    ['Настройки', 'Ctrl + ,'],
    ['Масштаб + / −', 'Ctrl + = / Ctrl + -'],
    ['Сброс масштаба', 'Ctrl + 0'],
    ['Меню Vio', 'Alt + E'],
    ['Дзен-режим', 'Ctrl + Shift + Z'],
    ['Полный экран', 'F11'],
    ['DevTools страницы', 'Ctrl + Shift + I']
  ]

  function sectionShortcuts () {
    return `
      <h1>Горячие клавиши</h1>
      <p class="set-desc">Всё, что можно делать без мыши.</p>
      <div class="set-card"><div class="kbd-grid">
        ${SHORTCUTS.map(s => `<div class="kbd-row"><span>${s[0]}</span><kbd>${s[1]}</kbd></div>`).join('')}
      </div></div>`
  }

  function sectionExtensions () {
    const extensions = Store.state.settings.extensions || []
    return `
      <h1>Расширения</h1>
      <p class="set-desc">Управляйте встроенными инструментами Vio и установленными Chromium-расширениями. Совместимость сторонних расширений зависит от их API и версии Manifest; до установки Vio проверяет запрошенные разрешения.</p>

      ${group('Восстановление и копирование', [
        row('Typeback', 'Возвращает потерянный текст из полей ввода, если вкладка закрылась или страница обновилась',
          sw('extTypeback')),
        row('Enable Copy', 'Разрешает копирование и правую кнопку мыши на сайтах, где они заблокированы',
          sw('extEnableCopy'))
      ].join(''))}

      ${group('Картинки (меню по правой кнопке)', [
        row('Сохранить как…', 'Сохранить картинку в PNG, JPEG или WebP на выбор',
          sw('extSaveAs')),
        row('Убрать фон', 'Делает однотонный фон картинки прозрачным, без интернета',
          sw('extBgRemove')),
        row('Распознать текст (OCR)', 'Считывает русский и английский текст с картинки',
          sw('extOcr'))
      ].join(''))}

      ${group('Блокировки', [
        row('Блокировка рекламы', 'Режет рекламные серверы на уровне сети и прячет баннеры на страницах',
          sw('extAdblock')),
        row('Анти-куки баннеры', 'Прячет всплывающие окна с просьбой принять куки',
          sw('extCookies'))
      ].join(''))}

      ${group('Свои расширения (режим разработчика)', [
        row('Загрузка', 'Папка с распакованным расширением (manifest.json внутри) — или сразу файл .crx / .zip: распакуем на лету. Честно: API урезаны, а контент-скрипты во вкладках не выполняются — большинство оригиналов работать не будет',
          `<button class="btn mini" id="ext-add">${ICON('plus')} Загрузить расширение…</button>`),
        row('Перетащите файл', 'Скачанный .crx или .zip из магазина расширений — просто перетащите в эту область',
          `<div id="ext-drop" class="set-hint ext-drop">${ICON('plus')} .crx / .zip сюда</div>`)
      ].join(''))}

      ${group('Установленные расширения (' + extensions.length + ')', [
        ...(extensions.length ? [
          row('Фильтр', 'По названию, версии, пути или ошибке загрузки',
            '<input class="set-input" id="ext-filter" type="search" placeholder="Найти расширение…" autocomplete="off">')
        ] : []),
        `<div id="ext-list">${extensions.map((x, i) => `
        <div class="engine-row ext-item" data-ext-row="${i}" data-search="${esc([x.name, x.version, x.path, x.error].filter(Boolean).join(' ').toLowerCase())}">
          <div class="er-main">
            <div class="er-name">${esc(x.name || 'Расширение')} ${x.version ? `<span style="color:var(--text-3)">${esc(x.version)}</span>` : ''}</div>
            <div class="er-url">${esc(x.path || '')}${x.id ? `<br>ID: ${esc(x.id)}` : ''}${x.error ? `<br><span style="color:#E5484D">${esc(x.error)}</span>` : ''}</div>
          </div>
          <label class="switch"><input type="checkbox" data-ext-toggle="${i}" ${x.enabled !== false ? 'checked' : ''}><i></i></label>
          <button class="btn mini danger" data-ext-del="${i}">Убрать</button>
        </div>`).join('') || '<div class="set-desc">Своих расширений пока нет.</div>'}</div>`
      ].join(''))}
    `
  }

  function sectionImport () {
    const s = Store.state.settings
    return `
      <h1>Импорт и пароли</h1>
      <p class="set-desc">Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.</p>

      ${group('Перенос из Chrome, Firefox и других', [
        row('Источник', 'Браузеры и профили, найденные на этом компьютере',
          `<select class="set-input" id="imp-browser"><option value="">Проверяю…</option></select>`),
        row('Что перенести', 'Отметьте нужное. Повторный импорт дубликаты не создаёт',
          `<div class="imp-what">
            <label><input type="checkbox" id="imp-bookmarks" checked> Закладки</label>
            <label><input type="checkbox" id="imp-history" checked> История</label>
            <label><input type="checkbox" id="imp-pass" checked> Пароли</label>
          </div>`),
        row('Запустить', 'Импорт идёт локально и занимает несколько секунд',
          `<button class="btn mini" id="imp-run">Импортировать</button>`),
        row('Результат', '', `<span class="set-note" id="imp-out">—</span>`)
      ].join(''))}

      ${group('Пароли Vio', [
        row('Сохранять пароли', 'Сайт попросит сохранить — Vio спросит и положит пароль в хранилище ОС (на Windows это DPAPI, на macOS — Keychain). В приватных вкладках пароли не сохраняются и не подставляются', sw('passSave')),
        row('Где хранятся', 'Файл logins.bin в папке профиля Vio, зашифрован ключом вашей учётной записи ОС — расшифровать его можно только от вашего имени', `<span class="set-note">только это устройство</span>`)
      ].join(''))}

      ${group('Сохранённые пароли', [
        row('В хранилище', 'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить',
          `<span class="set-note" id="pass-count">—</span>`),
        row('Список', '', `<div class="pass-list" id="pass-list"></div>`)
      ].join(''))}
    `
  }

  function sectionSync () {
    const s = Store.state.settings
    const p = s.syncProvider || 'off'
    const cloud = p === 'gdrive' || p === 'dropbox'
    return `
      <h1>Синхронизация</h1>
      <p class="set-desc">Своего сервера у Vio нет. Закладки, история и настройки собираются в один файл, шифруются на устройстве и лежат в вашем облаке — Google Drive, Dropbox или на своём WebDAV (Nextcloud, Yandex Disk, свой сервер). Мы не видим содержимого: ключ шифрования остаётся у вас.</p>

      ${group('Куда синхронизировать', [
        row('Облако', 'Один зашифрованный файл со всеми данными профиля',
          `<select data-select="syncProvider">${[
            ['off', 'Выключено'], ['webdav', 'WebDAV — без аккаунта (рекомендуется)'], ['gdrive', 'Google Drive — требует настройки'], ['dropbox', 'Dropbox — требует настройки']
          ].map(o => `<option value="${o[0]}" ${p === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`),
        row('Ключ шифрования', 'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве',
          `<input class="set-input" type="password" id="sync-pass" placeholder="придумайте пароль" value="${esc(String(s.syncPassphrase || ''))}">`),
        ...(p === 'webdav' ? [
          row('Адрес файла', 'Например https://cloud.example/remote.php/dav/files/ИМЯ/vio-sync.bin',
            `<input class="set-input" type="text" id="sync-url" placeholder="https://…/vio-sync.bin" value="${esc(String(s.syncWebdavUrl || ''))}">`),
          row('Доступ', 'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)',
            `<input class="set-input" type="text" id="sync-user" placeholder="логин" value="${esc(String(s.syncWebdavUser || ''))}">
             <input class="set-input" type="password" id="sync-wpass" placeholder="пароль" value="${esc(String(s.syncWebdavPass || ''))}">`)
        ] : []),
        ...(cloud ? [
          row('Client ID', p === 'gdrive'
            ? 'Свой OAuth-клиент в Google Cloud Console (тип «Desktop app»), redirect URI — http://localhost:…/callback. Google не даёт общие ключи, поэтому клиент создаёте вы'
            : 'Свой OAuth-клиент в developers.dropbox.com (Scoped app), redirect URI — http://localhost:…/callback',
            `<input class="set-input" type="text" id="sync-client" placeholder="${p === 'gdrive' ? '….apps.googleusercontent.com' : '…'}" value="${esc(String(s.syncClientId || ''))}">`),
          row('Аккаунт', 'Открывается страница провайдера; после разрешения Vio сам получит токен',
            `<button class="btn mini" id="sync-connect">Подключить</button> <span class="set-note" id="sync-status"></span>`)
        ] : [])
      ].join(''))}

      ${group('Данные', [
        row('Сохранить в облако', 'Собрать закладки, историю и настройки, зашифровать и загрузить файл',
          `<button class="btn mini" id="sync-push">Сохранить</button>`),
        row('Загрузить из облака', 'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны',
          `<button class="btn mini" id="sync-pull">Загрузить</button>`),
        row('Автосинк', 'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт',
          sw('syncAuto')),
        row('Последний раз', '', `<span class="set-note" id="sync-last">${s.syncLast ? new Date(s.syncLast).toLocaleString() : '—'}</span>`)
      ].join(''))}
    `
  }

  async function syncExtensions () {
    try {
      const list = Store.state.settings.extensions || []
      const updated = await vio.extSync(list)
      if (JSON.stringify(updated) !== JSON.stringify(list)) {
        Store.state.settings.extensions = updated
        Store.saveSettings()
      }
    } catch (e) {}
  }

  function sectionMind () {
    const s = Store.state.settings
    const on = s.mindOn !== false
    const consented = !!localStorage.getItem('vio.mind.consent')
    return `
      <h1>Память браузера</h1>
      <p class="set-desc">Vio может сохранять текст посещённых страниц 
      локально, чтобы ИИ отвечал с учётом того, что вы уже читали. 
      Всё хранится ТОЛЬКО на этом устройстве. Приватные вкладки не 
      сохраняются.</p>


      ${!consented && !on ? `
      <div class="set-card" style="margin-bottom:20px;padding:16px;border:2px solid var(--accent)">
        <b style="font-size:14px">Память выключена</b>
        <p style="color:var(--text-2);font-size:12.5px;margin:8px 0 12px">
          Пока вы не включите — Vio не сохраняет ничего.
        </p>
        <button class="btn primary" id="mind-enable">Включить память</button>
      </div>` : ''}


      ${group('Главное', [
        row('Память включена', 'Сохранять текст страниц локально', 
            on ? sw('mindOn') : '<span class="set-note">выключено — включите выше</span>'),
        row('Сохранено', '', '<span class="set-note" id="mind-stats">…</span>')
      ].join(''))}


      ${group('Управление', [
        row('Очистить старше 30 дней', '', '<button class="btn mini" id="mind-clear">Очистить</button>'),
        row('Удалить ВСЮ память', 'Безвозвратно', '<button class="btn mini danger" id="mind-wipe">Удалить всё</button>'),
        row('Экспорт', 'Скачать всю память в JSON', '<button class="btn mini" id="mind-export">Экспорт</button>'),
        row('Импорт', 'Загрузить память из JSON', '<input type="file" id="mind-import" accept=".json" style="display:none"><button class="btn mini" id="mind-import-btn">Импорт</button>')
      ].join(''))}


      ${group('Что не сохраняется', [
        row('Приватные вкладки', 'Никогда'),
        row('Банки и платёжные сайты', 'Стоп-лист по домену'),
        row('Страницы с /login, /password', 'Не сохраняются')
      ].join(''))}


      ${group('Карта знаний', [
        row('Связи', 'Показать, что связано по смыслу', '<button class="btn mini" id="mind-graph">Построить</button>'),
        row('Результат', '', '<div id="mind-graph-out" style="max-height:260px;overflow:auto;font-size:12px"></div>')
      ].join(''))}
    `
  }


  function sectionWebPanels () {
    const s = Store.state.settings
    const panels = s.webPanels || []
    return `
      <h1>Web-панели</h1>
      <p class="set-desc">Сайты, которые открываются в боковой панели или текущей вкладке. 
      Например, ChatGPT, YouTube, Habr — на быстром доступе.</p>


      ${group('Добавить', [
        row('Новая панель', 'Название и адрес сайта',
          '<button class="btn mini" id="wp-add">Добавить панель</button>')
      ].join(''))}


      ${group('Панели', panels.length ? panels.map((p, i) => `
        <div class="engine-row" data-wp-row="${i}">
          <div class="er-main">
            <div class="er-name">${esc(p.title || p.url)}</div>
            <div class="er-url">${esc(p.url)}</div>
          </div>
          <button class="btn mini" data-wp-open="${i}">Открыть</button>
          <button class="btn mini danger" data-wp-del="${i}">Удалить</button>
        </div>`).join('')
        : '<div class="set-desc">Панелей пока нет.</div>')}
    `
  }

  function sectionUserCss () {
    const s = Store.state.settings
    const css = String(s.userCss || '')
    return `
      <h1>Свой CSS для сайтов</h1>
      <p class="set-desc">Правила CSS применяются к страницам. Формат:
      <b>/* @all */</b> — для всех сайтов, <b>/* @example.com */</b> — только для example.com и его поддоменов.</p>


      ${group('CSS', [
        row('Правила', 'Максимум 50 000 символов. Сохраняется локально.',
          `<textarea class="set-area" id="usercss-text" rows="16" placeholder="/* @all */\nbody { font-family: Georgia, serif; }\n\n/* @youtube.com */\n#masthead { background: #222; }">${esc(css)}</textarea>
           <div class="set-hint" id="usercss-hint">${css.length} / 50000</div>`, 'sr-control--grow'),
        row('Сбросить', 'Удалить все правила',
          `<button class="btn mini danger" id="usercss-reset">Сбросить</button>`)
      ].join(''))}
    `
  }

  function sectionHotkeys () {
    const hk = Store.state.settings.hotkeys || {}
    const cmds = [
      ['tab:new', 'Новая вкладка'],
      ['tab:private', 'Приватная вкладка'],
      ['tab:close', 'Закрыть вкладку'],
      ['page:reload', 'Обновить страницу'],
      ['omni:focus', 'Перейти в адресную строку'],
      ['page:find', 'Найти на странице'],
      ['tab:bookmark', 'В закладки'],
      ['panel:history', 'История'],
      ['panel:downloads', 'Загрузки'],
      ['panel:toggle', 'Боковая панель'],
      ['settings', 'Настройки'],
      ['zoom:in', 'Увеличить'],
      ['zoom:out', 'Уменьшить'],
      ['zoom:reset', 'Сброс масштаба'],
      ['nav:back', 'Назад'],
      ['nav:fwd', 'Вперёд'],
      ['menu', 'Меню Vio'],
      ['zen', 'Дзен-режим'],
      ['quick:open', 'Quick Commands']
    ]
    return `
      <h1>Свои горячие клавиши</h1>
      <p class="set-desc">Назначьте свои комбинации. Формат: <b>Ctrl+Shift+X</b>, <b>Alt+J</b>, <b>Ctrl+K</b>.
      Пустое поле = стандартная комбинация.</p>


      ${group('Комбинации', cmds.map(([cmd, label]) => `
        <div class="engine-row">
          <div class="er-main">
            <div class="er-name">${esc(label)}</div>
            <div class="er-url" style="color:var(--text-3);font-size:11px">${esc(cmd)}</div>
          </div>
          <input class="set-input" data-hk="${esc(cmd)}" value="${esc(hk[cmd] || '')}" placeholder="Ctrl+..." style="min-width:140px">
        </div>`).join(''))}


      ${group('Сброс', [
        row('Удалить все свои комбинации', '',
          `<button class="btn mini danger" id="hotkeys-reset">Сбросить все</button>`)
      ].join(''))}
    `
  }

  function sectionAuto () {
    let list = []
    try { list = (window.VioAuto && VioAuto.suggestions()) || [] } catch (e) {}
    return `
      <h1>Автоматизация</h1>
      <p class="set-desc">Vio замечает повторяющиеся команды. Когда одна и та же последовательность встречается 3+ раз — она появляется здесь.</p>
      ${group('Найденные повторы', list.length ? list.map(s => `
        <div class="engine-row">
          <div class="er-main">
            <div class="er-name">Повторено ${s.count} раз</div>
            <div class="er-url">${esc(s.preview || '')}</div>
          </div>
        </div>`).join('') : '<div class="set-desc">Пока пусто. Работайте с агентом — Vio найдёт повторы.</div>')}
      ${group('Управление', [
        row('Очистить историю', '', '<button class="btn mini danger" id="auto-clear">Очистить</button>')
      ].join(''))}
    `
  }


  function sectionPerson () {
    let tops = [], qCount = 0, style = '', level = ''
    try {
      if (window.VioPerson) {
        tops = VioPerson.getTopDomains(8) || []
        style = VioPerson.getStyleHint() || ''
        level = VioPerson.getLevelHint() || ''
      }
      try { qCount = (JSON.parse(localStorage.getItem('vio.person.queries.v1') || '[]')).length } catch (e) {}
    } catch (e) {}
    return `
      <h1>Личный контекст</h1>
      <p class="set-desc">Vio наблюдает за запросами и сайтами, чтобы подстраивать стиль. Локально, без облака.</p>
      ${group('Что ИИ знает', [
        row('Запросов запомнено', '', '<span class="set-note">' + qCount + '</span>'),
        row('Стиль ответа', '', '<span class="set-note">' + (style || 'нейтральный') + '</span>'),
        row('Уровень', '', '<span class="set-note">' + (level || 'не определён') + '</span>')
      ].join(''))}
      ${group('Частые сайты', tops.length ? tops.map(d => `<div class="engine-row"><div class="er-main"><div class="er-name">${esc(d)}</div></div></div>`).join('') : '<div class="set-desc">Пока пусто.</div>')}
      ${group('Управление', [
        row('Очистить наблюдения', '', '<button class="btn mini danger" id="person-clear">Очистить</button>')
      ].join(''))}
    `
  }


  function sectionAbout () {
    const R = (typeof Region !== 'undefined' && Region.get && Region.get()) || null
    const region = R ? (R.country + (R.city ? ' · ' + R.city : '') + ' · ' + R.langName) : '—'
    return `
      <h1>О Vio</h1>
      <p class="set-desc">Vio — настольный браузер для работы: быстрый старт, предсказуемое поведение и никакой
        телеметрии. Служебные запросы Chromium (метрики, автообновления, отчёты о сбоях, проверки Google)
        отключены на уровне запуска и сети — браузер не отправляет ничего, пока вы сами не откроете сайт.</p>
      <p class="set-desc">Встроенный ИИ работает без ключа и регистрации: отвечает по содержимому текущей страницы,
        выполняет действия в ней — заполняет формы, проходит текстовые капчи, озвучивает ответы и слушает вас
        в микрофон. История, закладки, настройки и ключи хранятся только на этом устройстве.</p>
      <div class="set-card">
        <div class="about">
          ${LOGO(76)}
          <h2>Vio</h2>
          <div class="ver" id="about-ver">загрузка…</div>
          <div class="about-grid">
            <div class="about-card"><b>Приватность</b><span>Телеметрия Chromium отключена</span></div>
            <div class="about-card"><b>Регион</b><span>${esc(region)}</span></div>
            <div class="about-card"><b>Данные</b><span>Только на вашем устройстве</span></div>
            <div class="about-card"><b>Лицензия</b><span>MIT / свободное ПО</span></div>
          </div>
          <details class="about-flags">
            <summary>Что именно отключено</summary>
            <div class="about-flags-body" id="about-flags-body">загрузка…</div>
          </details>
          <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn" id="about-ext">${ICON('external')} Сайт проекта</button>
          </div>
        </div>
      </div>`
  }

  /* ---- обработчики ---- */
  function wire (root) {
    root.querySelectorAll('[data-seg]').forEach(el => {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button')
        if (!b) return
        Store.state.settings[el.dataset.seg] = isNaN(+b.dataset.val) ? b.dataset.val : +b.dataset.val
        Store.saveSettings()
        if (el.dataset.seg === 'tabPos') App.syncTabPosition()
        renderSettings()
      })
    })

    root.querySelectorAll('[data-switch]').forEach(el => {
      const key = el.dataset.switch
      el.querySelector('input').addEventListener('change', (e) => {
        Store.state.settings[key] = e.target.checked
        Store.saveSettings()
        if (key === 'bookmarksBar') App.renderBookmarksBar()
        if (key === 'rail') App.syncRail()
        renderSettings()
      })
    })

    root.querySelectorAll('[data-range]').forEach(el => {
      const key = el.dataset.range
      const dec = (String(el.step || 1).split('.')[1] || '').length
      el.addEventListener('input', () => {
        Store.state.settings[key] = +((+el.value).toFixed(dec))
        Store.saveSettings()
        if (key === 'panelW') App.applyPanelWidth()
      })
      el.addEventListener('change', () => renderSettings())
    })

    root.querySelectorAll('[data-select]').forEach(el => {
      el.addEventListener('change', () => {
        Store.state.settings[el.dataset.select] = el.value
        Store.saveSettings()
        /* смена региона/языка — сразу пересчитать язык интерфейса */
        try {
          if ((el.dataset.select === 'lang' || el.dataset.select === 'region') && window.I18n) I18n.refresh()
        } catch (e) {}
        renderSettings()
      })
    })

    /* все выпадающие списки настроек — кастомные, как выбор поисковой системы */
    root.querySelectorAll('select').forEach(el => {
      if (el.id === 'imp-browser') return /* импорт: оставить настоящим <select> для VioImport */
      const key = el.dataset.select || el.id || ''
      const opts = []
      for (let i = 0; i < el.options.length; i++) {
        opts.push({ v: el.options[i].value, t: el.options[i].textContent, on: el.options[i].value === el.value })
      }
      const cur = opts.filter(o => o.on)[0] || opts[0] || { v: '', t: '—' }
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'sel-btn'
      btn.setAttribute('data-select', key)
      btn.value = cur.v
      btn.title = cur.t
      btn.innerHTML = `<span class="sel-val">${esc(cur.t)}</span>${ICON('chevron')}`
      el.replaceWith(btn)
      const __transient = !el.dataset.select
      let downOpen = false
      btn.addEventListener('mousedown', () => { downOpen = !!document.querySelector('.sel-pop') })
      btn.addEventListener('click', () => {
        const host = document.getElementById('menu-root')
        if (!host) return
        if (downOpen) { host.innerHTML = ''; downOpen = false; return }
        host.innerHTML = ''
        const r = btn.getBoundingClientRect()
        const box = document.createElement('div')
        box.className = 'dropdown menu-pop sel-pop'
        box.innerHTML = opts.map(o =>
          `<button class="menu-item ${o.on ? 'on' : ''}" data-v="${esc(o.v)}">
            ${o.on ? ICON('check') : '<span style="width:16px"></span>'}
            <span class="mi-label">${esc(o.t)}</span></button>`).join('')
        host.appendChild(box)
        box.style.position = 'fixed'
        box.style.minWidth = Math.max(170, Math.round(r.width)) + 'px'
        box.style.top = Math.min(r.bottom + 6, window.innerHeight - box.offsetHeight - 10) + 'px'
        box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - box.offsetWidth - 8)) + 'px'
        box.addEventListener('click', (e) => {
          const b = e.target.closest('[data-v]')
          if (!b) return
          if (key && Store.state.settings[key] !== undefined) Store.state.settings[key] = b.dataset.v
          Store.saveSettings()
          host.innerHTML = ''
          try {
                      if (!__transient && (key === 'lang' || key === 'region') && window.I18n) I18n.refresh()
          if (__transient) {
            const valEl = btn.querySelector('.sel-val')
            if (valEl) valEl.textContent = b.textContent.trim()
            try { btn.value = b.dataset.v } catch (e) {}
            try {
              const orig = document.querySelector('#' + el.id)
              if (orig) { orig.value = b.dataset.v; orig.dispatchEvent(new Event('change', { bubbles: true })) }
              else { btn.dispatchEvent(new Event('change', { bubbles: true })) }
            } catch (e) {}
          }
          } catch (err) {}
          renderSettings()
        })
      })
    })

    root.querySelectorAll('[data-accent]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.accent
        if (id === 'custom') {
          $('#accent-custom').click()
          return
        }
        Store.state.settings.accent = id
        Store.state.settings.accentCustom = ''
        Store.saveSettings(); renderSettings(); App.rerenderPages()
      })
    })
    const ac = root.querySelector('#accent-custom')
    if (ac) ac.addEventListener('input', () => {
      Store.state.settings.accentCustom = ac.value
      Store.state.settings.accent = 'custom'
      Store.saveSettings(); App.rerenderPages()
    })
    root.querySelectorAll('[data-accent2]').forEach(el => {
      el.addEventListener('click', () => {
        Store.state.settings.accent2Custom = el.dataset.accent2
        Store.saveSettings(); renderSettings(); App.rerenderPages()
      })
    })
    const ac2 = root.querySelector('#accent2-custom')
    if (ac2) ac2.addEventListener('input', () => {
      Store.state.settings.accent2Custom = ac2.value
      Store.saveSettings(); App.rerenderPages()
    })

    root.querySelectorAll('[data-wall]').forEach(el => {
      el.addEventListener('click', () => {
        Store.state.settings.wall = el.dataset.wall
        Store.saveSettings(); renderSettings(); App.rerenderPages()
      })
    })

    root.querySelectorAll('[data-eng-toggle]').forEach(el => {
      el.addEventListener('change', () => {
        const id = el.dataset.engToggle
        const set = new Set(Store.state.settings.enabledEngines)
        el.checked ? set.add(id) : set.delete(id)
        if (!set.size) set.add(Store.engine().id)
        Store.state.settings.enabledEngines = [...set]
        Store.saveSettings(); App.rerenderPages()
      })
    })

    root.querySelectorAll('[data-eng-del]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.engDel
        Store.state.settings.customEngines = Store.state.settings.customEngines.filter(c => c.id !== id)
        Store.state.settings.enabledEngines = Store.state.settings.enabledEngines.filter(x => x !== id)
        if (Store.state.settings.engine === id) Store.state.settings.engine = 'google'
        Store.saveSettings(); renderSettings(); App.rerenderPages()
        toast('Поисковая система удалена')
      })
    })

    const engAdd = root.querySelector('#eng-add')
    if (engAdd) engAdd.addEventListener('click', () => {
      App.dialog('Новая поисковая система', [
        { key: 'title', label: 'Название', placeholder: 'Мой поиск' },
        { key: 'url', label: 'URL с запросом %s', placeholder: 'https://example.com/search?q=%s' }
      ], 'Добавить').then(v => {
        if (!v || !v.title || !v.url) return
        const id = 'c' + Date.now().toString(36)
        const url = v.url.includes('%s') ? v.url : v.url + (v.url.includes('?') ? '&' : '?') + 'q=%s'
        Store.state.settings.customEngines.push({ id, name: v.title, url, color: '#7C8B7E', letter: v.title[0].toUpperCase() })
        Store.state.settings.enabledEngines.push(id)
        Store.saveSettings(); renderSettings(); App.rerenderPages()
        toast('Поисковая система добавлена')
      })
    })

    /* перед установкой — скан манифеста: список опасных разрешений подтверждаем вручную */
    async function confirmExt (p) {
      try {
        const scan = await vio.extScan(p)
        if (!scan || scan.ok !== true) throw new Error((scan && scan.error) || 'Не удалось проверить manifest.json')
        const warns = (scan && scan.warnings) || []
        if (!warns.length) return true
        const v = await App.dialog('Расширение запрашивает опасные разрешения', [
          { key: 'w', label: 'Что запросит расширение', value: warns.join('\n'), multiline: true, rows: Math.max(2, Math.min(8, warns.length + 1)) }
        ], 'Всё равно установить')
        return !!v
      } catch (e) {
        toast('Не удалось проверить расширение: ' + String((e && e.message) || e).slice(0, 100))
        return false
      }
    }

    async function addExtension (p) {
      if (!p) return false
      const list = Store.state.settings.extensions || []
      const normalizePath = (value) => {
        const normalized = String(value || '').replace(/[\\/]+$/, '')
        return vio.platform === 'win32' ? normalized.toLowerCase() : normalized
      }
      if (list.some(item => normalizePath(item.path) === normalizePath(p))) {
        toast('Это расширение уже добавлено')
        return false
      }
      list.push({ path: p, id: '', name: String(p).split(/[\\/]/).pop(), version: '', enabled: true })
      Store.state.settings.extensions = list
      Store.saveSettings()
      await syncExtensions()
      renderSettings()
      toast('Расширение установлено')
      return true
    }
    const extAdd = root.querySelector('#ext-add')
    if (extAdd) extAdd.addEventListener('click', async () => {
      try {
        const p = await vio.extPick()
        if (!p) return
        if (!(await confirmExt(p))) return
        await addExtension(p)
      } catch (e) {
        toast('Не удалось установить: ' + String((e && e.message) || e).slice(0, 120))
      }
    })
    /* drag&drop .crx/.zip прямо в настройки */
    const extDrop = root.querySelector('#ext-drop')
    if (extDrop) {
      const hi = (on) => { extDrop.classList.toggle('over', !!on) }
      extDrop.addEventListener('dragover', (e) => { e.preventDefault(); hi(true) })
      extDrop.addEventListener('dragleave', () => hi(false))
      extDrop.addEventListener('drop', async (e) => {
        e.preventDefault(); hi(false)
        try {
          const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
          const p = f ? (vio.pathForFile ? vio.pathForFile(f) : (f.path || '')) : ''
          if (!p) { toast('Не удалось определить путь к файлу'); return }
          const ok = await vio.extPath(p)
          if (!ok) return
          if (!(await confirmExt(ok))) return
          await addExtension(ok)
        } catch (err) {
          toast('Не удалось установить: ' + String((err && err.message) || err).slice(0, 120))
        }
      })
    }
    root.querySelectorAll('[data-ext-toggle]').forEach(el => el.addEventListener('change', async () => {
      const list = Store.state.settings.extensions || []
      const it = list[+el.dataset.extToggle]
      if (!it) return
      it.enabled = el.checked
      Store.saveSettings()
      await syncExtensions()
      renderSettings()
    }))
    root.querySelectorAll('[data-ext-del]').forEach(el => el.addEventListener('click', async () => {
      const list = Store.state.settings.extensions || []
      list.splice(+el.dataset.extDel, 1)
      Store.state.settings.extensions = list
      Store.saveSettings()
      await syncExtensions()
      renderSettings()
      toast('Расширение убрано из списка')
    }))
    const extFilter = root.querySelector('#ext-filter')
    if (extFilter) extFilter.addEventListener('input', () => {
      const query = extFilter.value.trim().toLowerCase()
      root.querySelectorAll('.ext-item').forEach(item => {
        item.hidden = !!query && !item.dataset.search.includes(query)
      })
    })

    const aiClear = root.querySelector('#ai-clear')
    if (aiClear) aiClear.addEventListener('click', () => {
      AI.clearAll(true); renderSettings()
      toast('История ИИ-чатов очищена')
    })

    /* --- ИИ: базовый промпт --- */
    const A = (window.AI && AI.settings) ? AI.settings : null
    const ap = root.querySelector('#ai-prompt')
    if (ap) {
      const hint = root.querySelector('#ai-prompt-hint')
      const store = () => {
        const clean = A ? A.cleanPrompt(ap.value) : String(ap.value).slice(0, 3000)
        Store.state.settings.aiPrompt = clean
        Store.saveSettings()
        if (hint) hint.textContent = clean.length + ' / 3000'
      }
      ap.addEventListener('input', store)
      ap.addEventListener('blur', () => {
        const clean = A ? A.cleanPrompt(ap.value) : ap.value
        if (clean !== ap.value) ap.value = clean
        store()
      })
    }
    const apReset = root.querySelector('#ai-prompt-reset')
    if (apReset) apReset.addEventListener('click', () => {
      Store.state.settings.aiPrompt = ''
      Store.state.settings.aiStyle = 'default'
      Store.saveSettings()
      renderSettings()
      toast('Промпт и стиль сброшены')
    })

    /* --- ИИ: свой эндпоинт (адрес, ключ, модель) --- */
    const urlHint = root.querySelector('#ai-url-hint')
    const urlOk = () => {
      if (!urlHint) return
      const v = String(Store.state.settings.aiBaseUrl || '').trim()
      if (!v) { urlHint.textContent = 'адрес не задан — ИИ вернётся на бесплатные провайдеры'; urlHint.classList.remove('bad') }
      else if (/^https?:\/\/[^\s]+$/i.test(v)) { urlHint.textContent = 'адрес выглядит верно'; urlHint.classList.remove('bad') }
      else { urlHint.textContent = 'нужен полный адрес, начинающийся с http:// или https://'; urlHint.classList.add('bad') }
    }
    urlOk()
    const bindAI = (sel, key, clean) => {
      const el = root.querySelector(sel)
      if (!el) return
      el.addEventListener('input', () => {
        const v = clean(el.value)
        Store.state.settings[key] = v
        Store.saveSettings()
        if (key === 'aiBaseUrl') urlOk()
      })
    }
    bindAI('#ai-baseurl', 'aiBaseUrl', (v) => String(v).replace(/[\u0000-\u001F]/g, '').slice(0, 400))
    bindAI('#ai-apikey', 'aiApiKey', (v) => (A ? A.cleanKey(v) : v))
    bindAI('#ai-model', 'aiModel', (v) => (A ? A.cleanModel(v) : v))
    bindAI('#ai-gemini', 'aiGeminiKey', (v) => (A ? A.cleanKey(v) : v))
    bindAI('#ai-groq', 'aiGroqKey', (v) => (A ? A.cleanKey(v) : v))

    const dialClear = root.querySelector('#dial-clear')
    if (dialClear) dialClear.addEventListener('click', () => {
      Store.state.dial = []; Store.saveDial(); renderSettings(); App.rerenderPages()
      toast('Быстрый доступ очищен')
    })

    root.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', () => renderSettings(el.dataset.goto))
    })

    root.querySelectorAll('[data-clear]').forEach(el => {
      el.addEventListener('click', () => {
        const what = el.dataset.clear
        const names = { history: 'историю', bookmarks: 'закладки', cookies: 'куки и хранилище', cache: 'кэш' }
        App.dialog('Очистить ' + names[what] + '?', [{ key: 'x', label: 'Для подтверждения введите: да', placeholder: 'да', hidden: true }], 'Очистить', true)
          .then(async (v) => {
            if (!v) return
            if (what === 'history') Store.clearHistory()
            else if (what === 'bookmarks') Store.clearBookmarks()
            else await vio.clearData(what)
            App.rerenderPages()
            toast('Готово: ' + names[what] + ' очищены')
          })
      })
    })

    const p1 = root.querySelector('#priv-reset')
    ;[p1].forEach(b => b && b.addEventListener('click', async () => {
      await vio.clearPrivate()
      App.clearPrivateLists()
      toast('Данные приватного режима сброшены')
    }))

    const ext = root.querySelector('#about-ext')
    if (ext) ext.addEventListener('click', () => vio.openExternal('https://github.com'))

    const ver = root.querySelector('#about-ver')
    if (ver) vio.version().then(v => {
      ver.textContent = `Vio 1.0 · Electron ${v.electron} · Chromium ${v.chrome} · ${v.platform}`
    })

    const fb = root.querySelector('#about-flags-body')
    if (fb && vio.flagList) vio.flagList().then(f => {
      fb.innerHTML =
        '<b>Флаги запуска Chromium</b><pre>' + esc((f.switches || []).map(x => '--' + x).join('\n')) + '</pre>' +
        '<b>Заблокированные хосты телеметрии</b><pre>' + esc((f.hosts || []).join('\n')) + '</pre>' +
        '<p>Флаги ставятся до старта сессии, хосты режутся на уровне сети в обеих сессиях. Подробности — в README репозитория.</p>'
    }).catch(() => { fb.textContent = 'Список недоступен' })

    if (section === 'mind') {
      const en = root.querySelector('#mind-enable')
      if (en) en.addEventListener('click', async () => {
        const ok = await App.dialog(
          'Включить память браузера?',
          [{ key: 'x', label: 'Vio будет сохранять текст страниц ЛОКАЛЬНО на этом устройстве. Приватные вкладки не сохраняются. Ничего не уходит в интернет. Можно выключить и удалить в любой момент.' }],
          'Включить'
        )
        if (!ok) return
        localStorage.setItem('vio.mind.consent', '1')
        Store.state.settings.mindOn = true
        Store.saveSettings()
        renderSettings('mind')
      })


      const wipe = root.querySelector('#mind-wipe')
      if (wipe) wipe.addEventListener('click', async () => {
        const ok = await App.dialog('Удалить ВСЮ память?', 
          [{ key: 'x', label: 'Все сохранённые страницы будут стёрты навсегда. Отменить нельзя.' }], 
          'Удалить', true)
        if (!ok) return
        try {
          // export empty import to wipe
          const all = await vio.mind.export()
          if (all && all.length) {
            // Save ids, delete via clearOlder(0) won't work — need direct
            // Simpler: clear older than 0 days = clear all
            await vio.mind.clearOlder(0)
          }
        } catch (e) {}
        App.toast('Память стёрта')
        renderSettings('mind')
      })

      ;(async () => {
        try {
          const st = await vio.mind.stats()
          const el = root.querySelector('#mind-stats')
          if (el) el.textContent = (st.count || 0) + ' страниц'
        } catch (e) {}
      })()
      const gb = root.querySelector('#mind-graph')
      if (gb) gb.addEventListener('click', async () => {
        gb.disabled = true; gb.textContent = 'Строю…'
        try {
          const g = await vio.mind.graph()
          const out = root.querySelector('#mind-graph-out')
          if (out) {
            const lines = g.edges.slice(0, 50).map(e => {
              const a = g.pages[e.a] || {}, b = g.pages[e.b] || {}
              return '🔗 ' + String(a.title || a.url || '').slice(0, 40) + ' ↔ ' + String(b.title || b.url || '').slice(0, 40)
            })
            out.innerHTML = '<b>' + g.pages.length + ' стр., ' + g.edges.length + ' связей</b><br><br>' + lines.join('<br>')
          }
        } catch (e) { App.toast('Ошибка: ' + (e.message || e)) }
        gb.disabled = false; gb.textContent = 'Построить'
      })
      const cb = root.querySelector('#mind-clear')
      if (cb) cb.addEventListener('click', async () => {
        const n = await vio.mind.clearOlder(30)
        App.toast('Удалено: ' + n)
        renderSettings('mind')
      })
      const eb = root.querySelector('#mind-export')
      if (eb) eb.addEventListener('click', async () => {
        const items = await vio.mind.export()
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'vio-mind-' + Date.now() + '.json'
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      })
      const ii = root.querySelector('#mind-import')
      const ib = root.querySelector('#mind-import-btn')
      if (ib && ii) {
        ib.addEventListener('click', () => ii.click())
        ii.addEventListener('change', async () => {
          const f = ii.files[0]
          if (!f) return
          try {
            const items = JSON.parse(await f.text())
            const n = await vio.mind.import(items)
            App.toast('Импортировано: ' + n)
            renderSettings('mind')
          } catch (e) { App.toast('Ошибка импорта') }
        })
      }
    }
  }

  function toast (msg, icon) { App.toast(msg, icon) }
  function esc (s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

  window.Pages = { renderHome, renderSettings }
})()
