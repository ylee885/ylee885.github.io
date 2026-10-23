/* Interactive demos: a speed–accuracy slider (drift-diffusion model) and a cup guessing game.
   Plain JavaScript, no external libraries, nothing is sent anywhere. */
(function () {
  'use strict';

  /* ---------- 1. Speed–accuracy slider ---------- */
  var ddm = document.getElementById('ddm-demo');
  if (ddm) {
    var cvPaths = ddm.querySelector('#ddm-paths'), cvRR = ddm.querySelector('#ddm-rr');
    var sA = ddm.querySelector('#ddm-a'), sV = ddm.querySelector('#ddm-v');
    var out = ddm.querySelector('#ddm-out'), btn = ddm.querySelector('#ddm-run');
    var T0 = 0.3, OVERHEAD = 1.0, TMAX = 4;           // non-decision time, per-trial overhead, plot window (s)
    var ink = '#1c2a3a', accent = '#0a7c8c', muted = '#6b7580', rule = '#e2e8ec';

    function acc(a, v) { return 1 / (1 + Math.exp(-a * v)); }               // unbiased start, noise s = 1
    function dt(a, v) { return (a / (2 * v)) * Math.tanh(a * v / 2); }
    function rr(a, v) { return acc(a, v) / (dt(a, v) + T0 + OVERHEAD); }    // correct answers per second

    function setup(cv) {
      var r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * r; cv.height = h * r;
      var c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h);
      return { c: c, w: w, h: h };
    }

    function drawPaths() {
      var a = +sA.value, v = +sV.value, g = setup(cvPaths), c = g.c, w = g.w, h = g.h;
      var padL = 34, padR = 12, padT = 14, padB = 26, ymax = 4.6;
      var X = function (t) { return padL + (t / TMAX) * (w - padL - padR); };
      var Y = function (x) { return h - padB - (x / ymax) * (h - padT - padB); };
      var top = (ymax + a) / 2, bot = (ymax - a) / 2;            // keep the band centred; evidence starts mid-band
      var Yb = function (x) { return Y(x + bot); };
      c.font = '11px -apple-system, Helvetica, Arial, sans-serif'; c.fillStyle = muted; c.strokeStyle = accent;
      c.setLineDash([6, 4]); c.lineWidth = 1.5;
      [0, a].forEach(function (b) { c.beginPath(); c.moveTo(X(0), Yb(b)); c.lineTo(X(TMAX), Yb(b)); c.stroke(); });
      c.setLineDash([]);
      c.fillText('upper boundary (choose A)', X(0) + 4, Yb(a) - 5);
      c.fillText('lower boundary (choose B)', X(0) + 4, Yb(0) + 14);
      c.fillText('time →', w - padR - 40, h - 8);
      c.strokeStyle = rule; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(0), Y(ymax)); c.stroke();
      for (var k = 0; k < 10; k++) {                              // ten example trials (true answer is A)
        var x = a / 2, t = 0, step = 0.01, pts = [[0, x]];
        while (x > 0 && x < a && t < TMAX) {
          x += v * step + Math.sqrt(step) * gauss(); t += step; pts.push([t, Math.min(Math.max(x, 0), a)]);
        }
        var hit = x >= a;
        c.strokeStyle = hit ? accent : '#b4543f'; c.globalAlpha = 0.55; c.lineWidth = 1.5;
        c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(X(p[0]), Yb(p[1])) : c.moveTo(X(p[0]), Yb(p[1])); }); c.stroke();
      }
      c.globalAlpha = 1; c.fillStyle = ink; c.beginPath(); c.arc(X(0), Yb(a / 2), 3.5, 0, 7); c.fill();
    }
    function gauss() { var u = 0, w = 0; while (!u) u = Math.random(); while (!w) w = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); }

    function drawRR() {
      var a = +sA.value, v = +sV.value, g = setup(cvRR), c = g.c, w = g.w, h = g.h;
      var padL = 34, padR = 12, padT = 14, padB = 26, amin = 0.3, amax = 4.5, best = 0, bestA = amin, i, a2, r2;
      for (i = 0; i <= 200; i++) { a2 = amin + (amax - amin) * i / 200; r2 = rr(a2, v); if (r2 > best) { best = r2; bestA = a2; } }
      var X = function (x) { return padL + (x - amin) / (amax - amin) * (w - padL - padR); };
      var Y = function (y) { return h - padB - y / (best * 1.15) * (h - padT - padB); };
      c.strokeStyle = ink; c.lineWidth = 2; c.beginPath();
      for (i = 0; i <= 200; i++) { a2 = amin + (amax - amin) * i / 200; var p = [X(a2), Y(rr(a2, v))]; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      c.stroke();
      c.fillStyle = muted; c.font = '11px -apple-system, Helvetica, Arial, sans-serif';
      c.fillText('narrow, fast', padL, h - 8); c.fillText('wide, careful', w - padR - 62, h - 8);
      c.fillText('reward rate', w - padR - 58, padT + 2);
      c.fillStyle = accent; c.beginPath(); c.arc(X(bestA), Y(best), 4.5, 0, 7); c.fill();
      c.fillStyle = ink; c.beginPath(); c.arc(X(a), Y(rr(a, v)), 5.5, 0, 7); c.fill();
      c.fillStyle = accent; c.fillText('best', X(bestA) + 8, Y(best) - 6);
      return { best: best, bestA: bestA };
    }

    function update() {
      var a = +sA.value, v = +sV.value, b = drawRR(); drawPaths();
      var r = rr(a, v), a1 = acc(a, v), t = dt(a, v) + T0;
      out.innerHTML = '<span><b>' + Math.round(a1 * 100) + '%</b> correct</span><span><b>' + t.toFixed(2) + ' s</b> mean response time</span><span><b>' +
        Math.round(100 * r / b.best) + '%</b> of the best reward rate</span>';
    }
    ['input', 'change'].forEach(function (e) { sA.addEventListener(e, update); sV.addEventListener(e, update); });
    btn.addEventListener('click', drawPaths);
    window.addEventListener('resize', update); update();
  }

  /* ---------- 2. Cup guessing game ---------- */
  var game = document.getElementById('cup-game');
  if (game) {
    var stage = game.querySelector('.cg-stage'), cupImg = game.querySelector('.cg-cup'), msg = game.querySelector('.cg-msg');
    var info = game.querySelector('.cg-info'), keys = game.querySelector('.cg-keys'), start = game.querySelector('.cg-start');
    var COLORS = ['red', 'yellow', 'blue'], LETTERS = ['F', 'G', 'H'], ROUNDS = 3;
    var st = null, timer = null;

    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function show(text) { msg.textContent = text; msg.hidden = !text; }
    function setKeys(on) { keys.hidden = !on; }

    function newRound() {
      st.round++; st.rule = shuffle(LETTERS); st.tried = []; st.attempts = 0; st.resamples = 0; newAttempt();
    }
    function newAttempt() {
      st.order = shuffle([0, 1, 2]); st.pos = 0; st.guess = [null, null, null]; st.attempts++; showCup();
    }
    function showCup() {
      cupImg.src = 'assets/img/cup' + (st.order[st.pos] + 1) + '.png'; cupImg.hidden = false; show('');
      info.textContent = 'Round ' + st.round + ' of ' + ROUNDS + '  ·  Cup ' + (st.pos + 1) + ' of 3  ·  Which letter is inside?';
      setKeys(true);
    }
    function answer(letter) {
      if (!st || st.busy || keys.hidden) return;
      st.guess[st.order[st.pos]] = letter; st.pos++;
      if (st.pos < 3) { showCup(); return; }
      var key = st.guess.join(''), ok = key === st.rule.join('');
      if (st.tried.indexOf(key) > -1) st.resamples++;           // re-testing an already rejected combination
      st.tried.push(key); st.busy = true; setKeys(false); cupImg.hidden = true;
      show(ok ? 'Correct! Good job.\nMoving on to the next round' : 'Try Again');
      timer = setTimeout(function () {
        st.busy = false;
        if (!ok) { newAttempt(); }
        else {
          st.log.push({ attempts: st.attempts, resamples: st.resamples });
          if (st.round < ROUNDS) newRound(); else finish();
        }
      }, ok ? 1500 : 1100);
    }
    function finish() {
      cupImg.hidden = true; setKeys(false); info.textContent = 'Finished';
      var tot = st.log.reduce(function (s, r) { return s + r.resamples; }, 0), att = st.log.reduce(function (s, r) { return s + r.attempts; }, 0);
      show('You won all ' + ROUNDS + ' rounds in ' + att + ' attempts.\nResamples (re-testing a combination that already failed): ' + tot);
      start.hidden = false; start.textContent = 'Play again'; st = null;
    }
    start.addEventListener('click', function () {
      clearTimeout(timer); st = { round: 0, log: [], busy: false }; start.hidden = true; newRound(); stage.focus();
    });
    keys.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) answer(b.dataset.l); });
    document.addEventListener('keydown', function (e) {
      if (!st) return; var k = e.key.toUpperCase();
      if (LETTERS.indexOf(k) > -1 && game.contains(document.activeElement) || (LETTERS.indexOf(k) > -1 && game.matches(':hover'))) answer(k);
    });
  }

  /* ---------- 3. Looping figure: simultaneous vs sequential presentation ---------- */
  var loops = document.querySelectorAll('canvas[data-loop]');
  if (loops.length) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var CYCLE = 5200, state = { n: -1, p: null };
    function lens() {                                           // a fresh pair of lines each cycle
      var base = 0.42, d = 0.09, f = Math.random() < 0.5, l1 = base * (f ? 1 + d : 1), l2 = base * (f ? 1 : 1 + d);
      return { l1: l1, l2: l2, y1: 0.08 + Math.random() * (0.84 - l1), y2: 0.08 + Math.random() * (0.84 - l2), xa: 0.42 + Math.random() * 0.16, xb: 0.42 + Math.random() * 0.16 };
    }
    function frame(cv, mode, ms, p) {
      var r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * r)) { cv.width = w * r; cv.height = h * r; }
      var c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0);
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1c2a3a'; c.lineWidth = 1.5; c.strokeRect(0.75, 0.75, w - 1.5, h - 1.5); c.fillStyle = '#111';
      function bar(x, y, len) { c.fillRect(x * w - 5, y * h, 10, len * h); }
      if (mode === 'sim') { if (ms > 300 && ms < 2800) { bar(0.3, p.y1, p.l1); bar(0.7, p.y2, p.l2); } }
      else if (ms > 300 && ms < 1300) bar(p.xa, p.y1, p.l1);
      else if (ms > 2300 && ms < 3300) bar(p.xb, p.y2, p.l2);
    }
    function tick(now) {
      var n = Math.floor(now / CYCLE), ms = now % CYCLE;
      if (n !== state.n) { state.n = n; state.p = lens(); }
      loops.forEach(function (cv) { frame(cv, cv.dataset.loop, ms, state.p); });
      requestAnimationFrame(tick);
    }
    if (reduce) { var pp = lens(); loops.forEach(function (cv) { frame(cv, cv.dataset.loop, cv.dataset.loop === 'sim' ? 1000 : 500, pp); }); }
    else requestAnimationFrame(tick);
  }

  /* ---------- 4. Kinetic occlusion: the same event with three contour variations ---------- */
  var kin = document.querySelector('canvas[data-kin]');
  if (kin) {
    var label = document.querySelector('.kin-label'), res = document.querySelector('.kin-result'),
        VAR = [['concave cusps', 1.6, 'Most observers saw the red object as being cut in two.'], ['no cusps', 0, 'Fewer than half saw the red object as cut, the lowest rate of the three.'], ['convex cusps', -1.6, 'Fewer than half saw the red object as cut, slightly more than with no cusps.']];
    var W = 118, H = 298, TOP = 300, BX = 660, BY = 330, BW = 118, BH = 238, X0 = 372, X1 = 948, CYC = 4600;
    function shape(c, x, d) {                                    // red object; d > 0 concave notch, d < 0 convex tip, 0 straight
      var mid = TOP + H / 2, hs = 0.11 * H, dep = Math.abs(d) * 16;
      c.beginPath(); c.moveTo(x, TOP);
      if (d) { c.lineTo(x, mid - hs); c.quadraticCurveTo(x, mid, x + (d > 0 ? dep : -dep), mid); c.quadraticCurveTo(x, mid, x, mid + hs); }
      c.lineTo(x, TOP + H); c.lineTo(x + W, TOP + H); c.lineTo(x + W, mid + hs);
      if (d) { c.quadraticCurveTo(x + W, mid, x + W + (d > 0 ? -dep : dep), mid); c.quadraticCurveTo(x + W, mid, x + W, mid - hs); }
      c.lineTo(x + W, TOP); c.closePath(); c.fillStyle = '#d01200'; c.fill();
    }
    function kframe(ms, v) {
      var r = window.devicePixelRatio || 1, w = kin.clientWidth, h = kin.clientHeight;
      if (kin.width !== Math.round(w * r)) { kin.width = w * r; kin.height = h * r; }
      var c = kin.getContext('2d'), s = w / 1440; c.setTransform(r * s, 0, 0, r * s, 0, 0);
      var k = ms < 400 ? 0 : ms < 2400 ? (ms - 400) / 2000 : ms < 4400 ? 1 - (ms - 2400) / 2000 : 0;
      var x = X0 + (X1 - X0) * (1 - Math.cos(Math.PI * k)) / 2;
      c.fillStyle = '#c7c7c7'; c.fillRect(0, 0, 1440, 900);
      c.fillStyle = '#303eff'; c.fillRect(BX, BY, BW, BH);       // stationary object
      shape(c, x, VAR[v][1]);                                   // moving object
      c.save(); c.beginPath(); c.rect(BX, BY, BW, TOP + H / 2 - BY); c.clip();
      c.fillStyle = '#303eff'; c.fillRect(BX, BY, BW, BH); c.restore();   // upper half of the moving object passes behind
    }
    var kv = -1;
    function ktick(now) {
      var n = Math.floor(now / CYC) % 3, ms = now % CYC;
      if (n !== kv) { kv = n; if (label) label.textContent = VAR[n][0]; if (res) res.textContent = VAR[n][2]; }
      kframe(ms, n); requestAnimationFrame(ktick);
    }
    var kr = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (kr) { kframe(1500, 0); if (label) label.textContent = VAR[0][0]; if (res) res.textContent = VAR[0][2]; } else requestAnimationFrame(ktick);
  }

  /* ---------- 5. Continuous flash suppression: mask, target, and what the observer sees ---------- */
  var cfsC = document.querySelectorAll('canvas[data-cfs]');
  if (cfsC.length) {
    var SZ = 160, CYCLE5 = 9000, RAMP = 6000;
    var maskC = document.createElement('canvas'); maskC.width = maskC.height = SZ; var mctx = maskC.getContext('2d');
    var gabC = document.createElement('canvas'); gabC.width = gabC.height = 90; var gctx = gabC.getContext('2d'), gimg = gctx.createImageData(90, 90);
    var lastMask = -1;
    function newMask() {
      mctx.fillStyle = '#808080'; mctx.fillRect(0, 0, SZ, SZ);
      for (var i = 0; i < 150; i++) {
        mctx.fillStyle = 'hsl(' + Math.floor(Math.random() * 360) + ',85%,' + (35 + Math.floor(Math.random() * 30)) + '%)';
        var x = Math.random() * (SZ + 20) - 10, y = Math.random() * (SZ + 20) - 10, s = 16 + Math.random() * 34;
        if (Math.random() < 0.5) { mctx.beginPath(); mctx.arc(x, y, s / 2, 0, 7); mctx.fill(); } else { mctx.save(); mctx.translate(x, y); mctx.rotate(Math.random() * 3); mctx.fillRect(-s / 2, -s / 2, s, s); mctx.restore(); }
      }
    }
    function gabor(contrast, phase) {
      var d = gimg.data, N = 90, sig = 17, f = 0.11, th = Math.PI / 4, ct = Math.cos(th), st = Math.sin(th);
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var u = x - N / 2, v = y - N / 2, g = Math.exp(-(u * u + v * v) / (2 * sig * sig)), s = Math.sin(2 * Math.PI * f * (u * ct + v * st) + phase);
        var val = 128 + 120 * contrast * g * s, i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = val; d[i + 3] = 255 * Math.min(1, g * 1.6);
      }
      gctx.putImageData(gimg, 0, 0);
    }
    function base(c) { c.fillStyle = '#808080'; c.fillRect(0, 0, SZ, SZ); }
    function cross(c) { c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(SZ / 2 - 7, SZ / 2); c.lineTo(SZ / 2 + 7, SZ / 2); c.moveTo(SZ / 2, SZ / 2 - 7); c.lineTo(SZ / 2, SZ / 2 + 7); c.stroke(); }
    function frameBox(c) { c.strokeStyle = '#1c2a3a'; c.lineWidth = 6; c.strokeRect(3, 3, SZ - 6, SZ - 6); }
    function paintCfs(ms) {
      var cTarget = Math.min(1, ms / RAMP), cMask = ms < RAMP ? 1 : Math.max(0.35, 1 - (ms - RAMP) / 3000 * 0.65);
      var breakthrough = Math.min(1, Math.max(0, (ms - 3500) / 2500));
      var slot = Math.floor(ms / 100); if (slot !== lastMask) { lastMask = slot; newMask(); }
      cfsC.forEach(function (cv) {
        var r = window.devicePixelRatio || 1, w = cv.clientWidth; if (cv.width !== Math.round(w * r)) { cv.width = cv.height = w * r; }
        var c = cv.getContext('2d'), k = (w * r) / SZ; c.setTransform(k, 0, 0, k, 0, 0); var kind = cv.dataset.cfs;
        if (kind === 'mask') { c.drawImage(maskC, 0, 0); c.globalAlpha = 1 - cMask; base(c); c.globalAlpha = 1; cross(c); frameBox(c); }
        else if (kind === 'target') { base(c); gabor(cTarget, ms / 180); c.drawImage(gabC, SZ * 0.56, SZ * 0.2, 56, 56); cross(c); frameBox(c); }
        else { c.drawImage(maskC, 0, 0); c.globalAlpha = 1 - cMask; base(c); c.globalAlpha = breakthrough; gabor(cTarget, ms / 180); c.drawImage(gabC, SZ * 0.56, SZ * 0.2, 56, 56); c.globalAlpha = 1; cross(c); frameBox(c); }
      });
    }
    var cr = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function ctick(now) { paintCfs(now % CYCLE5); requestAnimationFrame(ctick); }
    if (cr) paintCfs(5200); else requestAnimationFrame(ctick);
  }
})();
