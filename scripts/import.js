/* Импорт из другого браузера (renderer-часть): показывает найденные профили,
   запускает чтение в main и сливает результат в Store. Первый запуск —
   предложение перенести данные (можно пропустить, больше не спрашиваем). */
(function () {
  function esc (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  }

  async function detect () {
    try { return await vio.importDetect() } catch (e) { return [] }
  }

  async function fillSelect (root) {
    const sel = root.querySelector('#imp-browser')
    if (!sel) return
    /* на случай гонок: если селект уже заменили на кастомную кнопку — не ломаемся */
    if (String(sel.tagName || '').toUpperCase() !== 'SELECT') return
    const list = await detect()
    if (!list.length) {
      sel.innerHTML = '<option value="">Поддерживаемые браузеры не найдены</option>'
      sel.disabled = true
      return
    }
    sel.innerHTML = list.map(b =>
      `<optgroup label="${esc(b.name)}">` +
      b.profiles.map(p => `<option value="${esc(b.id)}|${esc(p.id)}">${esc(p.name)}</option>`).join('') +
      '</optgroup>'
    ).join('')
  }

  function mergeBookmarks (list) {
    if (!list || !list.length) return 0
    const have = new Set(Store.state.bookmarks.map(b => b.url))
    let n = 0
    for (const b of list) {
      if (!b || !b.url || have.has(b.url)) continue
      have.add(b.url)
      Store.state.bookmarks.push({ url: b.url, title: b.title || b.url, fav: '', ts: Date.now() })
      n++
    }
    if (n) Store.saveBookmarks()
    return n
  }

  function mergeHistory (list) {
    if (!list || !list.length) return 0
    const map = new Map(Store.state.history.map(h => [h.url, h]))
    for (const h of list) {
      if (!h || !/^https?:/i.test(h.url || '')) continue
      const cur = map.get(h.url)
      if (cur) { cur.ts = Math.max(cur.ts || 0, h.ts || 0); continue }
      const rec = { url: h.url, title: h.title || h.url, fav: '', ts: h.ts || Date.now(), count: 1 }
      map.set(h.url, rec)
      Store.state.history.push(rec)
    }
    Store.state.history.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    const lim = Store.state.settings.historyLimit || 500
    if (Store.state.history.length > lim) Store.state.history.length = lim
    Store.saveHistory()
    return map.size
  }

  /* список сохранённых паролей: показать/скрыть и удалить */
  async function fillPasswords (root) {
    const box = root.querySelector('#pass-list')
    const cnt = root.querySelector('#pass-count')
    if (!box) return
    let list = []
    try { list = await vio.passAll() } catch (e) {}
    if (cnt) cnt.textContent = list.length ? list.length + ' шт.' : 'пусто'
    if (!list.length) {
      box.innerHTML = '<div class="pass-empty">Пока пусто. Vio предложит сохранить пароль, когда вы войдёте на сайт.</div>'
      return
    }
    box.innerHTML = list.map((x) => `
      <div class="pass-row" data-i="${Number(x.i) || 0}">
        <span class="pass-host">${esc(x.host || x.origin || '')}</span>
        <span class="pass-user">${esc(x.username || '—')}</span>
        <input class="pass-val" type="password" readonly value="${esc(x.password || '')}">
        <button type="button" class="pass-act pass-eye" title="Показать пароль">ок</button>
        <button type="button" class="pass-act pass-del" title="Удалить">×</button>
      </div>`).join('')
    if (box._wired) return
    box._wired = true
    box.addEventListener('click', async (e) => {
      const row = e.target.closest && e.target.closest('.pass-row')
      if (!row) return
      if (e.target.classList.contains('pass-eye')) {
        const inp = row.querySelector('.pass-val')
        if (inp) inp.type = inp.type === 'password' ? 'text' : 'password'
        return
      }
      if (e.target.classList.contains('pass-del')) {
        const host = (row.querySelector('.pass-host') || {}).textContent || ''
        const yes = await App.dialog('Удалить пароль для ' + host + '?', [], 'Удалить', true)
        if (!yes) return
        const r = await vio.passDel(Number(row.dataset.i))
        if (r && r.ok) { App.toast('Пароль удалён'); fillPasswords(root) }
        else App.toast('Не удалилось: ' + ((r && r.error) || ''))
      }
    })
  }

  async function run (root) {
    const sel = root.querySelector('#imp-browser')
    const out = root.querySelector('#imp-out')
    if (!sel || !out || !sel.value) { if (out) out.textContent = 'Сначала выберите источник'; return }
    const i = sel.value.indexOf('|')
    const browser = sel.value.slice(0, i)
    const profile = sel.value.slice(i + 1)
    const what = []
    if (root.querySelector('#imp-bookmarks').checked) what.push('bookmarks')
    if (root.querySelector('#imp-history').checked) what.push('history')
    if (root.querySelector('#imp-pass').checked) what.push('passwords')
    if (!what.length) { out.textContent = 'Отметьте, что переносить'; return }
    out.textContent = 'Импортирую…'
    let r
    try { r = await vio.importRun({ browser, profile, what }) } catch (e) { r = { ok: false, error: String(e.message || e) } }
    if (!r || !r.ok) { out.textContent = 'Ошибка: ' + ((r && r.error) || 'неизвестная'); return }
    const res = r.res
    const nb = mergeBookmarks(res._bookmarks)
    const nh = mergeHistory(res._history)
    delete res._bookmarks
    delete res._history
    const parts = []
    if (what.indexOf('bookmarks') >= 0) parts.push('закладки: +' + nb)
    if (what.indexOf('history') >= 0) parts.push('история: ' + res.history + ' найдено')
    if (what.indexOf('passwords') >= 0) parts.push('пароли: +' + (res.stored || 0))
    out.textContent = res.browser + ' / ' + res.profile + ' — ' + parts.join(', ')
    if (res.notes && res.notes.length) out.textContent += '. ' + res.notes.join('. ')
    /* перерисовка настроек убила бы только что выведенное сообщение —
       обновляем только то, что зависит от закладок */
    try { if (window.App && App.renderBookmarksBar) App.renderBookmarksBar() } catch (e) {}
    fillPasswords(root)
  }

  function wire (root) {
    fillSelect(root)
    fillPasswords(root)
    const b = root.querySelector('#imp-run')
    if (b) b.addEventListener('click', () => run(root))
  }

  /* предложение перенести данные при первом запуске */
  function onboarding () {
    try {
      if (localStorage.getItem('vio.onboard.v1')) return
      localStorage.setItem('vio.onboard.v1', '1')
      const browsers = detect()
      browsers.then(list => {
        if (!list.length) return
        if (!window.App || !App.dialog) return
        App.dialog(
          'Перенести данные из прошлого браузера?',
          [{ key: 'note', label: 'Найдено: ' + list.map(b => b.name).join(', ') + '. Импорт идёт локально — закладки, история и пароли останутся на этом устройстве.' }],
          'Открыть импорт'
        ).then(v => { if (v && App.openSettings) App.openSettings('import') })
      }).catch(() => {})
    } catch (e) {}
  }

  window.VioImport = { wire, detect, onboarding, mergeBookmarks, mergeHistory }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onboarding)
  else setTimeout(onboarding, 300)
})()
