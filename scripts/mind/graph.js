const STOP = new Set(['и','в','на','с','по','из','к','о','а','но','да','нет','это','как','что','где','когда','для','the','a','an','of','in','on','and','or','to','is','are','was','were','be','been','not','this','that'])


function keywords(text, n) {
  const words = String(text || '').toLowerCase().replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w))
  const freq = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, n || 15)
}


function buildGraph(pages) {
  const index = {}
  const withKw = pages.map(p => ({ ...p, _kw: keywords(p.text, 15) }))
  for (const p of withKw) for (const kw of p._kw) { if (!index[kw]) index[kw] = []; index[kw].push(p.id) }
  const edges = []
  const seen = new Set()
  for (const kw in index) {
    const ids = index[kw]
    if (ids.length < 2 || ids.length > 50) continue
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const key = ids[i] < ids[j] ? ids[i] + '-' + ids[j] : ids[j] + '-' + ids[i]
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ a: ids[i], b: ids[j], weight: 1 })
    }
  }
  return { pages: withKw, edges: edges.slice(0, 500) }
}


module.exports = { keywords, buildGraph }
