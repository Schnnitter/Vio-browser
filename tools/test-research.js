/* tools/test-research.js — смоук-тест toolResearch() без Electron и без сети-зависимостей от Chromium.
   scripts/ai-agent.js — это IIFE без exports, поэтому require() невозможен: грузим его в vm-песочнице.

   Моки (существующие файлы не трогаем):
     - vio.fetchBytes  → node fetch + Buffer.toString('base64')  (в main.js возвращает { data, type, status });
                         btoa в Node не подходит для произвольных байтов — нужен Buffer.
     - DOMParser       → мини-DOM ниже: parseFromString/querySelectorAll/body/textContent/remove/closest.
                         Покрывает ровно те селекторы, что используются в ai-agent.js:
                         'script,style,nav,footer,header,form,aside',
                         'a.result-link, a.result__a, a[href*="uddg="]',
                         '.result-snippet, .result__snippet, td:last-child', 'tr, .result, td'.

   Запуск:  node tools/test-research.js [запрос] [сколько источников]
   По умолчанию: Docker 3
*/
'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')

/* ============================== 1. мини-DOM ============================== */

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
const RAW_TAGS = new Set(['script', 'style', 'textarea', 'title']) /* контент до парного </tag> не разбираем */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', mdash: '—', ndash: '–', hellip: '…' }

function decodeEntities (s) {
  return String(s).replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (all, g) => {
    if (g[0] === '#') {
      try {
        const code = (g[1] === 'x' || g[1] === 'X') ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10)
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : all
      } catch (e) { return all }
    }
    const v = ENTITIES[g.toLowerCase()]
    return v === undefined ? all : v
  })
}

class TextNode {
  constructor (data) { this.nodeType = 3; this.data = data }
}

class El {
  constructor (tag, attrs) {
    this.nodeType = 1
    this.tagName = String(tag).toLowerCase()
    this.attrs = attrs || {}
    this.childNodes = []
    this.parentNode = null
  }
  getAttribute (n) {
    const v = this.attrs[String(n).toLowerCase()]
    return v === undefined ? null : v
  }
  get textContent () {
    let s = ''
    for (const n of this.childNodes) s += (n.nodeType === 3 ? n.data : n.textContent)
    return s
  }
  remove () {
    const p = this.parentNode
    if (!p) return
    const i = p.childNodes.indexOf(this)
    if (i >= 0) p.childNodes.splice(i, 1)
    this.parentNode = null
  }
  * elements () {
    for (const n of this.childNodes) {
      if (n.nodeType === 1) { yield n; yield * n.elements() }
    }
  }
  querySelectorAll (sel) { return qsa(this, sel) }
  querySelector (sel) {
    const r = qsa(this, sel)
    return r.length ? r[0] : null
  }
  closest (sel) {
    const groups = splitSelectors(sel)
    let el = this
    while (el && el.nodeType === 1) {
      if (groups.some(g => matchesChain(el, g))) return el
      el = el.parentNode
    }
    return null
  }
}

/* --- селекторы: список через запятую, compound (.cls #id [attr*=v] :last-child), потомок через пробел --- */

function splitSelectors (sel) {
  return String(sel || '').split(',').map(s => s.trim()).filter(Boolean).map(parseCompoundChain)
}

function parseCompoundChain (sel) {
  return sel.split(/\s+/).filter(Boolean).map(parseCompound)
}

function parseCompound (s) {
  const c = { tag: '', id: '', classes: [], attrs: [], not: [], lastChild: false, firstChild: false }
  s = s.replace(/:last-child/g, () => { c.lastChild = true; return '' })
  s = s.replace(/:first-child/g, () => { c.firstChild = true; return '' })
  s = s.replace(/:not\(([^)]*)\)/g, (m, inner) => { c.not.push(inner.trim()); return '' })
  s = s.replace(/\[([^\]]*)\]/g, (m, inner) => {
    const mm = /^([a-zA-Z_:][-\w:.]*)\s*(?:([*^$~|]?=)\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?$/.exec(inner.trim())
    if (mm) c.attrs.push({ name: mm[1].toLowerCase(), op: mm[2] || '', value: mm[4] !== undefined ? mm[4] : (mm[5] !== undefined ? mm[5] : (mm[6] || '')) })
    return ''
  })
  s = s.trim()
  const tm = /^([a-zA-Z][\w-]*|\*)/.exec(s)
  if (tm) { c.tag = tm[1].toLowerCase(); s = s.slice(tm[1].length) }
  const rest = s.match(/([.#][\w-]+)/g) || []
  for (const p of rest) {
    if (p[0] === '#') c.id = p.slice(1)
    else c.classes.push(p.slice(1))
  }
  return c
}

function attrMatch (el, a) {
  const v = el.getAttribute(a.name)
  if (v === null) return false
  if (!a.op) return true
  if (a.op === '=') return v === a.value
  if (a.op === '*=') return v.indexOf(a.value) >= 0
  if (a.op === '^=') return v.indexOf(a.value) === 0
  if (a.op === '$=') return v.slice(-a.value.length) === a.value
  if (a.op === '~=') return v.split(/\s+/).indexOf(a.value) >= 0
  if (a.op === '|=') return v === a.value || v.indexOf(a.value + '-') === 0
  return false
}

function matchesCompound (el, c) {
  if (c.tag && c.tag !== '*' && el.tagName !== c.tag) return false
  if (c.id && el.getAttribute('id') !== c.id) return false
  const cls = String(el.getAttribute('class') || '').split(/\s+/).filter(Boolean)
  for (const k of c.classes) if (cls.indexOf(k) < 0) return false
  for (const a of c.attrs) if (!attrMatch(el, a)) return false
  if (c.lastChild || c.firstChild) {
    const p = el.parentNode
    const kids = p ? p.childNodes.filter(n => n.nodeType === 1) : []
    if (c.lastChild && kids[kids.length - 1] !== el) return false
    if (c.firstChild && kids[0] !== el) return false
  }
  for (const nsel of c.not) {
    if (matchesChain(el, parseCompoundChain(nsel))) return false
  }
  return true
}

/* цепочка из правой части влево (потомок/предок) */
function matchesChain (el, parts) {
  if (!parts.length) return false
  if (!matchesCompound(el, parts[parts.length - 1])) return false
  let i = parts.length - 2
  let node = el.parentNode
  while (i >= 0) {
    if (!node || node.nodeType !== 1) return false
    if (matchesCompound(node, parts[i])) i--
    node = node.parentNode
  }
  return true
}

function qsa (root, sel) {
  const groups = splitSelectors(sel)
  const out = []
  for (const el of root.elements()) {
    if (groups.some(g => matchesChain(el, g))) out.push(el)
  }
  return out
}

function parseAttrs (s) {
  const attrs = {}
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  let m
  while ((m = re.exec(s))) {
    attrs[m[1].toLowerCase()] = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : (m[5] !== undefined ? m[5] : ''))
  }
  return attrs
}

function parseHTML (html) {
  html = String(html || '')
  const doc = new El('#document', {})
  const stack = [doc]
  const re = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<(\/)?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)(\/?)>|([^<]+)/gi
  let m
  while ((m = re.exec(html))) {
    const raw = m[0]
    if (raw[0] === '<' && !m[1] && !m[2]) continue /* комментарий / doctype */
    if (m[1]) { /* закрывающий тег: поднимаемся до него */
      const tag = m[2].toLowerCase()
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === tag) { stack.length = i; break }
      }
      continue
    }
    if (m[2]) {
      const tag = m[2].toLowerCase()
      const el = new El(tag, parseAttrs(m[3] || ''))
      const top = stack[stack.length - 1]
      el.parentNode = top
      top.childNodes.push(el)
      if (m[4] === '/' || VOID_TAGS.has(tag)) continue
      if (RAW_TAGS.has(tag)) {
        const closeRe = new RegExp('</' + tag + '[^>]*>', 'gi')
        closeRe.lastIndex = re.lastIndex
        const cm = closeRe.exec(html)
        re.lastIndex = cm ? cm.index : html.length /* парсер сам разберёт закрывающий тег */
        continue
      }
      stack.push(el)
      continue
    }
    if (m[5]) stack[stack.length - 1].childNodes.push(new TextNode(decodeEntities(m[5])))
  }
  const body = qsa(doc, 'body')[0] || null
  Object.defineProperty(doc, 'body', {
    configurable: true,
    get () {
      if (body) return body
      const fake = new El('body', {})
      fake.childNodes = doc.childNodes /* тот же массив: remove() по-прежнему работает */
      return fake
    }
  })
  return doc
}

class DOMParserMock {
  parseFromString (html, type) { return parseHTML(html) } /* type намеренно не используется */
}

/* ============================== 2. мок сети ============================== */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const stats = { fetches: 0, ok: 0, fail: 0 }

async function fetchBytes (url, opts) {
  if (!/^https?:/i.test(url || '')) throw new Error('bad url')
  stats.fetches++
  const ctl = new AbortController()
  const ms = (opts && +opts.timeoutMs) || 20000
  const timer = setTimeout(() => { try { ctl.abort() } catch (e) {} }, ms)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': UA,
        'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8'
      }
    })
    if (!res.ok) throw new Error('http ' + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) throw new Error('empty')
    stats.ok++
    /* как в main.js fetchBytes: { data: base64, type, status } */
    return { data: buf.toString('base64'), type: res.headers.get('content-type') || '', status: res.status }
  } catch (e) {
    stats.fail++
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/* ============================== 3. загрузка ai-agent.js ============================== */

function loadAgent () {
  const file = path.join(__dirname, '..', 'scripts', 'ai-agent.js')
  const src = fs.readFileSync(file, 'utf8')
  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    TextDecoder, TextEncoder, URL, URLSearchParams,
    AbortController, AbortSignal,
    atob, btoa, fetch, performance,
    Buffer,
    DOMParser: DOMParserMock,
    vio: { fetchBytes }
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(src, sandbox, { filename: 'ai-agent.js' })
  const tools = sandbox.AIAgent && sandbox.AIAgent.tools
  if (!tools || typeof tools.research !== 'function') throw new Error('AIAgent.tools.research не найден')
  return tools
}

/* ============================== 4. прогон и отчёт ============================== */

function report (out) {
  const head = /^Sources found: (\d+)/.exec(out)
  const blocks = []
  const rx = /\[SOURCE (\d+): ([^\]]+)\]\n([\s\S]*?)\n\[\/SOURCE\]/g
  let m
  while ((m = rx.exec(out))) blocks.push({ n: +m[1], url: m[2], text: m[3].trim() })

  if (!head) {
    console.log('sources found: 0 (нет блока [SOURCE])')
    console.log('ответ инструмента: ' + JSON.stringify(out.slice(0, 300)))
    return { found: 0, blocks }
  }

  console.log('sources found: ' + head[1])
  for (const b of blocks) {
    const gt = b.text.length > 100
    console.log('  [' + b.n + '] len=' + b.text.length + '  >100: ' + (gt ? 'yes' : 'NO') + '  ' + b.url)
  }
  if (blocks.length !== +head[1]) console.log('  (внимание: распарсено блоков ' + blocks.length + ' из ' + head[1] + ')')
  return { found: +head[1], blocks }
}

async function main () {
  const query = process.argv[2] || 'Docker'
  const n = +process.argv[3] || 3

  console.log('toolResearch(' + JSON.stringify(query) + ', ' + n + ')')
  const tools = loadAgent()

  const t0 = performance.now()
  let out = ''
  try {
    out = await tools.research(query, n)
  } catch (e) {
    out = 'research threw: ' + (e && e.message)
  }
  const ms = performance.now() - t0

  out = String(out == null ? '' : out)
  const r = report(out)
  console.log('fetches: ' + stats.fetches + ' (ok ' + stats.ok + ', fail ' + stats.fail + ')')
  console.log('time: ' + (ms / 1000).toFixed(2) + ' s (' + Math.round(ms) + ' ms)')
  return r.found > 0 ? 0 : 1
}

main().then(code => { process.exitCode = code }).catch(e => {
  console.error('test failed:', e && e.stack || e)
  process.exitCode = 2
})
