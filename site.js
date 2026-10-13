(function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu: moves focus in, keeps it there, and hands it back on close
  var menu = document.getElementById('mobile-menu');
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');
  if (menu && openBtn && closeBtn) {
    var setMenu = function (open, refocus) {
      menu.hidden = !open;
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { closeBtn.focus(); } else if (refocus) { openBtn.focus(); }
    };
    openBtn.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false, true); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false, false); }); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { setMenu(false, true); return; }
      if (e.key !== 'Tab') return;
      var items = menu.querySelectorAll('a, button');
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Enquiry form: sends in place via Web3Forms. Without JavaScript the form still posts normally.
  var form = document.getElementById('enquiry');
  if (form) {
    var CONTACT_EMAIL = 'hello@melu.co.nz';
    var sent = document.getElementById('sent');
    var submitBtn = document.getElementById('f-submit');
    var submitLabel = document.getElementById('f-submit-label');
    var checks = [
      { id: 'f-name', ok: function (v) { return v.length > 0; } },
      { id: 'f-business', ok: function (v) { return v.length > 0; } },
      { id: 'f-email', ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); } },
      { id: 'f-phone', ok: function (v) { return v === '' || (/^[0-9+() -]+$/.test(v) && v.replace(/\D/g, '').length >= 7); } }
    ];
    var mark = function (input, valid) {
      input.closest('.field').classList.toggle('invalid', !valid);
      if (valid) { input.removeAttribute('aria-invalid'); } else { input.setAttribute('aria-invalid', 'true'); }
    };
    checks.forEach(function (c) {
      var input = document.getElementById(c.id);
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid')) mark(input, c.ok(input.value.trim())); });
    });
    var showStatus = function (isError, text) {
      sent.textContent = text;
      if (isError) {
        var link = document.createElement('a');
        link.href = 'mailto:' + CONTACT_EMAIL;
        link.textContent = CONTACT_EMAIL;
        sent.appendChild(link);
        sent.appendChild(document.createTextNode(" and we'll pick it up."));
      }
      sent.classList.toggle('error', isError);
      sent.classList.add('show');
      sent.focus();
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      checks.forEach(function (c) {
        var input = document.getElementById(c.id);
        var valid = c.ok(input.value.trim());
        mark(input, valid);
        if (!valid && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }
      if (form.botcheck.checked) return; // only a bot ticks the hidden box
      var name = form.elements['name'].value.trim();
      var business = form.elements['business'].value.trim();
      var interests = [].slice.call(form.querySelectorAll('input[name="interest"]:checked')).map(function (i) { return i.value; });
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: form.elements['access_key'].value,
          subject: 'New enquiry from ' + name + ' (' + business + ') — melu.co.nz',
          from_name: 'Melu Media website',
          name: name,
          business: business,
          email: form.elements['email'].value.trim(),
          phone: form.elements['phone'].value.trim() || 'Not given',
          looking_for: interests.length ? interests.join(', ') : 'Not specified',
          message: form.elements['message'].value.trim() || '(no message)'
        })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (!data || !data.success) throw new Error('rejected');
        form.reset();
        showStatus(false, 'Sent. Thanks ' + name.split(' ')[0] + ", we'll be in touch within two working days.");
      }).catch(function () {
        showStatus(true, "That didn't send. Please email us at ");
      }).finally(function () {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send enquiry';
      });
    });
  }

  // Videos: nothing downloads until a video is on screen. They play muted while visible,
  // pause when scrolled away, and each has its own play/pause and sound buttons.
  var conn = navigator.connection || {};
  var autoplay = !reduce && !conn.saveData && !/(^|-)2g$|^3g$/.test(conn.effectiveType || '');
  var reels = [].slice.call(document.querySelectorAll('.reel'));
  reels.forEach(function (reel) {
    var video = reel.querySelector('video');
    var toggle = reel.querySelector('.toggle');
    var sound = reel.querySelector('.sound');
    var name = reel.getAttribute('data-name');
    video.removeAttribute('controls');
    video.muted = true;
    function sync() {
      var playing = !video.paused;
      reel.classList.toggle('playing', playing);
      toggle.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' video: ' + name);
    }
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    toggle.addEventListener('click', function () {
      if (video.paused) { reel.userChoice = 'play'; video.play().catch(function () {}); }
      else { reel.userChoice = 'pause'; video.pause(); }
    });
    sound.addEventListener('click', function () {
      var turnOn = video.muted;
      reels.forEach(function (r) {
        r.querySelector('video').muted = true;
        r.classList.remove('unmuted');
        r.querySelector('.sound').setAttribute('aria-label', 'Unmute video: ' + r.getAttribute('data-name'));
      });
      if (turnOn) {
        video.muted = false;
        reel.classList.add('unmuted');
        sound.setAttribute('aria-label', 'Mute video: ' + name);
        reel.userChoice = 'play';
        video.play().catch(function () {});
      }
    });
  });
  if (reels.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var reel = en.target;
        var video = reel.querySelector('video');
        if (en.isIntersecting) {
          if (autoplay && reel.userChoice !== 'pause') video.play().catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.5 });
    reels.forEach(function (reel) { io.observe(reel); });
  }

  // Hero glow: slow light drifting behind the page. Drawn at quarter resolution
  // (the gradients are soft, so it looks the same) and at about 30 frames a second.
  var canvas = document.getElementById('glow');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var SCALE = 0.25;
    var w, h;
    var resize = function () {
      w = Math.max(1, Math.round(window.innerWidth * SCALE));
      h = Math.max(1, Math.round(window.innerHeight * SCALE));
      canvas.width = w; canvas.height = h;
    };
    var light = getComputedStyle(document.documentElement).colorScheme.indexOf('light') === 0;
    var tint = light ? [255, 255, 255] : [242, 240, 235];
    var gain = light ? 9 : 1;
    var orbs = [
      { x: 0.72, y: 0.35, r: 0.55, c: tint, a: 0.07 * gain, sx: 0.00012, sy: 0.00009, p: 0 },
      { x: 0.18, y: 0.85, r: 0.45, c: tint, a: 0.05 * gain, sx: 0.00009, sy: 0.00013, p: 2 },
      { x: 0.45, y: 0.1, r: 0.35, c: tint, a: 0.05 * gain, sx: 0.00015, sy: 0.00008, p: 4 }
    ];
    var draw = function (t) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      orbs.forEach(function (o) {
        var ox = o.x + Math.sin(t * o.sx + o.p) * 0.08;
        var oy = o.y + Math.cos(t * o.sy + o.p) * 0.08;
        var rad = Math.max(w, h) * o.r;
        var g = ctx.createRadialGradient(ox * w, oy * h, 0, ox * w, oy * h, rad);
        g.addColorStop(0, 'rgba(' + o.c.join(',') + ',' + o.a + ')');
        g.addColorStop(1, 'rgba(' + o.c.join(',') + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      ctx.globalCompositeOperation = 'source-over';
    };
    var start = performance.now();
    var last = 0;
    var loop = function (now) {
      if (now - last > 32) { last = now; draw(now - start); }
      requestAnimationFrame(loop);
    };
    resize();
    window.addEventListener('resize', function () { resize(); draw(performance.now() - start); });
    if (reduce) { draw(3000); } else { requestAnimationFrame(loop); }
  }
})();
