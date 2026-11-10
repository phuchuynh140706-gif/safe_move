/* SAFE MOVE 2027 — Đề xuất giao diện 2 · hành vi trang (không phụ thuộc thư viện) */
(function () {
  'use strict';

  var TZ = '+07:00';
  var ROOT = document.documentElement.getAttribute('data-root') || '';
  var loadedAt = Date.now();

  /* ---------- Ngày giả lập (để xem trước trạng thái theo mùa giải) ---------- */
  var simDay = null;
  try {
    var q = new URLSearchParams(location.search).get('ngay');
    if (q === 'tat') sessionStorage.removeItem('sm-ngay');
    else if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) sessionStorage.setItem('sm-ngay', q);
    simDay = sessionStorage.getItem('sm-ngay');
  } catch (e) {
    var m = /[?&]ngay=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    simDay = m ? m[1] : null;
  }
  function now() {
    if (!simDay) return new Date();
    return new Date(new Date(simDay + 'T09:00:00' + TZ).getTime() + (Date.now() - loadedAt));
  }
  function dayStart(s) { return new Date(s + 'T00:00:00' + TZ); }
  function dayEnd(s) { return new Date(s + 'T23:59:59' + TZ); }
  function fmt(s) { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  /* ---------- Các mốc mùa giải (theo bản thảo nội dung) ---------- */
  var MILESTONES = [
    { d: '2026-12-01', t: 'Mở đăng ký đội SAFE ACTION và SAFE TECH' },
    { d: '2027-01-10', t: 'Công bố đề bài SAFE TECH' },
    { d: '2027-01-11', t: 'Phát động và mở bộ quiz SAFE SCHOOL đầu tiên' },
    { d: '2027-01-20', t: 'Đóng đăng ký đội SAFE ACTION và SAFE TECH', end: true },
    { d: '2027-02-28', t: 'Mốc cập nhật tiến độ đội thi thứ nhất' },
    { d: '2027-03-13', t: 'Mốc cập nhật tiến độ đội thi thứ hai' },
    { d: '2027-04-04', t: 'Kết thúc tính điểm quiz SAFE SCHOOL', end: true },
    { d: '2027-04-05', t: 'Hạn nộp hồ sơ dự thi', end: true },
    { d: '2027-04-13', t: 'Công bố kết quả vòng loại và các trường dẫn đầu' },
    { d: '2027-04-25', t: 'Ngày hội chung kết SAFE MOVE 2027' }
  ];
  function msTime(m) { return m.end ? dayEnd(m.d) : dayStart(m.d); }

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span></span>';
    toastEl.querySelector('span').textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 4200);
  }
  window.smToast = toast;

  /* ---------- Menu ---------- */
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      mnav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    });
  }
  document.querySelectorAll('.nav-dd > button').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var dd = b.parentElement, open = !dd.classList.contains('open');
      document.querySelectorAll('.nav-dd.open').forEach(function (x) { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
      dd.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.nav-dd.open').forEach(function (x) { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.nav-dd.open').forEach(function (x) { x.classList.remove('open'); });
    if (burger && burger.getAttribute('aria-expanded') === 'true') burger.click();
  });

  /* ---------- Hiển thị theo ngày ---------- */
  function applyGates() {
    var n = now();
    document.querySelectorAll('[data-from],[data-until]').forEach(function (el) {
      var f = el.getAttribute('data-from'), u = el.getAttribute('data-until');
      var ok = (!f || n >= dayStart(f)) && (!u || n < dayStart(u));
      el.hidden = !ok;
    });
  }

  /* Nút quiz theo thời điểm (01-005) */
  function applySeasonCta() {
    var n = now(), label, href;
    if (n < dayStart('2027-01-11')) { label = 'Đăng ký SAFE SCHOOL'; href = 'dang-ky/index.html'; }
    else if (n <= dayEnd('2027-04-04')) { label = 'Làm quiz tuần này'; href = 'safe-school/index.html#lich-quiz'; }
    else { label = 'Ôn tập kiến thức'; href = 'safe-school/index.html#lich-quiz'; }
    document.querySelectorAll('[data-season-cta]').forEach(function (a) {
      var t = a.querySelector('[data-label]') || a;
      t.textContent = label;
      a.setAttribute('href', ROOT + href);
    });
  }

  /* Trạng thái mốc: đã qua / đang diễn ra / sắp tới */
  function applyMilestones() {
    var n = now();
    document.querySelectorAll('[data-ms-list]').forEach(function (list) {
      var items = list.querySelectorAll('[data-ms]'), nextSet = false;
      items.forEach(function (el) {
        var s = el.getAttribute('data-ms'), e = el.getAttribute('data-ms-end') || s;
        var st = n > dayEnd(e) ? 'past' : (n >= dayStart(s) ? 'live' : 'up');
        el.classList.remove('is-past', 'is-live', 'is-next');
        if (st === 'past') el.classList.add('is-past');
        if (st === 'live') { el.classList.add('is-live'); nextSet = true; }
        if (st === 'up' && !nextSet) { el.classList.add('is-next'); nextSet = true; }
        var lab = el.querySelector('[data-ms-state]');
        if (lab) lab.textContent = st === 'past' ? 'Đã qua' : st === 'live' ? 'Đang diễn ra' : (el.classList.contains('is-next') ? 'Sắp tới' : 'Sắp diễn ra');
      });
    });
  }

  /* Bảng lịch 10 bộ quiz */
  function applyQuizBoard() {
    var n = now(), rows = document.querySelectorAll('[data-quiz]');
    if (!rows.length) return;
    var closed = n > dayEnd('2027-04-04'), cur = -1;
    rows.forEach(function (r, i) { if (n >= dayStart(r.getAttribute('data-quiz'))) cur = i; });
    rows.forEach(function (r, i) {
      var p = r.querySelector('.pill');
      r.classList.remove('is-live', 'is-done', 'is-past');
      if (closed) { p.textContent = 'Ôn tập'; r.classList.add('is-done'); }
      else if (i === cur) { p.textContent = 'Đang mở'; r.classList.add('is-live'); }
      else if (i < cur) { p.textContent = 'Đã mở'; r.classList.add('is-done'); }
      else { p.textContent = 'Sắp mở'; }
    });
  }

  /* ---------- Đếm ngược ---------- */
  var cds = document.querySelectorAll('[data-countdown]');
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function tick() {
    var n = now();
    cds.forEach(function (box) {
      var fixed = box.getAttribute('data-target'), target, title, date;
      if (fixed) {
        target = dayStart(fixed); date = fmt(fixed);
      } else {
        var m = null;
        for (var i = 0; i < MILESTONES.length; i++) { if (msTime(MILESTONES[i]) > n) { m = MILESTONES[i]; break; } }
        if (!m) { box.classList.add('is-over'); }
        else { target = msTime(m); title = m.t; date = fmt(m.d) + (m.end ? ' · 23:59' : ''); }
      }
      var done = box.querySelector('[data-cd-done]'), live = box.querySelector('[data-cd-live]');
      if (!target || target <= n) {
        if (done) done.hidden = false;
        if (live) live.hidden = true;
        return;
      }
      if (done) done.hidden = true;
      if (live) live.hidden = false;
      var diff = Math.floor((target - n) / 1000);
      var d = Math.floor(diff / 86400), h = Math.floor(diff % 86400 / 3600), mi = Math.floor(diff % 3600 / 60), s = diff % 60;
      var set = function (k, v) { var el = box.querySelector('[data-cd="' + k + '"]'); if (el) el.textContent = v; };
      set('d', pad(d)); set('h', pad(h)); set('m', pad(mi)); set('s', pad(s));
      var tt = box.querySelector('[data-cd-title]'), dd = box.querySelector('[data-cd-date]');
      if (tt && title && tt.textContent !== title) tt.textContent = title;
      if (dd && date) dd.textContent = date;
    });
  }

  function refreshAll() { applyGates(); applySeasonCta(); applyMilestones(); applyQuizBoard(); tick(); }
  refreshAll();
  if (cds.length) setInterval(tick, 1000);

  /* ---------- Huy hiệu ngày giả lập + điều khiển ở footer ---------- */
  var simInput = document.querySelector('[data-sim-input]');
  if (simInput) {
    simInput.value = simDay || '';
    simInput.addEventListener('change', function () {
      if (!simInput.value) return;
      try { sessionStorage.setItem('sm-ngay', simInput.value); } catch (e) {}
      location.search = '?ngay=' + simInput.value;
    });
  }
  function clearSim() {
    try { sessionStorage.removeItem('sm-ngay'); } catch (e) {}
    location.href = location.pathname + location.hash;
  }
  document.querySelectorAll('[data-sim-clear]').forEach(function (b) { b.addEventListener('click', clearSim); });
  if (simDay) {
    var badge = document.createElement('div');
    badge.className = 'sim-badge';
    badge.innerHTML = '<span>Đang xem giao diện theo ngày <b>' + fmt(simDay) + '</b></span><button type="button">Về hôm nay</button>';
    badge.querySelector('button').addEventListener('click', clearSim);
    document.body.appendChild(badge);
  }

  /* ---------- Nút thông báo (chức năng chờ kết nối) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toast]');
    if (!t) return;
    e.preventDefault();
    toast(t.getAttribute('data-toast'));
  });

  /* ---------- Sao chép / chia sẻ liên kết ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = location.href.split('?')[0];
      var done = function () { toast('Đã sao chép liên kết trang.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { toast(url); });
      else toast(url);
    });
  });
  document.querySelectorAll('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = location.href.split('?')[0];
      if (navigator.share) navigator.share({ title: document.title, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Đã sao chép liên kết để chia sẻ.'); });
    });
  });

  /* ---------- Bộ lọc dạng chip ---------- */
  document.querySelectorAll('[data-filter-for]').forEach(function (group) {
    var target = document.querySelector(group.getAttribute('data-filter-for'));
    if (!target) return;
    var empty = target.parentElement.querySelector('[data-filter-empty]');
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      group.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var key = chip.getAttribute('data-filter'), shown = 0;
      target.querySelectorAll('[data-cat]').forEach(function (it) {
        var ok = key === 'all' || it.getAttribute('data-cat').split(' ').indexOf(key) > -1;
        it.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  });

  /* ---------- Tìm kiếm hỏi đáp ---------- */
  var faqInput = document.querySelector('[data-faq-search]');
  if (faqInput) {
    var groups = document.querySelectorAll('.faq-group');
    var faqEmpty = document.querySelector('[data-faq-empty]');
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); };
    var activeGroup = 'all';
    var run = function () {
      var q = norm(faqInput.value.trim()), total = 0;
      groups.forEach(function (g) {
        var inGroup = activeGroup === 'all' || g.getAttribute('data-group') === activeGroup, n = 0;
        g.querySelectorAll('.qa').forEach(function (qa) {
          var ok = inGroup && (!q || norm(qa.textContent).indexOf(q) > -1);
          qa.hidden = !ok; if (ok) n++;
          if (q && ok) qa.open = true;
        });
        g.hidden = n === 0; total += n;
      });
      if (faqEmpty) faqEmpty.hidden = total > 0;
    };
    faqInput.addEventListener('input', run);
    var form = faqInput.closest('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    document.querySelectorAll('[data-faq-group]').forEach(function (chip, _, all) {
      chip.addEventListener('click', function () {
        all.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        activeGroup = chip.getAttribute('data-faq-group'); run();
      });
    });
  }

  /* ---------- Biểu mẫu trình diễn ---------- */
  var DEMO_MSG = 'Đây là bản giao diện tĩnh: biểu mẫu sẽ được kết nối hệ thống khi triển khai chính thức.';
  document.querySelectorAll('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var out = f.querySelector('[data-demo-result]');
      if (out) { out.hidden = false; out.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      else toast(f.getAttribute('data-demo') || DEMO_MSG);
    });
  });

  /* Tìm trường */
  document.querySelectorAll('form[data-school-search]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = f.parentElement.querySelector('[data-school-result]');
      if (box) box.hidden = false;
    });
  });

  /* ---------- Bước đăng ký (stepper) ---------- */
  document.querySelectorAll('[data-stepper]').forEach(function (st) {
    var panes = st.querySelectorAll('.pane'), navs = st.querySelectorAll('.stepper-nav li'), i = 0;
    var show = function (k, initial) {
      i = k;
      panes.forEach(function (p, j) { p.hidden = j !== k; });
      navs.forEach(function (li, j) { li.className = j < k ? 'done' : (j === k ? 'cur' : ''); });
      var nav = st.querySelector('.stepper-nav');
      if (nav) nav.hidden = k >= navs.length;
      if (initial) return;
      var first = panes[k].querySelector('input,select,button');
      if (first) first.focus({ preventScroll: true });
      st.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    st.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) {
        var ok = true;
        panes[i].querySelectorAll('input,select,textarea').forEach(function (inp) { if (ok && !inp.checkValidity()) { inp.reportValidity(); ok = false; } });
        if (ok && i < panes.length - 1) show(i + 1);
      }
      if (e.target.closest('[data-prev]') && i > 0) show(i - 1);
    });
    show(0, true);
  });

  /* ---------- Đăng nhập OTP (trình diễn) ---------- */
  var login = document.querySelector('[data-login]');
  if (login) {
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      var step2 = login.querySelector('[data-otp]');
      if (step2.hidden) {
        if (!login.reportValidity()) return;
        step2.hidden = false;
        login.querySelector('[data-send]').hidden = true;
        var phone = login.querySelector('input[type=tel]').value.replace(/\s/g, '');
        var masked = phone.length > 4 ? phone.slice(0, 3) + '****' + phone.slice(-3) : phone;
        login.querySelector('[data-masked]').textContent = masked;
        step2.querySelector('input').required = true;
        step2.querySelector('input').focus();
      } else {
        if (!login.reportValidity()) return;
        toast(DEMO_MSG);
      }
    });
  }

  /* ---------- Đăng ký đội ---------- */
  var team = document.querySelector('[data-team-form]');
  if (team) {
    var list = team.querySelector('[data-members]'), addBtn = team.querySelector('[data-add-member]');
    var limitMsg = team.querySelector('[data-limit-msg]'), tpl = team.querySelector('#member-tpl');
    var MAX_EXTRA = 4; /* trưởng đội + tối đa 4 thành viên = 5 */
    var renumber = function () {
      list.querySelectorAll('.member').forEach(function (m, k) { m.querySelector('[data-no]').textContent = 'Thành viên ' + (k + 2); });
      var full = list.children.length >= MAX_EXTRA;
      addBtn.setAttribute('aria-disabled', String(full));
    };
    addBtn.addEventListener('click', function () {
      if (list.children.length >= MAX_EXTRA) { limitMsg.hidden = false; return; }
      limitMsg.hidden = true;
      list.appendChild(tpl.content.cloneNode(true));
      renumber();
    });
    list.addEventListener('click', function (e) {
      var rm = e.target.closest('.rm'); if (!rm) return;
      rm.closest('.member').remove(); limitMsg.hidden = true; renumber();
    });
    var minor = team.querySelector('[data-minor]'), mentor = team.querySelector('[data-mentor]');
    var syncMentor = function () {
      mentor.hidden = !minor.checked;
      mentor.querySelectorAll('input').forEach(function (inp) { inp.required = minor.checked; });
    };
    minor.addEventListener('change', syncMentor); syncMentor();
    var student = team.querySelector('[data-student]'), boardErr = team.querySelector('[data-board-error]');
    var checkBoard = function () {
      var v = (team.querySelector('input[name=noi-dung]:checked') || {}).value;
      boardErr.hidden = !(student.checked && v === 'tech-hs');
    };
    team.addEventListener('change', checkBoard);
    team.querySelector('[data-switch-sv]').addEventListener('click', function () {
      team.querySelector('input[value=tech-sv]').checked = true; checkBoard();
    });
    var params = new URLSearchParams(location.search), pre = params.get('noi-dung');
    if (pre) { var r = team.querySelector('input[name=noi-dung][value="' + pre + '"]'); if (r) r.checked = true; }
    team.addEventListener('submit', function (e) {
      e.preventDefault();
      checkBoard();
      if (!boardErr.hidden) { boardErr.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      if (!team.reportValidity()) return;
      toast(DEMO_MSG);
    });
  }

  /* ---------- Chọn sẵn chủ đề hỗ trợ từ liên kết (?chu-de=...) hoặc #them-truong ---------- */
  (function () {
    var key = null;
    try { key = new URLSearchParams(location.search).get('chu-de'); } catch (e) {}
    if (!key && location.hash === '#them-truong') key = 'them-truong';
    if (!key) return;
    var r = document.querySelector('input[name="chu-de"][data-key="' + key + '"]');
    if (r) r.checked = true;
  })();

  /* ---------- Mục lục đang đọc (thể lệ) ---------- */
  var toc = document.querySelector('.toc');
  if (toc && 'IntersectionObserver' in window) {
    var links = toc.querySelectorAll('a');
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.doc-sec[id]').forEach(function (s) { io.observe(s); });
  }
})();
