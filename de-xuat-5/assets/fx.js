/*!
 * SAFE MOVE 2027 — lớp chuyển động (đề xuất 5). Chạy sau site.js, không phụ thuộc thư viện.
 * Chuyển thể từ Animata (MIT, © Animata — https://github.com/codse/animata):
 *   tabs/gooey-tabs, tabs/fluid-tabs, text/roll-text, text/ticker, container/marquee,
 *   container/animated-border-trail, progress/animatedtimeline.
 * Nguyên tắc: tăng cường dần — tắt JS thì trang vẫn y như bản gốc; tôn trọng prefers-reduced-motion;
 * hiệu ứng theo con trỏ chỉ bật trên thiết bị có chuột.
 */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  /* ------------------------------------------------ hiện khi cuộn tới */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  function watch(el) { if (io) io.observe(el); else el.classList.add('is-in'); }

  $$('.h-section[data-fx-split], .mark').forEach(function (el) { if (!el.closest('h1')) watch(el); });

  function reveal(list, step) {
    list.forEach(function (el, i) {
      if (el.hasAttribute('data-fx-reveal')) return;
      el.setAttribute('data-fx-reveal', '');
      el.style.setProperty('--d', Math.min(i, 5) * (step || 80) + 'ms');
      watch(el);
    });
  }
  var main = $('main');
  if (main) {
    // Lưới thẻ (ba sân chơi, tin tức, giá trị, đối tác…): xuất hiện so le
    $$('ul.grid, ul.flex.snap-x', main).forEach(function (ul) {
      if (ul.closest('main > div:first-child, main > section:first-child .wrap > div:first-child')) return;
      reveal($$(':scope > li', ul), 90);
    });
    // Khối thẻ đơn lẻ trong các mục (không áp cho phần mở đầu trang)
    $$('.card, [class*="rounded-[var(--radius-card)]"], [class*="rounded-[2rem]"], details[data-faq]', main).forEach(function (el) {
      if (el.closest('[data-fx-reveal]') || el.closest('main > div:first-child') || el.closest('main > section:first-child') || el.closest('[data-stepper] [data-step]') || el.closest('#mobile-menu')) return;
      if (el.matches('ul.grid > li, ul.snap-x > li')) return;
      if (el.matches('details[data-faq]')) {
        var sibs = $$(':scope > details[data-faq]', el.parentNode);
        el.setAttribute('data-fx-reveal', '');
        el.style.setProperty('--d', Math.min(sibs.indexOf(el), 4) * 50 + 'ms');
        watch(el);
        return;
      }
      el.setAttribute('data-fx-reveal', '');
      watch(el);
    });
  }

  /* ------------------------------------------------ thanh đầu trang */
  var header = $('header.sticky');
  var drawer = $('#mobile-menu');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    root.classList.toggle('fx-scrolled', y > 8);
    var down = y > lastY + 4, up = y < lastY - 4;
    var busy = (drawer && !drawer.hidden) || (header && header.matches(':hover, :focus-within'));
    if (down && y > 360 && !busy) root.classList.add('fx-hide-head');
    else if (up || y < 200) root.classList.remove('fx-hide-head');
    if (down && y > 200) root.classList.add('fx-hide-bar');
    else if (up) root.classList.remove('fx-hide-bar');
    if (Math.abs(y - lastY) > 4) lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  onScroll();

  // Nút menu: ba gạch thành X
  var burger = $('[data-menu-open]');
  if (burger) {
    var ico = $('svg', burger);
    if (ico) { var b = doc.createElement('span'); b.className = 'fx-burger'; b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<i></i><i></i><i></i>'; ico.replaceWith(b); }
    burger.addEventListener('click', function () {
      burger.setAttribute('aria-label', burger.getAttribute('aria-expanded') === 'true' ? 'Đóng menu' : 'Mở menu');
      root.classList.remove('fx-hide-head');
    });
  }
  // Đánh dấu trang hiện tại trong menu điện thoại
  if (drawer) {
    var here = $('nav[aria-label="Menu chính"] a[aria-current="page"]');
    if (here) $$('a', drawer).forEach(function (a) { if (a.getAttribute('href') === here.getAttribute('href')) a.setAttribute('aria-current', 'page'); });
  }

  /* ------------------------------------------------ menu chính: roll-text + viên nền trượt */
  function rollify(a) {
    Array.prototype.slice.call(a.childNodes).forEach(function (n) {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      var text = n.textContent.normalize('NFC');
      var wrap = doc.createElement('span');
      wrap.className = 'fx-roll';
      wrap.setAttribute('aria-hidden', 'true');
      Array.from(text).forEach(function (c, i) {
        var ch = doc.createElement('span');
        ch.className = 'fx-ch';
        var inner = doc.createElement('span');
        inner.textContent = c;
        inner.setAttribute('data-c', c);
        inner.style.setProperty('--i', i);
        ch.appendChild(inner);
        wrap.appendChild(ch);
      });
      if (!a.hasAttribute('aria-label')) a.setAttribute('aria-label', a.textContent.replace(/\s+/g, ' ').trim());
      n.replaceWith(wrap);
    });
  }
  var navList = $('nav[aria-label="Menu chính"] > ul');
  if (navList) {
    navList.classList.add('fx-nav');
    var links = $$(':scope > li > a', navList);
    links.forEach(rollify);
    var pill = doc.createElement('span');
    pill.className = 'fx-nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    navList.appendChild(pill);
    var shown = false;
    var move = function (a) {
      var r = a.getBoundingClientRect(), p = navList.getBoundingClientRect();
      if (!shown) { navList.classList.add('no-anim'); }
      pill.style.transform = 'translate(' + (r.left - p.left) + 'px,' + (r.top - p.top) + 'px)';
      pill.style.width = r.width + 'px';
      pill.style.height = r.height + 'px';
      if (!shown) { pill.offsetWidth; navList.classList.remove('no-anim'); shown = true; }
      navList.classList.add('is-hovering');
    };
    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { move(a); });
      a.addEventListener('focus', function () { if (a.matches(':focus-visible')) move(a); });
    });
    navList.addEventListener('mouseleave', function () { navList.classList.remove('is-hovering'); shown = false; });
    navList.addEventListener('focusout', function (e) { if (!navList.contains(e.relatedTarget)) { navList.classList.remove('is-hovering'); shown = false; } });
  }
  // Nút "Làm quiz ngay" trên thanh đầu trang
  var headCta = header && $('a.btn-primary', header);
  if (headCta) rollify(headCta);

  /* ------------------------------------------------ linh vật: nhìn theo con trỏ, nhảy khi được gọi */
  var mascots = $$('svg.mc');
  function cheer(svg) {
    if (reduce || svg.classList.contains('mc-cheer')) return;
    burst(svg);
    svg.classList.add('mc-cheer');
    setTimeout(function () { svg.classList.remove('mc-cheer'); }, 1000);
  }
  function burst(svg) {
    var g = $('.mc-pop', svg) || svg;
    var pts = [[-260, -300], [250, -320], [-360, -40], [370, -90], [-120, -400], [140, -390]];
    pts.forEach(function (d, i) {
      var p = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M500 330 L512 356 L540 368 L512 380 L500 406 L488 380 L460 368 L488 356 Z');
      p.setAttribute('fill', i % 2 ? '#14a3a0' : '#ffc907');
      p.setAttribute('class', 'mc-p');
      p.style.setProperty('--dx', d[0] + 'px');
      p.style.setProperty('--dy', d[1] + 'px');
      p.style.animationDelay = (i * 25) + 'ms';
      g.appendChild(p);
      setTimeout(function () { p.remove(); }, 1300);
    });
  }
  if (mascots.length) {
    mascots.forEach(function (svg) {
      svg.addEventListener('click', function () { cheer(svg); });
      // Chrome phát lại hoạt ảnh "mc-pop" (mờ → rõ) khi nhóm SVG đổi trạng thái;
      // sau lần xuất hiện đầu tiên thì gỡ hẳn để linh vật không bị mờ khi "cổ vũ".
      $$('.mc-pop', svg).forEach(function (g) {
        var done = function () { g.style.animation = 'none'; };
        g.addEventListener('animationend', function (e) { if (e.animationName === 'mc-pop') done(); });
        setTimeout(done, 1400);
      });
    });
    if (finePointer && !reduce) {
      var mx = 0, my = 0, pending = false;
      var look = function () {
        pending = false;
        mascots.forEach(function (svg) {
          var r = svg.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
          var cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
          var dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy) || 1;
          var k = Math.min(1, dist / 420);
          svg.style.setProperty('--lx', (dx / dist * 16 * k).toFixed(1));
          svg.style.setProperty('--ly', (dy / dist * 10 * k).toFixed(1));
        });
      };
      window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (!pending) { pending = true; raf(look); } }, { passive: true });
    }
    // Nút chính ở hero gọi linh vật "cổ vũ"
    var heroMascot = $('main > section:first-child svg.mc.w-full') || $('main > section:first-child svg.mc');
    $$('main > section:first-child a.btn-primary').forEach(function (a) {
      a.addEventListener('mouseenter', function () { if (heroMascot) cheer(heroMascot); });
    });
  }

  // Nhãn nổi quanh linh vật: lệch nhẹ theo con trỏ tạo chiều sâu
  var floats = $$('main > section:first-child [class*="float-"].absolute');
  if (floats.length && finePointer && !reduce) {
    var stage = floats[0].parentNode;
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      floats.forEach(function (f, i) {
        var depth = [14, 10, 18][i % 3];
        f.style.transform = 'translate3d(' + (x * depth).toFixed(1) + 'px,' + (y * depth).toFixed(1) + 'px,0)';
      });
    });
    stage.addEventListener('pointerleave', function () { floats.forEach(function (f) { f.style.transform = ''; }); });
  }

  /* ------------------------------------------------ đếm ngược: viền chạy + số cuộn (ticker) */
  $$('[data-countdown]').forEach(function (box) {
    box.classList.add('fx-trail');
    ['d', 'h', 'm', 's'].forEach(function (k) {
      var src = $('[data-cd-' + k + ']', box);
      if (!src) return;
      var tick = doc.createElement('p');
      tick.className = src.className + ' fx-tick';
      tick.setAttribute('aria-hidden', 'true');
      src.after(tick);
      src.classList.add('fx-gone');
      var cols = [];
      var render = function () {
        var v = src.textContent.trim();
        if (!/^\d+$/.test(v)) { tick.textContent = v; cols = []; return; }
        if (cols.length !== v.length) {
          tick.textContent = '';
          cols = Array.from(v).map(function () {
            var c = doc.createElement('span');
            c.className = 'fx-tick-col';
            for (var n = 0; n < 10; n++) { var s = doc.createElement('span'); s.textContent = n; c.appendChild(s); }
            tick.appendChild(c);
            return c;
          });
        }
        Array.from(v).forEach(function (d, i) { cols[i].style.transform = 'translateY(' + (-1.1 * +d) + 'em)'; });
      };
      render();
      new MutationObserver(render).observe(src, { childList: true, characterData: true, subtree: true });
    });
  });

  /* ------------------------------------------------ thẻ ba sân chơi */
  var tones = { school: '#14a3a0', action: '#f5a623', tech: '#2f6fe0' };
  $$('li.border-school-200, li.border-action-200, li.border-tech-200, li[class*="border-school-200"], li[class*="border-action-200"], li[class*="border-tech-200"]').forEach(function (li) {
    if (!li.classList.contains('overflow-hidden')) return;
    li.classList.add('fx-tile');
    var t = /border-(school|action|tech)-200/.exec(li.className);
    if (t) li.style.setProperty('--fx-tone', tones[t[1]]);
    var blob = $(':scope > span[aria-hidden].rounded-full', li);
    if (blob) blob.classList.add('fx-blob');
    var icon = $(':scope > span.relative.flex', li);
    if (icon) icon.classList.add('fx-tile-icon');
  });
  // Thẻ trượt ngang trên điện thoại: chấm chỉ vị trí
  $$('main ul.snap-x').forEach(function (ul) {
    var items = $$(':scope > li', ul);
    if (items.length < 2) return;
    var dots = doc.createElement('div');
    dots.className = 'fx-dots';
    dots.setAttribute('aria-hidden', 'true');
    items.forEach(function (_, i) { var d = doc.createElement('i'); if (!i) d.className = 'on'; dots.appendChild(d); });
    ul.after(dots);
    ul.addEventListener('scroll', function () {
      var w = items[0].getBoundingClientRect().width;
      var at = Math.round(ul.scrollLeft / (w + 16));
      $$('i', dots).forEach(function (d, i) { d.classList.toggle('on', i === Math.min(at, items.length - 1)); });
    }, { passive: true });
  });

  /* ------------------------------------------------ hành trình mùa giải */
  $$('[data-tl]').map(function (li) { return li.parentNode; }).filter(function (ol, i, a) { return a.indexOf(ol) === i; }).forEach(function (ol) {
    if (!ol.classList.contains('flex')) return; // bản dọc trên điện thoại giữ cách hiện thông thường
    ol.classList.add('fx-tl');
    $$(':scope > li', ol).forEach(function (li, i) { li.style.setProperty('--i', i); });
    watch(ol);
  });
  $$('ol.lg\\:hidden').forEach(function (ol) { if ($('[data-tl]', ol)) reveal($$(':scope > li', ol), 60); });

  /* ------------------------------------------------ dải "Ngày hội": ánh sáng theo con trỏ, lịch nghiêng 3D */
  $$('main [class*="bg-[linear-gradient(115deg"]').forEach(function (band) {
    band.classList.add('fx-spot');
    var cal = $('.text-center.bg-white', band) || $('[class*="-rotate-[4deg]"]', band);
    if (cal) cal.classList.add('fx-cal');
    if (!finePointer || reduce) return;
    band.addEventListener('pointermove', function (e) {
      var r = band.getBoundingClientRect();
      band.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      band.style.setProperty('--my', (e.clientY - r.top) + 'px');
      if (cal) {
        var c = cal.getBoundingClientRect();
        var x = (e.clientX - (c.left + c.width / 2)) / r.width, y = (e.clientY - (c.top + c.height / 2)) / r.height;
        cal.style.transform = 'perspective(700px) rotateY(' + (x * 14).toFixed(2) + 'deg) rotateX(' + (-y * 12).toFixed(2) + 'deg)';
      }
    });
    band.addEventListener('pointerleave', function () { if (cal) cal.style.transform = ''; });
  });

  /* ------------------------------------------------ bảng xếp hạng chờ */
  $$('ol[aria-hidden="true"].select-none').forEach(function (ol) {
    ol.classList.add('fx-bars');
    $$(':scope > li', ol).forEach(function (li, i) { li.style.setProperty('--i', i); });
    watch(ol);
  });

  /* ------------------------------------------------ thẻ tin tức */
  function markNews() {
    $$('main li.flex.flex-col.overflow-hidden').forEach(function (li) {
      if ($(':scope > div.relative[class*="aspect-[2/1]"]', li) && $('h3 a', li)) li.classList.add('fx-news');
    });
  }
  markNews();

  /* ------------------------------------------------ bộ lọc tin: viên trượt (fluid-tabs) */
  var filterBtns = $$('[data-filter]');
  if (filterBtns.length) {
    var seg = filterBtns[0].parentNode;
    seg.classList.add('fx-seg');
    var sp = doc.createElement('span');
    sp.className = 'fx-seg-pill';
    sp.setAttribute('aria-hidden', 'true');
    seg.prepend(sp);
    var place = function (instant) {
      var on = $('[data-filter][aria-pressed="true"]', seg);
      if (!on) return;
      if (instant) seg.classList.add('no-anim');
      sp.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
      sp.style.width = on.offsetWidth + 'px';
      sp.style.height = on.offsetHeight + 'px';
      if (instant) { sp.offsetWidth; seg.classList.remove('no-anim'); }
    };
    place(true);
    window.addEventListener('resize', function () { place(true); });
    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        place(false);
        var n = 0;
        $$('[data-topic]').forEach(function (card) {
          if (card.hidden) return;
          card.classList.remove('fx-enter');
          card.removeAttribute('data-fx-reveal');
          void card.offsetWidth;
          card.style.setProperty('--d', (n++ * 60) + 'ms');
          card.classList.add('fx-enter');
        });
      });
    });
  }

  /* ------------------------------------------------ hỏi đáp: mở/đóng mượt */
  $$('details[data-faq]').forEach(function (d) {
    var sum = $('summary', d);
    var anim = null;
    sum.addEventListener('click', function (e) {
      if (reduce || !d.animate) return;
      e.preventDefault();
      if (anim) anim.cancel();
      var start = d.offsetHeight + 'px';
      if (d.open) {
        d.classList.add('is-closing');
        var end = sum.offsetHeight + parseFloat(getComputedStyle(d).borderTopWidth) * 2 + 'px';
        anim = d.animate({ height: [start, end] }, { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)' });
        anim.onfinish = function () { d.open = false; d.classList.remove('is-closing'); anim = null; };
      } else {
        d.style.height = start;
        d.open = true;
        d.classList.add('is-opening');
        raf(function () {
          d.style.height = '';
          var full = d.offsetHeight + 'px';
          anim = d.animate({ height: [start, full] }, { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
          var body = $(':scope > :not(summary)', d);
          if (body) body.animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 420, delay: 80, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
          anim.onfinish = function () { d.classList.remove('is-opening'); anim = null; };
        });
      }
    });
  });

  /* ------------------------------------------------ hỏi đáp: thanh lọc nhóm "gooey" (gooey-tabs) */
  var groups = $$('[data-faq-group]');
  if (groups.length > 2) {
    var ICONS = {
      'Tất cả': '<path d="M4 6h16M4 12h16M4 18h10"/>',
      'Chung': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
      'SAFE SCHOOL': '<path d="M5 4.5h14a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9.5L5 20.5V5.5a1 1 0 0 1 0-1Z"/><path d="M10.2 8.9a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.3M12 14.3h.01"/>',
      'SAFE ACTION': '<path d="M4 10v4h3.5L13 18V6L7.5 10H4ZM16.5 9a4 4 0 0 1 0 6"/>',
      'SAFE TECH': '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1 1 1.7V16h5v-.4c0-.7.4-1.3 1-1.7A6 6 0 0 0 12 3Z"/>',
      'Đội thi': '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M16 5.5a3 3 0 0 1 0 5.4M17.5 14.6c1.6.6 2.6 2 3 4.4"/>',
      'Trường THPT': '<path d="M3 10.5 12 5l9 5.5M5 9.5V19h14V9.5M9.5 19v-4.5h5V19"/>',
      'Dữ liệu': '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      'Ngày hội': '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
      'Hỗ trợ': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5M12 16.5h.01"/>'
    };
    var COLORS = { 'SAFE SCHOOL': '#0b7d79', 'SAFE ACTION': '#c97a06', 'SAFE TECH': '#2f6fe0' };
    var names = ['Tất cả'].concat(groups.map(function (g) { return $('h2', g).textContent.trim(); }));
    var wrap = doc.createElement('div');
    wrap.className = 'fx-goo-wrap';
    var fid = 'fx-goo-' + Math.random().toString(36).slice(2, 7);
    wrap.innerHTML = '<p class="fx-goo-label" id="' + fid + '-l">Xem theo nhóm</p>' +
      '<svg aria-hidden="true" width="0" height="0" style="position:absolute"><defs><filter id="' + fid + '"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter></defs></svg>' +
      '<div class="fx-goo" role="group" aria-labelledby="' + fid + '-l" style="filter:url(#' + fid + ');margin-top:.6rem"></div>';
    var bar = $('.fx-goo', wrap);
    names.forEach(function (name, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === 0));
      b.setAttribute('aria-label', name);
      b.title = name;
      if (COLORS[name]) b.style.setProperty('--fx-c', COLORS[name]);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS['Chung']) + '</svg><span>' + name + '</span>';
      bar.appendChild(b);
    });
    var anchor = $('#faq-q') && $('#faq-q').closest('.card');
    (anchor || groups[0]).insertAdjacentElement(anchor ? 'afterend' : 'beforebegin', wrap);
    var empty = $('#faq-empty');
    var current = 'Tất cả';
    var sync = function () {
      var any = false;
      groups.forEach(function (g) {
        var name = $('h2', g).textContent.trim();
        g.classList.toggle('fx-off', current !== 'Tất cả' && name !== current);
        if (!g.hidden && !g.classList.contains('fx-off')) any = true;
      });
      if (empty) empty.hidden = any;
    };
    $$('button', bar).forEach(function (b, i) {
      b.addEventListener('click', function () {
        current = names[i];
        $$('button', bar).forEach(function (x, j) { x.setAttribute('aria-pressed', String(i === j)); });
        sync();
        groups.forEach(function (g) {
          if (g.classList.contains('fx-off') || g.hidden) return;
          g.classList.remove('fx-enter'); void g.offsetWidth; g.classList.add('fx-enter');
          $$('[data-fx-reveal]', g).forEach(function (el) { el.classList.add('is-in'); });
          $$('.h-section', g).forEach(function (el) { el.classList.add('is-in'); });
        });
        if (b.scrollIntoView && wrap.scrollWidth > wrap.clientWidth) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      });
      b.addEventListener('keydown', function (e) {
        var all = $$('button', bar), n = all.indexOf(b), to = null;
        if (e.key === 'ArrowRight') to = all[(n + 1) % all.length];
        if (e.key === 'ArrowLeft') to = all[(n - 1 + all.length) % all.length];
        if (to) { e.preventDefault(); to.focus(); }
      });
    });
    var q = $('#faq-q');
    if (q) q.addEventListener('input', sync);
    var go = $('[data-faq-go]');
    if (go) go.addEventListener('click', sync);
  }

  /* ------------------------------------------------ biểu mẫu nhiều bước: hướng chuyển */
  $$('[data-stepper]').forEach(function (st) {
    $$('[data-next]', st).forEach(function (b) { b.addEventListener('click', function () { st.dataset.dir = 'next'; }, true); });
    $$('[data-prev]', st).forEach(function (b) { b.addEventListener('click', function () { st.dataset.dir = 'back'; }, true); });
  });

  /* ------------------------------------------------ chân trang: dải chữ chạy (marquee) */
  var foot = $('footer.bg-brand-900');
  if (foot) {
    var mq = doc.createElement('div');
    mq.className = 'fx-marquee';
    mq.setAttribute('aria-hidden', 'true');
    var unit = '<span>Giữ an toàn cho mình<i></i><b>và cho những người xung quanh</b><i></i>SAFE SCHOOL<i></i>SAFE ACTION<i></i>SAFE TECH<i></i></span>';
    mq.innerHTML = '<div class="fx-marquee-track">' + unit + unit + '</div>';
    foot.prepend(mq);
  }

  /* ------------------------------------------------ bài viết: thanh tiến độ đọc */
  if (/\/bai-viet\//.test(location.pathname) || $('article')) {
    var pb = doc.createElement('div');
    pb.className = 'fx-progress';
    pb.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(pb);
    if (!CSS.supports('animation-timeline: scroll()')) {
      var upd = function () {
        var h = doc.documentElement.scrollHeight - innerHeight;
        pb.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      };
      window.addEventListener('scroll', function () { raf(upd); }, { passive: true });
      upd();
    }
  }

  root.classList.add('fx-ready');
})();
