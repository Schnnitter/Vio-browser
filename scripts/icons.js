/* Vio icons — простые SVG-пиктограммы (stroke, 24x24) + логотип */
(function () {
  let uid = 0

  const P = {
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    fwd: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 4.5v4.2h-4.2"/>',
    stop: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    home: '<path d="M3.6 11.2 12 4l8.4 7.2"/><path d="M6 10.2V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.8"/>',
    star: '<path d="m12 4 2.5 5.1 5.6.8-4.1 4 1 5.6L12 16.8 6.9 19.5l1-5.6-4.1-4 5.6-.8z"/>',
    starFill: '<path d="m12 4 2.5 5.1 5.6.8-4.1 4 1 5.6L12 16.8 6.9 19.5l1-5.6-4.1-4 5.6-.8z" fill="currentColor"/>',
    panel: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
    bookmark: '<path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4.3L5.5 20V5a1 1 0 0 1 1-1z"/>',
    history: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 1.8"/>',
    download: '<path d="M12 4v10"/><path d="m8 10.5 4 4 4-4"/><path d="M5 19h14"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    private: '<circle cx="7.6" cy="13.6" r="3.4"/><circle cx="16.4" cy="13.6" r="3.4"/><path d="M11 13.6h2"/><path d="M4.4 9.6c2.2-1.9 4.9-2.9 7.6-2.9s5.4 1 7.6 2.9"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m19.5 19.5-4.4-4.4"/>',
    lock: '<rect x="4.8" y="10.2" width="14.4" height="9.6" rx="2.2"/><path d="M8.2 10.2V7.8a3.8 3.8 0 0 1 7.6 0v2.4"/>',
    globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c2.4 2.4 3.4 5.3 3.4 8s-1 5.6-3.4 8c-2.4-2.4-3.4-5.3-3.4-8S9.6 6.4 12 4z"/>',
    info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    trash: '<path d="M4.5 7h15"/><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="m6.5 7 1 12.2A1.8 1.8 0 0 0 9.3 21h5.4a1.8 1.8 0 0 0 1.8-1.8L17.5 7"/>',
    check: '<path d="m5 12.8 4.4 4.4L19 7.6"/>',
    external: '<path d="M14 4h6v6"/><path d="m20 4-8.5 8.5"/><path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10"/>',
    folder: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    eye: '<path d="M2.5 12S6.3 6 12 6s9.5 6 9.5 6-3.8 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 1.6-1.9-.4-1 .2-2.1 1.4-2.1H18a3 3 0 0 0 3-3c0-5.5-4-9.9-9-9.9z"/><circle cx="8" cy="10.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="10.5" r="1.1" fill="currentColor" stroke="none"/>',
    keyboard: '<rect x="2.8" y="6.5" width="18.4" height="11" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M6.5 13.5h11"/>',
    zap: '<path d="M13.2 3 5.5 13.4h5.6L10.4 21l7.9-10.6h-5.7z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"/>',
    moon: '<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    shield: '<path d="M12 3.5 19 6.3v5.4c0 4.3-2.9 7.5-7 8.8-4.1-1.3-7-4.5-7-8.8V6.3z"/>',
    mask: '<path d="M4 9.5c2.5-1.7 5.2-2.5 8-2.5s5.5.8 8 2.5"/><path d="M6.5 10.4c.4 3.7 2.4 6 5.5 6s5.1-2.3 5.5-6"/>',
    minus: '<path d="M5.5 12h13"/>',
    max: '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/>',
    restore: '<path d="M7 7.5h9.5V17"/><rect x="4.5" y="10" width="9.5" height="9.5" rx="1.5"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 1.8"/>',
    layers: '<path d="m12 3.5 8.5 4.5L12 12.5 3.5 8z"/><path d="m4.5 12.5 7.5 4 7.5-4"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.8" cy="9.6" r="1.6"/><path d="m4.5 17 4.8-4.5 3.4 3 3-2.6 3.8 3.6"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    sparkle: '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.5 5-5 2.5 2.5-5z"/>',
    stack: '<rect x="5" y="7" width="14" height="11" rx="2"/><path d="M3 5.5h18"/><path d="M3 18.5h18"/>',
    save: '<path d="M5 5.5h11l3 3V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/><path d="M8 5.5v4h6v-4"/><path d="M8 20v-5h8v5"/>',
    window: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17"/>',
    globeSmall: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>',
    power: '<path d="M12 4v7"/><path d="M17.7 7A8 8 0 1 1 6.3 7"/>',
    clockRewind: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.2h4.2"/><path d="M12 8v4.3l2.8 1.7"/>',
    bug: '<rect x="8" y="7.5" width="8" height="11" rx="4"/><path d="M8 12H4.5M19.5 12H16M8.6 8.2 6 6M15.4 8.2 18 6M8.6 17.2 6 19.5M15.4 17.2 18 19.5"/>',
    search2: '<circle cx="11" cy="11" r="6"/>',
    link: '<path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/>',
    chevron: '<path d="m6 9.5 6 6 6-6"/>',
    apps: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M8.5 21h7"/>',
    volume: '<path d="M11 5 6.5 8.5H3.5v7h3L11 19z"/><path d="M14.8 9.2a4 4 0 0 1 0 5.6"/><path d="M17.4 6.6a7.5 7.5 0 0 1 0 10.8"/>',
    volumeOff: '<path d="M11 5 6.5 8.5H3.5v7h3L11 19z"/><path d="m15.5 9.5 5 5M20.5 9.5l-5 5"/>',
    list: '<path d="M8.5 6.5h11.5M8.5 12h11.5M8.5 17.5h11.5"/><circle cx="4.4" cy="6.5" r="1.2"/><circle cx="4.4" cy="12" r="1.2"/><circle cx="4.4" cy="17.5" r="1.2"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.6 3.6V16H6.5A2.5 2.5 0 0 1 4 13.5z"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    robot: '<rect x="4.5" y="7.5" width="15" height="11" rx="3"/><path d="M12 4.5v3"/><circle cx="12" cy="4" r="1.3"/><circle cx="9.3" cy="12.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.7" cy="12.5" r="1.2" fill="currentColor" stroke="none"/><path d="M9.8 15.6h4.4"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7.5" rx="1.8"/><path d="M7 14h10v6H7z"/>',
    pip: '<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><rect x="11.5" y="11.5" width="7" height="6" rx="1.2"/>',
    book: '<path d="M4 5.5A2 2 0 0 1 6 3.5h5v17H6a2 2 0 0 0-2 2z"/><path d="M20 5.5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>',
    brain: '<path d="M12 3a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3V7a4 4 0 0 0-4-4z"/><path d="M9 9a2 2 0 0 1 2-2"/><path d="M13 15a2 2 0 0 1-2 2"/>'
  }

  function ico (name, cls) {
    const d = P[name]
    if (!d) return ''
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ''}>${d}</svg>`
  }

  function logo (size, cls) {
    const id = 'vg' + (++uid)
    return `<svg width="${size || 24}" height="${size || 24}" viewBox="0 0 64 64" class="${cls || ''}" aria-label="Vio">
      <defs>
        <linearGradient id="${id}" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FF9B4F"/>
          <stop offset=".52" stop-color="#FF8A3D"/>
          <stop offset="1" stop-color="#7FC99B"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#${id})"/>
      <path d="M16 19.5c0-1.4 1.7-2.1 2.7-1.1L32 38.4l13.3-20c1-1 2.7-.3 2.7 1.1v1.6c0 .8-.4 1.6-1.1 2L34.6 46.6c-1 1.1-2.7 1.1-3.7 0L17.1 23.1c-.7-.9-1.1-1.6-1.1-2z" fill="#fff" fill-opacity=".95"/>
      <circle cx="46.5" cy="17.5" r="4.5" fill="#fff" fill-opacity=".75"/>
    </svg>`
  }

  window.ICON = ico
  window.LOGO = logo
  window.PAL = P
})()
