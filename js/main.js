/* =====================================================================
   Дарья — косметолог в Туле. Интерактив без зависимостей.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------- header + progress ------------------------------- */
  const header = $('#header');
  const progress = $('#scrollProgress');

  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 24);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------- mobile menu ------------------------------- */
  const burger = $('#burger');
  const nav = $('#nav');

  function closeMenu() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('is-locked');
  }

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      document.body.classList.toggle('is-locked', open);
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeMenu(); });
  }

  /* ------------------------------- scroll reveal ------------------------------- */
  const revealItems = $$('[data-reveal]');
  if (revealItems.length) {
    revealItems.forEach((el) => {
      const delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
    });

    if (prefersReduced || !('IntersectionObserver' in window)) {
      revealItems.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      revealItems.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------- counters ------------------------------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const format = (n) => n.toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
    const animate = (el) => {
      const target = Number(el.getAttribute('data-count')) || 0;
      if (prefersReduced) { el.textContent = format(target); return; }
      const duration = 1500;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animate(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ------------------------------- before / after ------------------------------- */
  const compare = $('[data-compare]');
  if (compare) {
    const range = $('.compare__range', compare);
    const caption = $('[data-compare-caption]');
    const cases = $$('[data-case]');

    const setPos = (value) => {
      const v = Math.max(0, Math.min(100, Number(value)));
      compare.style.setProperty('--pos', v + '%');
      if (range) range.value = String(v);
    };
    setPos(range ? range.value : 50);

    if (range) {
      range.addEventListener('input', () => setPos(range.value));
      range.addEventListener('change', () => setPos(range.value));
    }

    // стрелки клавиатуры работают через нативный range, но добавим шаг побольше
    compare.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 4;
      if (e.key === 'ArrowLeft') { setPos(Number(range.value) - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(Number(range.value) + step); e.preventDefault(); }
    });

    // смена кейса
    cases.forEach((btn) => {
      btn.addEventListener('click', () => {
        const before = btn.getAttribute('data-before');
        const after = btn.getAttribute('data-after');
        const beforeImg = $('[data-compare-img="before"]', compare);
        const afterImg = $('[data-compare-img="after"]', compare);
        if (beforeImg) beforeImg.src = before;
        if (afterImg) afterImg.src = after;
        if (caption) caption.textContent = btn.getAttribute('data-caption') || '';
        cases.forEach((b) => b.classList.toggle('is-active', b === btn));
        setPos(50);
        compare.style.setProperty('--pos', '50%');
        if (range) range.value = '50';
      });
    });
  }

  /* ------------------------------- tabs (техники) ------------------------------- */
  $$('[data-tabs]').forEach((group) => {
    const tabs = $$('.tech-tab', group);
    const panels = $$('.tech-panel', group);
    const activate = (tab) => {
      const id = tab.getAttribute('aria-controls');
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      panels.forEach((p) => {
        const active = p.id === id;
        p.classList.toggle('is-active', active);
        p.hidden = !active;
      });
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { next.focus(); activate(next); e.preventDefault(); }
      });
    });
  });

  /* ------------------------------- accordion ------------------------------- */
  $$('[data-accordion]').forEach((acc) => {
    const items = $$('.acc', acc);
    items.forEach((item) => {
      const head = $('.acc__head', item);
      if (!head) return;
      head.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((other) => {
          other.classList.remove('is-open');
          const h = $('.acc__head', other);
          if (h) h.setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          item.classList.add('is-open');
          head.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  /* ------------------------------- carousel ------------------------------- */
  $$('[data-carousel]').forEach((carousel) => {
    const track = $('[data-carousel-track]', carousel);
    const dotsBox = $('[data-carousel-dots]', carousel);
    if (!track) return;

    const slides = Array.from(track.children);
    let dots = [];

    const buildDots = () => {
      if (!dotsBox) return;
      dotsBox.innerHTML = '';
      dots = slides.map((slide, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Отзыв ' + (i + 1));
        dot.addEventListener('click', () => {
          track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: prefersReduced ? 'auto' : 'smooth' });
        });
        dotsBox.appendChild(dot);
        return dot;
      });
    };

    const syncDots = () => {
      if (!dots.length) return;
      const center = track.scrollLeft + track.clientWidth / 2;
      let active = 0;
      let best = Infinity;
      slides.forEach((slide, i) => {
        const mid = slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(mid - center);
        if (distance < best) { best = distance; active = i; }
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
    };

    const step = () => {
      if (slides.length < 2) return track.clientWidth;
      return slides[1].offsetLeft - slides[0].offsetLeft;
    };

    const goTo = (dir) => {
      track.scrollBy({ left: dir * step(), behavior: prefersReduced ? 'auto' : 'smooth' });
    };

    const prev = $('[data-carousel-prev]');
    const next = $('[data-carousel-next]');
    if (prev) prev.addEventListener('click', () => goTo(-1));
    if (next) next.addEventListener('click', () => goTo(1));

    buildDots();
    syncDots();
    let raf = null;
    track.addEventListener('scroll', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncDots);
    }, { passive: true });
    window.addEventListener('resize', () => { buildDots(); syncDots(); });
  });

  /* ------------------------------- form ------------------------------- */
  const form = $('#bookingForm');
  if (form) {
    const success = $('[data-form-success]', form);

    const setError = (field, message) => {
      const wrap = field.closest('.field') || field.closest('.checkbox');
      const box = wrap && wrap.querySelector('[data-error]');
      if (wrap) wrap.classList.toggle('is-invalid', Boolean(message));
      if (box) box.textContent = message || '';
      return !message;
    };

    const validate = () => {
      let ok = true;
      const name = form.elements.name;
      const phone = form.elements.phone;
      const agree = form.elements.agree;

      if (!name.value.trim() || name.value.trim().length < 2) {
        ok = setError(name, 'Укажите имя — как к вам обращаться') && ok;
      } else setError(name, '');

      const digits = phone.value.replace(/\D/g, '');
      if (digits.length < 10) {
        ok = setError(phone, 'Введите телефон или ник в мессенджере') && ok;
      } else setError(phone, '');

      const agreeError = $('[data-error-for="agree"]');
      if (!agree.checked) {
        if (agreeError) agreeError.textContent = 'Нужно согласие на обработку данных';
        ok = false;
      } else if (agreeError) agreeError.textContent = '';

      return ok;
    };

    ['input', 'change'].forEach((evt) => {
      form.addEventListener(evt, (e) => {
        const el = e.target;
        if (el && el.closest('.field')) setError(el, '');
        if (el && el.name === 'agree') {
          const agreeError = $('[data-error-for="agree"]');
          if (agreeError) agreeError.textContent = '';
        }
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) {
        const firstInvalid = $('.is-invalid input, .is-invalid select', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      // TODO: подключить реальную отправку (Telegram Bot API / почта / Formspree)
      if (success) {
        success.hidden = false;
        form.reset();
      }
    });
  }

  /* ------------------------------- year ------------------------------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
