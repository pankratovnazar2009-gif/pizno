// pizno: portfolio interactions. Plain JS, no build step.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  /* ---------- language ---------- */
  const i18nNodes = [...document.querySelectorAll('[data-en]')];
  i18nNodes.forEach((n) => { n.dataset.uk = n.innerHTML; });
  const META = {
    uk: { title: 'pizno: сайти, застосунки та ШІ-автоматизації для малого бізнесу', desc: "Сайти, застосунки лояльності, Telegram-боти та ШІ-асистенти для кав'ярень, магазинів, салонів і сервісів в Україні та Польщі. Безкоштовний аудит." },
    en: { title: 'pizno: websites, apps and AI automation for small businesses', desc: 'Websites, loyalty apps, Telegram bots and AI assistants for cafés, shops, salons and service businesses in Ukraine and Poland. Free audit.' },
  };
  function setLang(lang) {
    const l = lang === 'en' ? 'en' : 'uk';
    i18nNodes.forEach((n) => { n.innerHTML = n.dataset[l]; });
    root.lang = l;
    document.title = META[l].title;
    document.querySelector('meta[name="description"]').content = META[l].desc;
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    store.set('pizno.lang', l);
  }
  const urlLang = new URLSearchParams(location.search).get('lang');
  const startLang = urlLang || store.get('pizno.lang') || (navigator.language || '').slice(0, 2);
  if (startLang === 'en') setLang('en');
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* ---------- reveals (fire once) ---------- */
  const targets = document.querySelectorAll('.reveal:not(.hero .reveal), .mask:not(.hero .mask)');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- header ---------- */
  const top = document.querySelector('.top');
  let lastY = 0;
  addEventListener('scroll', () => {
    if (pressing) return;
    const y = scrollY;
    top.classList.toggle('is-solid', y > 40);
    top.classList.toggle('is-hidden', y > 400 && y > lastY);
    lastY = y;
  }, { passive: true });

  /* ---------- hero duck: the menu bar slides down like a ceiling and squashes it ---------- */
  const track = document.querySelector('.hero-track');
  const heroEl = document.querySelector('.hero');
  const avatar = document.querySelector('.avatar');
  const topBar = document.querySelector('.top');
  const duckImg = avatar.querySelector('.avatar__f');
  const HEAD_TOP = 0.02;   // top of the duck's head as a share of its box
  const MIN_SQUASH = 0.4;  // how flat the duck gets at the end of the press
  const lerp = (a, b, t) => a + (b - a) * t;
  function ceilingAt(p, barH, headY, floorY) {
    // slab bottom: rest → touches the head → presses down to 40 % height → holds
    const lowest = floorY - (floorY - headY) * MIN_SQUASH;
    const k = [[0, barH], [0.16, headY], [0.75, lowest], [1, lowest]];
    for (let i = 1; i < k.length; i++) {
      if (p <= k[i][0]) { const t = (p - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return lerp(k[i - 1][1], k[i][1], t); }
    }
    return lowest;
  }
  function setPose(pose) {
    if (avatar.dataset.pose === pose) return;
    avatar.dataset.pose = pose;
    heroEl.dataset.pose = pose;
    avatar.classList.remove('is-hit', 'is-hi');
    void avatar.offsetWidth;
    if (pose !== 'idle') avatar.classList.add('is-hit');
  }
  function squashDuck(s) {
    // cartoon squash: flatter and a bit wider, anchored at the feet
    duckImg.style.transform = s >= 0.999 ? '' : `scale(${(1 + (1 - s) * 0.45).toFixed(3)}, ${s.toFixed(3)})`;
  }
  // The slab also flattens the big words it passes over (they squash toward their baseline).
  const halves = [...document.querySelectorAll('.hero__half')];
  function squashWords(slabBottom) {
    halves.forEach((h) => {
      const top = h.offsetTop + heroEl.getBoundingClientRect().top + h.parentElement.offsetTop;
      const bottom = top + h.offsetHeight;
      const MIN = 0.16;
      if (slabBottom <= top) { h.style.transform = ''; return; }
      const raw = (bottom - slabBottom) / h.offsetHeight;
      // fully flattened words stick to the underside of the slab and ride down with it
      const dy = raw < MIN ? slabBottom - (bottom - MIN * h.offsetHeight) : 0;
      h.style.transform = `translateY(${dy.toFixed(1)}px) scaleY(${Math.max(MIN, raw).toFixed(3)})`;
    });
  }

  let pressing = false;
  function updatePress() {
    if (reduced) return;
    const room = track.offsetHeight - innerHeight;
    const trackTop = track.getBoundingClientRect().top;
    const p = room > 0 ? Math.min(1, Math.max(0, -trackTop / room)) : 0;
    const inTrack = trackTop <= 0 && -trackTop < room;
    const box = avatar.getBoundingClientRect();
    const barH = topBar.offsetHeight;
    const headY = box.top + box.height * HEAD_TOP, floorY = box.bottom;
    if (p > 0.01 && inTrack) {
      const bottom = Math.max(barH, ceilingAt(p, barH, headY, floorY));
      topBar.classList.remove('is-return', 'is-hidden');
      topBar.classList.add('is-press');
      topBar.style.transform = `translateY(${Math.round(bottom - barH)}px)`;
      pressing = true;
      const s = Math.min(1, Math.max(MIN_SQUASH, (floorY - bottom) / (floorY - headY)));
      squashDuck(s);
      setPose(s > 0.995 ? 'idle' : 'press');
      squashWords(bottom);
    } else if (pressing) {
      // leaving the hero: the slab flies back up and the duck pops back
      pressing = false;
      topBar.classList.add('is-return');
      topBar.classList.remove('is-press');
      topBar.style.transform = '';
      squashWords(0);
      squashDuck(1);
      setPose('idle');
    } else if (p <= 0.01) {
      squashDuck(1);
      setPose('idle');
    }
  }
  let ticking = false;
  const onPressScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; updatePress(); }); } };
  addEventListener('scroll', onPressScroll, { passive: true });
  addEventListener('resize', onPressScroll);
  updatePress();

  // the duck leans a little toward the cursor
  const body = avatar.querySelector('.avatar__body');
  if (!reduced && matchMedia('(hover: hover)').matches) {
    heroEl.addEventListener('mousemove', (e) => {
      const x = e.clientX / innerWidth - 0.5;
      body.style.rotate = `${(x * 6).toFixed(1)}deg`;
    });
    heroEl.addEventListener('mouseleave', () => { body.style.rotate = ''; });
  }

  let hiTimer;
  function sayHi() {
    if (avatar.dataset.pose !== 'idle') return;
    avatar.classList.remove('is-hi');
    void avatar.offsetWidth; // restart the hop animation
    avatar.classList.add('is-hi');
    clearTimeout(hiTimer);
    hiTimer = setTimeout(() => avatar.classList.remove('is-hi'), 1800);
  }
  const hit = avatar.querySelector('.avatar__hit');
  hit.addEventListener('mouseenter', sayHi);
  hit.addEventListener('click', sayHi);

  /* ---------- intro duck: waves on hover or tap, card tilts toward the cursor ---------- */
  const face = document.querySelector('.face');
  let hovering = false;
  const setFace = (state) => { face.dataset.face = state; };
  face.addEventListener('mouseenter', () => { hovering = true; setFace('wave'); });
  face.addEventListener('mouseleave', () => { hovering = false; setFace('idle'); face.style.transform = ''; });
  face.addEventListener('click', () => {
    setFace('wave');
    setTimeout(() => { if (!hovering) setFace('idle'); }, 1600);
  });
  if (!reduced) {
    face.addEventListener('mousemove', (e) => {
      const r = face.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      face.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
    });
  }

  /* ---------- mobile: swipe carousels get dots + a "swipe" hint ---------- */
  document.querySelectorAll('[data-swipe]').forEach((rail) => {
    const items = [...rail.children];
    const ui = document.createElement('div');
    ui.className = 'swipe__ui';
    ui.innerHTML = `<div class="swipe__dots">${items.map(() => '<i></i>').join('')}</div><span class="swipe__hint script" data-en="swipe →">гортай →</span>`;
    rail.after(ui);
    const hint = ui.querySelector('.swipe__hint');
    hint.dataset.uk = hint.innerHTML;
    i18nNodes.push(hint);
    if (root.lang === 'en') hint.innerHTML = hint.dataset.en;
    const dots = [...ui.querySelectorAll('i')];
    const sync = () => {
      const w = items[0].getBoundingClientRect().width + 14;
      const i = Math.min(items.length - 1, Math.round(rail.scrollLeft / w));
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      ui.classList.toggle('is-end', i === items.length - 1);
    };
    rail.addEventListener('scroll', sync, { passive: true });
    sync();
  });

  /* ---------- mobile: floating tab bar follows the section in view ---------- */
  const tabbar = document.querySelector('.tabbar');
  const tabs = [...tabbar.querySelectorAll('[data-tab]')];
  const sections = tabs.map((t) => document.getElementById(t.dataset.tab));
  function syncTabs() {
    tabbar.classList.toggle('is-on', scrollY > track.offsetHeight - innerHeight * 0.4);
    const mid = innerHeight * 0.45;
    let active = null;
    sections.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) active = tabs[i]; });
    tabs.forEach((t) => t.classList.toggle('is-active', t === active));
  }
  addEventListener('scroll', syncTabs, { passive: true });
  syncTabs();

  /* ---------- smooth scroll (desktop, motion allowed) ---------- */
  function startLenis() {
    if (reduced || !window.Lenis || matchMedia('(hover: none)').matches) return;
    const lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === '#top' ? 0 : -40 });
    }));
  }

  /* ---------- loader: waits for real load, capped ---------- */
  const loader = document.querySelector('.loader');
  const hero = document.querySelector('.hero');
  function enter() {
    loader.classList.add('is-done');
    setTimeout(() => {
      hero.classList.add('is-in');
      hero.querySelectorAll('.reveal').forEach((r) => r.classList.add('is-in'));
      avatar.classList.add('is-drop');
      setTimeout(() => avatar.classList.remove('is-drop'), 1100);
    }, reduced ? 0 : 260);
    setTimeout(() => loader.remove(), 1100);
    startLenis();
  }
  if (reduced) { enter(); return; }
  const t0 = performance.now();
  Promise.race([
    Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))),
    ]),
    new Promise((r) => setTimeout(r, 2200)),
  ]).then(() => setTimeout(enter, Math.max(0, 700 - (performance.now() - t0))));
})();
