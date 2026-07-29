/* ============================================================
   Vidyamrit — script.js
   Core UI behaviour, loaded on every page (defer):
     · navbar shadow on scroll
     · mobile drawer open/close (+ backdrop, Esc, scroll lock)
     · Programs dropdown toggle on mobile
     · button ripple micro-interaction
     · FAQ single-open accordion
     · active navigation link
     · footer year
   ============================================================ */
(function () {
  'use strict';

  const doc = document;
  const header = doc.getElementById('siteHeader');
  const toggle = doc.getElementById('navToggle');
  const menu = doc.getElementById('navMenu');
  const backdrop = doc.getElementById('navBackdrop');

  /* ---- 1. Navbar shadow on scroll ----------------------- */
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- 2. Mobile drawer --------------------------------- */
  function setMenu(open) {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    if (backdrop) backdrop.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    doc.body.classList.toggle('nav-open', open);
  }

  if (toggle) {
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  }
  if (backdrop) backdrop.addEventListener('click', () => setMenu(false));

  // close drawer when a real link is tapped
  if (menu) {
    menu.querySelectorAll('a[href]').forEach((a) => {
      a.addEventListener('click', () => setMenu(false));
    });
  }

  // Escape closes the drawer
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  // reset drawer state if resized back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setMenu(false);
  });

  /* ---- 3. Programs dropdown toggle (mobile) ------------- */
  doc.querySelectorAll('.nav-link--drop').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      // only intercept when the drawer layout is active
      if (window.innerWidth <= 860) {
        e.preventDefault();
        const parent = btn.closest('.has-dropdown');
        if (parent) {
          const open = parent.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', String(open));
        }
      }
    });
  });

  /* ---- 4. Button ripple --------------------------------- */
  doc.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = doc.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  /* ---- 5. FAQ single-open accordion --------------------- */
  doc.querySelectorAll('.faq').forEach((group) => {
    const items = group.querySelectorAll('.faq-item');
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (item.open) {
          items.forEach((other) => { if (other !== item) other.open = false; });
        }
      });
    });
  });

  /* ---- 6. Active navigation link ------------------------ */
  (function markActive() {
    if (!menu) return;
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const programPages = ['navodaya.html', 'sainik.html', 'foundation.html', 'board.html'];

    menu.querySelectorAll('.nav-link[href]').forEach((link) => {
      const target = (link.getAttribute('href').split('/').pop() || '').toLowerCase();
      if (target && target === current) link.classList.add('is-active');
    });
    // highlight the Programs parent when on any program page
    if (programPages.includes(current)) {
      const drop = menu.querySelector('.nav-link--drop');
      if (drop) drop.classList.add('is-active');
    }
  })();

  /* ---- 7. Footer year ----------------------------------- */
  const yearEl = doc.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
