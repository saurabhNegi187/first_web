/* ============================================================
   Vidyamrit — animations.js
   Visual + gallery behaviour (defer):
     · scroll reveals (IntersectionObserver, auto-stagger)
     · animated number counters
     · gallery category filtering
     · lightbox (open/close, prev/next, keyboard)
   Everything degrades gracefully with prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  const doc = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Scroll reveals -------------------------------- */
  const reveals = doc.querySelectorAll('.reveal');

  // auto-stagger children inside a [data-stagger] container
  doc.querySelectorAll('[data-stagger]').forEach((group) => {
    const step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
    group.querySelectorAll('.reveal').forEach((el, i) => {
      if (!el.style.getPropertyValue('--d')) {
        el.style.setProperty('--d', (i * step).toFixed(2) + 's');
      }
    });
  });

  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ---- 2. Number counters ------------------------------- */
  const counters = doc.querySelectorAll('[data-count]');

  function runCounter(el) {
    const target = parseFloat(el.getAttribute('data-count')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1500;

    const render = (val) => {
      const n = Math.round(val).toLocaleString('en-IN');
      el.innerHTML = n + (suffix ? '<span class="suffix">' + suffix + '</span>' : '');
    };

    if (reduce) { render(target); return; }

    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      render(target * ease(p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCounter);
    } else {
      const cio = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { runCounter(entry.target); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach((el) => cio.observe(el));
    }
  }

  /* ---- 3. Gallery filtering ----------------------------- */
  const filterBar = doc.querySelector('.filters');
  const gallery = doc.querySelector('.gallery');

  if (filterBar && gallery) {
    const tiles = Array.from(gallery.querySelectorAll('.moment-tile'));
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const filter = btn.getAttribute('data-filter');

      tiles.forEach((tile) => {
        const cat = tile.getAttribute('data-category');
        const show = filter === 'all' || cat === filter;
        tile.classList.toggle('is-hidden', !show);
      });
    });
  }

  /* ---- 4. Lightbox -------------------------------------- */
  const lightbox = doc.getElementById('lightbox');

  if (lightbox && gallery) {
    const stage = lightbox.querySelector('.lightbox__stageInner');
    const capEl = lightbox.querySelector('.lightbox__cap');
    let visibleTiles = [];
    let index = 0;

    const currentTiles = () =>
      Array.from(gallery.querySelectorAll('.moment-tile:not(.is-hidden)'));

    const paint = () => {
      const tile = visibleTiles[index];
      if (!tile) return;
      const inner = tile.querySelector('img, .ph').cloneNode(true);
      inner.classList.remove('is-hidden');
      stage.innerHTML = '';
      stage.appendChild(inner);
      const cap = tile.getAttribute('data-caption') || tile.querySelector('figcaption')?.textContent || '';
      capEl.textContent = cap;
    };

    const open = (tile) => {
      visibleTiles = currentTiles();
      index = visibleTiles.indexOf(tile);
      if (index < 0) index = 0;
      paint();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      doc.body.classList.add('nav-open');
    };
    const close = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      doc.body.classList.remove('nav-open');
    };
    const step = (dir) => {
      if (!visibleTiles.length) return;
      index = (index + dir + visibleTiles.length) % visibleTiles.length;
      paint();
    };

    gallery.addEventListener('click', (e) => {
      const tile = e.target.closest('.moment-tile');
      if (tile) { e.preventDefault(); open(tile); }
    });
    lightbox.querySelector('.lightbox__close').addEventListener('click', close);
    lightbox.querySelector('.lightbox__nav.prev').addEventListener('click', () => step(-1));
    lightbox.querySelector('.lightbox__nav.next').addEventListener('click', () => step(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

    doc.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }
})();
