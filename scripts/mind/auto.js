const KEY = 'vio.mind.sequences.v1'
function readSeq() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch (e) { return [] } }
function hashCmd(c) {
  if (!c) return ''
  return String(c.kind || '') + ':' + String(c.target || c.text || '').slice(0, 40)
}
function record(cmds) {
  try {
    if (!Array.isArray(cmds) || cmds.length < 2) return null
    const h = cmds.map(hashCmd).join('→')
    if (!h || h.length < 5) return null
    const list = readSeq()
    let s = list.find(x => x.hash === h)
    if (!s) {
      s = { hash: h, count: 0, last: 0,
        preview: cmds.slice(0, 4).map(c => (c.kind || '') + (c.text ? ' "' + String(c.text).slice(0, 30) + '"' : '')).join(' → ') }
      list.push(s)
    }
    s.count++
    s.last = Date.now()
    localStorage.setItem(KEY, JSON.stringify(list.slice(-30)))
    return s
  } catch (e) { return null }
}
function suggestions() {
  try {
    const now = Date.now()
    return readSeq().filter(s => s.count >= 3 && (now - s.last) < 7 * 86400000)
      .sort((a, b) => b.count - a.count).slice(0, 5)
  } catch (e) { return [] }
}
function clear() { try { localStorage.removeItem(KEY) } catch (e) {} }
window.VioAuto = { record, suggestions, clear }
