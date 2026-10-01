/* Поисковые системы Vio */
(function () {
  const ENGINES = [
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', color: '#4285F4', letter: 'G', suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&q=%s' },
    { id: 'yandex', name: 'Yandex', url: 'https://yandex.ru/search/?text=%s', color: '#FC3F1D', letter: 'Y', suggest: 'https://suggest.yandex.ru/suggest-ya.cgi?srv=ys&part=%s' },
    { id: 'bing', name: 'Microsoft Bing', url: 'https://www.bing.com/search?q=%s', color: '#0C8CE9', letter: 'b', suggest: '' },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', color: '#DE5833', letter: 'D', suggest: 'https://duckduckgo.com/ac/?q=%s&type=list' },
    { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=%s', color: '#FF5A1F', letter: 'B', suggest: '' },
    { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=%s', color: '#6677FF', letter: 'S', suggest: '' },
    { id: 'seznamb', name: 'Seznam', url: 'https://search.seznam.cz/?text=%s', color: '#39A900', letter: 'S', suggest: '' },
    { id: 'mojeek', name: 'Mojeek', url: 'https://www.mojeek.com/search?q=%s', color: '#F5A623', letter: 'M', suggest: '' },
    { id: 'wikipedia', name: 'Wikipedia', url: 'https://ru.wikipedia.org/w/index.php?search=%s', color: '#3366CC', letter: 'W', suggest: '' },
    { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=%s', color: '#181717', letter: 'G', suggest: '' },
    { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', color: '#FF0000', letter: '▶', suggest: '' },
    { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=%s', color: '#F48024', letter: 'Q', suggest: '' },
    { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s', color: '#2932E1', letter: 'B', suggest: '' },
    { id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s', color: '#3388FF', letter: 'E', suggest: '' },
    { id: 'qwant', name: 'Qwant', url: 'https://www.qwant.com/?q=%s', color: '#FF6666', letter: 'Q', suggest: '' },
    { id: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search?p=%s', color: '#7B0099', letter: 'Y', suggest: '' },
    { id: 'naver', name: 'Naver', url: 'https://search.naver.com/search.naver?query=%s', color: '#03C75A', letter: 'N', suggest: '' }
  ]

  const T = 'font-family:\'Segoe UI\',Arial,sans-serif;font-weight:700'

  const LOGO = {
    google: `<img class="eng-logo" src="assets/Google.png" alt="Google">`,
    yandex: `<img class="eng-logo" src="assets/Yandex.png" alt="Yandex">`,
    bing: `<img class="eng-logo" src="assets/Microsoft Bing.png" alt="Microsoft Bing">`,
    duckduckgo: `<img class="eng-logo" src="assets/DuckDuckGo.png" alt="DuckDuckGo">`,
    wikipedia: `<img class="eng-logo" src="assets/Wikipedia.png" alt="Wikipedia">`,
    youtube: `<img class="eng-logo" src="assets/YouTube.png" alt="YouTube">`,

    brave: `<svg class="eng-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FB542B" d="M12 1.6l8.8 3.1v6.4c0 5.3-3.6 9.2-8.8 11-5.2-1.8-8.8-5.7-8.8-11V4.7z"/>
      <path fill="#fff" d="M8.3 7.4l2 .7-.5 2.2-2.2-.9zM15.7 7.4l-2 .7.5 2.2 2.2-.9z"/>
      <path fill="#fff" d="M7.6 12.1h8.8l-1.2 3.4L12 17.2l-3.2-1.7z"/>
      <path fill="#FB542B" d="M10.6 13.2h2.8l-.5 1.6h-1.8z"/>
    </svg>`,

    startpage: `<svg class="eng-logo" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="17.5" text-anchor="middle" style="${T}" font-size="17" fill="#6677FF">S</text>
    </svg>`,

    seznamb: `<svg class="eng-logo" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="17.5" text-anchor="middle" style="${T}" font-size="17" fill="#2E9E1F">S</text>
    </svg>`,

    mojeek: `<svg class="eng-logo" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="17.5" text-anchor="middle" style="${T}" font-size="17" fill="#E08A0B">M</text>
    </svg>`,

    stackoverflow: `<svg class="eng-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#BCBFC5" d="M7.1 14.6l7.7 1.6.4-1.9-7.7-1.6zM7.5 10.9l7.3 2.3.7-1.9-7.3-2.3zM8.5 7.3l6.6 3 1-1.8-6.6-3zM10.3 3.6l5.4 3.8 1.3-1.8-5.4-3.8z"/>
      <path fill="#F48024" d="M18.6 20.8H6.4v-4.7h2v2.8h8.2v-2.8h2z"/>
    </svg>`
  }

  function byId (list, id) { return list.find(e => e.id === id) || list[0] }

  /* страна (ISO-3166 alpha-2) → поисковик по умолчанию для режима «auto» */
  const DEFAULT_FOR = {
    RU: 'yandex',
    BY: 'yandex',
    KZ: 'yandex',
    CZ: 'seznamb',
    CN: 'baidu',
    TW: 'yahoo',
    JP: 'google',
    KR: 'google'
  }

  function defaultFor (code) {
    const id = code && DEFAULT_FOR[String(code).toUpperCase()]
    return id || 'google'
  }

  function mark (e) {
    return LOGO[e.id] ? `<span class="mark mark-img">${LOGO[e.id]}</span>` : `<span class="mark" style="background:${e.color}">${(e.letter || e.name[0]).toUpperCase()}</span>`
  }

  function logo (e) {
    return LOGO[e.id] || mark(e)
  }

  function build (engine, query) {
    let url = engine.url.replace('%s', encodeURIComponent(query))
    try {
      /* регион и язык пользователя — параметры выдачи (без трекинга, только локаль) */
      const R = (window.Region && Region.get && Region.get()) || null
      if (R && R.code && engine.id === 'google') {
        url += (url.indexOf('?') > -1 ? '&' : '?') + 'hl=' + encodeURIComponent(R.lang) + '&gl=' + encodeURIComponent(R.code)
      } else if (R && engine.id === 'duckduckgo' && /^[a-z]{2}$/.test(R.lang)) {
        url += (url.indexOf('?') > -1 ? '&' : '?') + 'kl=' + encodeURIComponent((R.lang + '-' + (R.code || 'us')).toLowerCase())
      } else if (R && engine.id === 'wikipedia' && /^[a-z]{2}$/.test(R.lang)) {
        url = url.replace('ru.wikipedia.org', R.lang + '.wikipedia.org')
      }
    } catch (e) {}
    return url
  }

  window.ENGINES = ENGINES
  window.Engine = { byId, mark, logo, build, defaultFor }
})()
