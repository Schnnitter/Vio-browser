const path = require('path')
const crypto = require('crypto')


let db = null


function init(userDataPath) {
  if (db) return db
  const Database = require('better-sqlite3')
  const dbPath = path.join(userDataPath, 'vio-mind.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      text TEXT,
      domain TEXT,
      visited_at INTEGER NOT NULL,
      text_hash TEXT,
      UNIQUE(url, text_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_pages_domain ON pages(domain);
    CREATE INDEX IF NOT EXISTS idx_pages_visited ON pages(visited_at);
    CREATE TABLE IF NOT EXISTS vectors (
      page_id INTEGER PRIMARY KEY,
      vec TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patterns (
      key TEXT PRIMARY KEY,
      from_domain TEXT,
      to_domain TEXT,
      count INTEGER
    );
  `)
  return db
}


function hashText(t) {
  return crypto.createHash('sha1').update(String(t || '')).digest('hex').slice(0, 16)
}


function savePage(page) {
  if (!db || !page) return false
  try {
    const text = String(page.text || '').slice(0, 100000)
    if (text.length < 100) return false
    const h = hashText(text)
    db.prepare('INSERT OR IGNORE INTO pages (url, title, text, domain, visited_at, text_hash) VALUES (?, ?, ?, ?, ?, ?)')
      .run(String(page.url || ''), String(page.title || '').slice(0, 300), text, String(page.domain || ''), Date.now(), h)
    return true
  } catch (e) { return false }
}


function searchPages(query, limit) {
  if (!db || !query) return []
  limit = Math.min(50, Math.max(1, +limit || 5))
  try {
    const q = '%' + String(query).replace(/[%_]/g, ' ').trim().slice(0, 100) + '%'
    return db.prepare('SELECT url, title, text, domain, visited_at FROM pages WHERE text LIKE ? OR title LIKE ? OR url LIKE ? ORDER BY visited_at DESC LIMIT ?')
      .all(q, q, q, limit)
      .map(r => ({ url: r.url, title: r.title, domain: r.domain, visited_at: r.visited_at, text: String(r.text || '').slice(0, 3000) }))
  } catch (e) { return [] }
}


function getStats() {
  if (!db) return { count: 0 }
  try {
    const r = db.prepare('SELECT COUNT(*) as c FROM pages').get()
    return { count: r.c || 0 }
  } catch (e) { return { count: 0 } }
}


function clearOlderThan(days) {
  if (!db) return 0
  try {
    const cutoff = Date.now() - (+days || 30) * 86400000
    const r = db.prepare('DELETE FROM pages WHERE visited_at < ?').run(cutoff)
    return r.changes || 0
  } catch (e) { return 0 }
}


function exportAll() {
  if (!db) return []
  try { return db.prepare('SELECT id, url, title, text, domain, visited_at FROM pages').all() }
  catch (e) { return [] }
}


function importMany(items) {
  if (!db || !Array.isArray(items)) return 0
  let n = 0
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO pages (url, title, text, domain, visited_at, text_hash) VALUES (?, ?, ?, ?, ?, ?)')
    const tx = db.transaction((arr) => {
      for (const it of arr) {
        const text = String(it.text || '').slice(0, 100000)
        if (text.length < 100) continue
        const r = stmt.run(String(it.url || ''), String(it.title || ''), text, String(it.domain || ''), +it.visited_at || Date.now(), hashText(text))
        if (r.changes) n++
      }
    })
    tx(items)
  } catch (e) {}
  return n
}


function getPageById(id) {
  if (!db) return null
  try { return db.prepare('SELECT * FROM pages WHERE id = ?').get(id) } catch (e) { return null }
}


function saveVector(pageId, vec) {
  if (!db) return false
  try {
    db.prepare('INSERT OR REPLACE INTO vectors (page_id, vec) VALUES (?, ?)').run(pageId, JSON.stringify(vec))
    return true
  } catch (e) { return false }
}


function getVectorForPage(pageId) {
  if (!db) return null
  try { return db.prepare('SELECT vec FROM vectors WHERE page_id = ?').get(pageId) }
  catch (e) { return null }
}
function getVectors(limit) {
  if (!db) return []
  try { return db.prepare('SELECT page_id, vec FROM vectors LIMIT ?').all(limit || 1000) }
  catch (e) { return [] }
}


function recordPattern(from, to) {
  if (!db || !from || !to || from === to) return
  try {
    const key = from + '→' + to
    const cur = db.prepare('SELECT count FROM patterns WHERE key = ?').get(key)
    if (cur) db.prepare('UPDATE patterns SET count = count + 1 WHERE key = ?').run(key)
    else db.prepare('INSERT INTO patterns (key, from_domain, to_domain, count) VALUES (?, ?, ?, 1)').run(key, from, to)
  } catch (e) {}
}


function getPatterns() {
  if (!db) return []
  try { return db.prepare('SELECT * FROM patterns').all() } catch (e) { return [] }
}


module.exports = { init, savePage, searchPages, getStats, getVectorForPage, clearOlderThan, exportAll, importMany, getPageById, saveVector, getVectors, recordPattern, getPatterns }
