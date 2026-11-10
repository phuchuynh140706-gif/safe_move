/* Scroll-driven opening of the home page: highway pass -> drift -> rider puts on a helmet -> resting background.
   Everything is drawn on one canvas from a single story position T (0..1), so scrolling back replays it exactly. */
(function () {
  'use strict';
  var root = document.querySelector('[data-intro]');
  if (!root) return;
  var view = root.querySelector('[data-view]'), canvas = root.querySelector('canvas'), g = canvas.getContext('2d');
  var header = document.querySelector('header'), hero = root.querySelector('[data-hero]'), scrim = root.querySelector('[data-scrim]');
  var skip = root.querySelector('[data-skip]'), caps = [].slice.call(root.querySelectorAll('[data-cap]'));
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T0 = 0.18; // the load animation brings the story here; scrolling covers the rest

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function seg(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }
  function sm(x) { return x * x * (3 - 2 * x); }
  function ss(x, a, b) { return sm(seg(x, a, b)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function key(t, kf) {
    for (var i = 0; i < kf.length - 1; i++) {
      var a = kf[i], b = kf[i + 1];
      if (t <= b[0]) { var k = sm(seg(t, a[0], b[0])); return a.slice(1).map(function (v, j) { return lerp(v, b[j + 1], k); }); }
    }
    return kf[kf.length - 1].slice(1);
  }
  function layer(w, h) { var c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

  var W = 0, H = 0, dpr = 1, wide = true, HZ = 0, RT = 0, GY = 0;
  var sky, hillFar, hillNear, ground, puff, glow, road = [], R = 0, AX = 0, AY = 0, AW = 0, AH = 0;

  function sprite(size, stops) {
    var c = layer(size, size), x = c.getContext('2d'), r = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { r.addColorStop(s[0], s[1]); });
    x.fillStyle = r; x.fillRect(0, 0, size, size); return c;
  }
  puff = sprite(128, [[0, 'rgba(226,228,232,.9)'], [0.55, 'rgba(210,214,220,.34)'], [1, 'rgba(200,205,212,0)']]);
  glow = sprite(256, [[0, 'rgba(255,214,150,.95)'], [0.35, 'rgba(255,186,110,.32)'], [1, 'rgba(255,170,90,0)']]);

  function hills(color, base, amp, seed) {
    var c = layer(1800, 300), x = c.getContext('2d'); x.fillStyle = color; x.beginPath(); x.moveTo(0, 300);
    for (var i = 0; i <= 1800; i += 12) {
      var a = i / 1800 * Math.PI * 2;
      x.lineTo(i, base - amp * (0.55 * Math.sin(a * 2 + seed) + 0.3 * Math.sin(a * 5 + seed * 2) + 0.15 * Math.sin(a * 11 + seed * 3)));
    }
    x.lineTo(1800, 300); x.closePath(); x.fill(); return c;
  }
  hillFar = hills('#2c4a50', 170, 90, 1.3); hillNear = hills('#132a2f', 215, 62, 4.1);

  function buildSky() {
    sky = layer(W * dpr, H * dpr);
    var c = sky.getContext('2d'); c.scale(dpr, dpr);
    var s = c.createLinearGradient(0, 0, 0, HZ);
    s.addColorStop(0, '#0a1622'); s.addColorStop(0.46, '#153a44'); s.addColorStop(0.78, '#a9633c'); s.addColorStop(0.93, '#ee9f55'); s.addColorStop(1, '#ffd08a');
    c.fillStyle = s; c.fillRect(0, 0, W, HZ + 2);
    for (var i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd(i) * 0.55) + ')'; c.beginPath(); c.arc(rnd(i + 200) * W, rnd(i + 400) * HZ * 0.55, 0.5 + rnd(i + 600), 0, 7); c.fill(); }
    var sx = W * (wide ? 0.74 : 0.5), sr = Math.min(W, H) * 0.09;
    c.drawImage(glow, sx - sr * 6, HZ - sr * 6, sr * 12, sr * 12);
    c.fillStyle = '#ffe2ae'; c.beginPath(); c.arc(sx, HZ - sr * 0.15, sr, 0, 7); c.fill();
  }

  function buildRoad() {
    var src = wide ? [[-0.25, 0.8], [0.1, 0.86], [0.38, 0.72], [0.5, 0.44], [0.7, 0.24], [1.3, 0.3]] : [[0.2, 1.25], [0.28, 0.92], [0.68, 0.68], [0.72, 0.42], [0.36, 0.24], [0.3, -0.28]];
    AX = W * 0.35; AY = H * 0.35; AW = W * 1.7; AH = H * 1.7;
    var p = src.map(function (q) { return [q[0] * W + AX, q[1] * H + AY]; });
    p.unshift(p[0]); p.push(p[p.length - 1]);
    var raw = [];
    for (var i = 0; i < p.length - 3; i++) for (var k = 0; k < 90; k++) {
      var t = k / 90, t2 = t * t, t3 = t2 * t;
      raw.push([0, 1].map(function (j) { return 0.5 * (2 * p[i + 1][j] + (p[i + 2][j] - p[i][j]) * t + (2 * p[i][j] - 5 * p[i + 1][j] + 4 * p[i + 2][j] - p[i + 3][j]) * t2 + (3 * p[i + 1][j] - p[i][j] - 3 * p[i + 2][j] + p[i + 3][j]) * t3); }));
    }
    var len = [0]; for (i = 1; i < raw.length; i++) len[i] = len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
    road = []; var total = len[len.length - 1], j = 0;
    for (i = 0; i <= 1400; i++) {
      var d = total * i / 1400; while (j < len.length - 2 && len[j + 1] < d) j++;
      var f = (d - len[j]) / ((len[j + 1] - len[j]) || 1); road.push([lerp(raw[j][0], raw[j + 1][0], f), lerp(raw[j][1], raw[j + 1][1], f)]);
    }
    R = Math.min(W, H) * 0.2;
    ground = layer(AW * 1.25, AH * 1.25);
    var c = ground.getContext('2d'); c.scale(1.25, 1.25);
    var bg = c.createLinearGradient(0, 0, AW, AH); bg.addColorStop(0, '#0d2420'); bg.addColorStop(1, '#14332c'); c.fillStyle = bg; c.fillRect(0, 0, AW, AH);
    for (i = 0; i < 1100; i++) {
      // clustered tree canopies rather than even dots
      var cl = i % 26, x = (rnd(cl + 300) * AW) + (rnd(i) - 0.5) * AW * 0.16, y = (rnd(cl + 700) * AH) + (rnd(i + 900) - 0.5) * AH * 0.16, near = false;
      for (j = 0; j < road.length; j += 20) if (Math.hypot(road[j][0] - x, road[j][1] - y) < R * 0.8) { near = true; break; }
      if (near) continue;
      c.fillStyle = ['#143429', '#102d25', '#17392e', '#112f27'][i % 4]; c.beginPath(); c.arc(x, y, 4 + rnd(i + 50) * 11, 0, 7); c.fill();
    }
    function stroke(w, col, dash) { c.lineWidth = w; c.strokeStyle = col; c.setLineDash(dash || []); c.lineJoin = c.lineCap = 'round'; c.beginPath(); road.forEach(function (q, n) { n ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); }
    stroke(R + 26, '#2b3633'); stroke(R + 6, '#d9d4c6'); stroke(R - 2, '#262c2e'); c.lineCap = 'butt'; stroke(Math.max(3, R * 0.03), '#eac56b', [R * 0.3, R * 0.26]); c.setLineDash([]);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.42;
    for (i = 40; i < road.length; i += 150) { var q = road[i], s = R * 1.7; c.drawImage(glow, q[0] - s / 2 + R * 0.42, q[1] - s / 2 - R * 0.18, s, s); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  function resize() {
    W = view.clientWidth; H = view.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 1.75);
    canvas.width = Math.ceil(W * dpr); canvas.height = Math.ceil(H * dpr);
    wide = W >= H; HZ = H * (wide ? 0.68 : 0.64); RT = H * (wide ? 0.76 : 0.72); GY = H * (wide ? 0.9 : 0.885);
    buildSky(); buildRoad();
  }

  /* ---- side-view world ---- */
  function band(img, off, y, scale) {
    var w = 1800 * scale, h = 300 * scale;
    for (var x = -mod(off, w); x < W; x += w) g.drawImage(img, x, y - h, w + 1, h);
  }
  function world(off, blur) {
    g.drawImage(sky, 0, 0, W, H);
    var k = Math.max(0.75, Math.min(W / 1400, 1.1));
    band(hillFar, off * 0.05, HZ + 2, k); band(hillNear, off * 0.12, HZ + 8, k);
    var gr = g.createLinearGradient(0, HZ, 0, RT); gr.addColorStop(0, '#0f2226'); gr.addColorStop(1, '#0a1518'); g.fillStyle = gr; g.fillRect(0, HZ, W, RT - HZ + 1);
    var gap = 760;
    for (var x = -mod(off * 0.62, gap); x < W + 60; x += gap) {
      g.strokeStyle = '#0a1214'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, RT); g.lineTo(x, RT - H * 0.24); g.lineTo(x - 42, RT - H * 0.25); g.stroke();
      g.save(); g.globalCompositeOperation = 'lighter'; var s = H * 0.17; g.drawImage(glow, x - 42 - s / 2, RT - H * 0.25 - s / 2, s, s); g.restore();
    }
    var r = g.createLinearGradient(0, RT, 0, H); r.addColorStop(0, '#30383a'); r.addColorStop(0.55, '#1b2224'); r.addColorStop(1, '#0d1214'); g.fillStyle = r; g.fillRect(0, RT, W, H - RT);
    g.fillStyle = 'rgba(236,231,219,.72)'; g.fillRect(0, RT + 3, W, 3);
    g.fillStyle = '#7f8a88'; g.fillRect(0, RT - 24, W, 7);
    if (blur < 0.5) { g.fillStyle = '#4c5755'; for (x = -mod(off, 130); x < W; x += 130) g.fillRect(x, RT - 24, 6, 24); }
    else { g.fillStyle = 'rgba(90,102,100,.55)'; g.fillRect(0, RT - 17, W, 14); }
    var ly = RT + (H - RT) * 0.72, dash = wide ? 300 : 220;
    g.fillStyle = 'rgba(234,197,107,.9)';
    for (x = -mod(off, dash); x < W; x += dash) g.fillRect(x, ly, lerp(dash * 0.5, dash * 0.96, blur), 5);
  }

  /* ---- motorbike, side view: local space faces right, ground at y=540, centre x=430 ---- */
  var P = {};
  [['swing', 'M232 462 L420 428 L426 452 L238 486Z'], ['engine', 'M368 392 L505 378 C532 410 530 462 510 484 C470 510 405 508 372 488 C352 450 352 420 368 392Z'],
   ['frame', 'M410 330 L590 288 L600 304 L442 362 L472 430 L446 438 L396 350Z'], ['tank', 'M420 302 C428 244 496 232 546 240 C578 246 598 268 596 288 C578 318 530 334 480 338 L430 338Z'],
   ['stripe', 'M446 270 C486 250 540 250 586 276 L590 288 C542 266 492 268 442 290Z'], ['seat', 'M232 300 C290 296 360 304 424 314 L432 340 C350 350 280 346 244 334Z'],
   ['tail', 'M236 298 L146 268 C140 282 146 298 158 308 C190 324 224 332 252 336Z'], ['nacelle', 'M585 262 C612 254 640 268 646 292 C640 314 612 322 590 314Z'],
   ['fender', 'M570 402 C600 368 672 368 706 412 L694 420 C664 388 610 388 584 414Z'], ['rearguard', 'M150 392 C180 360 260 356 300 392 L290 402 C256 376 196 378 164 404Z']].forEach(function (p) { P[p[0]] = new Path2D(p[1]); });
  function line(pts, w, col) { g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
  function wheel(cx, ang, blur, sil) {
    g.save(); g.translate(cx, 470);
    g.lineWidth = 20; g.strokeStyle = '#06080a'; g.beginPath(); g.arc(0, 0, 60, 0, 7); g.stroke();
    if (blur) { g.fillStyle = 'rgba(150,165,165,.16)'; g.beginPath(); g.arc(0, 0, 48, 0, 7); g.fill(); }
    else { g.rotate(ang); g.strokeStyle = sil ? '#0d1315' : '#8a9694'; g.lineWidth = 5; for (var i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 48); g.stroke(); } }
    g.strokeStyle = sil ? '#101719' : '#5d6b68'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 49, 0, 7); g.stroke();
    g.fillStyle = sil ? '#0d1315' : '#46524f'; g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.restore();
  }
  function fill(name, col, sil) { g.fillStyle = sil ? '#070b0d' : col; g.fill(P[name]); }
  function rim(name, a) { g.strokeStyle = 'rgba(255,190,120,' + a + ')'; g.lineWidth = 2.5; g.stroke(P[name]); }
  function bike(o) {
    var sil = o.sil;
    wheel(230, o.ang, o.blur, sil); wheel(640, o.ang, o.blur, sil);
    fill('rearguard', '#1a2426', sil); fill('swing', '#262f30', sil);
    line([430, 472, 340, 482, 250, 442, 172, 398], 20, sil ? '#090d0f' : '#8f9a97');
    line([172, 398, 150, 386], 26, sil ? '#090d0f' : '#59645f');
    fill('engine', '#262d2e', sil);
    if (!sil) { g.fillStyle = '#3c4645'; g.beginPath(); g.arc(444, 442, 34, 0, 7); g.fill(); g.fillStyle = '#596462'; g.beginPath(); g.arc(444, 442, 18, 0, 7); g.fill(); }
    fill('frame', '#1a3f39', sil);
    line([640, 470, 578, 292], 15, sil ? '#090d0f' : '#b3bcb8');
    fill('fender', '#16211f', sil); fill('tail', '#16211f', sil); fill('seat', '#120f0d', sil); fill('tank', '#16504a', sil);
    if (!sil) { g.fillStyle = '#f0b23e'; g.fill(P.stripe); }
    fill('nacelle', '#16211f', sil);
    line([586, 262, 548, 236], 11, '#06080a');
    g.fillStyle = o.tail ? '#ff4a35' : '#7a1c14'; g.fillRect(142, 272, 12, 20);
    g.fillStyle = o.lit > 0.05 ? '#fff0c8' : (sil ? '#ffe9b8' : '#55605c'); g.beginPath(); g.ellipse(642, 291, 9, 18, 0, 0, 7); g.fill();
    if (sil) { rim('tank', 0.5); rim('seat', 0.32); rim('tail', 0.32); rim('nacelle', 0.45); }
  }
  function place(x, y, s, flip) { g.translate(x, y); g.scale(flip ? -s : s, s); g.translate(-430, -540); }
  function fit() { return wide ? Math.min(W * 0.5 / 800, H * 0.62 / 560) : W * 0.98 / 800; }

  /* ---- S1: tracking shot on the empty highway ---- */
  function scene1(T, clock) {
    var boost = ss(T, 0.2, 0.335), off = clock * (1500 + boost * 5200) + T * 9000;
    world(off, clamp(0.72 + boost, 0, 1));
    var s = fit() * (wide ? 0.82 : 0.86), ax = W * (wide ? 0.46 : 0.5);
    var x = lerp(-W * 0.55, ax, 1 - Math.pow(1 - seg(T, 0, 0.16), 3));
    x = lerp(x, W * 1.75, Math.pow(seg(T, 0.2, 0.33), 2.6));
    var bob = calm ? 0 : Math.sin(clock * 34) * 1.4;
    // long tail-light and headlight smears sell the speed
    g.save(); g.globalCompositeOperation = 'lighter';
    var tx = x - 300 * s, ty = GY - 255 * s;
    var tl = g.createLinearGradient(tx - W, 0, tx, 0); tl.addColorStop(0, 'rgba(255,60,40,0)'); tl.addColorStop(1, 'rgba(255,60,40,.85)'); g.fillStyle = tl; g.fillRect(tx - W, ty - 2.5, W, 5);
    var hx = x + 212 * s, hy = GY - 249 * s, bm = g.createLinearGradient(hx, 0, hx + W * 0.7, 0); bm.addColorStop(0, 'rgba(255,226,170,.5)'); bm.addColorStop(1, 'rgba(255,226,170,0)'); g.fillStyle = bm;
    g.beginPath(); g.moveTo(hx, hy - 6); g.lineTo(hx + W * 0.7, hy - H * 0.05); g.lineTo(hx + W * 0.7, hy + H * 0.2); g.lineTo(hx, hy + 8); g.closePath(); g.fill(); g.restore();
    g.save(); place(x, GY + bob, s, false);
    bike({ sil: true, blur: true, ang: 0, lit: 1, tail: true });
    // rider stays a backlit shape in this shot
    line([345, 285, 490, 182], 74, '#070b0d'); line([490, 182, 540, 256, 556, 240], 26, '#070b0d'); line([345, 300, 470, 362, 402, 470], 42, '#070b0d');
    g.fillStyle = '#070b0d'; g.beginPath(); g.arc(535, 148, 41, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,190,120,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(535, 148, 41, -2.6, -0.3); g.stroke();
    line([378, 232, 468, 158], 3, 'rgba(255,190,120,.42)');
    g.restore();
    var n = wide ? 30 : 20;
    for (var i = 0; i < n; i++) {
      var len = 200 + rnd(i + 7) * 800, y = H * (0.08 + 0.86 * rnd(i + 3)), sx = mod(-off * (0.5 + rnd(i) * 0.9) + rnd(i + 90) * W * 2, W * 2 + len) - len;
      g.fillStyle = 'rgba(255,224,178,' + (0.05 + 0.3 * boost) + ')'; g.fillRect(sx, y, len, 1 + rnd(i + 11) * 1.8);
    }
  }

  /* ---- S2: seen from above, the drift ---- */
  var U0 = 0.36, U1 = 0.72;
  function roadAt(u) { var i = clamp(u, 0, 1) * (road.length - 2), n = Math.floor(i), f = i - n, a = road[n], b = road[n + 1]; return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
  function bell(u) { return sm(seg(u, U0, U0 + 0.13)) * (1 - sm(seg(u, U1 - 0.13, U1))); }
  function turnSign(u) { var a = roadAt(u - 0.02).ang, b = roadAt(u + 0.02).ang; return Math.atan2(Math.sin(b - a), Math.cos(b - a)) >= 0 ? 1 : -1; }
  function bodyAt(u) {
    var p = roadAt(u), d = bell(u), sign = turnSign(u), slip = d * R * 0.2;
    var x = p.x - Math.cos(p.ang + Math.PI / 2) * slip * sign, y = p.y - Math.sin(p.ang + Math.PI / 2) * slip * sign;
    return { x: x, y: y, ang: p.ang + sign * d * 0.98, d: d };
  }
  function scene2(T) {
    var t = seg(T, 0.345, 0.635), u = 0.05 + 0.75 * (1 - Math.pow(1 - t, 2.1));
    var b = bodyAt(u), punch = Math.pow(seg(T, 0.615, 0.66), 2.4);
    var z = lerp(1.12, 1.34, t) * (1 + punch * 5), mx = lerp(W * 0.5 + AX, b.x, 0.68 + punch * 0.32), my = lerp(H * 0.5 + AY, b.y, 0.68 + punch * 0.32);
    g.save(); g.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - mx * z), dpr * (H / 2 - my * z));
    g.drawImage(ground, 0, 0, AW, AH);
    var L = R * 0.66, i, v, q, rx, ry;
    // tyre marks stay on the road once laid down
    g.lineCap = 'round'; g.strokeStyle = 'rgba(6,7,9,.75)';
    [-1, 1].forEach(function (side) {
      g.lineWidth = R * 0.028; g.beginPath(); var started = false;
      for (v = U0; v < u; v += 0.0026) {
        q = bodyAt(v); if (q.d < 0.04) continue;
        rx = q.x - Math.cos(q.ang) * L * 0.46 + side * Math.cos(q.ang + 1.57) * R * 0.018; ry = q.y - Math.sin(q.ang) * L * 0.46 + side * Math.sin(q.ang + 1.57) * R * 0.018;
        if (started) g.lineTo(rx, ry); else { g.moveTo(rx, ry); started = true; }
      }
      g.stroke();
    });
    // smoke is a pure function of position along the road, so it scrubs backwards too
    for (i = 0; i < 130; i++) {
      v = U0 + i * 0.0029; if (v >= u) break;
      var age = (u - v) / 0.3; if (age > 1) continue;
      q = bodyAt(v);
      var r = R * (0.14 + 0.85 * age + 0.2 * rnd(i)), a = (1 - age) * (0.22 + q.d * 0.5);
      g.globalAlpha = a; g.drawImage(puff, q.x - Math.cos(q.ang) * L * 0.46 + (rnd(i + 9) - 0.5) * R * 0.55 * age - r, q.y - Math.sin(q.ang) * L * 0.46 + (rnd(i + 19) - 0.5) * R * 0.55 * age - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    g.translate(b.x, b.y); g.rotate(b.ang);
    g.save(); g.globalCompositeOperation = 'lighter';
    var cone = g.createLinearGradient(L * 0.4, 0, L * 3.4, 0); cone.addColorStop(0, 'rgba(255,226,170,.55)'); cone.addColorStop(1, 'rgba(255,226,170,0)'); g.fillStyle = cone;
    g.beginPath(); g.moveTo(L * 0.42, -4); g.lineTo(L * 3.4, -L * 1.15); g.lineTo(L * 3.4, L * 1.15); g.lineTo(L * 0.42, 4); g.closePath(); g.fill();
    var red = L * 0.9; g.drawImage(glow, -L * 0.62 - red / 2, -red / 2, red, red); g.restore();
    g.fillStyle = '#05080a'; g.fillRect(-L * 0.52, -L * 0.07, L * 0.3, L * 0.14); g.fillRect(L * 0.25, -L * 0.06, L * 0.3, L * 0.12);
    g.fillStyle = '#16504a'; g.beginPath(); g.ellipse(L * 0.04, 0, L * 0.34, L * 0.15, 0, 0, 7); g.fill();
    g.fillStyle = '#f0b23e'; g.fillRect(L * 0.02, -L * 0.03, L * 0.26, L * 0.06);
    g.strokeStyle = '#05080a'; g.lineWidth = L * 0.06; g.lineCap = 'round'; g.beginPath(); g.moveTo(L * 0.3, -L * 0.2); g.lineTo(L * 0.3, L * 0.2); g.stroke();
    g.fillStyle = '#2a6f63'; g.beginPath(); g.ellipse(-L * 0.08, 0, L * 0.13, L * 0.23, 0, 0, 7); g.fill();
    g.fillStyle = '#0c1114'; g.beginPath(); g.arc(L * 0.02, 0, L * 0.11, 0, 7); g.fill();
    g.fillStyle = '#ff4a35'; g.fillRect(-L * 0.56, -L * 0.05, L * 0.04, L * 0.1);
    g.restore();
  }

  /* ---- S3: the stop. The rider, the helmet, the strap ---- */
  var SHOULDER = [400, 158], HEAD = [420, 92];
  function headShape(tilt) {
    g.save(); g.translate(HEAD[0], HEAD[1]); g.rotate(tilt);
    g.fillStyle = '#d9a37e'; g.fillRect(-20, 30, 36, 42);
    g.fillStyle = '#e7b28c';
    g.beginPath(); g.moveTo(-32, -28); g.bezierCurveTo(-20, -50, 20, -52, 34, -26); g.bezierCurveTo(40, -10, 40, 0, 38, 6); g.lineTo(49, 21); g.lineTo(38, 25); g.bezierCurveTo(40, 33, 38, 39, 32, 41); g.bezierCurveTo(26, 53, 6, 57, -6, 51); g.bezierCurveTo(-28, 43, -40, 10, -32, -28); g.closePath(); g.fill();
    g.fillStyle = '#d9a37e'; g.beginPath(); g.ellipse(-8, 8, 8, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#17110d'; g.beginPath(); g.ellipse(24, 3, 3.6, 5, 0, 0, 7); g.fill();
    line([17, -10, 32, -11], 4, '#17110d'); line([24, 37, 36, 35], 3, '#a4674a');
    g.restore();
  }
  function hair(tilt) {
    g.save(); g.translate(HEAD[0], HEAD[1]); g.rotate(tilt); g.fillStyle = '#17110d';
    g.beginPath(); g.moveTo(-36, -2); g.bezierCurveTo(-46, -44, -8, -66, 30, -46); g.bezierCurveTo(40, -40, 38, -30, 31, -25); g.bezierCurveTo(8, -34, -14, -28, -19, -2); g.bezierCurveTo(-23, 8, -32, 8, -36, -2); g.closePath(); g.fill(); g.restore();
  }
  function star(cx, cy, r, rot) {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.beginPath();
    for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.42 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    g.closePath(); g.fillStyle = '#ffd21f'; g.fill(); g.strokeStyle = '#d99a00'; g.lineWidth = 2; g.stroke(); g.restore();
  }
  function helmet(x, y, rot, strap) {
    g.save(); g.translate(x, y); g.rotate(rot);
    var r = g.createLinearGradient(-40, -60, 40, 20); r.addColorStop(0, '#ec4a3d'); r.addColorStop(1, '#c4210f'); g.fillStyle = r;
    g.beginPath(); g.moveTo(-47, 21); g.bezierCurveTo(-58, -30, -30, -68, 12, -66); g.bezierCurveTo(46, -64, 60, -30, 56, 5); g.lineTo(45, 9); g.bezierCurveTo(30, -6, 6, -12, -18, -8); g.bezierCurveTo(-28, -6, -33, 6, -31, 25); g.closePath(); g.fill();
    g.fillStyle = '#a8160f'; g.beginPath(); g.moveTo(-31, 25); g.bezierCurveTo(-33, 6, -28, -6, -18, -8); g.bezierCurveTo(6, -12, 30, -6, 45, 9); g.lineTo(38, 15); g.bezierCurveTo(24, 2, 4, -2, -14, 1); g.bezierCurveTo(-22, 3, -24, 12, -23, 27); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-44, -14); g.bezierCurveTo(-40, -40, -20, -56, 2, -58); g.stroke();
    star(-4, -34, 18, -0.1);
    if (strap > 0) { g.strokeStyle = '#2a1512'; g.lineWidth = 5; g.beginPath(); g.moveTo(-24, 24); g.quadraticCurveTo(lerp(-8, 2, strap), lerp(70, 56, strap), lerp(10, 26, strap), lerp(84, 44, strap)); g.stroke(); }
    g.restore();
  }
  function ik(s, t, l1, l2, bend) {
    var dx = t[0] - s[0], dy = t[1] - s[1], d = clamp(Math.hypot(dx, dy), 10, l1 + l2 - 2), a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend;
    return [s[0] + Math.cos(a + b) * l1, s[1] + Math.sin(a + b) * l1];
  }
  var HELMET = [[0.66, 503, 288, -0.34], [0.735, 503, 288, -0.34], [0.805, 466, 24, -0.22], [0.86, 420, 92, 0], [1, 420, 92, 0]];
  var NEAR = [[0.86, 0, 0], [0.885, 1, 0], [0.905, 1, 0], [0.945, 1, 1], [1, 1, 1]];
  function rider(T, lit) {
    var h = key(T, HELMET), tilt = key(T, [[0.66, 0.26], [0.74, 0.26], [0.805, -0.24], [0.86, 0], [1, -0.03]])[0];
    var n = key(T, NEAR), on = T >= 0.86;
    var grip = [h[0] + 40, h[1] + 66];
    var hand = n[0] > 0 ? [lerp(lerp(grip[0], 462, n[0]), 548, n[1]), lerp(lerp(grip[1], 138, n[0]), 236, n[1])] : grip;
    var farGrip = [h[0] - 38, h[1] + 66], farT = ss(T, 0.86, 0.93), far = [lerp(farGrip[0], 556, farT), lerp(farGrip[1], 228, farT)];
    // while the far hand is close to the shoulder the elbow is pulled in, so it never pokes out behind the head
    var bent = ik(SHOULDER, far, 118, 118, 1), tuck = ss(T, 0.815, 0.85) * (1 - ss(T, 0.9, 0.945));
    var el = [lerp(bent[0], (SHOULDER[0] + far[0]) / 2, tuck), lerp(bent[1], (SHOULDER[1] + far[1]) / 2, tuck)]; line([SHOULDER[0] + 4, SHOULDER[1] + 4, el[0], el[1], far[0], far[1]], 30, '#1c4c44');
    g.fillStyle = '#c99a78'; g.beginPath(); g.arc(far[0], far[1], 15, 0, 7); g.fill();
    bike({ sil: false, blur: false, ang: 0.4, lit: lit, tail: lit > 0.3 });
    line([345, 300, 472, 348, 470, 512], 46, '#22303f');
    g.fillStyle = '#ece6da'; g.beginPath(); g.ellipse(486, 526, 46, 17, 0, 0, 7); g.fill(); g.fillStyle = '#c23b2a'; g.fillRect(442, 534, 88, 6);
    g.fillStyle = '#2a6f63'; g.beginPath(); g.moveTo(312, 306); g.lineTo(330, 180); g.bezierCurveTo(342, 134, 442, 126, 472, 162); g.lineTo(462, 310); g.closePath(); g.fill();
    g.fillStyle = 'rgba(16,52,46,.32)'; g.beginPath(); g.moveTo(312, 306); g.lineTo(330, 180); g.bezierCurveTo(336, 160, 350, 150, 362, 146); g.bezierCurveTo(346, 190, 342, 260, 352, 308); g.closePath(); g.fill();
    line([430, 158, 436, 310], 3, '#f0b23e');
    headShape(tilt);
    if (!on || T < 0.845) hair(tilt);
    var sq = on ? 0 : 0;
    g.save(); if (on) { g.translate(HEAD[0], HEAD[1]); g.rotate(tilt); g.translate(-HEAD[0], -HEAD[1]); }
    helmet(h[0], h[1] + sq, h[2], on ? ss(T, 0.87, 0.895) : 0.0001); g.restore();
    el = ik(SHOULDER, hand, 118, 118, 1); line([SHOULDER[0], SHOULDER[1], el[0], el[1]], 38, '#2f7a6d'); line([el[0], el[1], hand[0], hand[1]], 30, '#2f7a6d');
    g.fillStyle = '#e7b28c'; g.beginPath(); g.arc(hand[0], hand[1], 17, 0, 7); g.fill();
    var click = seg(T, 0.884, 0.915);
    if (click > 0 && click < 1) {
      g.strokeStyle = 'rgba(255,214,120,' + (1 - click) + ')'; g.lineWidth = 4; g.beginPath(); g.arc(462, 138, 18 + click * 54, 0, 7); g.stroke();
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + 0.3, r1 = 30 + click * 44, r2 = r1 + 16; line([462 + Math.cos(a) * r1, 138 + Math.sin(a) * r1, 462 + Math.cos(a) * r2, 138 + Math.sin(a) * r2], 3.5, 'rgba(255,214,120,' + (1 - click) + ')'); }
    }
  }
  function scene3(T, clock) {
    world(0, 0);
    var lit = ss(T, 0.915, 0.955);
    var base = fit(), fx = wide ? W * 0.74 : W * 0.5;
    var pull = ss(T, 0.9, 0.985), s = lerp(base * (wide ? 1.75 : 1.5), base, pull);
    var lx = 430, ly = lerp(205, 540, pull), sx = lerp(W * (wide ? 0.68 : 0.5), fx, pull), sy = lerp(H * (wide ? 0.6 : 0.64), GY, pull);
    g.save(); g.translate(sx, sy); g.scale(-s, s); g.translate(-lx, -ly);
    if (lit > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      var b = g.createLinearGradient(646, 292, 1900, 420); b.addColorStop(0, 'rgba(255,226,170,' + (0.5 * lit) + ')'); b.addColorStop(1, 'rgba(255,226,170,0)'); g.fillStyle = b;
      g.beginPath(); g.moveTo(640, 280); g.lineTo(1900, 150); g.lineTo(1900, 640); g.lineTo(640, 306); g.closePath(); g.fill();
      var q = 320 + Math.sin(clock * 1.7) * 6; g.globalAlpha = 0.6 * lit; g.drawImage(glow, 150 - q, 262 - q / 3, q * 2, q * 0.66); g.globalAlpha = 1; g.restore();
    }
    rider(T, lit);
    g.restore();
  }

  /* ---- story ---- */
  function draw(T, clock) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (T < 0.345) scene1(T, clock); else if (T < 0.655) scene2(T); else scene3(T, clock);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cut = Math.max(1 - Math.abs(T - 0.345) / 0.022, ss(T, 0.625, 0.655) * (1 - ss(T, 0.655, 0.69)));
    if (cut > 0) { g.fillStyle = 'rgba(9,14,17,' + clamp(cut, 0, 1) + ')'; g.fillRect(0, 0, W, H); }
    caps.forEach(function (c) {
      var a = +c.dataset.in, b = +c.dataset.out, v = ss(T, a, a + 0.035) * (1 - ss(T, b - 0.03, b));
      c.style.opacity = v; c.style.transform = 'translateY(' + ((1 - v) * 18) + 'px)';
    });
    var h = ss(T, 0.93, 0.992);
    hero.style.opacity = h; hero.style.transform = 'translateY(' + ((1 - h) * 22) + 'px)'; hero.style.pointerEvents = h > 0.6 ? 'auto' : 'none';
    scrim.style.opacity = ss(T, 0.91, 0.985);
    skip.style.opacity = 1 - ss(T, 0.82, 0.9); skip.style.pointerEvents = T > 0.86 ? 'none' : 'auto';
  }
  function progress() {
    var r = root.getBoundingClientRect(), d = r.height - view.clientHeight;
    return d > 0 ? clamp(-r.top / d, 0, 1) : 1;
  }
  function headerState() {
    var over = root.getBoundingClientRect().bottom > 64;
    if (over) header.setAttribute('data-over', ''); else header.removeAttribute('data-over');
  }

  resize();
  headerState();
  window.addEventListener('scroll', headerState, { passive: true });
  if (calm) {
    draw(1, 0);
    window.addEventListener('resize', function () { resize(); draw(1, 0); headerState(); });
    return;
  }
  root.classList.add('is-live');
  var born = performance.now(), last = born, T = progress() > 0 ? T0 + (1 - T0) * progress() : 0, on = true, rid = 0;
  function frame(now) {
    rid = 0; if (!on) return;
    var dt = Math.min(0.25, (now - last) / 1000); last = now;
    var clock = (now - born) / 1000, p = progress();
    var auto = T0 * (1 - Math.pow(1 - clamp(clock / 2.2, 0, 1), 3)), want = p <= 0.001 ? auto : T0 + (1 - T0) * p;
    T += (want - T) * (1 - Math.exp(-dt * 9));
    if (Math.abs(want - T) < 0.0002) T = want;
    draw(T, clock);
    rid = requestAnimationFrame(frame);
  }
  rid = requestAnimationFrame(frame);
  new IntersectionObserver(function (es) {
    on = es[0].isIntersecting;
    if (on && !rid) { last = performance.now(); rid = requestAnimationFrame(frame); }
  }).observe(view);
  function toEnd() { window.scrollTo({ top: root.offsetTop + root.offsetHeight - view.clientHeight, behavior: 'smooth' }); }
  skip.addEventListener('click', toEnd);
  hero.addEventListener('focusin', function () { if (progress() < 0.9) toEnd(); });
  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(resize, 120); });
})();
