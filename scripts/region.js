/* Регион и язык пользователя.
   Работает без сети: часовой пояс (Intl) + локаль браузера. Ничего не отправляется наружу. */
;(function () {
  /* часовой пояс → [код страны, город для погоды] */
  const TZ = {
    'Europe/Moscow': ['RU', 'Москва'], 'Europe/Kaliningrad': ['RU', 'Калининград'],
    'Europe/Samara': ['RU', 'Самара'], 'Asia/Yekaterinburg': ['RU', 'Екатеринбург'],
    'Asia/Novosibirsk': ['RU', 'Новосибирск'], 'Asia/Krasnoyarsk': ['RU', 'Красноярск'],
    'Asia/Irkutsk': ['RU', 'Иркутск'], 'Asia/Yakutsk': ['RU', 'Якутск'],
    'Asia/Vladivostok': ['RU', 'Владивосток'], 'Asia/Magadan': ['RU', 'Магадан'],
    'Asia/Kamchatka': ['RU', 'Петропавловск-Камчатский'], 'Asia/Sakhalin': ['RU', 'Холмск'],
    'Europe/Kiev': ['UA', 'Киев'], 'Europe/Kyiv': ['UA', 'Киев'],
    'Europe/Minsk': ['BY', 'Минск'],
    'Asia/Almaty': ['KZ', 'Алматы'], 'Asia/Aqtobe': ['KZ', 'Актобе'],
    'Asia/Atyrau': ['KZ', 'Атырау'], 'Asia/Karaganda': ['KZ', 'Караганда'],
    'Asia/Oral': ['KZ', 'Орал'], 'Asia/Qyzylorda': ['KZ', 'Кызылорда'],
    'Asia/Shymkent': ['KZ', 'Шымкент'], 'Asia/Uralsk': ['KZ', 'Уральск'],
    'Europe/London': ['GB', 'Лондон'], 'Europe/Dublin': ['IE', 'Дублин'],
    'Europe/Lisbon': ['PT', 'Лиссабон'], 'Europe/Madrid': ['ES', 'Мадрид'],
    'Atlantic/Canary': ['ES', 'Лас-Пальмас'], 'Europe/Paris': ['FR', 'Париж'],
    'Europe/Brussels': ['BE', 'Брюссель'], 'Europe/Amsterdam': ['NL', 'Амстердам'],
    'Europe/Berlin': ['DE', 'Берлин'], 'Europe/Vienna': ['AT', 'Вена'],
    'Europe/Zurich': ['CH', 'Цюрих'], 'Europe/Rome': ['IT', 'Рим'],
    'Europe/Warsaw': ['PL', 'Варшава'], 'Europe/Prague': ['CZ', 'Прага'],
    'Europe/Budapest': ['HU', 'Будапешт'], 'Europe/Bucharest': ['RO', 'Бухарест'],
    'Europe/Sofia': ['BG', 'София'], 'Europe/Athens': ['GR', 'Афины'],
    'Europe/Istanbul': ['TR', 'Стамбул'],
    'Europe/Helsinki': ['FI', 'Хельсинки'], 'Europe/Stockholm': ['SE', 'Стокгольм'],
    'Europe/Oslo': ['NO', 'Осло'], 'Europe/Copenhagen': ['DK', 'Копенгаген'],
    'Europe/Riga': ['LV', 'Рига'], 'Europe/Tallinn': ['EE', 'Таллин'],
    'Europe/Vilnius': ['LT', 'Вильнюс'], 'Europe/Chisinau': ['MD', 'Кишинёв'],
    'Asia/Tbilisi': ['GE', 'Тбилиси'], 'Asia/Yerevan': ['AM', 'Ереван'],
    'Asia/Baku': ['AZ', 'Баку'], 'Asia/Tashkent': ['UZ', 'Ташкент'],
    'Asia/Dushanbe': ['TJ', 'Душанбе'], 'Asia/Bishkek': ['KG', 'Бишкек'],
    'Asia/Ashgabat': ['TM', 'Ашхабад'],
    'Asia/Jerusalem': ['IL', 'Тель-Авив'], 'Asia/Dubai': ['AE', 'Дубай'],
    'Asia/Riyadh': ['SA', 'Эр-Рияд'], 'Asia/Karachi': ['PK', 'Карачи'],
    'Asia/Kolkata': ['IN', 'Дели'], 'Asia/Calcutta': ['IN', 'Дели'],
    'Asia/Dhaka': ['BD', 'Дакка'], 'Asia/Kathmandu': ['NP', 'Катманду'],
    'Asia/Shanghai': ['CN', 'Пекин'], 'Asia/Chongqing': ['CN', 'Чунцин'],
    'Asia/Urumqi': ['CN', 'Урумчи'], 'Asia/Harbin': ['CN', 'Харбин'],
    'Asia/Hong_Kong': ['HK', 'Гонконг'], 'Asia/Macau': ['MO', 'Макао'],
    'Asia/Taipei': ['TW', 'Тайбэй'], 'Asia/Tokyo': ['JP', 'Токио'],
    'Asia/Seoul': ['KR', 'Сеул'], 'Asia/Jakarta': ['ID', 'Джакарта'],
    'Asia/Makassar': ['ID', 'Макасар'], 'Asia/Bangkok': ['TH', 'Бангкок'],
    'Asia/Ho_Chi_Minh': ['VN', 'Хо Ши Мин'], 'Asia/Saigon': ['VN', 'Хо Ши Мин'],
    'Asia/Manila': ['PH', 'Манила'], 'Asia/Kuala_Lumpur': ['MY', 'Куала-Лумпур'],
    'Asia/Singapore': ['SG', 'Сингапур'], 'Australia/Sydney': ['AU', 'Сидней'],
    'Australia/Melbourne': ['AU', 'Мельбурн'], 'Australia/Perth': ['AU', 'Перт'],
    'Australia/Brisbane': ['AU', 'Брисбен'], 'Pacific/Auckland': ['NZ', 'Окленд'],
    'America/New_York': ['US', 'Нью-Йорк'], 'America/Detroit': ['US', 'Детройт'],
    'America/Chicago': ['US', 'Чикаго'], 'America/Denver': ['US', 'Денвер'],
    'America/Los_Angeles': ['US', 'Лос-Анджелес'], 'America/Phoenix': ['US', 'Финикс'],
    'America/Anchorage': ['US', 'Анкоридж'], 'Pacific/Honolulu': ['US', 'Гонолулу'],
    'America/Toronto': ['CA', 'Торонто'], 'America/Vancouver': ['CA', 'Ванкувер'],
    'America/Edmonton': ['CA', 'Эдмонтон'], 'America/Winnipeg': ['CA', 'Виннипег'],
    'America/Halifax': ['CA', 'Галифакс'], 'America/St_Johns': ['CA', 'Сент-Джонс'],
    'America/Mexico_City': ['MX', 'Мехико'], 'America/Bogota': ['CO', 'Богота'],
    'America/Lima': ['PE', 'Лима'], 'America/Santiago': ['CL', 'Сантьяго'],
    'America/Argentina/Buenos_Aires': ['AR', 'Буэнос-Айрес'], 'America/Sao_Paulo': ['BR', 'Сан-Паулу'],
    'America/Fortaleza': ['BR', 'Форталеза'], 'America/Rio_Branco': ['BR', 'Риу-Бранку'],
    'Africa/Cairo': ['EG', 'Каир'], 'Africa/Lagos': ['NG', 'Лагос'],
    'Africa/Nairobi': ['KE', 'Найроби'], 'Africa/Johannesburg': ['ZA', 'Йоханнесбург'],
    'Africa/Casablanca': ['MA', 'Касабланка'], 'Africa/Algiers': ['DZ', 'Алжир']
  }

  /* код страны → название по-русски */
  const COUNTRIES = {
    RU: 'Россия', UA: 'Украина', BY: 'Беларусь', KZ: 'Казахстан', UZ: 'Узбекистан',
    AM: 'Армения', GE: 'Грузия', AZ: 'Азербайджан', KG: 'Киргизия', TJ: 'Таджикистан',
    TM: 'Туркменистан', MD: 'Молдова', LV: 'Латвия', LT: 'Литва', EE: 'Эстония',
    US: 'США', CA: 'Канада', GB: 'Великобритания', IE: 'Ирландия', DE: 'Германия',
    FR: 'Франция', ES: 'Испания', IT: 'Италия', PT: 'Португалия', NL: 'Нидерланды',
    BE: 'Бельгия', AT: 'Австрия', CH: 'Швейцария', PL: 'Польша', CZ: 'Чехия',
    HU: 'Венгрия', RO: 'Румыния', BG: 'Болгария', GR: 'Греция', TR: 'Турция',
    FI: 'Финляндия', SE: 'Швеция', NO: 'Норвегия', DK: 'Дания',
    CN: 'Китай', JP: 'Япония', KR: 'Республика Корея', IN: 'Индия', PK: 'Пакистан',
    BD: 'Бангладеш', ID: 'Индонезия', TH: 'Таиланд', VN: 'Вьетнам', PH: 'Филиппины',
    MY: 'Малайзия', SG: 'Сингапур', HK: 'Гонконг', TW: 'Тайвань',
    AU: 'Австралия', NZ: 'Новая Зеландия', AE: 'ОАЭ', SA: 'Саудовская Аравия',
    IL: 'Израиль', EG: 'Египет', NG: 'Нигерия', KE: 'Кения', ZA: 'ЮАР',
    MX: 'Мексика', CO: 'Колумбия', PE: 'Перу', CL: 'Чили', AR: 'Аргентина', BR: 'Бразилия'
  }

  const LANGS = {
    ru: 'русский', en: 'английский', uk: 'украинский', kk: 'казахский',
    be: 'белорусский', de: 'немецкий', fr: 'французский', es: 'испанский',
    it: 'итальянский', pt: 'португальский', pl: 'польский', tr: 'турецкий',
    zh: 'китайский', ja: 'японский', ko: 'корейский', ar: 'арабский',
    hi: 'хинди', nl: 'голландский', sv: 'шведский', fi: 'финский',
    cs: 'чешский', ro: 'румынский', el: 'греческий', he: 'иврит'
  }

  /* язык по умолчанию на языке страны — для системного промпта ИИ */
  const NATIVE = {
    ru: 'русский', en: 'English', uk: 'українська', kk: 'қазақша', be: 'беларуская',
    de: 'Deutsch', fr: 'français', es: 'español', it: 'italiano', pt: 'português',
    pl: 'polski', tr: 'Türkçe', zh: '中文', ja: '日本語', ko: '한국어',
    ar: 'العربية', hi: 'हिन्दी', nl: 'Nederlands', sv: 'svenska', fi: 'suomi',
    cs: 'čeština', ro: 'română', el: 'ελληνικά', he: 'עברית'
  }

  /* страна → язык интерфейса и ответов ИИ по умолчанию.
     Если страны нет в списке — берётся язык локали браузера. */
  const COUNTRY_LANG = {
    UA: 'uk', RU: 'ru', BY: 'be', KZ: 'kk', MD: 'ro',
    US: 'en', GB: 'en', IE: 'en', CA: 'en', AU: 'en', NZ: 'en',
    IN: 'hi', DE: 'de', AT: 'de', FR: 'fr', ES: 'es', IT: 'it',
    PT: 'pt', PL: 'pl', TR: 'tr', CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
    JP: 'ja', KR: 'ko', NL: 'nl', SE: 'sv', FI: 'fi', CZ: 'cs',
    GR: 'el', IL: 'he', SA: 'ar', AE: 'ar', EG: 'ar', DZ: 'ar', MA: 'ar'
  }

  /* как сказать «по-русски / на хинди» — для промптов вида «расскажи по-…» */
  const PHRASE = {
    ru: 'по-русски', en: 'по-английски', uk: 'на украинском', kk: 'на казахском',
    be: 'по-белорусски', de: 'по-немецки', fr: 'по-французски', es: 'по-испански',
    it: 'по-итальянски', pt: 'по-португальски', pl: 'по-польски', tr: 'по-турецки',
    zh: 'по-китайски', ja: 'по-японски', ko: 'по-корейски', ar: 'по-арабски',
    hi: 'на хинди', nl: 'по-голландски', sv: 'по-шведски', fi: 'по-фински',
    cs: 'по-чешски', ro: 'по-румынски', el: 'по-гречески', he: 'по-ивриту'
  }

  function browserLocale () {
    try {
      const l = (navigator.language || navigator.userLanguage || '').toLowerCase()
      return /^[a-z]{2}(-[a-z]{2})?/.test(l) ? l : 'en'
    } catch (e) { return 'en' }
  }

  /* язык: сначала страна, потом локаль браузера, потом английский */
  function langFor (code, loc) {
    if (code && COUNTRY_LANG[code]) return COUNTRY_LANG[code]
    const l = String(loc || '').slice(0, 2)
    if (LANGS[l]) return l
    return 'en'
  }

  function detect () {
    let t = ''
    try { t = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch (e) {}
    const hit = TZ[t]
    const loc = browserLocale()
    const m = /-([a-z]{2})$/.exec(loc)
    let code = hit ? hit[0] : (m ? m[1].toUpperCase() : '')
    if (!code && !hit) code = ''
    return {
      tz: t,
      code: code,
      country: COUNTRIES[code] || '',
      city: hit ? hit[1] : '',
      lang: langFor(code, loc),
      source: hit ? 'часовой пояс' : (code ? 'локаль' : 'не определён')
    }
  }

  let cached = null
  function get () {
    const s = (typeof Store !== 'undefined' && Store.state && Store.state.settings) || {}
    if (!cached) cached = detect()
    const d = cached
    const code = (s.region && s.region !== 'auto' && s.region) || d.code
    const lang = (s.lang && s.lang !== 'auto' && LANGS[s.lang]) ? s.lang : d.lang
    const autoRegion = !(s.region && s.region !== 'auto')
    const autoLang = !(s.lang && s.lang !== 'auto')
    let city = d.city || ''
    if (code !== d.code) {
      const k = Object.keys(TZ).filter(k => TZ[k][0] === code)[0]
      city = k ? TZ[k][1] : ''
    }
    return {
      code: code,
      country: COUNTRIES[code] || (code ? code : 'не определён'),
      lang: lang,
      langName: LANGS[lang] || lang,
      langNative: NATIVE[lang] || (LANGS[lang] || lang),
      tz: d.tz,
      city: city,
      source: autoRegion ? d.source : 'задано вручную',
      autoRegion: autoRegion,
      autoLang: autoLang
    }
  }

  /* строка для системного промпта ИИ и для настроек */
  function promptLine () {
    const r = get()
    if (!r.code && !r.tz) return ''
    const labels = {
      ru: { header: 'РЕГИОН И ЯЗЫК:', region: 'регион пользователя', city: 'город', zone: 'часовой пояс', ui: 'язык интерфейса', unknown: 'не определён' },
      uk: { header: 'РЕГІОН ТА МОВА:', region: 'регіон користувача', city: 'місто', zone: 'часовий пояс', ui: 'мова інтерфейсу', unknown: 'не визначено' },
      be: { header: 'РЭГІЁН І МОВА:', region: 'рэгіён карыстальніка', city: 'горад', zone: 'часавы пояс', ui: 'мова інтэрфейсу', unknown: 'не вызначана' },
      kk: { header: 'РЕГИОН ЖӘНЕ ТІЛ:', region: 'пайдаланушы аймағы', city: 'қала', zone: 'уақыт белдеуі', ui: 'интерфейс тілі', unknown: 'анықталмады' },
      en: { header: 'REGION AND LANGUAGE:', region: 'user region', city: 'city', zone: 'time zone', ui: 'interface language', unknown: 'not detected' },
      de: { header: 'REGION UND SPRACHE:', region: 'Region des Nutzers', city: 'Stadt', zone: 'Zeitzone', ui: 'Sprache der Oberfläche', unknown: 'nicht erkannt' },
      fr: { header: 'RÉGION ET LANGUE :', region: 'région de l’utilisateur', city: 'ville', zone: 'fuseau horaire', ui: 'langue de l’interface', unknown: 'non détecté' },
      es: { header: 'REGIÓN Y IDIOMA:', region: 'región del usuario', city: 'ciudad', zone: 'zona horaria', ui: 'idioma de la interfaz', unknown: 'no detectado' },
      it: { header: 'REGIONE E LINGUA:', region: 'regione dell’utente', city: 'città', zone: 'fuso orario', ui: 'lingua dell’interfaccia', unknown: 'non rilevato' },
      pt: { header: 'REGIÃO E IDIOMA:', region: 'região do usuário', city: 'cidade', zone: 'fuso horário', ui: 'idioma da interface', unknown: 'não detectado' },
      pl: { header: 'REGION I JĘZYK:', region: 'region użytkownika', city: 'miasto', zone: 'strefa czasowa', ui: 'język interfejsu', unknown: 'nie wykryto' },
      tr: { header: 'BÖLGE VE DİL:', region: 'kullanıcı bölgesi', city: 'şehir', zone: 'zaman dilimi', ui: 'arayüz dili', unknown: 'belirlenmedi' },
      zh: { header: '地区和语言：', region: '用户地区', city: '城市', zone: '时区', ui: '界面语言', unknown: '未检测到' },
      ja: { header: '地域と言語：', region: 'ユーザーの地域', city: '都市', zone: 'タイムゾーン', ui: 'インターフェース言語', unknown: '未検出' },
      ko: { header: '지역 및 언어:', region: '사용자 지역', city: '도시', zone: '시간대', ui: '인터페이스 언어', unknown: '감지되지 않음' },
      ar: { header: 'المنطقة واللغة:', region: 'منطقة المستخدم', city: 'المدينة', zone: 'المنطقة الزمنية', ui: 'لغة الواجهة', unknown: 'غير محدد' },
      hi: { header: 'क्षेत्र और भाषा:', region: 'उपयोगकर्ता क्षेत्र', city: 'शहर', zone: 'समय क्षेत्र', ui: 'इंटरफ़ेस भाषा', unknown: 'अज्ञात' },
      nl: { header: 'GEBIED EN TAAL:', region: 'gebied van gebruiker', city: 'stad', zone: 'tijdzone', ui: 'taal van de interface', unknown: 'niet gedetecteerd' },
      sv: { header: 'REGION OCH SPRÅK:', region: 'användarens region', city: 'stad', zone: 'tidszon', ui: 'gränssnittsspråk', unknown: 'ej detekterat' },
      fi: { header: 'ALUE JA KIELI:', region: 'käyttäjän alue', city: 'kaupunki', zone: 'aikavyöhyke', ui: 'käyttöliittymän kieli', unknown: 'ei havaittu' },
      cs: { header: 'REGION A JAZYK:', region: 'oblast uživatele', city: 'město', zone: 'časové pásmo', ui: 'jazyk rozhraní', unknown: 'nezjištěno' },
      ro: { header: 'REGIUNE ȘI LIMBĂ:', region: 'regiunea utilizatorului', city: 'oraș', zone: 'fus orar', ui: 'limba interfeței', unknown: 'nedetectat' },
      el: { header: 'ΠΕΡΙΟΧΗ ΚΑΙ ΓΛΩΣΣΑ:', region: 'περιοχή χρήστη', city: 'πόλη', zone: 'ζώνη ώρας', ui: 'γλώσσα διεπαφής', unknown: 'δεν ανιχνεύτηκε' },
      he: { header: 'אזור ושפה:', region: 'אזור המשתמש', city: 'עיר', zone: 'אזור זמן', ui: 'שפת הממשק', unknown: 'לא זוהה' }
    }[r.lang] || { header: 'REGION AND LANGUAGE:', region: 'user region', city: 'city', zone: 'time zone', ui: 'interface language', unknown: 'not detected' }
    const country = r.country || labels.unknown
    const cityText = r.city ? ' (' + labels.city + ': ' + r.city + ')' : ''
    const zoneText = r.tz ? ', ' + labels.zone + ' ' + r.tz : ''
    return labels.header + ' ' + labels.region + ' — ' + country + cityText + zoneText + '. ' + labels.ui + ' — ' + (r.langName || r.lang) + ' (' + r.lang + '). ' + answerLine()
  }

  /* жёсткая инструкция: на каком языке отвечать по умолчанию */
  function answerLine () {
    const r = get()
    const base = (r.langNative || r.langName || r.lang || 'English')
    const map = {
      ru: 'Отвечай строго по-русски. Если пользователь пишет на другом языке, отвечай на его языке только по явному запросу.',
      uk: 'Відповідай строго українською. Якщо користувач пише іншою мовою, відповідай його мовою лише за явної вимоги.',
      be: 'Адказвай строга па-беларусску. Калі карыстальнік піша іншай мовай, адказвай яго мовай толькі пры відавочнаму запыце.',
      kk: 'Жауаптарды міндетті түрде қазақ тілінде жаз. Егер пайдаланушы басқа тілде жаза бастаса, тек нақты сұрау болғанда ғана сол тілде жауап бер.',
      en: 'Answer strictly in English. If the user writes in another language, answer in their language only on an explicit request.',
      de: 'Antworte strikt auf Deutsch. Wenn der Nutzer in einer anderen Sprache schreibt, antworte nur auf ausdrückliche Anfrage in seiner Sprache.',
      fr: 'Réponds strictement en français. Si l’utilisateur écrit dans une autre langue, réponds dans sa langue uniquement à sa demande explicite.',
      es: 'Responde estrictamente en español. Si el usuario escribe en otro idioma, responde en su idioma solo si lo solicita explícitamente.',
      it: 'Rispondi rigorosamente in italiano. Se l’utente scrive in un’altra lingua, rispondi nella sua lingua solo su richiesta esplicita.',
      pt: 'Responda estritamente em português. Se o usuário escrever em outro idioma, responda em seu idioma apenas por pedido explícito.',
      pl: 'Odpowiadaj ściśle po polsku. Jeśli użytkownik pisze w innym języku, odpowiadaj jego językiem tylko na wyraźne żądanie.',
      tr: 'Cevapları kesinlikle Türkçe yaz. Kullanıcı başka dilde yazarsa yalnızca açık istek olduğunda onun dilinde cevap ver.',
      zh: '必须严格使用中文回答。如果用户使用其他语言书写，只有在明确要求时才切换到其语言。',
      ja: '必ず日本語で厳密に回答してください。ユーザーが別の言語で書いていても、明示的な依頼がある場合だけその言語で答えてください。',
      ko: '반드시 한국어로 엄격하게 답변하라. 사용자가 다른 언어로 쓰면 명시적 요청이 있을 때만 그 언어로 답하라.',
      ar: 'أجب دائمًا باللغة العربية بدقة. إذا كان المستخدم يكتب بلغة أخرى، فلا ترد إلا بلغته عند طلب صريح.',
      hi: 'सख्ती से हिन्दी में जवाब दें। यदि उपयोगकर्ता किसी अन्य भाषा में लिखता है, तो केवल स्पष्ट अनुरोध पर ही उसी भाषा में उत्तर दें।',
      nl: 'Antwoord strikt in het Nederlands. Als de gebruiker in een andere taal schrijft, antwoord dan alleen op expliciet verzoek in die taal.',
      sv: 'Svara strikt på svenska. Om användaren skriver på ett annat språk, svara bara på det språket vid ett tydligt krav.',
      fi: 'Vastaa tiukasti suomeksi. Jos käyttäjä kirjoittaa toisella kielellä, vastaa hänen kielellään vain nimenomaisen pyynnön perusteella.',
      cs: 'Odpovídej striktně česky. Pokud uživatel píše jiným jazykem, odpovídej ve jeho jazyce pouze na výslovnou žádost.',
      ro: 'Răspunde strict în română. Dacă utilizatorul scrie în altă limbă, răspunde în limba lui doar la cerere explicită.',
      el: 'Απάντα αυστηρά στα ελληνικά. Αν ο χρήστης γράφει σε άλλη γλώσσα, απάντησε στη γλώσσα του μόνο με ρητή αίτηση.',
      he: 'ענה בעברית בקפדנות. אם המשתמש כותב בשפה אחרת, ענה בשפתו רק לפי בקשה מפורשת.'
    }
    if (map[r.lang]) return map[r.lang]
    return 'All answers must be in «' + base + '» (code ' + r.lang + '). If the user explicitly asks in another language, follow that language; otherwise stay in the default language.'
  }

  /* «по-русски» / «на хинди» — короткая форма для промптов вида «расскажи по-…» */
  function phrase () {
    return PHRASE[get().lang] || 'по-английски'
  }

  /* название языка на его собственном языке — для списков выбора в настройках */
  function nativeName (code) {
    const base = NATIVE[code] || LANGS[code] || code
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  window.Region = { get, detect, promptLine, answerLine, phrase, nativeName, LANGS, COUNTRIES, COUNTRY_LANG, NATIVE, PHRASE }
})()
