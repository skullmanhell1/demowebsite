/* ============================================================
   Meridian — interactivity
   Vanilla JS, no dependencies. Progressive & accessible.
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle (persisted) ---------- */
  (function theme() {
    const root = document.documentElement;
    const toggle = $('#themeToggle');
    const stored = localStorage.getItem('meridian-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));

    toggle?.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('meridian-theme', next);
    });
  })();

  /* ---------- Header scroll state + scroll progress ---------- */
  (function scrollFx() {
    const header = $('#header');
    const progress = $('#scrollProgress');
    const toTop = $('#toTop');

    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      header?.classList.toggle('scrolled', y > 10);
      if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      toTop?.classList.toggle('show', y > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    toTop?.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
    );
  })();

  /* ---------- Mobile menu ---------- */
  (function mobileMenu() {
    const btn = $('#hamburger');
    const nav = $('#navLinks');
    if (!btn || !nav) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    document.body.appendChild(backdrop);

    const close = () => {
      nav.classList.remove('open');
      btn.classList.remove('is-open');
      backdrop.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
      nav.classList.add('open');
      btn.classList.add('is-open');
      backdrop.classList.add('show');
      btn.setAttribute('aria-expanded', 'true');
    };

    btn.addEventListener('click', () =>
      nav.classList.contains('open') ? close() : open()
    );
    backdrop.addEventListener('click', close);
    $$('a', nav).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  })();

  /* ---------- Scroll reveal ---------- */
  (function reveal() {
    const items = $$('.reveal');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // stagger siblings a touch for a nicer cascade
            const delay = Math.min(i * 60, 240);
            setTimeout(() => entry.target.classList.add('in-view'), delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    items.forEach((el) => io.observe(el));
  })();

  /* ---------- Animated counters ---------- */
  (function counters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1600;
      const start = performance.now();
      const from = 0;

      if (prefersReduced) { el.textContent = target.toLocaleString() + suffix; return; }

      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        const val = Math.round(from + (target - from) * eased);
        el.textContent = val.toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
        });
      },
      { threshold: 0.5 }
    );
    nums.forEach((el) => io.observe(el));
  })();

  /* ---------- Gallery filter ---------- */
  (function gallery() {
    const btns = $$('.filter-btn');
    const tiles = $$('.tile');
    if (!btns.length) return;

    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const f = btn.dataset.filter;
        tiles.forEach((tile) => {
          const show = f === 'all' || tile.dataset.cat === f;
          tile.classList.toggle('is-hidden', !show);
        });
      });
    });
  })();

  /* ---------- Pricing billing toggle ---------- */
  (function pricing() {
    const toggle = $('#billingToggle');
    const amounts = $$('.amount');
    if (!toggle) return;

    const apply = (yearly) => {
      amounts.forEach((el) => {
        const val = yearly ? el.dataset.yearly : el.dataset.monthly;
        // quick count animation between prices
        const from = parseInt(el.textContent, 10) || 0;
        const to = parseInt(val, 10);
        if (prefersReduced || from === to) { el.textContent = to; return; }
        const start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / 400, 1);
          el.textContent = Math.round(from + (to - from) * p);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };

    toggle.addEventListener('click', () => {
      const yearly = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(yearly));
      apply(yearly);
    });
  })();

  /* ---------- Testimonials slider ---------- */
  (function slider() {
    const track = $('#slides');
    const slides = $$('.slide', track);
    const dotsWrap = $('#dots');
    const prev = $('#prevBtn');
    const next = $('#nextBtn');
    if (!track || slides.length === 0) return;

    let idx = 0;
    let timer;

    // build dots
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.setAttribute('aria-label', 'Go to review ' + (i + 1));
      if (i === 0) d.classList.add('is-active');
      d.addEventListener('click', () => go(i, true));
      dotsWrap.appendChild(d);
    });
    const dots = $$('button', dotsWrap);

    const go = (n, user) => {
      idx = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      if (user) restart();
    };

    const start = () => { if (!prefersReduced) timer = setInterval(() => go(idx + 1), 6000); };
    const stop = () => clearInterval(timer);
    const restart = () => { stop(); start(); };

    prev?.addEventListener('click', () => go(idx - 1, true));
    next?.addEventListener('click', () => go(idx + 1, true));

    const slider = $('#slider');
    slider?.addEventListener('mouseenter', stop);
    slider?.addEventListener('mouseleave', start);

    // basic swipe support
    let x0 = null;
    slider?.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
    slider?.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1), true);
      x0 = null;
    });

    start();
  })();

  /* ---------- FAQ accordion ---------- */
  (function accordion() {
    const items = $$('.acc-item');
    items.forEach((item) => {
      const header = $('.acc-header', item);
      const body = $('.acc-body', item);
      header?.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        // close others for a clean single-open accordion
        items.forEach((other) => {
          if (other !== item) {
            other.classList.remove('is-open');
            $('.acc-header', other)?.setAttribute('aria-expanded', 'false');
            $('.acc-body', other).style.maxHeight = null;
          }
        });
        item.classList.toggle('is-open', !isOpen);
        header.setAttribute('aria-expanded', String(!isOpen));
        body.style.maxHeight = !isOpen ? body.scrollHeight + 'px' : null;
      });
    });
  })();

  /* ---------- Contact form validation ---------- */
  (function contact() {
    const form = $('#contactForm');
    if (!form) return;
    const success = $('#formSuccess');

    const setError = (name, msg) => {
      const field = form.querySelector(`[name="${name}"]`)?.closest('.field');
      const errEl = form.querySelector(`.error[data-for="${name}"]`);
      if (field) field.classList.toggle('invalid', !!msg);
      if (errEl) errEl.textContent = msg || '';
    };

    const validate = () => {
      let ok = true;
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const business = form.business.value;
      const message = form.message.value.trim();

      if (name.length < 2) { setError('name', 'Please enter your name.'); ok = false; } else setError('name', '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('email', 'Enter a valid email address.'); ok = false; } else setError('email', '');
      if (!business) { setError('business', 'Please choose a business type.'); ok = false; } else setError('business', '');
      if (message.length < 10) { setError('message', 'Tell us a bit more (10+ characters).'); ok = false; } else setError('message', '');
      return ok;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      success.hidden = false;
      form.reset();
      setTimeout(() => { success.hidden = true; }, 5000);
    });

    // clear error as the user fixes a field
    ['name', 'email', 'business', 'message'].forEach((n) => {
      form[n]?.addEventListener('input', () => setError(n, ''));
      form[n]?.addEventListener('change', () => setError(n, ''));
    });
  })();

  /* ---------- Newsletter (footer) ---------- */
  (function newsletter() {
    const form = $('#newsForm');
    const input = $('#newsEmail');
    const msg = $('#newsMsg');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        msg.textContent = 'Please enter a valid email.';
        msg.style.color = '#ef4444';
        return;
      }
      msg.textContent = "✓ You're subscribed. Welcome aboard!";
      msg.style.color = '';
      form.reset();
    });
  })();

  /* ---------- Active nav link highlight ---------- */
  (function activeNav() {
    const links = $$('.nav-links a[href^="#"]');
    const map = new Map();
    links.forEach((l) => {
      const id = l.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, l);
    });
    if (!map.size || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = map.get(entry.target);
          if (entry.isIntersecting) {
            links.forEach((l) => l.removeAttribute('aria-current'));
            link?.setAttribute('aria-current', 'true');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    map.forEach((_, sec) => io.observe(sec));
  })();

  /* ---------- Footer year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
