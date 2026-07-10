/**
 * consultancy_page.js
 * JACHINS Development Limited — Consultancy Services Page
 * Custom JavaScript: no jQuery dependency required for core functions.
 * jQuery (if loaded) is used only for legacy plugin compatibility.
 */

(function () {
  'use strict';

  /* ── Utility: DOM ready ──────────────────────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  /* ── 1. Preloader ───────────────────────────────────────── */
  function initPreloader() {
    var pre = document.getElementById('preloader');
    if (!pre) return;

    window.addEventListener('load', function () {
      pre.classList.add('hidden');
      setTimeout(function () {
        pre.style.display = 'none';
      }, 600);
    });

    /* Safety fallback — hide after 4 s regardless */
    setTimeout(function () {
      pre.classList.add('hidden');
      setTimeout(function () { pre.style.display = 'none'; }, 600);
    }, 4000);
  }

  /* ── 2. Copyright year ──────────────────────────────────── */
  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ── 3. Sticky / shrink header ──────────────────────────── */
  function initStickyHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;

    var THRESHOLD = 80;

    function onScroll() {
      if (window.pageYOffset > THRESHOLD) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); /* run once on init */
  }

  /* ── 4. Mobile navigation ───────────────────────────────── */
  function initMobileNav() {
    var toggle  = document.getElementById('nav-toggle');
    var drawer  = document.getElementById('mobile-drawer');
    var overlay = document.getElementById('mobile-overlay');
    if (!toggle || !drawer || !overlay) return;

    function openNav() {
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      drawer.classList.add('open');
      overlay.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      drawer.classList.contains('open') ? closeNav() : openNav();
    });

    overlay.addEventListener('click', closeNav);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeNav(); closePreview(); }
    });

    /* Mobile sub-menu accordion */
    var mobileDropdownToggles = drawer.querySelectorAll('.mobile-dropdown-toggle');
    mobileDropdownToggles.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var dd   = this.nextElementSibling;
        var open = dd && dd.classList.contains('open');

        /* Close all */
        drawer.querySelectorAll('.dropdown').forEach(function (d) {
          d.classList.remove('open');
        });
        mobileDropdownToggles.forEach(function (b) {
          b.setAttribute('aria-expanded', 'false');
        });

        /* Open clicked if it was closed */
        if (!open && dd) {
          dd.classList.add('open');
          this.setAttribute('aria-expanded', 'true');
        }
      });
    });

    /* Close nav when a drawer link is clicked */
    drawer.querySelectorAll('a:not(.mobile-dropdown-toggle)').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
  }

  /* ── 5. Active nav link ─────────────────────────────────── */
  function initActiveNav() {
    var path  = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.nav-menu a, .mobile-nav-drawer a');
    links.forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop();
      if (href === path) {
        a.closest('li') && a.closest('li').classList.add('active');
      }
    });
  }

  /* ── 6. Image preview overlay ───────────────────────────── */
  var previewOverlay = null;
  var previewImg     = null;

  function initPreview() {
    previewOverlay = document.getElementById('previewOverlay');
    previewImg     = document.getElementById('previewImg');
    if (!previewOverlay || !previewImg) return;

    previewOverlay.addEventListener('click', function (e) {
      if (e.target === previewOverlay) closePreview();
    });

    /* Keyboard: close on Escape (also handled globally above) */
    previewOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePreview();
    });
  }

  /* Exposed globally so inline onclick attributes still work */
  window.openPreview = function (src) {
    if (!previewOverlay || !previewImg) return;
    previewImg.src = src;
    previewOverlay.classList.add('active');
    previewOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    previewOverlay.focus();
  };

  window.closePreview = function () {
    if (!previewOverlay) return;
    previewOverlay.classList.remove('active');
    previewOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  /* ── 7. Scroll-reveal animation ─────────────────────────── */
  function initReveal() {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

      elements.forEach(function (el) { obs.observe(el); });
    } else {
      /* Fallback: show everything immediately */
      elements.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  /* ── 8. Smooth scroll for anchor links ──────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        var offset = parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--header-h') || '72', 10
        ) + 16;
        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ── 9. Hover: cards — subtle tilt on desktop ────────────── */
  function initCardTilt() {
    if (window.matchMedia('(hover: none)').matches) return; /* skip touch */

    var cards = document.querySelectorAll(
      '.capability-card, .project-card, .jets-card, .benefit-item'
    );

    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect   = card.getBoundingClientRect();
        var x      = (e.clientX - rect.left) / rect.width  - 0.5;
        var y      = (e.clientY - rect.top)  / rect.height - 0.5;
        var tiltX  = +(y * 4).toFixed(2);
        var tiltY  = -(x * 4).toFixed(2);
        card.style.transform =
          'translateY(-6px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ── 10. Stats counter animation ────────────────────────── */
  function initCounters() {
    var counters = document.querySelectorAll('.stat-num, .stat-col strong');
    if (!counters.length) return;

    function animateCounter(el) {
      var raw  = el.textContent.trim();
      var num  = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return;

      var suffix  = raw.replace(/[0-9.]/g, '');
      var start   = 0;
      var duration = 1400;
      var startTime = null;

      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        /* ease-out-cubic */
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * num);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = raw; /* restore exact original */
      }

      requestAnimationFrame(step);
    }

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });

      counters.forEach(function (el) { obs.observe(el); });
    }
  }

  /* ── Init all ───────────────────────────────────────────── */
  initPreloader();
  initYear();

  ready(function () {
    initStickyHeader();
    initMobileNav();
    initActiveNav();
    initPreview();
    initReveal();
    initSmoothScroll();
    initCardTilt();
    initCounters();
  });

})();