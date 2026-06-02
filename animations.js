'use strict';
/* =============================================================
   SENA LAB — Animation Engine
   Particle network · Scroll reveals · 3D tilt · Magnetic btns
   Ripple · Counters · Route transitions · Login effects
   ============================================================= */

const CYAN = [6, 182, 212];

/* ─────────────────────────────────────────────────────────────
   1. CANVAS PARTICLE NETWORK (hero background)
   ───────────────────────────────────────────────────────────── */
function initParticleBackground() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = Math.min(70, Math.floor(window.innerWidth / 18));
  const MAX_DIST = 160;

  class Particle {
    constructor() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.r  = Math.random() * 1.6 + 0.4;
    }
    step() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height)  this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CYAN},0.55)`;
      ctx.fill();
    }
  }

  const pts = Array.from({ length: COUNT }, () => new Particle());
  let mx = -9999, my = -9999;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < pts.length; i++) {
      // particle ↔ particle lines
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.hypot(dx, dy);
        if (d < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(${CYAN},${(1 - d / MAX_DIST) * 0.17})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
      // mouse repulsion / connection
      const mdx = pts[i].x - mx;
      const mdy = pts[i].y - my;
      const md  = Math.hypot(mdx, mdy);
      if (md < 120) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(mx, my);
        ctx.strokeStyle = `rgba(${CYAN},${(1 - md / 120) * 0.38})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }

      pts[i].step();
      pts[i].draw();
    }
    requestAnimationFrame(frame);
  }
  frame();
}

/* ─────────────────────────────────────────────────────────────
   2. MINI PARTICLE NETWORK for login canvas
   ───────────────────────────────────────────────────────────── */
function initLoginCanvas() {
  const canvas = document.getElementById('loginCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = 28;
  class P {
    constructor() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.28;
      this.vy = (Math.random() - 0.5) * 0.28;
      this.r  = Math.random() * 1.5 + 0.4;
    }
    step() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height)  this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CYAN},0.45)`;
      ctx.fill();
    }
  }
  const pts = Array.from({ length: COUNT }, () => new P());
  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 130) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(${CYAN},${(1 - d / 130) * 0.2})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
      pts[i].step();
      pts[i].draw();
    }
    requestAnimationFrame(frame);
  }
  frame();
}

/* ─────────────────────────────────────────────────────────────
   3. SCROLL REVEAL  — repeating, visible in both directions
      • Scroll DOWN → element slides UP into view  (add .revealed)
      • Scroll UP   → element slides DOWN out of view (remove .revealed
                       while still partially visible so user sees it)
      • Scroll DOWN again → element slides UP in again
   ───────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const pending = new WeakMap();
  const active  = new Set();   // elements that have been in view at least once

  // ── Track scroll direction ────────────────────────────────
  let lastY       = window.scrollY;
  let goingDown   = true;
  window.addEventListener('scroll', () => {
    const y  = window.scrollY;
    goingDown = y >= lastY;
    lastY     = y;
  }, { passive: true });

  // ── IntersectionObserver for ENTRY (scroll down) ──────────
  const enterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (!entry.isIntersecting) return;
      active.add(el);
      // Reveal with stagger delay
      if (pending.has(el)) clearTimeout(pending.get(el));
      const delay = parseInt(el.style.getPropertyValue('--delay')) || 0;
      pending.set(el, setTimeout(() => el.classList.add('revealed'), delay));
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -5% 0px' });

  // ── Smooth exit helper ───────────────────────────────────────
  // The root CSS has transition-delay: var(--delay) on reveal-up etc.
  // That delay is for staggered ENTRY. On exit we force delay=0 and
  // switch to ease-in so the animation is snappy and always visible.
  function smoothExit(el) {
    if (pending.has(el)) { clearTimeout(pending.get(el)); pending.delete(el); }

    // Override to instant-start, ease-in exit
    el.style.transitionDelay          = '0ms';
    el.style.transitionTimingFunction = 'ease-in';
    el.style.transitionDuration       = '.42s';

    // For split-heading letters: each letter needs its own override
    el.querySelectorAll('.letter').forEach(l => {
      l.style.transitionDelay          = '0ms';
      l.style.transitionTimingFunction = 'ease-in';
      l.style.transitionDuration       = '.35s';
    });

    el.classList.remove('revealed');

    // Restore CSS-driven transitions after the exit completes
    setTimeout(() => {
      el.style.transitionDelay          = '';
      el.style.transitionTimingFunction = '';
      el.style.transitionDuration       = '';
      el.querySelectorAll('.letter').forEach(l => {
        l.style.transitionDelay          = '';
        l.style.transitionTimingFunction = '';
        l.style.transitionDuration       = '';
      });
    }, 460);
  }

  // ── Scroll listener for EXIT (while still visible on screen) ──
  // Triggers when element has less than 30 % visible — the CSS
  // transition then plays while the remaining 30 % slides out.
  const EXIT_RATIO = 0.30;
  let rafPending = false;

  function checkExits() {
    rafPending = false;
    active.forEach(el => {
      const r  = el.getBoundingClientRect();
      const vh = window.innerHeight;

      if (!goingDown) {
        // ── Scrolling UP ──────────────────────────────────
        if (el.classList.contains('revealed')) {
          // Partially in viewport: exit when mostly gone from the bottom
          if (r.top < vh && r.bottom > 0) {
            const vis = (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height;
            if (vis < EXIT_RATIO) smoothExit(el);
          }
          // Completely below viewport — reset for replay on next scroll-down
          if (r.top >= vh) smoothExit(el);
        }
      } else {
        // ── Scrolling DOWN ────────────────────────────────
        // Went above viewport — reset so scroll-up replays the entrance
        if (r.bottom <= 0 && el.classList.contains('revealed')) smoothExit(el);
      }
    });
  }

  window.addEventListener('scroll', () => {
    if (!rafPending) { rafPending = true; requestAnimationFrame(checkExits); }
  }, { passive: true });

  document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.reveal-scale')
    .forEach(el => enterObs.observe(el));
}

/* ─────────────────────────────────────────────────────────────
   4. 3-D CARD TILT
   ───────────────────────────────────────────────────────────── */
function initTiltCards() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    let raf;
    card.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width  - 0.5;
        const y = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${-y * 14}deg) rotateY(${x * 14}deg) translateZ(10px)`;
        const sh = card.querySelector('.card-shimmer');
        if (sh) sh.style.background =
          `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(6,182,212,0.14) 0%, transparent 60%)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      card.style.transition = 'transform .55s cubic-bezier(0.23,1,0.32,1)';
      card.style.transform  = '';
      setTimeout(() => { card.style.transition = ''; }, 560);
      const sh = card.querySelector('.card-shimmer');
      if (sh) sh.style.background = '';
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   5. MAGNETIC BUTTONS
   ───────────────────────────────────────────────────────────── */
function initMagneticButtons() {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width  / 2;
      const y = e.clientY - r.top  - r.height / 2;
      btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform .55s cubic-bezier(0.23,1,0.32,1)';
      btn.style.transform  = '';
      setTimeout(() => { btn.style.transition = ''; }, 560);
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   6. RIPPLE on primary buttons
   ───────────────────────────────────────────────────────────── */
function initRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-primary,.btn-add');
    if (!btn) return;
    const rip  = document.createElement('span');
    rip.className = 'ripple';
    const br   = btn.getBoundingClientRect();
    const size = Math.max(br.width, br.height) * 2;
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - br.left - size / 2}px;top:${e.clientY - br.top - size / 2}px;`;
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 680);
  });
}

/* ─────────────────────────────────────────────────────────────
   7. STAT COUNTER ANIMATION  (watches metricPatients/metricTests)
   ───────────────────────────────────────────────────────────── */
function initCounters() {
  function animateTo(el, target) {
    if (!target || isNaN(target)) return;
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1400, 1);
      const e = 1 - Math.pow(1 - p, 3);   // ease-out cubic
      el.textContent = Math.floor(e * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  ['metricPatients', 'metricTests'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // Watch for when app.js sets the value
    const mo = new MutationObserver(() => {
      const val = parseInt(el.textContent, 10);
      if (!isNaN(val) && val > 0) { mo.disconnect(); animateTo(el, val); }
    });
    mo.observe(el, { childList: true, characterData: true, subtree: true });
  });
}

/* ─────────────────────────────────────────────────────────────
   8. ROUTE TRANSITION (page-enter class on visible sections)
   ───────────────────────────────────────────────────────────── */
function initRouteTransitions() {
  function animate() {
    requestAnimationFrame(() => {
      // Only animate route-view sections (workspace, login, etc.)
      // Never animate route-public — hero content uses CSS auto-animations
      document.querySelectorAll(
        '.route-view:not(.route-hidden):not(.is-hidden)'
      ).forEach(sec => {
        sec.classList.remove('page-enter');
        void sec.offsetWidth;          // force reflow
        sec.classList.add('page-enter');
      });

      // Re-run scroll reveals for newly visible sections
      document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.reveal-scale')
        .forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.92) {
            const delay = parseInt(el.style.getPropertyValue('--delay')) || 0;
            setTimeout(() => el.classList.add('revealed'), delay);
          }
        });
    });
  }

  window.addEventListener('hashchange', () => setTimeout(animate, 20));
  window.addEventListener('load', () => setTimeout(animate, 60));
}

/* ─────────────────────────────────────────────────────────────
   9. LOGIN CARD EFFECTS
   ───────────────────────────────────────────────────────────── */
function initLoginEffects() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Observe loginMessage for error text → shake card
  const msgEl = document.getElementById('loginMessage');
  if (msgEl) {
    const mo = new MutationObserver(() => {
      const text = msgEl.textContent || '';
      if (text.toLowerCase().includes('not correct') || text.toLowerCase().includes('error')) {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
      }
    });
    mo.observe(msgEl, { childList: true, characterData: true, subtree: true });
  }

  // Loading state on submit
  form.addEventListener('submit', () => {
    const btn = form.querySelector('.btn-primary');
    if (!btn) return;
    btn.classList.add('loading');
    btn.disabled = true;
    setTimeout(() => { btn.classList.remove('loading'); btn.disabled = false; }, 1200);
  });
}

/* ─────────────────────────────────────────────────────────────
   10. NAV ACTIVE STATE
   ───────────────────────────────────────────────────────────── */
function initNavHighlight() {
  function update() {
    const h = window.location.hash || '#home';
    document.querySelectorAll('nav a').forEach(a => {
      a.classList.toggle('nav-active', a.getAttribute('href') === h);
    });
  }
  window.addEventListener('hashchange', update);
  update();
}

/* ─────────────────────────────────────────────────────────────
   11. FLOATING ORB DOTS — make them appear after load for perf
   ───────────────────────────────────────────────────────────── */
function initOrbDots() {
  // Already handled via CSS animation — just ensure they show
  document.querySelectorAll('.mol-dot').forEach((dot, i) => {
    dot.style.animationDelay = `${-i * 1.3}s`;
  });

  // If logo image fails (white-bg PNG issue), hide img and show initials
  const img = document.querySelector('.mol-logo-img');
  if (img) {
    img.addEventListener('error', () => { img.style.display = 'none'; });
    img.addEventListener('load', () => {
      // Test if the image is mostly white (white-bg PNG)
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 4;
        const c = canvas.getContext('2d');
        c.drawImage(img, 0, 0, 4, 4);
        const d = c.getImageData(0, 0, 4, 4).data;
        // Check top-left pixel: if very bright, assume white bg → hide
        if (d[0] > 240 && d[1] > 240 && d[2] > 240) {
          img.style.display = 'none';
        }
      } catch (e) { /* cross-origin, leave as-is */ }
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   12. SCROLL-BASED NAVBAR OPACITY boost
   ───────────────────────────────────────────────────────────── */
function initNavbarScroll() {
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  let last = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    bar.style.background = y > 40
      ? 'rgba(5,12,26,0.97)'
      : 'rgba(5,12,26,0.82)';
    last = y;
  }, { passive: true });
}

/* ─────────────────────────────────────────────────────────────
   SPLIT HEADINGS — char-by-char on scroll
   Walks the DOM tree of each target heading, replaces text nodes
   with individual .letter spans (preserving child elements like <em>).
   ───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initParticleBackground();
  initLoginCanvas();
  initScrollReveal();
  initTiltCards();
  initMagneticButtons();
  initRipple();
  initCounters();
  initRouteTransitions();
  initLoginEffects();
  initNavHighlight();
  initOrbDots();
  initNavbarScroll();
});
