/* ==========================================================
   LAYERS BAKERY & DELI — script.js
   Vanilla JS + GSAP + Lenis
   ========================================================== */

(() => {
  'use strict';

  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches || window.innerWidth < 720;
  const isMobile = window.innerWidth < 720;

  /* ===========================================================
     LOADER
     =========================================================== */
  const loader = $('#loader');
  document.body.classList.add('is-loading');

  function dismissLoader() {
    if (!loader) return;
    loader.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    setTimeout(() => loader.remove(), 800);
  }

  /* ===========================================================
     LENIS — SMOOTH SCROLL
     =========================================================== */
  let lenis = null;

  function initLenis() {
    if (reduce) return;
    if (typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* Anchor smooth scroll */
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -60, duration: 1.2 });
        if (mobileMenu && mobileMenu.classList.contains('is-open')) toggleMobileMenu(false);
      });
    });
  }

  /* ===========================================================
     CUSTOM CURSOR (lerp, GPU-accelerated)
     =========================================================== */
  const cursor = $('#cursor');
  const cursorRing = cursor ? cursor.querySelector('.cursor__ring') : null;
  const cursorDot  = cursor ? cursor.querySelector('.cursor__dot')  : null;
  const cursorLabel = $('#cursorLabel');
  const cursorLabelSpan = cursorLabel ? cursorLabel.querySelector('span') : null;

  function initCursor() {
    if (!cursor || !cursorRing || !cursorDot || isTouch) return;

    /* Mouse state */
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    /* Rendered positions (lerped) */
    let rx = mx, ry = my;          /* ring */
    let dx = mx, dy = my;          /* dot  */
    /* latest known hover state */
    let currentHover = false;
    let currentCard  = false;

    /* Use translate(-50%, -50%) so the element is ALWAYS centered at (rx, ry),
       regardless of its size. This keeps ring/dot/label aligned through hover changes. */

    /* Initial position (so first frame is centered, not at 0,0) */
    cursorRing.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    cursorDot.style.transform  = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    if (cursorLabel) {
      cursorLabel.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    }

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;

      /* Update hover state using elementFromPoint — bulletproof, no event-juggling. */
      if (!reduce) {
        const el = document.elementFromPoint(mx, my);
        const isCard = !!(el && el.closest && el.closest('[data-cursor="card"], .card'));
        const isCta  = !!(el && el.closest && el.closest(
          'a, button, [role="button"], .menu__tab, .t-nav, .t-dot, input[type="submit"], input[type="button"], label'
        ));
        if (isCard !== currentCard) {
          currentCard = isCard;
          cursor.classList.toggle('is-card', isCard);
          if (cursorLabelSpan) {
            cursorLabelSpan.textContent = isCard ? 'View' : '';
          }
        }
        if (isCta !== currentHover) {
          currentHover = isCta;
          cursor.classList.toggle('is-hover', isCta);
        }
      }
    }, { passive: true });

    /* Hide cursor when leaving the viewport, show on re-entry */
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));

    /* The render loop — single lerp, GPU-accelerated transforms, translate(-50%, -50%)
       keeps every element centered at (rx, ry). */
    const RING_LERP = 0.22;
    const DOT_LERP  = 0.45;   /* dot trails less, feels precise */

    function tick() {
      rx += (mx - rx) * RING_LERP;
      ry += (my - ry) * RING_LERP;
      dx += (mx - dx) * DOT_LERP;
      dy += (my - dy) * DOT_LERP;

      cursorRing.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      cursorDot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      if (cursorLabel) {
        cursorLabel.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ===========================================================
     NAV — scroll behaviour
     =========================================================== */
  const nav = $('#nav');
  const heroScroll = $('#heroScroll');

  function initNav() {
    if (!nav) return;
    let lastY = 0;
    let ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      if (heroScroll) {
        heroScroll.classList.toggle('is-hidden', y > 80);
      }

      /* Active link */
      const sections = ['home', 'menu', 'about', 'bakery', 'contact'];
      let current = 'home';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom > 120) { current = id; break; }
      }
      $$('.nav__link').forEach((l) => {
        l.classList.toggle('is-active', l.getAttribute('href') === '#' + current);
      });

      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
    onScroll();
  }

  /* ===========================================================
     MOBILE MENU
     =========================================================== */
  const navBurger = $('#navBurger');
  const mobileMenu = $('#mobileMenu');

  function toggleMobileMenu(force) {
    if (!mobileMenu || !navBurger) return;
    const willOpen = typeof force === 'boolean' ? force : !mobileMenu.classList.contains('is-open');
    mobileMenu.classList.toggle('is-open', willOpen);
    nav.classList.toggle('is-open', willOpen);
    navBurger.setAttribute('aria-expanded', String(willOpen));
    document.body.style.overflow = willOpen ? 'hidden' : '';
  }

  if (navBurger) {
    navBurger.addEventListener('click', () => toggleMobileMenu());
  }
  $$('[data-menu-link]').forEach((a) => a.addEventListener('click', () => toggleMobileMenu(false)));

  /* ===========================================================
     HERO ENTRANCE (after loader)
     =========================================================== */
  function playHeroIntro() {
    /* Always reset the hero__line spans to visible (no transform) as the first step.
       GSAP will re-hide them if it animates, but this guarantees the title is never
       permanently invisible if GSAP fails or timing is off. */
    $$('#home .hero__line span').forEach((el) => { el.style.transform = 'none'; });

    if (reduce || typeof gsap === 'undefined') {
      $$('#home .hero__line span, #home .hero__eyebrow, #home .hero__lede, #home .hero__cta, #home .hero__scroll, #home .nav')
        .forEach((el) => {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      $$('#home .hero__line > span').forEach((el) => { el.style.transform = 'none'; });
      return;
    }

    /* Pre-set: ensure hidden state matches what we want to animate FROM */
    gsap.set('#home .hero__line span',  { yPercent: 110 });
    gsap.set('#home .hero__eyebrow',    { y: 30,  opacity: 0 });
    gsap.set('#home .hero__lede',       { y: 24,  opacity: 0 });
    gsap.set('#home .hero__cta .btn',   { y: 24,  opacity: 0 });
    gsap.set('#home .hero__scroll',     { y: 14,  opacity: 0 });
    gsap.set('#home .hero__bg-img',     { scale: 1.18 });
    gsap.set('#home .hero__bg-overlay', { opacity: 0 });
    gsap.set('#home .nav',              { y: -20, opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    /* nav */
    tl.to('.nav', { y: 0, opacity: 1, duration: 0.9 }, 0.1);

    /* hero background scale settle */
    tl.to('.hero__bg-img', { scale: 1, duration: 1.8, ease: 'power2.out' }, 0);
    tl.to('.hero__bg-overlay', { opacity: 1, duration: 1.2 }, 0.2);

    /* hero copy stagger */
    tl.to('.hero__eyebrow', { y: 0, opacity: 1, duration: 1 }, 0.5);
    tl.to('.hero__line span', { yPercent: 0, duration: 1.1, stagger: 0.08 }, 0.65);
    tl.to('.hero__lede', { y: 0, opacity: 1, duration: 0.9 }, 0.95);
    tl.to('.hero__cta .btn', { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, 1.05);
    tl.to('.hero__scroll', { y: 0, opacity: 1, duration: 0.7 }, 1.3);

    /* Safety net: if GSAP somehow doesn't animate the title spans to yPercent: 0
       (e.g. reduced motion after script start, or browser quirks), force them visible
       after a short delay. */
    setTimeout(() => {
      $$('#home .hero__line span').forEach((el) => {
        if (el._gsap && el._gsap.yPercent !== undefined && el._gsap.yPercent !== 0) {
          gsap.set(el, { yPercent: 0 });
        } else {
          el.style.transform = 'none';
        }
      });
    }, 3500);
  }

  /* ===========================================================
     GSAP SCROLL-TRIGGER REVEALS
     =========================================================== */
  function initReveals() {
    if (reduce || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      $$('.reveal-fade, .reveal-up, .reveal-clip, [data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
        if (el.classList.contains('reveal-clip') && el.firstElementChild) {
          el.firstElementChild.style.transform = 'none';
          el.firstElementChild.style.opacity = '1';
        }
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* default reveal — fade + slide up */
    $$('.reveal-up, .reveal-fade').forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          onStart: () => el.classList.add('is-revealed')
        }
      );
    });

    /* clip-path image reveal */
    $$('.reveal-clip').forEach((el) => {
      const child = el.firstElementChild;
      if (!child) return;
      gsap.fromTo(el,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1.4,
          ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          onStart: () => el.classList.add('is-revealed')
        }
      );
      gsap.fromTo(child,
        { scale: 1.12 },
        {
          scale: 1,
          duration: 1.6,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
        }
      );
    });

    /* data-reveal stagger — children animate one after another */
    $$('[data-reveal-stagger]').forEach((container) => {
      const children = container.querySelectorAll('[data-reveal]');
      gsap.fromTo(children,
        { opacity: 0, y: 36 },
        {
          opacity: 1, y: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: container, start: 'top 82%', toggleActions: 'play none none none' },
          onStart: () => children.forEach((c) => c.classList.add('is-revealed'))
        }
      );
    });

    /* individual data-reveal */
    $$('[data-reveal]:not([data-reveal-stagger] [data-reveal])').forEach((el) => {
      const parent = el.closest('[data-reveal-stagger]');
      if (parent) return;
      gsap.fromTo(el,
        { opacity: 0, y: 36 },
        {
          opacity: 1, y: 0,
          duration: 0.95,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
          onStart: () => el.classList.add('is-revealed')
        }
      );
    });

    /* section display-head (eyebrow + display + lede) */
    $$('section').forEach((sec) => {
      const head = sec.querySelector('.eyebrow, h2.display, .lede, .section-head__sub');
      if (!head) return;
      const items = [head];
      const siblings = [];
      let n = head.nextElementSibling;
      while (n && items.length + siblings.length < 4) {
        if (n.matches('.eyebrow, h2, .lede, .section-head__sub, p')) siblings.push(n);
        n = n.nextElementSibling;
      }
      const all = [...items, ...siblings];
      gsap.fromTo(all,
        { opacity: 0, y: 28 },
        {
          opacity: 1, y: 0,
          duration: 0.95,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: sec, start: 'top 80%', toggleActions: 'play none none none' },
        }
      );
    });

    /* hero bg subtle parallax */
    if (!isMobile) {
      $$('[data-parallax]').forEach((el) => {
        const speed = el.dataset.parallax === 'hero-img' ? 0.15 :
                      el.dataset.parallax === 'break-img' ? 0.2 :
                      el.dataset.parallax === 'craft-img' ? 0.1 : 0.12;
        gsap.to(el, {
          yPercent: -10 * speed * 10,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
    }
  }

  /* ===========================================================
     MOUSE PARALLAX (subtle)
     =========================================================== */
  function initMouseParallax() {
    if (reduce || isTouch || isMobile) return;
    const layers = $$('[data-mouse-parallax]');
    if (!layers.length) return;

    let mx = 0, my = 0;
    let cx = 0, cy = 0;

    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    function loop() {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      layers.forEach((el) => {
        const depth = parseFloat(el.dataset.mouseParallax) || 0.5;
        const tx = -cx * depth * 8;
        const ty = -cy * depth * 6;
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      });
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ===========================================================
     MENU TABS
     =========================================================== */
  function initMenuTabs() {
    const tabs = $$('.menu__tab');
    const groups = $$('.menu__group');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        const current = $('.menu__group.is-active');
        const next = $(`.menu__group[data-group="${target}"]`);
        if (!next || next.classList.contains('is-active')) return;

        tabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });

        if (current) {
          current.classList.add('is-leaving');
          current.addEventListener('transitionend', function h() {
            current.classList.remove('is-active', 'is-leaving');
            current.removeEventListener('transitionend', h);
          });
        }
        setTimeout(() => {
          next.classList.add('is-active');
        }, current ? 200 : 0);
      });
    });
  }

  /* ===========================================================
     TESTIMONIAL CAROUSEL
     =========================================================== */
  function initTestimonials() {
    const track = $('#tTrack');
    const dots = $('#tDots');
    const prev = $('#tPrev');
    const next = $('#tNext');
    if (!track) return;
    const cards = $$('.t-card', track);

    /* build dots */
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 't-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      if (dots) dots.appendChild(dot);
    });

    let active = 0;
    let auto;
    const isCarousel = window.innerWidth > 720;

    function update() {
      cards.forEach((c, i) => {
        c.classList.toggle('is-active', i === active);
      });
      if (dots) {
        $$('.t-dot', dots).forEach((d, i) => d.classList.toggle('is-active', i === active));
      }
    }
    function goTo(i) {
      active = (i + cards.length) % cards.length;
      update();
      restartAuto();
    }
    function nextCard() { goTo(active + 1); }
    function prevCard() { goTo(active - 1); }

    if (prev) prev.addEventListener('click', prevCard);
    if (next) next.addEventListener('click', nextCard);

    /* Touch swipe */
    let tx = 0;
    track.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend',   (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) (dx < 0 ? nextCard : prevCard)();
    });

    function restartAuto() {
      clearInterval(auto);
      auto = setInterval(nextCard, 5500);
    }

    if (isCarousel) restartAuto();
    track.addEventListener('mouseenter', () => clearInterval(auto));
    track.addEventListener('mouseleave', () => { if (isCarousel) restartAuto(); });

    /* keyboard */
    document.addEventListener('keydown', (e) => {
      const rect = track.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === 'ArrowRight') nextCard();
    });
  }

  /* ===========================================================
     CARD TILT (very subtle, 1-2 degrees)
     =========================================================== */
  function initCardTilt() {
    if (reduce || isTouch || isMobile) return;
    $$('.card').forEach((card) => {
      const img = card.querySelector('.card__img');
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rx = (0.5 - y) * 2;
        const ry = (x - 0.5) * 2;
        card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        if (img) img.style.transform = `scale(1.16) translate(${ry * -4}px, ${rx * -4}px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        if (img) img.style.transform = '';
      });
    });
  }

  /* ===========================================================
     YEAR + footer back to top
     =========================================================== */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  $$('.footer__top-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (lenis) lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ===========================================================
     INIT — wait for fonts + libs
     =========================================================== */
  function init() {
    initLenis();
    initCursor();
    initNav();
    initMenuTabs();
    initTestimonials();
    initCardTilt();
    initMouseParallax();
    initReveals();

    /* Loader dismissal after a minimum show */
    setTimeout(() => {
      dismissLoader();
      playHeroIntro();
    }, 1400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
