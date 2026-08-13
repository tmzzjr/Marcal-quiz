(function () {
  'use strict';

  var STEPS = window.QUIZ_STEPS;
  var INTRO = window.QUIZ_INTRO;
  var LEVELS = window.QUIZ_LEVELS;
  var PATTERNS = window.QUIZ_PATTERNS;
  var COMPARISON = window.QUIZ_COMPARISON;
  var SECTIONS = window.QUIZ_SECTIONS;

  // pm6 (corpo inteiro) abre o quiz: é o único recorte sem corte reto de enquadramento
  var PHOTOS = ['img/pm6.webp', 'img/pm2.webp', 'img/pm3.webp', 'img/pm4.webp', 'img/pm5.webp', 'img/pm1.webp'];

  var state = { index: -1, answers: {}, sent: false };

  var app = document.getElementById('app');
  var back = document.getElementById('back');
  var topbar = document.getElementById('topbar');
  var headCenter = document.getElementById('head-center');
  var ctabar = document.getElementById('ctabar');

  /* ---------- fotos: ordem enviada primeiro, depois aleatório sem repetir seguido ---------- */
  function hasHero(s) {
    return s.type === 'single' || s.type === 'multi' || s.type === 'scale' || s.type === 'content';
  }
  var photoOf = (function () {
    var map = {}, used = 0, last = null;
    STEPS.forEach(function (s) {
      if (!hasHero(s)) return;
      var pick;
      if (used < PHOTOS.length) pick = PHOTOS[used];
      else do { pick = PHOTOS[Math.floor(Math.random() * PHOTOS.length)]; } while (pick === last);
      used++; last = pick; map[s.id] = pick;
    });
    return function (id) { return map[id]; };
  })();

  /* ---------- seções ---------- */
  var sectionOf = (function () {
    var map = {}, cur = 0;
    STEPS.forEach(function (s) {
      var i = SECTIONS.map(function (x) { return x.start; }).indexOf(s.id);
      if (i >= 0) cur = i;
      map[s.id] = cur;
    });
    return function (id) { return map[id]; };
  })();

  function sectionProgress(step) {
    var sec = sectionOf(step.id);
    var inSec = STEPS.filter(function (s) { return sectionOf(s.id) === sec; });
    var pos = inSec.indexOf(step);
    return { section: sec, pct: ((pos + 1) / inSec.length) * 100 };
  }

  /* ---------- helpers ---------- */
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function bold(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong class="hl">$1</strong>');
  }

  var CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ebe1d3" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var DOT = '<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#ebe1d3"/></svg>';
  var ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  /* ---------- pontuação ---------- */
  function scoreOf() {
    var total = 0;
    STEPS.forEach(function (s) {
      var a = state.answers[s.id];
      if (a == null) return;
      if (s.type === 'scale') { total += Number(a); return; }
      if (s.type !== 'single') return;
      var opt = (s.options || []).filter(function (o) { return o.value === a; })[0];
      if (!opt) return;
      var v = opt.score != null ? opt.score : parseInt(opt.value, 10);
      if (!isNaN(v)) total += v;
    });
    var level = 1;
    if (total >= 27) level = 4;
    else if (total >= 20) level = 3;
    else if (total >= 12) level = 2;
    return { score: total, level: level };
  }

  /* ---------- navegação ---------- */
  function go(i) {
    state.index = Math.max(-1, Math.min(i, STEPS.length - 1));
    render();
    window.scrollTo(0, 0);
  }
  function next() { go(state.index + 1); }
  function prev() { go(state.index - 1); }
  function answer(id, value) { state.answers[id] = value; }

  function setCta(label, onClick, disabled) {
    if (!label) { ctabar.hidden = true; app.classList.remove('has-cta'); return; }
    ctabar.hidden = false;
    app.classList.add('has-cta');
    var b = el('<button class="btn"' + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>');
    b.addEventListener('click', function () { if (!b.disabled) onClick(); });
    ctabar.firstElementChild.replaceChildren(b);
    return b;
  }

  /* ---------- header ---------- */
  var LOGO = '<p class="wordmark">QUEBRANDO CICLOS</p>';

  function header(step) {
    topbar.hidden = false;
    back.hidden = false;
    var isQuestion = step.type === 'single' || step.type === 'multi' || step.type === 'scale';
    if (!isQuestion) { headCenter.replaceChildren(el(LOGO)); return; }

    var pr = sectionProgress(step);
    var segs = SECTIONS.map(function (_, i) {
      var w = i < pr.section ? 100 : (i === pr.section ? pr.pct : 0);
      return '<i><b style="width:' + w + '%"></b></i>';
    }).join('');
    headCenter.replaceChildren(el(
      '<div><p class="head-label">' + esc(SECTIONS[pr.section].label) + '</p>' +
      '<div class="segments">' + segs + '</div></div>'
    ));
  }

  /* ---------- render ---------- */
  function render() {
    if (state.sent) return renderDone();
    if (state.index < 0) return renderIntro();

    var step = STEPS[state.index];
    header(step);
    setCta(null);

    var view;
    switch (step.type) {
      case 'single': view = viewSingle(step); break;
      case 'multi': view = viewMulti(step); break;
      case 'scale': view = viewScale(step); break;
      case 'content': view = viewContent(step); break;
      case 'loading': view = viewLoading(step); break;
      case 'diagnosis': view = viewDiagnosis(step); break;
      case 'comparison': view = viewComparison(step); break;
      case 'lead': view = viewLead(step); break;
      default: view = el('<div></div>');
    }
    view.classList.add('step');
    app.replaceChildren(view);
  }

  function figure(step, tall) {
    var src = photoOf(step.id);
    if (!src) return '';
    return '<div class="figure' + (tall ? ' tall' : '') + '">' +
      '<img src="' + src + '" alt="Pablo Marçal" loading="lazy"></div>';
  }

  /* ---------- intro ---------- */
  function renderIntro() {
    topbar.hidden = false;
    back.hidden = true;
    headCenter.replaceChildren(el(LOGO));
    setCta(null);

    var opts = INTRO.options.map(function (o) {
      return '<button class="opt tile" data-v="' + o.value + '">' +
        '<span class="shot"><img src="' + o.image + '" alt="' + esc(o.label) + '"></span>' +
        '<span class="bar"><span class="txt">' + esc(o.label) + '</span>' +
        '<span class="go">' + ARROW + '</span></span></button>';
    }).join('');

    var v = el(
      '<div class="step intro">' +
        '<h1>' + esc(INTRO.headline) + '</h1>' +
        '<p class="sub">' + bold(INTRO.sub) + '</p>' +
        '<div class="opts grid2">' + opts + '</div>' +
        '<p class="legal">Ao <strong class="hl">selecionar e continuar</strong>, você concorda com nossos ' +
          '<a href="#">Termos de Serviço</a> | <a href="#">Política de Privacidade</a></p>' +
      '</div>'
    );

    v.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        v.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        answer('genero_inicial', b.dataset.v);
        setTimeout(function () { go(0); }, 220);
      });
    });
    app.replaceChildren(v);
  }

  /* ---------- single ---------- */
  function viewSingle(step) {
    var cls = 'opts' + (step.grid === 2 ? ' grid2' : '');
    var opts = step.options.map(function (o) {
      var on = state.answers[step.id] === o.value ? ' on' : '';
      if (o.emoji) {
        return '<button class="opt emoji' + on + '" data-v="' + esc(o.value) + '">' +
          '<span class="em">' + o.emoji + '</span><span class="txt">' + esc(o.label) + '</span></button>';
      }
      return '<button class="opt' + on + '" data-v="' + esc(o.value) + '">' +
        '<span class="txt">' + esc(o.label) + '</span><span class="mark">' + DOT + '</span></button>';
    }).join('');

    var v = el('<div>' + figure(step) +
      '<h1 class="q">' + esc(step.question) + '</h1>' +
      '<div class="' + cls + '">' + opts + '</div></div>');

    v.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        v.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        answer(step.id, b.dataset.v);
        setTimeout(next, 220);
      });
    });
    return v;
  }

  /* ---------- multi ---------- */
  function viewMulti(step) {
    var sel = state.answers[step.id] || [];
    var opts = step.options.map(function (o) {
      var on = sel.indexOf(o.value) >= 0 ? ' on' : '';
      return '<button class="opt' + on + '" data-v="' + esc(o.value) + '">' +
        '<span class="txt">' + esc(o.label) + '</span>' +
        '<span class="mark square">' + CHECK + '</span></button>';
    }).join('');

    var v = el('<div>' + figure(step) +
      '<h1 class="q">' + esc(step.question) + '</h1>' +
      '<p class="q-sub">Escolha quantas quiser</p>' +
      '<div class="opts">' + opts + '</div></div>');

    var cta = setCta('Continuar', next, sel.length === 0);
    v.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var val = b.dataset.v, i = sel.indexOf(val);
        if (i >= 0) { sel.splice(i, 1); b.classList.remove('on'); }
        else { sel.push(val); b.classList.add('on'); }
        answer(step.id, sel.slice());
        cta.disabled = sel.length === 0;
      });
    });
    return v;
  }

  /* ---------- escala ---------- */
  function viewScale(step) {
    var levels = [
      { v: '0', label: 'Discordo totalmente' },
      { v: '1', label: 'Discordo em parte' },
      { v: '2', label: 'Mais ou menos' },
      { v: '3', label: 'Concordo em parte' },
      { v: '4', label: 'Concordo totalmente' },
    ];
    var cur = state.answers[step.id];
    var opts = levels.map(function (l) {
      var on = String(cur) === l.v ? ' on' : '';
      return '<button class="opt' + on + '" data-v="' + l.v + '">' +
        '<span class="txt">' + l.label + '</span><span class="mark">' + DOT + '</span></button>';
    }).join('');

    var v = el('<div>' + figure(step) +
      '<h1 class="q">' + esc(step.question) + '</h1>' +
      '<div class="statement">' + esc(step.statement) + '</div>' +
      '<div class="opts">' + opts + '</div></div>');

    v.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        v.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        answer(step.id, b.dataset.v);
        setTimeout(next, 220);
      });
    });
    return v;
  }

  /* ---------- conteúdo ---------- */
  function viewContent(step) {
    var paras = step.body.split('\n\n').map(function (p) {
      return '<p>' + bold(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
    var quote = step.quote ? '<div class="quote"><p class="who">' + esc(step.quote.author) + '</p>' +
      '<p class="txt">' + esc(step.quote.text) + '</p></div>' : '';

    var v = el('<div class="content">' + figure(step, true) +
      '<h1>' + esc(step.title) + '</h1>' + paras + quote + '</div>');

    setCta('Continuar', next);
    return v;
  }

  /* ---------- loading ---------- */
  function viewLoading(step) {
    var R = 60, C = 2 * Math.PI * R;
    var v = el('<div class="loading">' +
      '<div class="ring"><svg width="132" height="132">' +
        '<circle class="bgc" cx="66" cy="66" r="' + R + '"></circle>' +
        '<circle class="fg" cx="66" cy="66" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"></circle>' +
      '</svg><b>0%</b></div>' +
      '<p class="msg">' + esc(step.messages[0]) + '</p>' +
      '<p class="warn">Não feche esta página. Sua análise personalizada está sendo finalizada.</p></div>');

    var fg = v.querySelector('.fg'), num = v.querySelector('b'), msg = v.querySelector('.msg');
    var t0 = Date.now(), dur = 4200, mine = state.index;
    var timer = setInterval(function () {
      if (state.index !== mine) { clearInterval(timer); return; }
      var p = Math.min(1, (Date.now() - t0) / dur);
      num.textContent = Math.round(p * 100) + '%';
      fg.setAttribute('stroke-dashoffset', String(C * (1 - p)));
      var mi = Math.min(step.messages.length - 1, Math.floor(p * step.messages.length));
      if (msg.textContent !== step.messages[mi]) msg.textContent = step.messages[mi];
      if (p >= 1) { clearInterval(timer); setTimeout(next, 350); }
    }, 50);
    return v;
  }

  /* ---------- diagnóstico ---------- */
  function viewDiagnosis() {
    var r = scoreOf();
    var lv = LEVELS[r.level];
    var marks = ['Preso Profundo', 'Ciclo Ativo', 'Rompendo', 'Quase Livre'];
    var patterns = PATTERNS.map(function (p) {
      return '<div class="pattern"><p class="tag">' + esc(p.tag) + '</p>' +
        '<p class="nm">' + esc(p.name) + '</p><p class="ds">' + esc(p.desc) + '</p></div>';
    }).join('');

    var v = el('<div class="diag">' +
      '<p class="kicker">Seu Índice de Ruptura de Ciclos</p>' +
      '<h1>Nível <span class="' + toneClass(lv.tone) + '">' + esc(lv.name) + '</span></h1>' +
      '<p class="rule">Preso Profundo → Ciclo Ativo → Rompendo → Quase Livre</p>' +
      '<div class="marker-track"><div class="marker" style="left:0%"><span>Você</span><i></i></div></div>' +
      '<div class="gauge"><i></i><i></i><i></i><i></i></div>' +
      '<div class="gauge-labels">' + marks.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' +
      '<p class="summary">' + esc(lv.summary) + '</p>' +
      '<p class="sect">Padrão invisível identificado na sua linhagem</p>' + patterns + '</div>');

    var cta = setCta('Analisando...', next, true);
    var marker = v.querySelector('.marker');
    var t0 = Date.now(), dur = 2200, mine = state.index;
    var timer = setInterval(function () {
      if (state.index !== mine) { clearInterval(timer); return; }
      var p = Math.min(1, (Date.now() - t0) / dur);
      marker.style.left = ((1 - Math.pow(1 - p, 3)) * lv.bar) + '%';
      if (p >= 1) { clearInterval(timer); cta.disabled = false; cta.textContent = 'Continuar'; }
    }, 30);
    return v;
  }

  function toneClass(t) {
    return t === 'danger' ? 'negative' : (t === 'warn' ? 'warning' : 'positive');
  }

  /* ---------- comparativo ---------- */
  function viewComparison() {
    var rows = COMPARISON.map(function (r) {
      return '<div class="cmp-row"><div class="cmp-label">' + esc(r.label) + '</div>' +
        '<div class="a">' + esc(r.a) + '</div><div class="b">' + esc(r.b) + '</div></div>';
    }).join('');

    var v = el('<div class="cmp">' +
      '<h1>Repetindo o ciclo x quebrando o ciclo</h1>' +
      '<p class="sub">A mesma pessoa, com e sem o método.</p>' +
      '<div class="cmp-head"><div class="a">Sozinho, na tentativa</div><div class="b">Com o Quebrando Ciclos</div></div>' +
      rows + '</div>');

    setCta('Quero quebrar o meu ciclo', next);
    return v;
  }

  /* ---------- lead ---------- */
  function viewLead() {
    var v = el('<div class="lead">' +
      '<h1>Última etapa antes da sua análise completa</h1>' +
      '<p class="sub">Seu nível já foi calculado. Informe onde você quer receber sua análise personalizada e o próximo passo recomendado.</p>' +
      '<form novalidate>' +
        '<div class="field"><label for="nome">Como quer ser chamado?</label>' +
          '<input id="nome" type="text" autocomplete="name" placeholder="Seu primeiro nome"></div>' +
        '<div class="field"><label for="email">Seu melhor e-mail</label>' +
          '<input id="email" type="email" autocomplete="email" placeholder="voce@email.com"></div>' +
        '<div class="field"><label for="fone">WhatsApp com DDD</label>' +
          '<input id="fone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 9XXXX-XXXX">' +
          '<div class="err" hidden>Informe um celular válido com DDD: (11) 9XXXX-XXXX</div></div>' +
        '<label class="consent"><input type="checkbox" id="ok">' +
          '<span>Autorizo o contato e concordo com a <a href="#">Política de Privacidade</a>.</span></label>' +
        '<p class="secure">🔒 Seus dados estão seguros e não serão compartilhados</p>' +
      '</form></div>');

    var nome = v.querySelector('#nome'), email = v.querySelector('#email');
    var fone = v.querySelector('#fone'), ok = v.querySelector('#ok'), err = v.querySelector('.err');

    function mask(raw) {
      var d = raw.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) return d ? '(' + d : '';
      if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    }
    function phoneOk() { return /^\(\d{2}\) 9\d{4}-\d{4}$/.test(fone.value); }
    function emailOk() { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()); }
    function valid() { return nome.value.trim() && emailOk() && phoneOk() && ok.checked; }

    var cta = setCta('Receber minha análise completa', submit, true);
    function sync() { cta.disabled = !valid(); }

    function submit() {
      if (!valid()) return;
      answer('lead', { nome: nome.value.trim(), email: email.value.trim(), fone: fone.value });
      cta.disabled = true;
      cta.textContent = 'Enviando...';
      setTimeout(function () { state.sent = true; render(); }, 900);
    }

    fone.addEventListener('input', function () {
      fone.value = mask(fone.value);
      err.hidden = phoneOk() || fone.value.length < 15;
      sync();
    });
    [nome, email].forEach(function (i) { i.addEventListener('input', sync); });
    ok.addEventListener('change', sync);
    v.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    return v;
  }

  function renderDone() {
    back.hidden = true;
    headCenter.replaceChildren(el(LOGO));
    setCta(null);
    app.replaceChildren(el('<div class="step done"><h1>Análise enviada.</h1>' +
      '<p>Em instantes você vai receber o retrato completo do seu Índice de Ruptura e o próximo passo pra quebrar cada ciclo.</p></div>'));
  }

  back.addEventListener('click', prev);
  renderIntro();
})();
