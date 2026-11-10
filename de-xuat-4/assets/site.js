(function () {
  'use strict';
  var MS = [{"at": "2026-12-01T00:00:00+07:00", "label": "Mở đăng ký đội SAFE ACTION và SAFE TECH", "date": "01/12/2026"}, {"at": "2027-01-10T00:00:00+07:00", "label": "Công bố đề bài SAFE TECH", "date": "10/01/2027"}, {"at": "2027-01-11T00:00:00+07:00", "label": "Phát động và mở bộ quiz SAFE SCHOOL đầu tiên", "date": "11/01/2027"}, {"at": "2027-02-28T00:00:00+07:00", "label": "Hai mốc cập nhật tiến độ của đội thi", "date": "28/02/2027"}, {"at": "2027-03-13T00:00:00+07:00", "label": "Hai mốc cập nhật tiến độ của đội thi", "date": "13/03/2027"}, {"at": "2027-04-04T00:00:00+07:00", "label": "Kết thúc quiz và hạn nộp hồ sơ dự thi", "date": "04/04/2027"}, {"at": "2027-04-13T00:00:00+07:00", "label": "Công bố kết quả vòng loại và các trường dẫn đầu", "date": "13/04/2027"}, {"at": "2027-04-25T00:00:00+07:00", "label": "Ngày hội chung kết SAFE MOVE 2027", "date": "25/04/2027"}];
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var now = new Date();

  // Menu on phones
  var openBtn = $('[data-menu-open]'), drawer = $('#mobile-menu');
  if (openBtn && drawer) {
    openBtn.addEventListener('click', function () {
      var open = drawer.hidden; drawer.hidden = !open;
      openBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !drawer.hidden) { drawer.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); }
    });
  }

  // Light / dark (proposed look only)
  var themeBtn = $('[data-theme-toggle]');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('sm-theme', dark ? 'dark' : 'light'); } catch (e) {}
  });

  // Season timeline states follow the viewer's clock
  var lists = new Map();
  $$('[data-tl]').forEach(function (li) {
    if (!lists.has(li.parentNode)) lists.set(li.parentNode, []);
    lists.get(li.parentNode).push(li);
  });
  lists.forEach(function (items) {
    var nextSeen = false;
    items.forEach(function (li) {
      var ended = new Date(li.dataset.end + 'T23:59:59+07:00') <= now;
      li.dataset.state = ended ? 'past' : (nextSeen ? 'future' : 'next');
      if (!ended) nextSeen = true;
    });
  });

  // "Sắp mở" chips disappear once the date has come
  $$('[data-until]').forEach(function (el) {
    if (new Date(el.dataset.until + 'T00:00:00+07:00') <= now) el.hidden = true;
  });

  // Countdown to the next milestone
  $$('[data-countdown]').forEach(function (box) {
    var name = $('[data-cd-label]', box), date = $('[data-cd-date]', box);
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      var t = new Date();
      var next = MS.filter(function (m) { return new Date(m.at) > t; })[0];
      if (!next) { box.hidden = true; return; }
      name.textContent = next.label; date.textContent = next.date;
      var s = Math.floor((new Date(next.at) - t) / 1000);
      $('[data-cd-d]', box).textContent = pad(Math.floor(s / 86400));
      $('[data-cd-h]', box).textContent = pad(Math.floor(s % 86400 / 3600));
      $('[data-cd-m]', box).textContent = pad(Math.floor(s % 3600 / 60));
      $('[data-cd-s]', box).textContent = pad(s % 60);
    }
    tick(); setInterval(tick, 1000);
  });

  // FAQ search, ignoring Vietnamese tone marks
  function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  var q = $('#faq-q');
  if (q) {
    var runFaq = function () {
      var term = fold(q.value.trim()), any = false;
      $$('[data-faq-group]').forEach(function (g) {
        var shown = 0;
        $$('[data-faq]', g).forEach(function (d) {
          var hit = !term || fold(d.textContent).indexOf(term) > -1;
          d.hidden = !hit; if (hit) shown++;
        });
        g.hidden = !shown; if (shown) any = true;
      });
      $('#faq-empty').hidden = any;
    };
    q.addEventListener('input', runFaq);
    var go = $('[data-faq-go]'); if (go) go.addEventListener('click', runFaq);
  }
  if (location.hash === '#otp') { var o = $('#otp'); if (o) o.open = true; }

  // News category filter
  var filters = $$('[data-filter]');
  if (filters.length) {
    var ALL = filters[0].dataset.filter;
    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.dataset.filter, seen = 0;
        $$('[data-topic]').forEach(function (card) { var hit = c === ALL || card.dataset.topic === c; card.hidden = !hit; if (hit) seen++; });
        $$('[data-filter][aria-pressed]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.filter === c)); });
        $('#news-empty').hidden = seen > 0; $('#news-list').hidden = seen === 0;
      });
    });
  }

  // Multi-step forms
  $$('[data-stepper]').forEach(function (root) {
    var steps = $$('[data-step]', root), inds = $$('[data-step-ind]', root), at = 0;
    function show(n) {
      at = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, i) { s.hidden = i !== at; });
      inds.forEach(function (d, i) { d.dataset.state = i < at ? 'done' : (i === at ? 'current' : 'todo'); });
      root.scrollIntoView({ block: 'nearest' });
    }
    $$('[data-next]', root).forEach(function (b) { b.addEventListener('click', function () { show(at + 1); }); });
    $$('[data-prev]', root).forEach(function (b) { b.addEventListener('click', function () { show(at - 1); }); });
  });

  // Team member rows, at most 5 (workbook 04-018)
  $$('[data-add-member]').forEach(function (b) {
    var wrap = b.parentNode, list = $('[data-members]', wrap), tpl = $('[data-member-tpl]', wrap);
    var form = b.closest('[data-form]'), err = form && $('[data-members-error]', form);
    b.addEventListener('click', function () {
      if ($$('[data-member]', list).length >= 5) { if (err) err.hidden = false; return; }
      list.appendChild(tpl.content.cloneNode(true));
    });
  });

  // No form on these pages can send anything: buttons only explain that
  $$('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () {
      var scope = b.closest('[data-step]') || b.closest('[data-form]') || document;
      var note = $('[data-demo-note]', scope), err = $('[data-error-note]', scope);
      if (b.hasAttribute('data-check') && err) {
        var missing = $$('[data-required]', scope).some(function (f) { return f.type === 'checkbox' ? !f.checked : !f.value.trim(); });
        err.hidden = !missing; if (note) note.hidden = missing;
        return;
      }
      if (note) note.hidden = false;
    });
  });

  // Pre-select the SAFE TECH board from the link
  function pickBoard() { if (location.hash === '#bang-hoc-sinh' || location.hash === '#bang-sinh-vien') { var r = $(location.hash); if (r) r.checked = true; } }
  pickBoard(); window.addEventListener('hashchange', pickBoard);

  // Share button
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = $('[data-share-label]', b), url = location.href;
      if (navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { label.textContent = 'Đã sao chép liên kết'; });
    });
  });
})();
