// Пользовательские стили (CSS) для сайтов — хранятся локально, применяются во вкладках.
// Формат:
//   @all            — заголовок вида "@all" в комментарии: правила для всех сайтов
//   @example.com    — только для example.com и его поддоменов
//   @*.wikipedia.org — звёздочка в начале необязательна
;(function () {
  function parse (text) {
    const blocks = []
    let cur = null
    String(text || '').split(/\r?\n/).forEach(line => {
      const m = /\/\*\s*@([^*]+?)\s*\*\//.exec(line)
      if (m) {
        if (cur) blocks.push(cur)
        cur = { match: String(m[1]).trim().toLowerCase(), css: '' }
        return
      }
      if (!cur) cur = { match: 'all', css: '' }
      cur.css += line + '\n'
    })
    if (cur) blocks.push(cur)
    return blocks.filter(b => b.css.trim())
  }

  function match (pattern, host) {
    const p = String(pattern || '').trim().toLowerCase()
    if (!p || p === 'all' || p === '*') return true
    let d = p.replace(/^\*\./, '')
    if (d.charAt(0) === '.') d = d.slice(1)
    if (!d) return false
    return host === d || host.endsWith('.' + d)
  }

  function forUrl (url, text) {
    let host = ''
    try { host = new URL(url).hostname.toLowerCase() } catch (e) { return '' }
    let src = text
    if (src == null) {
      src = (typeof Store !== 'undefined' && Store.state && Store.state.settings && Store.state.settings.userCss) || ''
    }
    if (!String(src).trim()) return ''
    return parse(src).filter(b => match(b.match, host)).map(b => b.css).join('\n')
  }

  window.UserCss = { parse, match, forUrl }
})()
