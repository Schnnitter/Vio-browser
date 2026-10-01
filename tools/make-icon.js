/* Генерация assets/icon.png и assets/icon.ico из логотипа Vio
   Запуск: npx electron tools/make-icon.js   (или node_modules\electron\dist\electron.exe tools\make-icon.js) */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const SIZE = 256

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FF9B4F"/><stop offset=".52" stop-color="#FF8A3D"/><stop offset="1" stop-color="#7FC99B"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  <path d="M16 19.5c0-1.4 1.7-2.1 2.7-1.1L32 38.4l13.3-20c1-1 2.7-.3 2.7 1.1v1.6c0 .8-.4 1.6-1.1 2L34.6 46.6c-1 1.1-2.7 1.1-3.7 0L17.1 23.1c-.7-.9-1.1-1.6-1.1-2z" fill="#fff" fill-opacity=".95"/>
  <circle cx="46.5" cy="17.5" r="4.5" fill="#fff" fill-opacity=".75"/>
</svg>`

function pngToIco (pngBuf, size) {
  const header = Buffer.alloc(6 + 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header.writeUInt8(size >= 256 ? 0 : size, 6)
  header.writeUInt8(size >= 256 ? 0 : size, 7)
  header.writeUInt8(0, 8)
  header.writeUInt8(0, 9)
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(pngBuf.length, 14)
  header.writeUInt32LE(22, 18)
  return Buffer.concat([header, pngBuf])
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { backgroundThrottling: false }
  })

  const html = `<!DOCTYPE html><html><head><style>
    html,body{margin:0;padding:0;width:${SIZE}px;height:${SIZE}px;background:transparent;overflow:hidden}
    svg{display:block}
  </style></head><body>${LOGO}</body></html>`

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise(r => setTimeout(r, 400))

  const captured = await win.webContents.capturePage()
  const native = require('electron').nativeImage.createFromBuffer(captured.toPNG())
  const size = native.getSize()
  const scaled = (size.width === SIZE && size.height === SIZE)
    ? native
    : native.resize({ width: SIZE, height: SIZE, quality: 'good' })
  const png = scaled.toPNG()
  const dir = path.join(__dirname, '..', 'assets')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'icon.png'), png)
  fs.writeFileSync(path.join(dir, 'icon.ico'), pngToIco(png, SIZE))
  console.log('[icon] written:', path.join(dir, 'icon.png'), 'and icon.ico (' + png.length + ' bytes png)')

  app.exit(0)
})
