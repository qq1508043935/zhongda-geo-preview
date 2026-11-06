/* ===========================================================
   中大工业地产 · 官网演示
   单页路由 / 滚动动画 / 筛选 / 二维码放大 / 表单
   =========================================================== */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  var mega = document.getElementById('mega');
  var megaTrigger = document.getElementById('megaTrigger');
  var lightbox = document.getElementById('lightbox');
  var lbImg = lightbox.querySelector('img');
  var lbText = document.getElementById('lbText');
  var toast = document.getElementById('toast');

  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 静态模式：?static=1 关闭所有入场动画（截图 / 导出 / 打印用）
  if (location.search.indexOf('static') > -1) {
    document.documentElement.classList.add('static-mode');
  }

  /* ---------------------------------------------------------
     1. 路由
     --------------------------------------------------------- */
  function pageOf(name) {
    return pages.filter(function (p) { return p.dataset.page === name; })[0];
  }

  function updateNav(name) {
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === name && a.parentNode.classList.contains('nav-links'));
      if (a.parentNode.classList.contains('drawer')) {
        a.classList.toggle('active', a.dataset.nav === name);
      }
    });
  }

  function resetReveals(scope) {
    scope.querySelectorAll('.reveal').forEach(function (el) { el.classList.remove('in'); });
    scope.querySelectorAll('[data-count]').forEach(function (el) {
      el.dataset.done = '';
      el.textContent = '0';
    });
  }

  function switchPage(name, skipScroll) {
    var target = pageOf(name);
    if (!target) target = pages[0];
    name = target.dataset.page;

    pages.forEach(function (p) { p.classList.remove('active'); });
    void target.offsetWidth;
    target.classList.add('active');

    resetReveals(target);
    updateNav(name);
    closeDrawer();
    closeMega();

    if (!skipScroll) {
      var html = document.documentElement;
      var prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      html.style.scrollBehavior = prev;
    }

    requestAnimationFrame(function () {
      observeWithin(target);
      // 首屏元素立即点亮，避免白屏
      setTimeout(function () {
        target.querySelectorAll('.reveal').forEach(function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight * 1.05) el.classList.add('in');
        });
        target.querySelectorAll('[data-count]').forEach(function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight * 1.05) runCount(el);
        });
      }, 60);
    });
  }

  function goTo(name) {
    if (('#' + name) !== location.hash) {
      location.hash = name;
    } else {
      switchPage(name);
    }
  }

  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      goTo(a.dataset.nav);
    });
  });

  window.addEventListener('hashchange', function () {
    var name = location.hash.replace('#', '') || 'home';
    switchPage(name);
  });

  /* ---------------------------------------------------------
     2. 滚动状态
     --------------------------------------------------------- */
  var lastY = 0;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    nav.classList.toggle('scrolled', y > 20);
    if (Math.abs(y - lastY) > 60) closeMega();
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------------------------------------------------
     3. 大菜单
     --------------------------------------------------------- */
  var megaTimer = null;

  function openMega() {
    clearTimeout(megaTimer);
    if (window.innerWidth < 981) return;
    mega.classList.add('open');
  }
  function closeMega() {
    clearTimeout(megaTimer);
    mega.classList.remove('open');
  }
  function closeMegaSoon() {
    clearTimeout(megaTimer);
    megaTimer = setTimeout(closeMega, 180);
  }

  if (megaTrigger) {
    megaTrigger.addEventListener('mouseenter', openMega);
    megaTrigger.addEventListener('mouseleave', closeMegaSoon);
  }
  mega.addEventListener('mouseenter', openMega);
  mega.addEventListener('mouseleave', closeMegaSoon);

  /* ---------------------------------------------------------
     4. 移动抽屉
     --------------------------------------------------------- */
  function openDrawer() {
    drawer.classList.add('open');
    burger.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    burger.classList.remove('on');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function () {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });

  /* ---------------------------------------------------------
     5. 进入视口动画 + 数字计数
     --------------------------------------------------------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains('reveal')) el.classList.add('in');
        if (el.hasAttribute('data-count')) runCount(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  }

  function observeWithin(scope) {
    var els = scope.querySelectorAll('.reveal, [data-count]');
    els.forEach(function (el) {
      if (io) { io.observe(el); }
      else {
        el.classList.add('in');
        if (el.hasAttribute('data-count')) runCount(el);
      }
    });
  }

  function runCount(el) {
    if (el.dataset.done === '1') return;
    el.dataset.done = '1';
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = el.dataset.suffix || '';

    // 静态模式 / 减弱动效：直接落终值
    if (reduceMotion || document.documentElement.classList.contains('static-mode')) {
      el.textContent = target + suffix;
      return;
    }

    var dur = 1200, start = null, finished = false;

    function settle() {
      if (finished) return;
      finished = true;
      el.textContent = target + suffix;
    }

    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(tick);
      else settle();
    }
    requestAnimationFrame(tick);
    // 兜底：后台标签页或 rAF 被节流时，1.6s 后强制落终值
    setTimeout(settle, 1600);
  }

  /* ---------------------------------------------------------
     6. 案例筛选
     --------------------------------------------------------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var caseCards = Array.prototype.slice.call(document.querySelectorAll('#caseGrid .case-card'));

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      var f = chip.dataset.filter;
      caseCards.forEach(function (card) {
        var show = f === 'all' || card.dataset.region === f;
        card.classList.toggle('hide', !show);
        if (show) {
          card.style.animation = 'none';
          void card.offsetWidth;
          card.style.animation = 'pageIn .45s cubic-bezier(.22,.61,.36,1) both';
        }
      });
    });
  });

  /* ---------------------------------------------------------
     7. 二维码放大
     --------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('img[data-zoom]') : null;
    if (img) {
      lbImg.src = img.src;
      lbText.textContent = img.dataset.zoom || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  });

  lightbox.addEventListener('click', function () {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      lightbox.classList.remove('open');
      closeDrawer();
      closeMega();
      document.body.style.overflow = '';
    }
  });

  /* ---------------------------------------------------------
     8. 表单
     --------------------------------------------------------- */
  var form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var company = form.company.value.trim();
      var person = form.person.value.trim();
      var phone = form.phone.value.trim();

      if (!company || !person || !phone) {
        showToast('请先填写企业名称、联系人与联系电话');
        return;
      }
      if (!/^1[3-9]\d{9}$/.test(phone.replace(/\s/g, ''))) {
        showToast('手机号格式好像不对，请再核对一下');
        return;
      }
      if (!form.elements.consent.checked) {
        showToast('请先勾选同意将信息用于项目咨询沟通');
        return;
      }
      var button = form.querySelector('button[type="submit"]');
      var status = document.getElementById('formStatus');
      button.disabled = true;
      button.textContent = '正在保存…';
      status.textContent = '正在提交至测试服务器…';
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 12000);
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ company: company, person: person, phone: phone,
          note: form.elements.note.value.trim(), consent: true,
          website: form.elements.website.value })
      }).then(function (response) {
        return response.json().then(function (result) {
          if (!response.ok || !result.ok) throw new Error(result.message || '提交失败');
          form.reset();
          status.textContent = result.message + ' 编号：' + result.id;
          showToast('咨询已保存至测试服务器');
        });
      }).catch(function (err) {
        status.textContent = err.name === 'AbortError' ? '请求超时，信息已保留，请稍后重试。' : (err.message || '网络异常，请稍后再试');
        showToast('未能确认保存，请查看提示后重试');
      }).finally(function () {
        clearTimeout(timeout);
        button.disabled = false;
        button.textContent = '提交需求';
      });
    });
  }

  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 3200);
  }

  /* ---------------------------------------------------------
     9. 初始化
     --------------------------------------------------------- */
  var initial = location.hash.replace('#', '') || 'home';
  switchPage(initial, true);
  onScroll();

  // 静态模式下所有计数直接落终值（不必等到滚动触发）
  if (document.documentElement.classList.contains('static-mode')) {
    document.querySelectorAll('[data-count]').forEach(runCount);
  }
})();
