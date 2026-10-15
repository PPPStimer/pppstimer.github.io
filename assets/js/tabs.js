(function () {
  var tabs = document.querySelectorAll('.tab');
  function show(id) {
    tabs.forEach(function (t) {
      var on = t.dataset.tab === id;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== id; });
    history.replaceState(null, '', '#' + id);
    document.querySelectorAll('.carousel').forEach(function (c) { c._go && c._go(0); });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.tab); }); });
  var h = location.hash.slice(1);
  if (h && document.getElementById(h)) show(h);
})();

document.querySelectorAll('.carousel').forEach(function (c) {
  var track = c.querySelector('.carousel__track');
  var n = track.children.length, i = 0, paused = false, timer;
  var dotsBox = c.querySelector('.carousel__dots');
  var dots = Array.prototype.map.call(track.children, function (_, k) {
    var b = document.createElement('button');
    b.setAttribute('aria-label', 'Go to slide ' + (k + 1));
    b.addEventListener('click', function () { go(k); restart(); });
    dotsBox.appendChild(b);
    return b;
  });
  function go(k) {
    i = (k + n) % n;
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    dots.forEach(function (d, x) { d.classList.toggle('is-active', x === i); });
  }
  function restart() {
    clearInterval(timer);
    var ms = +c.dataset.autoplay || 0;
    if (ms > 0 && n > 1) timer = setInterval(function () { if (!paused) go(i + 1); }, ms);
  }
  c.querySelector('.carousel__btn--prev').addEventListener('click', function () { go(i - 1); restart(); });
  c.querySelector('.carousel__btn--next').addEventListener('click', function () { go(i + 1); restart(); });
  c.addEventListener('mouseenter', function () { paused = true; });
  c.addEventListener('mouseleave', function () { paused = false; });
  c._go = function (k) { go(k); restart(); };
  go(0); restart();
});

document.querySelectorAll('.copy').forEach(function (b) {
  b.addEventListener('click', function () {
    navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy);
    b.textContent = 'Copied';
    setTimeout(function () { b.textContent = 'Copy'; }, 1500);
  });
});

(function () {
  var root = document.documentElement, btns = document.querySelectorAll('[data-theme-set]');
  function apply(t) {
    if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
    try { localStorage.setItem('soft-theme', t); } catch (e) {}
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.themeSet === t); });
  }
  var saved = 'auto';
  try { saved = localStorage.getItem('soft-theme') || 'auto'; } catch (e) {}
  apply(saved);
  btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.themeSet); }); });
})();

// Live data from GitHub Releases (falls back to _data/softs.yml if unavailable)
document.querySelectorAll('.panel[data-repo]').forEach(function (panel) {
  var repo = panel.dataset.repo, pick = panel.dataset.asset || '';
  if (!repo || /(^|\/)USER\//.test(repo + '/') || repo.indexOf('USER') === 0) return;
  var key = 'gh-rel:' + repo, TTL = 10 * 60 * 1000;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(n) { return panel.querySelector('[data-gh="' + n + '"]'); }
  function render(rel) {
    rel = rel.filter(function (x) { return !x.draft; });
    if (!rel.length) return;
    var latest = rel.filter(function (x) { return !x.prerelease; })[0] || rel[0];
    var asset = latest.assets.filter(function (a) { return a.name.indexOf(pick) !== -1; })[0] || latest.assets[0];
    var total = rel.reduce(function (n, x) { return n + x.assets.reduce(function (m, a) { return m + a.download_count; }, 0); }, 0);
    $('version').textContent = latest.tag_name;
    if (asset) {
      $('size').textContent = (asset.size / 1048576).toFixed(1) + ' MB';
      $('file').textContent = asset.name;
      $('href').href = asset.browser_download_url;
    } else {
      $('href').href = latest.zipball_url;
    }
    var d = $('downloads');
    d.textContent = ' · ' + total.toLocaleString('en-US') + ' downloads';
    d.hidden = false;
    var log = $('changelog');
    if (log) log.innerHTML = rel.slice(0, 5).map(function (x) {
      var items = (x.body || '').split(/\r?\n/).map(function (l) { return l.trim().replace(/^([-*+]|#+)\s+/, '').replace(/\*\*/g, ''); })
        .filter(Boolean).slice(0, 8).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
      return '<div class="release"><span class="release__v">' + esc(x.tag_name) + '</span><span class="meta">' +
        esc((x.published_at || '').slice(0, 10)) + '</span><ul>' + items + '</ul></div>';
    }).join('');
  }
  try {
    var c = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (c && Date.now() - c.t < TTL) return render(c.d);
  } catch (e) {}
  fetch('https://api.github.com/repos/' + repo + '/releases?per_page=10')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      render(d);
    })
    .catch(function () {});
});
