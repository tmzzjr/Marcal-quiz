(function () {
  'use strict';

  var STEPS = window.QUIZ_STEPS;
  var INTRO = window.QUIZ_INTRO;
  var LEVELS = window.QUIZ_LEVELS;
  var PATTERNS = window.QUIZ_PATTERNS;
  var COMPARISON = window.QUIZ_COMPARISON;

  var PHOTOS = ['img/pm1.jpg', 'img/pm2.jpg', 'img/pm3.jpg', 'img/pm4.jpg', 'img/pm5.jpg', 'img/pm6.jpg'];

  var state = { index: -1, answers: {}, sent: false };

  var app = document.getElementById('app');
  var bar = document.getElementById('bar');
  var back = document.getElementById('back');
  var counter = document.getElementById('counter');
  var topbar = document.getElementById('topbar');

  /* ---------- fotos: ordem enviada primeiro, depois aleatório sem repetir seguido ---------- */
  var photoOf = (function () {
    var map = {};
    var used = 0;
    var last = null;
    STEPS.forEach(function (s) {
      if (!hasHero(s)) return;
      var pick;
      if (used < PHOTOS.length) {
        pick = PHOTOS[used];
      } else {
        do { pick = PHOTOS[Math.floor(Math.random() * PHOTOS.length)]; } while (pick === last);
      }
      used++;
      last = pick;
      map[s.id] = pick;
    });
    return function (id) { return map[id]; };
  })();

  function hasHero(s) {
    return s.type === 'single' || s.type === 'multi' || s.type === 'scale' || s.type === 'content';
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

  var CHEV = '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  var CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

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
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  function next() { go(state.index + 1); }
  function prev() { go(state.index - 1); }

  function answer(id, value) {
    state.answers[id] = value;
  }

  /* ---------- render ---------- */
  function render() {
    if (state.sent) return renderDone();
    if (state.index < 0) return renderIntro();

    var step = STEPS[state.index];
    topbar.hidden = false;
    back.hidden = false;
    bar.style.width = ((state.index + 1) / STEPS.length * 100) + '%';

    var questionSteps = STEPS.filter(function (s) {
      return s.type === 'single' || s.type === 'multi' || s.type === 'scale';
    });
    var qIdx = questionSteps.indexOf(step);
    counter.textContent = qIdx >= 0 ? (qIdx + 1) + '/' + questionSteps.length : '';

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

  function heroHTML(step) {
    var src = photoOf(step.id);
    return src ? '<img class="hero" src="' + src + '" alt="Pablo Marçal" loading="lazy">' : '';
  }

  /* ---------- intro (passo 1, estilo BetterMe) ---------- */
  function renderIntro() {
    topbar.hidden = true;
    var opts = INTRO.options.map(function (o) {
      return '<button class="opt tile" data-v="' + o.value + '">' +
        '<img src="' + o.image + '" alt="' + esc(o.label) + '">' +
        '<span class="txt">' + esc(o.label) + '</span></button>';
    }).join('');

    var v = el(
      '<div class="step intro">' +
        '<img class="intro-logo" src="img/logo.webp" alt="Quebrando Ciclos">' +
        '<h1>' + esc(INTRO.headline) + '</h1>' +
        '<p class="sub">' + bold(INTRO.sub) + '</p>' +
        '<h2>' + esc(INTRO.genderQuestion) + '</h2>' +
        '<div class="opts grid2">' + opts + '</div>' +
        '<p class="legal">Ao acessar esta página, você concorda com os ' +
          '<a href="#">Termos de Uso</a> e a <a href="#">Política de Privacidade</a>.</p>' +
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
    var isEmoji = step.options.some(function (o) { return o.emoji; });
    var cls = 'opts' + (step.grid === 2 ? ' grid2' : '');

    var opts = step.options.map(function (o) {
      var on = state.answers[step.id] === o.value ? ' on' : '';
      if (o.emoji) {
        return '<button class="opt emoji' + on + '" data-v="' + esc(o.value) + '">' +
          '<span class="em">' + o.emoji + '</span><span class="txt">' + esc(o.label) + '</span></button>';
      }
      return '<button class="opt' + on + '" data-v="' + esc(o.value) + '">' +
        '<span class="txt">' + esc(o.label) + '</span>' + CHEV + '</button>';
    }).join('');

    var v = el('<div>' + heroHTML(step) +
      '<h2 class="q">' + esc(step.question) + '</h2>' +
      '<div class="' + cls + (isEmoji ? '' : '') + '">' + opts + '</div></div>');

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
        '<span class="box">' + CHECK + '</span></button>';
    }).join('');

    var v = el('<div>' + heroHTML(step) +
      '<h2 class="q">' + esc(step.question) + '</h2>' +
      '<div class="opts">' + opts + '</div>' +
      '<div class="btn-sticky"><button class="btn" id="mnext" disabled>Continuar</button></div></div>');

    var cta = v.querySelector('#mnext');
    function sync() {
      cta.disabled = sel.length === 0;
      cta.textContent = sel.length ? 'Continuar (' + sel.length + ')' : 'Selecione ao menos uma';
    }
    v.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var val = b.dataset.v;
        var i = sel.indexOf(val);
        if (i >= 0) { sel.splice(i, 1); b.classList.remove('on'); }
        else { sel.push(val); b.classList.add('on'); }
        answer(step.id, sel.slice());
        sync();
      });
    });
    cta.addEventListener('click', next);
    sync();
    return v;
  }

  /* ---------- scale ---------- */
  function viewScale(step) {
    var faces = ['🙅', '🙁', '😐', '🙂', '🙌'];
    var cur = state.answers[step.id];
    var btns = faces.map(function (f, i) {
      var on = String(cur) === String(i) ? ' on' : '';
      return '<button class="' + on.trim() + '" data-v="' + i + '">' + f + '</button>';
    }).join('');

    var v = el('<div>' + heroHTML(step) +
      '<h2 class="q">' + esc(step.question) + '</h2>' +
      '<div class="statement">' + esc(step.statement) + '</div>' +
      '<div class="scale">' + btns + '</div>' +
      '<div class="scale-legend"><span>Discordo totalmente</span><span>Concordo totalmente</span></div></div>');

    v.querySelectorAll('.scale button').forEach(function (b) {
      b.addEventListener('click', function () {
        v.querySelectorAll('.scale button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        answer(step.id, b.dataset.v);
        setTimeout(next, 240);
      });
    });
    return v;
  }

  /* ---------- content ---------- */
  function viewContent(step) {
    var paras = step.body.split('\n\n').map(function (p) {
      return '<p>' + bold(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');

    var quote = step.quote ? '<div class="quote"><p class="who">' + esc(step.quote.author) + '</p>' +
      '<p class="txt">' + esc(step.quote.text) + '</p></div>' : '';

    var src = photoOf(step.id);
    var img = src ? '<img class="portrait" src="' + src + '" alt="Pablo Marçal" loading="lazy">' : '';

    var v = el('<div class="content-wrap">' + img +
      '<div class="content-card"><h2>' + esc(step.title) + '</h2>' + paras + quote + '</div>' +
      '<div class="btn-wrap"><button class="btn">Continuar</button></div></div>');

    v.querySelector('.btn').addEventListener('click', next);
    return v;
  }

  /* ---------- loading ---------- */
  function viewLoading(step) {
    var R = 52, C = 2 * Math.PI * R;
    var v = el('<div class="loading">' +
      '<div class="ring"><svg width="116" height="116">' +
        '<circle class="bgc" cx="58" cy="58" r="' + R + '"></circle>' +
        '<circle class="fg" cx="58" cy="58" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"></circle>' +
      '</svg><b>0%</b></div>' +
      '<p class="msg">' + esc(step.messages[0]) + '</p>' +
      '<p class="warn">Não feche esta página. Sua análise personalizada está sendo finalizada.</p></div>');

    var fg = v.querySelector('.fg');
    var num = v.querySelector('b');
    var msg = v.querySelector('.msg');
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
      return '<div class="pattern"><p class="tag">🔴 ' + esc(p.tag) + '</p>' +
        '<p class="nm">' + esc(p.name) + '</p><p class="ds">' + esc(p.desc) + '</p></div>';
    }).join('');

    var v = el('<div><div class="diag">' +
      '<p class="kicker">Seu Índice de Ruptura de Ciclos</p>' +
      '<h2>Nível <span class="' + lv.tone + '">' + esc(lv.name) + '</span></h2>' +
      '<p class="rule">🔗 Régua: Preso Profundo → Ciclo Ativo → Rompendo → Quase Livre</p>' +
      '<div class="marker-track"><div class="marker" style="left:0%"><span>Você</span><i></i></div></div>' +
      '<div class="gauge"><i></i><i></i><i></i><i></i></div>' +
      '<div class="gauge-labels">' + marks.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' +
      '<p class="summary">' + esc(lv.summary) + '</p>' +
      '<p class="sect">Padrão invisível identificado na sua linhagem:</p>' + patterns +
      '</div><div class="btn-wrap"><button class="btn" disabled>Analisando...</button></div></div>');

    var marker = v.querySelector('.marker');
    var cta = v.querySelector('.btn');
    var t0 = Date.now(), dur = 2200, mine = state.index;

    var timer = setInterval(function () {
      if (state.index !== mine) { clearInterval(timer); return; }
      var p = Math.min(1, (Date.now() - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      marker.style.left = (eased * lv.bar) + '%';
      if (p >= 1) {
        clearInterval(timer);
        cta.disabled = false;
        cta.textContent = 'Continuar →';
      }
    }, 30);

    cta.addEventListener('click', function () { if (!cta.disabled) next(); });
    return v;
  }

  /* ---------- comparativo ---------- */
  function viewComparison() {
    var rows = COMPARISON.map(function (r) {
      return '<div class="cmp-row"><div class="cmp-label">' + esc(r.label) + '</div>' +
        '<div class="a">' + esc(r.a) + '</div><div class="b">' + esc(r.b) + '</div></div>';
    }).join('');

    var v = el('<div><div class="cmp">' +
      '<h2>Repetindo o ciclo x Quebrando o ciclo</h2>' +
      '<p class="sub">A mesma pessoa, com e sem o método.</p>' +
      '<div class="cmp-head"><div class="a">Sozinho, na tentativa</div><div class="b">Com o Quebrando Ciclos</div></div>' +
      rows + '</div>' +
      '<div class="btn-wrap"><button class="btn">Quero quebrar o meu ciclo →</button></div></div>');

    v.querySelector('.btn').addEventListener('click', next);
    return v;
  }

  /* ---------- lead ---------- */
  function viewLead() {
    var v = el('<div class="lead">' +
      '<h2>Última etapa antes de receber a sua análise completa.</h2>' +
      '<p class="sub">Seu nível já foi calculado. Informe seu nome e onde você quer receber sua análise personalizada + o próximo passo recomendado.</p>' +
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
        '<button class="btn" type="submit" disabled>RECEBER MINHA ANÁLISE COMPLETA →</button>' +
        '<p class="secure">🔒 Seus dados estão seguros e não serão compartilhados</p>' +
      '</form></div>');

    var nome = v.querySelector('#nome');
    var email = v.querySelector('#email');
    var fone = v.querySelector('#fone');
    var ok = v.querySelector('#ok');
    var err = v.querySelector('.err');
    var cta = v.querySelector('.btn');

    function mask(raw) {
      var d = raw.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) return d ? '(' + d : '';
      if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    }
    function phoneOk() { return /^\(\d{2}\) 9\d{4}-\d{4}$/.test(fone.value); }
    function emailOk() { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()); }
    function valid() { return nome.value.trim() && emailOk() && phoneOk() && ok.checked; }
    function sync() { cta.disabled = !valid(); }

    fone.addEventListener('input', function () {
      fone.value = mask(fone.value);
      err.hidden = phoneOk() || fone.value.length < 15;
      sync();
    });
    [nome, email].forEach(function (i) { i.addEventListener('input', sync); });
    ok.addEventListener('change', sync);

    v.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid()) return;
      answer('lead', { nome: nome.value.trim(), email: email.value.trim(), fone: fone.value });
      cta.disabled = true;
      cta.textContent = 'ENVIANDO...';
      setTimeout(function () { state.sent = true; render(); }, 900);
    });
    return v;
  }

  function renderDone() {
    bar.style.width = '100%';
    back.hidden = true;
    counter.textContent = '';
    app.replaceChildren(el('<div class="step done"><h1>Análise enviada.</h1>' +
      '<p>Em instantes você vai receber o retrato completo do seu Índice de Ruptura e o próximo passo pra quebrar cada ciclo.</p></div>'));
  }

  back.addEventListener('click', prev);
  renderIntro();
})();
