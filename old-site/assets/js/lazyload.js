/* Lightweight lazy loader
 * Strategy:
 * - Prefer native `loading="lazy"` for images where supported.
 * - For browsers without native support, use IntersectionObserver to set `src`/`srcset` from data attributes.
 * - Safe: images with no data-src left untouched.
 */

(function () {
  'use strict';

  // Apply native lazy attribute where supported
  function applyNativeLazy() {
    try {
      var img = document.createElement('img');
      if ('loading' in img) return true;
    } catch (e) {
      return false;
    }
    return false;
  }

  function enableNative(imgs) {
    imgs.forEach(function (img) {
      if (!img.getAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      // If data-src present and img has no src, move it so native lazy can load later
      if (img.dataset.src && !img.src) {
        img.src = img.dataset.src;
      }
      if (img.dataset.srcset && !img.srcset) {
        img.srcset = img.dataset.srcset;
      }
    });
  }

  function ioFallback(imgs) {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      imgs.forEach(function (img) {
        if (img.dataset.src) img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.dataset.src) img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });

    imgs.forEach(function (img) {
      observer.observe(img);
    });
  }

  function init() {
    var imgs = [].slice.call(document.querySelectorAll('img'));

    // Prefer images that have data-src or data-srcset OR have no loading attribute yet
    imgs = imgs.filter(function (img) {
      return img.dataset.src || img.dataset.srcset || !img.getAttribute('loading');
    });

    if (!imgs.length) return;

    if ('loading' in HTMLImageElement.prototype) {
      enableNative(imgs);
      return;
    }

    ioFallback(imgs);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 10);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
