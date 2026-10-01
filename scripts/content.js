/* Vio — встроенные «расширения»: контент-скрипты и чистая логика обработки картинок */
(function () {
  /* ---------- Typeback: вернуть потерянный текст из полей ввода ---------- */
  function typeback () {
    if (window.__vioTypeback) return
    window.__vioTypeback = true
    const PRE = 'vio.tb.'
    function keyFor (el) {
      try {
        const id = el.id || el.name || ''
        let idx = ''
        if (!id) {
          const all = document.querySelectorAll(el.tagName)
          idx = ':' + Array.prototype.indexOf.call(all, el)
        }
        return PRE + location.host + location.pathname + '|' + el.tagName + '|' + id + idx
      } catch (e) { return '' }
    }
    function isText (el) {
      if (!el) return false
      if (/^TEXTAREA$/i.test(el.tagName)) return true
      if (el.tagName !== 'INPUT') return false
      return /^(text|search|url|email|tel|number|)$/i.test(el.type || '')
    }
    function save (el) {
      try {
        if (!isText(el)) return
        const k = keyFor(el)
        if (!k) return
        const v = el.value
        if (typeof v !== 'string') return
        if (!v) { try { localStorage.removeItem(k) } catch (e) {} return }
        if (v.length > 50000) return
        localStorage.setItem(k, v)
      } catch (e) {}
    }
    const timers = {}
    document.addEventListener('input', (e) => {
      const el = e.target
      if (!isText(el)) return
      const k = keyFor(el) || 'x'
      clearTimeout(timers[k])
      timers[k] = setTimeout(() => save(el), 400)
    }, true)
    function restore () {
      try {
        document.querySelectorAll('textarea, input').forEach(el => {
          try {
            if (!isText(el) || el.value) return
            const v = localStorage.getItem(keyFor(el))
            if (v) {
              el.value = v
              el.dispatchEvent(new Event('input', { bubbles: true }))
              el.dispatchEvent(new Event('change', { bubbles: true }))
            }
          } catch (e) {}
        })
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore)
    else restore()
  }

  /* ---------- Enable Copy: снять запрет копирования ---------- */
  function enableCopy () {
    if (window.__vioCopy) return
    window.__vioCopy = true
    ;['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach(t => {
      document.addEventListener(t, e => e.stopImmediatePropagation(), true)
      try { document['on' + t] = null } catch (e) {}
    })
    try { window.oncopy = window.oncut = window.oncontextmenu = window.onselectstart = null } catch (e) {}
    try {
      document.querySelectorAll('*').forEach(el => {
        el.oncopy = el.oncut = el.onpaste = el.oncontextmenu = el.onselectstart = el.ondragstart = null
      })
    } catch (e) {}
    try {
      const st = document.createElement('style')
      st.textContent = '*{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}'
      ;(document.head || document.documentElement).appendChild(st)
    } catch (e) {}
  }

  /* ---------- чистая логика: flood-fill прозрачности (тестируема без DOM) ----------
     data: Buffer/Uint8Array RGBA, w/h — размеры, r/g/b — цвет фона, tol — допуск.
     Возвращает число обнулённых пикселей. */
  function floodAlpha (data, w, h, r, g, b, tol) {
    const seen = new Uint8Array(w * h)
    const tol2 = tol * tol * 3
    const stack = [0, w - 1, (h - 1) * w, h * w - 1]
    let cleared = 0
    while (stack.length) {
      const p = stack.pop()
      if (seen[p]) continue
      seen[p] = 1
      const o = p * 4
      const dr = data[o] - r, dg = data[o + 1] - g, db = data[o + 2] - b
      if ((dr * dr + dg * dg + db * db) > tol2) continue
      if (data[o + 3] !== 0) { data[o + 3] = 0; cleared++ }
      const x = p % w, y = (p / w) | 0
      if (x > 0) stack.push(p - 1)
      if (x < w - 1) stack.push(p + 1)
      if (y > 0) stack.push(p - w)
      if (y < h - 1) stack.push(p + w)
    }
    return cleared
  }

  /* ---------- убрать фон: dataURL -> dataURL PNG (выполняется в странице) ---------- */
  async function removeBackground (dataUrl, tol) {
    tol = tol == null ? 40 : tol
    const img = await new Promise((res, rej) => {
      const im = new Image()
      im.onload = () => res(im)
      im.onerror = rej
      im.src = dataUrl
    })
    const max = 1600
    const sc = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * sc))
    const h = Math.max(1, Math.round(img.height * sc))
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const cx = cv.getContext('2d', { willReadFrequently: true })
    cx.drawImage(img, 0, 0, w, h)
    const id = cx.getImageData(0, 0, w, h)
    const d = id.data
    let fr = 0, fg = 0, fb = 0, n = 0
    const corner = (x, y) => {
      const o = (y * w + x) * 4
      if (d[o + 3] < 128) return
      fr += d[o]; fg += d[o + 1]; fb += d[o + 2]; n++
    }
    corner(0, 0); corner(w - 1, 0); corner(0, h - 1); corner(w - 1, h - 1)
    if (!n) { fr = 255; fg = 255; fb = 255; n = 1 }
    floodAlpha(d, w, h, Math.round(fr / n), Math.round(fg / n), Math.round(fb / n), tol)
    cx.putImageData(id, 0, 0)
    return cv.toDataURL('image/png')
  }

  /* ---------- прячем элементы готовым CSS ---------- */
  function applyCss (css) {
    try {
      const st = document.createElement('style')
      st.setAttribute('data-vio', '1')
      st.textContent = css
      ;(document.head || document.documentElement).appendChild(st)
    } catch (e) {}
  }
  function cssCode (kind) {
    let css = ''
    try {
      css = kind === 'ad' ? window.VioBlock.AD_CSS : window.VioBlock.COOKIE_CSS
    } catch (e) {}
    if (!css) return ''
    return '(' + applyCss.toString() + ')(' + JSON.stringify(css) + ')'
  }

  /* ---------- инъектор: вызывается из renderer при dom-ready ---------- */
  function inject (wv) {
    let s = {}
    try { s = window.Store ? Store.state.settings : {} } catch (e) {}
    try {
      if (s.extTypeback !== false) wv.executeJavaScript('(' + typeback.toString() + ')()').catch(() => {})
      if (s.extEnableCopy !== false) wv.executeJavaScript('(' + enableCopy.toString() + ')()').catch(() => {})
      if (s.extAdblock !== false) { const c = cssCode('ad'); if (c) wv.executeJavaScript(c).catch(() => {}) }
      if (s.extCookies !== false) { const c = cssCode('cookie'); if (c) wv.executeJavaScript(c).catch(() => {}) }
    } catch (e) {}
  }

  window.VioContent = { typeback, enableCopy, floodAlpha, removeBackground, inject, applyCss, cssCode }
})()
