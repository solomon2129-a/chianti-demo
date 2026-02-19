/* ═══════════════════════════════════════════════════════════════
   CHIANTI RISTORANTE — main.js v3
   Modules:
   1.  Nav — scroll bg + hamburger + drawer
   2.  Scroll reveal
   3.  Hero parallax
   4.  Infinite-loop auto-play carousel (clone-based)
   5.  Active nav tracking
   6.  Count-up stats animation
   7.  Masonry hover (already CSS — no JS needed)
   8.  Cursor magnetic effect on buttons
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ══════════════════════════════════════════════════════════
     1. NAV
  ══════════════════════════════════════════════════════════ */
  const nav      = qs('#nav');
  const toggle   = qs('#navToggle');
  const drawer   = qs('#navDrawer');
  const drawerLinks = qsa('.nav__drawer-link, .nav__drawer-cta');

  function setNavScrolled() {
    nav.classList.toggle('nav--scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', setNavScrolled, { passive: true });
  setNavScrolled();

  function openDrawer() {
    nav.classList.add('nav--open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    nav.classList.remove('nav--open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function () {
    nav.classList.contains('nav--open') ? closeDrawer() : openDrawer();
  });

  drawerLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        closeDrawer();
        const target = qs(href);
        if (target) {
          setTimeout(function () {
            target.scrollIntoView({ behavior: 'smooth' });
          }, 320);
        }
      }
    });
  });

  // Smooth-scroll ALL anchor links in page
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = qs(href);
    if (!target) return;
    e.preventDefault();
    closeDrawer();
    target.scrollIntoView({ behavior: 'smooth' });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ══════════════════════════════════════════════════════════
     2. SCROLL REVEAL
  ══════════════════════════════════════════════════════════ */
  const revealEls = qsa('.reveal');
  const revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -44px 0px' });

  revealEls.forEach(function (el) { revealObs.observe(el); });

  /* ══════════════════════════════════════════════════════════
     3. HERO PARALLAX
  ══════════════════════════════════════════════════════════ */
  const heroBg  = qs('#heroBgImg');
  const heroSec = qs('#home');
  let rafPending = false;

  function updateParallax() {
    if (!heroBg || !heroSec) { rafPending = false; return; }
    const sy = window.scrollY;
    if (sy < heroSec.offsetHeight * 1.2) {
      heroBg.style.transform = 'translateY(' + (sy * 0.28) + 'px)';
    }
    rafPending = false;
  }
  window.addEventListener('scroll', function () {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     4. INFINITE AUTO-LOOP CAROUSEL
     Strategy: clone cards before+after, use CSS transition,
     silently jump when crossing clone boundary.
  ══════════════════════════════════════════════════════════ */
  const track    = qs('#carouselTrack');
  const prevBtn  = qs('#cPrev');
  const nextBtn  = qs('#cNext');
  const fillEl   = qs('#carouselFill');

  if (track && prevBtn && nextBtn) {

    const INTERVAL  = 3800;   // ms between auto-slides
    const SPEED     = 700;    // transition duration in ms
    const GAP       = 0;      // gap already handled by card padding

    let origCards    = qsa('.c-card', track);
    let totalOrig    = origCards.length;
    let visCount     = getVisCount();
    let cardW        = 0;
    let currentIdx   = 0;     // logical index (0 = first real card)
    let isAnimating  = false;
    let autoTimer    = null;

    /* ── Build clones ── */
    function buildClones() {
      // Remove any existing clones
      qsa('.c-card--clone', track).forEach(function (c) { c.remove(); });

      origCards = qsa('.c-card', track);
      totalOrig = origCards.length;
      visCount  = getVisCount();

      // Clone enough cards for seamless loop
      const clonesBefore = Math.min(visCount, totalOrig);
      const clonesAfter  = Math.min(visCount, totalOrig);

      // Prepend clones (last N original cards)
      for (let i = totalOrig - clonesBefore; i < totalOrig; i++) {
        const clone = origCards[i].cloneNode(true);
        clone.classList.add('c-card--clone');
        track.insertBefore(clone, track.firstChild);
      }
      // Append clones (first N original cards)
      for (let i = 0; i < clonesAfter; i++) {
        const clone = origCards[i].cloneNode(true);
        clone.classList.add('c-card--clone');
        track.appendChild(clone);
      }
    }

    function getVisCount() {
      const w = window.innerWidth;
      if (w >= 1024) return 3;
      if (w >= 768)  return 2;
      return 1;
    }

    function measureCard() {
      const allCards = qsa('.c-card', track);
      if (allCards.length === 0) return;
      cardW = allCards[0].offsetWidth;
    }

    function clonesBefore() {
      return Math.min(visCount, totalOrig);
    }

    function getTranslateX() {
      // currentIdx is relative to originals (0-based)
      // actual DOM index = clonesBefore() + currentIdx
      const domIdx = clonesBefore() + currentIdx;
      return -(domIdx * cardW);
    }

    function setTransform(x, animated) {
      if (animated) {
        track.style.transition = 'transform ' + SPEED + 'ms cubic-bezier(0.25,1,0.5,1)';
      } else {
        track.style.transition = 'none';
      }
      track.style.transform = 'translateX(' + x + 'px)';
    }

    function goTo(newIdx, animated) {
      if (typeof animated === 'undefined') animated = true;
      currentIdx = newIdx;
      setTransform(getTranslateX(), animated);
      updateProgress();
    }

    function updateProgress() {
      if (!fillEl) return;
      const pct = ((currentIdx + 1) / totalOrig) * 100;
      fillEl.style.width = pct + '%';
    }

    /* Snap back silently after hitting clone boundary */
    track.addEventListener('transitionend', function () {
      isAnimating = false;
      if (currentIdx >= totalOrig) {
        currentIdx = currentIdx % totalOrig;
        setTransform(getTranslateX(), false);
      } else if (currentIdx < 0) {
        currentIdx = totalOrig + (currentIdx % totalOrig || 0);
        if (currentIdx === totalOrig) currentIdx = 0;
        setTransform(getTranslateX(), false);
      }
    });

    function next() {
      if (isAnimating) return;
      isAnimating = true;
      goTo(currentIdx + 1);
      // If next exceeds total, transitionend will handle wrap
    }

    function prev() {
      if (isAnimating) return;
      isAnimating = true;
      goTo(currentIdx - 1);
    }

    nextBtn.addEventListener('click', function () {
      stopAuto();
      next();
      startAuto();
    });
    prevBtn.addEventListener('click', function () {
      stopAuto();
      prev();
      startAuto();
    });

    /* Auto-play */
    function startAuto() {
      stopAuto();
      autoTimer = setInterval(next, INTERVAL);
    }
    function stopAuto() {
      clearInterval(autoTimer);
    }

    /* Pause on hover */
    track.parentElement.addEventListener('mouseenter', stopAuto);
    track.parentElement.addEventListener('mouseleave', startAuto);

    /* Touch / swipe */
    let touchX0 = 0;
    track.addEventListener('touchstart', function (e) {
      touchX0 = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      const diff = touchX0 - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        stopAuto();
        if (diff > 0) next(); else prev();
        startAuto();
      }
    }, { passive: true });

    /* Mouse drag */
    let mouseX0 = 0, isDragging = false;
    track.addEventListener('mousedown', function (e) {
      isDragging = true;
      mouseX0 = e.clientX;
      track.style.cursor = 'grabbing';
      stopAuto();
    });
    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
    });
    document.addEventListener('mouseup', function (e) {
      if (!isDragging) return;
      isDragging = false;
      track.style.cursor = 'grab';
      const diff = mouseX0 - e.clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) next(); else prev();
      }
      startAuto();
    });

    /* Keyboard */
    prevBtn.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft')  { stopAuto(); prev(); startAuto(); } });
    nextBtn.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { stopAuto(); next(); startAuto(); } });

    /* Init & resize */
    function init() {
      buildClones();
      measureCard();
      currentIdx = 0;
      setTransform(getTranslateX(), false);
      updateProgress();
      startAuto();
    }

    window.addEventListener('resize', debounce(function () {
      stopAuto();
      visCount = getVisCount();
      init();
    }, 250));

    // Wait for fonts + layout
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(init);
    } else {
      window.addEventListener('load', init);
    }
  }

  /* ══════════════════════════════════════════════════════════
     5. ACTIVE NAV LINK
  ══════════════════════════════════════════════════════════ */
  const navLinks  = qsa('.nav__link');
  const sections  = qsa('section[id], footer[id]');

  const sectionObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(function (l) {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.35, rootMargin: '-76px 0px 0px 0px' });

  sections.forEach(function (s) { sectionObs.observe(s); });

  /* ══════════════════════════════════════════════════════════
     6. COUNT-UP ANIMATION (stats in story section)
  ══════════════════════════════════════════════════════════ */
  const counters = qsa('.story__stat-n[data-target]');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1600;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      el.textContent = target >= 1000
        ? value.toLocaleString()
        : value;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function (c) { counterObs.observe(c); });

  /* ══════════════════════════════════════════════════════════
     7. MAGNETIC BUTTON EFFECT
     Buttons gently pull toward cursor on hover.
  ══════════════════════════════════════════════════════════ */
  const magBtns = qsa('.btn--gold, .nav__cta, .nav__drawer-cta');

  magBtns.forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * 0.22;
      const dy   = (e.clientY - cy) * 0.22;
      btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) translateY(-2px)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = '';
    });
  });

  /* ══════════════════════════════════════════════════════════
     8. MARQUEE — pause on hover
  ══════════════════════════════════════════════════════════ */
  const marqueeTrack = qs('.marquee-track');
  if (marqueeTrack) {
    marqueeTrack.parentElement.addEventListener('mouseenter', function () {
      marqueeTrack.style.animationPlayState = 'paused';
    });
    marqueeTrack.parentElement.addEventListener('mouseleave', function () {
      marqueeTrack.style.animationPlayState = 'running';
    });
  }

})();
