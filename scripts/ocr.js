/* Vio — OCR: распознать русский/английский текст с картинки (Tesseract, бесплатно, без ключа) */
(function () {
  const CDNS = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js'
  ]
  let loading = null

  function toast (msg, icon) {
    try { if (window.App && App.toast) App.toast(msg, icon || 'image') } catch (e) {}
  }

  function cacheUrl () {
    try {
      const key = 'vio.ocr.cache.v1'
      if (!window.localStorage) return null
      return window.localStorage.getItem(key)
    } catch (e) { return null }
  }

  function saveCache (url) {
    try {
      if (!window.localStorage) return
      window.localStorage.setItem('vio.ocr.cache.v1', url)
    } catch (e) {}
  }

  function loadScript (src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = src
      s.onload = () => (window.Tesseract ? res() : rej(new Error('lib')))
      s.onerror = () => rej(new Error('lib'))
      document.head.appendChild(s)
      setTimeout(() => rej(new Error('timeout')), 45000)
    })
  }

  function ensureLib () {
    if (window.Tesseract) return Promise.resolve()
    if (loading) return loading
    const ordered = []
    const cached = cacheUrl()
    if (cached) ordered.push(cached)
    for (const c of CDNS) if (c !== cached) ordered.push(c)
    loading = (async () => {
      let last = null
      for (const src of ordered) {
        try {
          await loadScript(src)
          saveCache(src)
          return
        } catch (e) { last = e }
      }
      throw last || new Error('lib')
    })().catch(e => { loading = null; throw e })
    return loading
  }

  function downscale (dataUrl, maxSide) {
    maxSide = maxSide || 2000
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const sc = Math.min(1, maxSide / Math.max(img.width, img.height))
          if (sc >= 1) return resolve(dataUrl)
          const cv = document.createElement('canvas')
          cv.width = Math.round(img.width * sc)
          cv.height = Math.round(img.height * sc)
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
          resolve(cv.toDataURL('image/jpeg', 0.92))
        } catch (e) { resolve(dataUrl) }
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  async function read (dataUrl) {
    await ensureLib()
    const small = await downscale(dataUrl)
    const out = await window.Tesseract.recognize(small, ['rus', 'eng'])
    const text = out && out.data && typeof out.data.text === 'string' ? out.data.text.trim() : ''
    return text
  }

  /* размеры картинки (для пересчёта координат OCR на координаты страницы) */
  function measure (src) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.width, h: img.height })
      img.onerror = () => resolve({ w: 0, h: 0 })
      img.src = src
    })
  }

  function wordsFrom (data) {
    const out = []
    try {
      const blocks = (data && data.blocks) || []
      for (let i = 0; i < blocks.length; i++) {
        const paras = (blocks[i] && blocks[i].paragraphs) || []
        for (let j = 0; j < paras.length; j++) {
          const words = (paras[j] && paras[j].words) || []
          for (let k = 0; k < words.length; k++) {
            const t = String(words[k].text || '').trim()
            const b = words[k].bbox
            if (t && b) out.push({ text: t, x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 })
          }
        }
      }
    } catch (e) {}
    return out
  }

  /* текст + координаты слов: координаты приведены к исходной картинке */
  async function readFull (dataUrl) {
    await ensureLib()
    const small = await downscale(dataUrl)
    const out = await window.Tesseract.recognize(small, ['rus', 'eng'])
    const data = (out && out.data) || {}
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    let words = wordsFrom(data)
    if (words.length && small !== dataUrl) {
      const a = await measure(dataUrl)
      const b = await measure(small)
      if (a.w && b.w && b.w !== a.w) {
        const k = a.w / b.w
        words = words.map(w => ({ text: w.text, x: Math.round(w.x * k), y: Math.round(w.y * k), w: Math.round(w.w * k), h: Math.round(w.h * k) }))
      }
    }
    return { text, words }
  }

  async function readFromUrl (srcURL) {
    toast('Качаю картинку…', 'image')
    let f = null
    try { f = await vio.fetchBytes(srcURL) } catch (e) {}
    if (!f || !f.data) throw new Error('download')
    const mime = typeof f.type === 'string' && f.type.indexOf('image/') === 0 ? f.type.split(';')[0] : 'image/png'
    toast('Распознаю текст (первый раз дольше)…', 'search')
    return read('data:' + mime + ';base64,' + f.data)
  }

  window.VioOCR = { read, readFull, readFromUrl, ensureLib }
})()
