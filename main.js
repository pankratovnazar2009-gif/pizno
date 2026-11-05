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
    const y = scrollY;
    top.classList.toggle('is-solid', y > 40);
    top.classList.toggle('is-hidden', y > 400 && y > lastY);
    lastY = y;
  }, { passive: true });

  /* ---------- hero duck: stands still, sways on its own floor, hops and talks when poked ---------- */
  const heroEl = document.querySelector('.hero');
  const avatar = document.querySelector('.avatar');
  const body = avatar.querySelector('.avatar__body');
  const bubble = avatar.querySelector('.avatar__hi');
  const LINES = {
    uk: ['привіт!', 'бабл-ті?', 'кря!', 'пиши «АУДИТ»', 'автоматизую!', 'ще раз?'],
    en: ['hi!', 'boba?', 'quack!', 'type “AUDIT”', 'I automate!', 'again?'],
  };
  let line = 0, hiTimer;
  function poke() {
    const list = LINES[root.lang === 'en' ? 'en' : 'uk'];
    bubble.textContent = list[line % list.length];
    line++;
    avatar.classList.remove('is-hi');
    void avatar.offsetWidth; // restart the hop
    avatar.classList.add('is-hi');
    clearTimeout(hiTimer);
    hiTimer = setTimeout(() => { avatar.classList.remove('is-hi'); bubble.textContent = ''; }, 1800);
  }
  avatar.querySelector('.avatar__hit').addEventListener('click', poke);

  // the duck leans toward the cursor; its floor stays put
  if (!reduced && matchMedia('(hover: hover)').matches) {
    heroEl.addEventListener('mousemove', (e) => {
      const x = e.clientX / innerWidth - 0.5;
      body.style.rotate = `${(x * 7).toFixed(1)}deg`;
    });
    heroEl.addEventListener('mouseleave', () => { body.style.rotate = ''; });
  }

  /* ---------- intro duck: sticks its tongue out on hover or tap ---------- */
  const face = document.querySelector('.face');
  let hovering = false;
  const setFace = (state) => { face.dataset.face = state; };
  face.addEventListener('mouseenter', () => { hovering = true; setFace('tongue'); });
  face.addEventListener('mouseleave', () => { hovering = false; setFace('idle'); });
  face.addEventListener('click', () => {
    setFace('tongue');
    setTimeout(() => { if (!hovering) setFace('idle'); }, 1400);
  });

  /* ---------- thanks duck: grabs the shades and lifts them ---------- */
  const shades = document.querySelector('.shades');
  let shadeTimers = [];
  const clearShades = () => { shadeTimers.forEach(clearTimeout); shadeTimers = []; };
  function liftShades(hold) {
    clearShades();
    shades.dataset.shades = 'grab';
    shadeTimers.push(setTimeout(() => { shades.dataset.shades = 'lift'; }, 260));
    if (hold) shadeTimers.push(setTimeout(() => { shades.dataset.shades = 'idle'; }, 2200));
  }
  shades.addEventListener('mouseenter', () => liftShades(false));
  shades.addEventListener('mouseleave', () => { clearShades(); shades.dataset.shades = 'idle'; });
  shades.addEventListener('click', () => liftShades(true));
  shades.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); liftShades(true); } });

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
    tabbar.classList.toggle('is-on', scrollY > heroEl.offsetHeight - innerHeight * 0.4);
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
      setTimeout(poke, reduced ? 0 : 1000); // says hi once after landing
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
