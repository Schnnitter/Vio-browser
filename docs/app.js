(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- theme ---------------- */
  var root = document.documentElement;
  var sun = document.getElementById('ic-sun');
  var moon = document.getElementById('ic-moon');

  function apply(t) {
    root.dataset.theme = t;
    sun.hidden = t === 'dark';
    moon.hidden = t !== 'dark';
  }

  var saved = null;
  try { saved = localStorage.getItem('vio-theme'); } catch (e) {}
  apply(saved || 'dark');

  document.getElementById('theme').addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('vio-theme', next); } catch (e) {}
  });

  /* ---------------- reveal on scroll ---------------- */
  var items = document.querySelectorAll(
    'main .sec-head, main .desc, main .grid, main .tbl-wrap, main .set-card, main .code,' +
    ' main .chips, main .callout, main .hint, main .flow, main .list,' +
    ' main h3, main h4, main p.lead-p, main .hash, footer'
  );
  var lastSec = null;
  var idx = 0;
  var pending = [];
  items.forEach(function (el) {
    var sec = el.closest('section') || document.body;
    if (sec !== lastSec) { lastSec = sec; idx = 0; }
    el.classList.add('reveal');
    if (!el.hasAttribute('data-d')) el.setAttribute('data-d', String(Math.min(idx, 5)));
    idx++;
    pending.push(el);
  });

  function sweep(force) {
    var vh = window.innerHeight;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (force || r.top < vh - 50) { el.classList.add('in'); return false; }
      return true;
    });
  }

  var ticking = false;
  function onReveal() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { sweep(false); ticking = false; });
  }
  addEventListener('scroll', onReveal, { passive: true });
  addEventListener('resize', onReveal);
  sweep(false);
  setTimeout(function () {
    if (!document.querySelector('.reveal.in')) sweep(true);
  }, 1500);

  /* ---------------- scroll progress ---------------- */
  var bar = document.getElementById('progress');
  function onScroll() {
    var d = document.documentElement;
    var max = (d.scrollHeight - d.clientHeight) || 1;
    bar.style.width = Math.min(100, (d.scrollTop / max) * 100) + '%';
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- hero mock: mouse tilt ---------------- */
  var stage = document.getElementById('stage');
  var mock = document.getElementById('heroMock');
  if (stage && mock && !reduced && matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      mock.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      mock.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
    });
    stage.addEventListener('mouseleave', function () {
      mock.style.setProperty('--ry', '0deg');
      mock.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------------- omnibox typewriter ---------------- */
  var omni = document.getElementById('omniText');
  if (omni && !reduced) {
    var words = [
      'vio://newtab',
      'youtube.com',
      'store.steampowered.com',
      'mail.google.com',
      'github.com/Schnnitter/Vio-browser'
    ];
    var wi = 0, ci = 0, del = false;
    (function tick() {
      var w = words[wi];
      ci += del ? -1 : 1;
      omni.textContent = w.slice(0, ci);
      var t = del ? 35 : 70;
      if (!del && ci === w.length) { del = true; t = 2100; }
      else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; t = 420; }
      setTimeout(tick, t);
    })();
  }

  /* ---------------- hero mock: tab / page switch ---------------- */
  if (mock && !reduced) {
    var tabs = mock.querySelectorAll('.mtab');
    var panes = mock.querySelectorAll('.pane');
    var all = Array.prototype.slice.call(tabs);
    var k = 0;
    setInterval(function () {
      var vis = all.filter(function (t) { return t.offsetParent !== null; });
      if (vis.length < 2) return;
      k = (k + 1) % vis.length;
      var active = vis[k];
      all.forEach(function (t) { t.classList.toggle('active', t === active); });
      var pi = all.indexOf(active);
      Array.prototype.forEach.call(panes, function (p, j) { p.classList.toggle('on', j === pi); });
    }, 4600);
  }

  /* ---------------- github stats ---------------- */
  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  fetch('https://api.github.com/repos/Schnnitter/Vio-browser')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      if (typeof d.stargazers_count === 'number') set('st-stars', String(d.stargazers_count));
      if (typeof d.open_issues_count === 'number') set('st-issues', String(d.open_issues_count));
      if (d.archived) set('st-status', 'Archived');
    })
    .catch(function () {});

  fetch('https://api.github.com/repos/Schnnitter/Vio-browser/releases/latest')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.tag_name) set('st-version', d.tag_name); })
    .catch(function () {});
})();
