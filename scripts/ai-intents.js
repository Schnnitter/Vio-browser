/* Pure request routing. Kept free of DOM so the important language cases are testable. */
(function (root, factory) {
  const api = factory()
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  if (root) root.VioAIIntents = api
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const groups = {
    1: ['первый', 'первое', 'первая', 'первую', 'первого', 'один', 'одна', 'перше', 'перший', 'перша', 'першу', 'одне', 'first', '1st', 'one', '1'],
    2: ['второй', 'второе', 'вторая', 'вторую', 'другой', 'друге', 'другий', 'друга', 'другу', 'second', '2nd', 'two', '2'],
    3: ['третий', 'третье', 'третья', 'третью', 'третє', 'третій', 'третя', 'третю', 'third', '3rd', 'three', '3'],
    4: ['четвертый', 'четвертое', 'четвертая', 'четверте', 'четвертий', 'четверта', 'fourth', '4th', 'four', '4'],
    5: ['пятый', 'пятое', 'пятая', 'пяте', 'пятий', 'п\'яте', 'п’ятий', 'fifth', '5th', 'five', '5'],
    6: ['шестой', 'шестое', 'шестая', 'шосте', 'шостий', 'sixth', '6th', 'six', '6'],
    7: ['седьмой', 'седьмое', 'седьмая', 'сьоме', 'сьомий', 'seventh', '7th', 'seven', '7'],
    8: ['восьмой', 'восьмое', 'восьмая', 'восьме', 'восьмий', 'eighth', '8th', 'eight', '8'],
    9: ['девятый', 'девятое', 'девятая', 'дев’яте', 'дев\'яте', 'дев’ятий', 'ninth', '9th', 'nine', '9'],
    10: ['десятый', 'десятое', 'десятая', 'десяте', 'десятий', 'tenth', '10th', 'ten', '10']
  }
  function clean (s) { return String(s || '').trim().toLowerCase().replace(/[«»"'.,!?():;]/g, '') }
  function ordinal (value) {
    const s = clean(value)
    if (/^(последн|останн|last)/u.test(s)) return -1
    for (const k of Object.keys(groups)) if (groups[k].includes(s)) return +k
    const m = s.match(/^([1-9]|10)(?:-?(?:й|я|е|ий|ый|ое|ая|ую|st|nd|rd|th))?$/iu)
    return m ? +m[1] : 0
  }
  const verbs = '(?:напиши|написать|введи|ввести|впиши|вписать|вставь|вставить|набери|заполни|знайди|пошукай|type|fill|search)'
  const places = '(?:в|во|на|у|по|in|into|for)?\\s*(?:строк[а-яіїєґё]*|пол[а-яіїєґё]*|окн[а-яіїєґё]*|форм[а-яіїєґё]*|панел[а-яіїєґё]*|поиск[а-яіїєґё]*|пошук[а-яіїєґё]*|search(?:\\s+box)?|field|input)'
  const forbidden = /^(?:в|во|на|у|по|с|до|in|into|for|search|поиск|пошук|строку|строка|поле|форма)$/iu
  function parseTypeIntent (input) {
    const s = String(input || '').trim()
    let m = s.match(new RegExp('^\\s*' + verbs + '\\s+(?:слово|текст|значение|word|text)?\\s*[«"]?(.+?)[»"]?\\s+' + places + '\\s*[.!?]*$', 'iu'))
    if (!m) m = s.match(new RegExp('^\\s*' + verbs + '\\s+' + places + '\\s+[«"]?(.+?)[»"]?\\s*[.!?]*$', 'iu'))
    if (!m) m = s.match(new RegExp('^\\s*' + verbs + '\\s+(?:слово|текст|значение|word|text)\\s+[«"]?(.+?)[»"]?\\s*[.!?]*$', 'iu'))
    if (!m) m = s.match(/^\s*search\s+for\s+(.+?)[.!?]*$/iu)
    if (!m) return null
    const text = String(m[1] || '').trim().replace(/^[«"']|[»"']$/gu, '').trim()
    if (!text || forbidden.test(clean(text))) return null
    return { type: 'type', text, search: true }
  }
  const aliases = { youtube: 'youtube.com', 'ютуб': 'youtube.com', 'ютюбе': 'youtube.com', 'ютубе': 'youtube.com', github: 'github.com', 'гитхаб': 'github.com', 'гідхаб': 'github.com' }
  const pageWords = /(?:видео|відео|video|ролик|clip|результат|result|ссылк|посилан|link|стать[яьи]|article|товар|product|кнопк)/iu
  const openVerb = /^(?:открой|открыть|відкрий|відкрити|open|click|нажми|натисни|кликни|клікни)(?:\s|$)/iu
  function route (input, page) {
    const text = String(input || '').trim()
    if (!text) return { kind: 'empty' }
    if (/^https?:\/\//iu.test(text) || /^[\w-]+(?:\.[\w-]+)+$/iu.test(text)) return { kind: 'open', target: text }
    const words = clean(text).split(/\s+/)
    const site = words.find(w => aliases[w])
    if (site) return { kind: 'open', target: 'https://' + aliases[site] }
    const web = /^https?:/iu.test(String(page && page.url || ''))
    const typed = parseTypeIntent(text)
    if (typed && web) return { kind: 'agent', intent: typed }
    if (web && /(?:пауз|останови|зупини|закрой|закрий|закрити|pause|stop|close).*(?:відео|видео|video|ролик|clip)|(?:відео|видео|video|ролик|clip).*(?:пауз|останови|зупини|закрой|закрий|закрити|pause|stop|close)/iu.test(text)) return { kind: 'agent', intent: { type: 'video-control' } }
    if (web && /^(?:назад|обнови|перезагрузи|прокрути|скролл|back|reload|refresh|scroll|назад|онови|прокрути)/iu.test(text)) return { kind: 'agent', intent: { type: 'local-navigation' } }
    if (web && openVerb.test(text) && pageWords.test(text)) return { kind: 'agent', intent: { type: 'open-item', ordinal: words.map(ordinal).find(Boolean) || 1, item: 'page-item' } }
    if (!web && openVerb.test(text) && pageWords.test(text)) return { kind: 'clarify', text: 'Что открыть?' }
    return { kind: 'chat' }
  }
  return { ordinal, parseTypeIntent, route }
})
