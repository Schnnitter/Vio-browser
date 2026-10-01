const QKEY = 'vio.person.queries.v1'
const DKEY = 'vio.person.domains.v1'
function readQ() { try { return JSON.parse(localStorage.getItem(QKEY) || '[]') } catch (e) { return [] } }
function readD() { try { return JSON.parse(localStorage.getItem(DKEY) || '{}') } catch (e) { return {} } }
function recordQuery(text) {
  try {
    const t = String(text || '').trim().slice(0, 500)
    if (t.length < 2) return
    const list = readQ()
    list.push({ t, ts: Date.now() })
    localStorage.setItem(QKEY, JSON.stringify(list.slice(-200)))
  } catch (e) {}
}
function recordDomain(d) {
  try {
    d = String(d || '').replace(/^www\./, '').toLowerCase()
    if (!d) return
    const m = readD()
    m[d] = (m[d] || 0) + 1
    localStorage.setItem(DKEY, JSON.stringify(m))
  } catch (e) {}
}
function getTopDomains(n) {
  try {
    const m = readD()
    return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, n || 5)
  } catch (e) { return [] }
}
function getStyleHint() {
  try {
    const list = readQ()
    if (list.length < 5) return ''
    const avg = list.reduce((s, x) => s + x.t.length, 0) / list.length
    if (avg < 30) return 'Пользователь пишет кратко — отвечай сжато.'
    if (avg > 200) return 'Пользователь пишет подробно — отвечай развёрнуто.'
    return ''
  } catch (e) { return '' }
}
function getLevelHint() {
  try {
    const list = readQ()
    if (list.length < 5) return ''
    const tech = ['функци', 'класс', 'массив', 'асинхрон', 'api', 'баг', 'код', 'js', 'python', 'файл', 'ошибк', 'сервер', 'клиент', 'бд', 'sql']
    let n = 0
    for (const q of list) { const t = q.t.toLowerCase(); if (tech.some(w => t.indexOf(w) >= 0)) n++ }
    const r = n / list.length
    if (r > 0.5) return 'Пользователь технически грамотный — можно использовать термины.'
    if (r > 0.2) return 'Пользователь частично разбирается в IT.'
    return ''
  } catch (e) { return '' }
}
function clear() { try { localStorage.removeItem(QKEY); localStorage.removeItem(DKEY) } catch (e) {} }
window.VioPerson = { recordQuery, recordDomain, getTopDomains, getStyleHint, getLevelHint, clear }
