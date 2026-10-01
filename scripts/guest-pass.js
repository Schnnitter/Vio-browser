/* Гостевой preload веб-вью: автозаполнение и сохранение паролей.
   Изолированный мир — страница не видит ipcRenderer и не может подделать запрос.
   Общение с хостом: sendToHost → renderer слушает ipc-message и ходит в main. */
const { ipcRenderer } = require('electron')
try {
  if (process.env && process.env.VIO_SMOKE) {
    console.log('[guest-pass] loaded ' + location.href)
    setTimeout(() => { try { ipcRenderer.sendToHost('vio-pass-test', { href: location.href }) } catch (e) {} }, 300)
  }
} catch (e) {}

function here () {
  try {
    const u = new URL(location.href)
    return { origin: u.origin, host: u.hostname.replace(/^www\./, ''), ok: /^https?:$/.test(u.protocol) }
  } catch (e) { return { origin: '', host: '', ok: false } }
}

let creds = []
let asked = false
let pending = null

function ask () {
  const h = here()
  if (asked || !h.ok) return
  asked = true
  try { ipcRenderer.sendToHost('vio-pass-need', { origin: h.origin }) } catch (e) {}
}

function send (ch, payload) {
  const h = here()
  if (!h.ok) return
  try { ipcRenderer.sendToHost(ch, payload) } catch (e) {}
}

function isPasswordField (el) {
  return !!el && el.tagName === 'INPUT' && String(el.type || '').toLowerCase() === 'password'
}

function findPassword (root) {
  const scope = root || document
  const act = document.activeElement
  if (isPasswordField(act)) return act
  const list = (scope.querySelectorAll ? scope.querySelectorAll('input[type=password]') : [])
  for (const p of list) if (!p.disabled && !p.readOnly) return p
  return null
}

function findUser (scope) {
  if (!scope || !scope.querySelectorAll) return null
  const sel = 'input[autocomplete="username"],input[type=email],input[type=text],input[type=tel],input:not([type])'
  const all = Array.prototype.slice.call(scope.querySelectorAll(sel))
  for (const el of all) if (!el.disabled && !el.readOnly) return el
  return null
}

function fill () {
  if (!creds.length) return
  const pw = findPassword()
  if (!pw || pw.value || pw.disabled || pw.readOnly) return
  if ((pw.getAttribute('autocomplete') || '').toLowerCase() === 'new-password') return
  const c = creds[0]
  const form = pw.form || null
  try {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    if (form) {
      const u = findUser(form)
      if (u && !u.value && c.username) setter.call(u, c.username)
    }
    setter.call(pw, c.password)
    pw.dispatchEvent(new Event('input', { bubbles: true }))
    pw.dispatchEvent(new Event('change', { bubbles: true }))
  } catch (e) {}
}

function grab () {
  const pw = findPassword()
  if (!pw || !pw.value || pw.disabled || pw.readOnly) return
  if ((pw.getAttribute('autocomplete') || '').toLowerCase() === 'new-password') return
  if (pw.value.length > 400) return
  const form = pw.form || document
  const u = findUser(form)
  const rec = { origin: here().origin, username: u ? String(u.value || '').slice(0, 200) : '', password: String(pw.value) }
  const last = pending
  if (last && last.password === rec.password && Date.now() - last.ts < 4000) return
  pending = { password: rec.password, ts: Date.now() }
  send('vio-pass-save', rec)
}

ipcRenderer.on('vio-pass-data', (e, list) => {
  creds = Array.isArray(list) ? list : []
  if (creds.length) { try { fill() } catch (err) {} }
})

/* автозаполнение — когда пользователь дотронулся до поля пароля */
document.addEventListener('focusin', (e) => {
  if (isPasswordField(e.target)) { ask(); fill() }
}, true)
document.addEventListener('mousedown', (e) => {
  if (isPasswordField(e.target)) { ask(); fill() }
}, true)

/* сохранение — отправка формы или нажатие кнопки отправки */
document.addEventListener('submit', () => { try { grab() } catch (e) {} }, true)
document.addEventListener('click', (e) => {
  try {
    const t = e.target
    const b = t && t.closest && t.closest('button,input[type=submit],input[type=image],[role=button]')
    if (b) grab()
  } catch (e) {}
}, true)

ask()
