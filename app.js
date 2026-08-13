(function () {
  'use strict';

  var STEPS = window.QUIZ_STEPS;
  var INTRO = window.QUIZ_INTRO;
  var LEVELS = window.QUIZ_LEVELS;
  var PATTERNS = window.QUIZ_PATTERNS;
  var COMPARISON = window.QUIZ_COMPARISON;
  var SECTIONS = window.QUIZ_SECTIONS;

  var PHOTOS = ['img/pm1.webp', 'img/pm6.webp', 'img/pm3.webp', 'img/pm4.webp', 'img/pm5.webp', 'img/pm2.webp'];
  var FULL_BODY = ['img/pm6.webp']; // corpo inteiro pede mais altura pra figura não ficar pequena

  // pré-carrega tudo no início: trocar de step não pode esperar imagem
  ['img/homem-cut.webp', 'img/mulher-cut.webp'].concat(PHOTOS).forEach(function (src) {
    var i = new Image();
    i.decoding = 'async';
    i.src = src;
  });

  var state = { index: -1, answers: {}, sent: false };

  /* ---------- progresso salvo ---------- */
  var STORE_KEY = 'quebrando_ciclos_v1';
  var MAX_IDADE = 1000 * 60 * 60 * 24 * 14; // 14 dias

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || s.v !== 1) return null;
      if (!s.t || Date.now() - s.t > MAX_IDADE) { localStorage.removeItem(STORE_KEY); return null; }
      return s;
    } catch (e) { return null; }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 1,
        t: Date.now(),
        index: state.index,
        answers: state.answers,
        sent: state.sent,
        photos: photoMap,
      }));
    } catch (e) { /* modo anônimo ou cota cheia: seguir sem salvar */ }
  }

  var saved = loadSaved();

  var app = document.getElementById('app');
  var back = document.getElementById('back');
  var topbar = document.getElementById('topbar');
  var headCenter = document.getElementById('head-center');
  var ctabar = document.getElementById('ctabar');

  /* ---------- fotos: ordem enviada primeiro, depois aleatório sem repetir seguido ---------- */
  function hasHero(s) {
    return s.type === 'single' || s.type === 'multi' || s.type === 'scale' || s.type === 'content';
  }
  var photoMap = (function () {
    // reaproveita o sorteio salvo, senão as fotos trocariam a cada recarga
    if (saved && saved.photos && Object.keys(saved.photos).length) return saved.photos;
    var map = {}, used = 0, last = null;
    STEPS.forEach(function (s) {
      if (!hasHero(s)) return;
      var pick;
      if (used < PHOTOS.length) pick = PHOTOS[used];
      else do { pick = PHOTOS[Math.floor(Math.random() * PHOTOS.length)]; } while (pick === last);
      used++; last = pick; map[s.id] = pick;
    });
    return map;
  })();

  // fotos escolhidas a dedo para passos específicos, acima do sorteio
  var FIXOS = {
    rotina_futura: 'img/pm5.webp',
    preferencia_caminho: 'img/pm3.webp',
  };
  Object.keys(FIXOS).forEach(function (id) { photoMap[id] = FIXOS[id]; });

  // depois dos fixos, desfaz qualquer foto repetida em passos vizinhos
  (function () {
    var comHero = STEPS.filter(hasHero);
    function trocar(id, proibidas) {
      for (var k = 0; k < PHOTOS.length; k++) {
        if (proibidas.indexOf(PHOTOS[k]) < 0) { photoMap[id] = PHOTOS[k]; return; }
      }
    }
    for (var i = 1; i < comHero.length; i++) {
      var id = comHero[i].id, idAnt = comHero[i - 1].id;
      if (photoMap[id] !== photoMap[idAnt]) continue;
      var prox = comHero[i + 1] ? photoMap[comHero[i + 1].id] : null;
      var antAnt = comHero[i - 2] ? photoMap[comHero[i - 2].id] : null;
      // o passo com foto escolhida a dedo manda; quem cede é o vizinho
      if (FIXOS[id]) trocar(idAnt, [photoMap[id], antAnt]);
      else trocar(id, [photoMap[idAnt], prox]);
    }
  })();

  function photoOf(id) { return photoMap[id]; }

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

  // o diagnóstico é a linha de chegada da barra: lá ela precisa estar cheia
  var IDX_DIAGNOSTICO = (function () {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].type === 'diagnosis') return i;
    return STEPS.length - 1;
  })();

  function progressoGlobal(step) {
    var i = STEPS.indexOf(step);
    return Math.max(0, Math.min(1, (i + 1) / (IDX_DIAGNOSTICO + 1)));
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

  var GIFT = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
    '<rect x="3" y="9.5" width="18" height="11.5" rx="2" fill="currentColor"/>' +
    '<rect x="2" y="6.5" width="20" height="4.5" rx="1.4" fill="currentColor"/>' +
    '<rect x="10.4" y="6.5" width="3.2" height="14.5" fill="rgba(5,3,0,.42)"/>' +
    '<path d="M12 6.5C10.6 6.5 8 6.2 8 4.4 8 3.3 8.9 2.5 10 2.5c1.6 0 2 2.3 2 4zm0 0c1.4 0 4-.3 4-2.1 0-1.1-.9-1.9-2-1.9-1.6 0-2 2.3-2 4z" fill="currentColor"/>' +
    '</svg>';

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
    return { score: total, level: level, max: maxScore(), pct: Math.round(total / maxScore() * 100) };
  }

  // teto real do questionário, para o índice não ser um número solto
  function maxScore() {
    var max = 0;
    STEPS.forEach(function (s) {
      if (s.type === 'scale') { max += 4; return; }
      if (s.type !== 'single') return;
      var best = 0;
      (s.options || []).forEach(function (o) {
        var v = o.score != null ? o.score : parseInt(o.value, 10);
        if (!isNaN(v) && v > best) best = v;
      });
      max += best;
    });
    return max || 1;
  }

  // intensidade de cada padrão, lida das respostas que o alimentam
  function patternIntensity() {
    var a = state.answers;
    function has(id, val) { return a[id] === val; }
    function inMulti(id, val) { return (a[id] || []).indexOf(val) >= 0; }
    function scale(id) { return a[id] != null ? Number(a[id]) / 4 : 0; }
    function clamp(n) { return Math.max(18, Math.min(100, Math.round(n))); }

    var frases = (a.frases_herdadas || []).filter(function (v) { return v !== 'nenhuma'; }).length;

    return [
      clamp(30 + scale('escala_destino') * 40 + (Number(a.financeiro) || 0) * 5 + frases * 4),
      clamp(28 + scale('escala_culpa') * 45 + (has('crenca_prosperar', 'culpado') ? 15 : 0) + (has('fe', 'muito') ? 8 : 0)),
      clamp(25 + (has('nao_dito_traicao', 'exato') ? 40 : has('nao_dito_traicao', 'um_pouco') ? 25 : has('nao_dito_traicao', 'faz_sentido') ? 15 : 0) +
        (has('julgamento_social', 'todos') ? 22 : has('julgamento_social', 'familia') ? 16 : 0) + (inMulti('origem_limites', 'casa') ? 8 : 0)),
      clamp(24 + (Number(a.autossabotagem) || 0) * 12 + (has('padrao_travada', 'eu_travo') ? 18 : 12) +
        (has('recaidas', 'muitas') ? 20 : has('recaidas', '3_4') ? 12 : 0)),
    ];
  }

  /* ---------- navegação ---------- */
  function go(i) {
    state.index = Math.max(-1, Math.min(i, STEPS.length - 1));
    save();
    render();
    window.scrollTo(0, 0);
  }
  function next() { go(state.index + 1); }
  function prev() {
    // sair do diagnóstico para trás significa que o resultado terá de ser refeito
    if (STEPS[state.index] && STEPS[state.index].type === 'diagnosis') state.recalcular = true;
    go(state.index - 1);
  }
  function answer(id, value) { state.answers[id] = value; save(); }

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
    var g = progressoGlobal(step);
    var n = SECTIONS.length;
    var segs = SECTIONS.map(function (_, i) {
      var w = Math.max(0, Math.min(1, g * n - i)) * 100;
      return '<i><b style="width:' + w + '%"></b></i>';
    }).join('') + '<em class="gift roxo' + (g >= 1 ? ' won' : '') + '">' + GIFT + '</em>';

    headCenter.replaceChildren(el(
      '<div>' + LOGO + '<div class="segments">' + segs + '</div></div>'
    ));
  }

  /* ---------- render ---------- */
  function render() {
    if (state.sent) return renderDone();
    if (state.index < 0) return renderIntro();

    var step = STEPS[state.index];
    header(step);
    setCta(null);

    if (step.type === 'diagnosis') clearRecalc();
    else if (state.recalcular) recalcBanner();

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
    var cls = 'figure' + (tall ? ' tall' : '') + (FULL_BODY.indexOf(src) >= 0 ? ' full' : '');
    return '<div class="' + cls + '">' +
      '<img src="' + src + '" alt="Pablo Marçal" decoding="sync" fetchpriority="high"></div>';
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
    var tone = toneClass(lv.tone);
    var marks = ['Preso Profundo', 'Ciclo Ativo', 'Rompendo', 'Quase Livre'];
    var pos = 4 - r.level; // 0 = mais preso
    var intens = patternIntensity();

    var steps = marks.map(function (m, i) {
      var cls = i < pos ? ' done' : (i === pos ? ' now' : '');
      return '<div class="rung' + cls + '"><i></i><span>' + m + '</span></div>';
    }).join('');

    var patterns = PATTERNS.map(function (p, i) {
      var n = intens[i];
      var grau = n >= 70 ? 'Alta' : n >= 45 ? 'Média' : 'Baixa';
      return '<article class="pattern">' +
        '<header><h3>' + esc(p.name) + '</h3><span class="grau g' + grau.charAt(0) + '">' + grau + '</span></header>' +
        '<p class="ds">' + esc(p.desc) + '</p>' +
        '<div class="meter"><b data-w="' + n + '"></b></div>' +
        '<p class="tag">' + esc(p.tag) + '</p></article>';
    }).join('');

    // arco semicircular: raio 92, meia volta
    var R = 92, ARC = Math.PI * R;

    var v = el('<div class="diag">' +
      '<p class="kicker">Seu Índice de Ruptura</p>' +
      '<div class="dial">' +
        '<svg viewBox="0 0 220 128" width="100%">' +
          '<path class="track" d="M18 110 A92 92 0 0 1 202 110" fill="none" stroke-width="13" stroke-linecap="round"/>' +
          '<path class="fill ' + tone + '" d="M18 110 A92 92 0 0 1 202 110" fill="none" stroke-width="13" stroke-linecap="round"' +
            ' stroke-dasharray="' + ARC + '" stroke-dashoffset="' + ARC + '"/>' +
        '</svg>' +
        '<div class="dial-mid"><b><span class="n">0</span><i>%</i></b><span>do padrão ativo</span></div>' +
      '</div>' +
      '<div class="player">' +
        '<button class="play" type="button" aria-label="Ouvir a leitura do seu resultado">' +
          '<svg class="ico-play" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M8 5.2v13.6c0 .9 1 1.4 1.7.9l10-6.8a1.1 1.1 0 000-1.8l-10-6.8A1.1 1.1 0 008 5.2z"/></svg>' +
          '<svg class="ico-pause" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="6.5" y="4.5" width="4" height="15" rx="1.4"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.4"/></svg>' +
        '</button>' +
        '<div class="player-body">' +
          '<div class="wave">' + ondas(46) + '</div>' +
          '<div class="times"><span class="t-now">0:00</span><span class="t-total">0:15</span></div>' +
        '</div>' +
      '</div>' +
      '<h1 class="' + tone + '">' + esc(lv.name) + '</h1>' +
      '<p class="range">' + esc(lv.range) + '</p>' +
      '<p class="summary">' + esc(lv.summary) + '</p>' +
      '<div class="ladder">' + steps + '</div>' +
      '<p class="sect">Padrões ativos na sua linhagem</p>' +
      '<div class="patterns">' + patterns + '</div>' +
      '<button class="prize" type="button">' +
        '<span class="prize-shine"></span>' +
        '<span class="prize-ico">' + GIFT + '</span>' +
        '<span class="prize-txt">' +
          '<b>Seu presente está liberado</b>' +
          '<i>O plano para quebrar os 4 padrões, sem custo</i>' +
        '</span>' +
        '<span class="prize-go">' + ARROW + '</span>' +
      '</button>' +
      '<p class="peers">Comparado com <b>5.841</b> pessoas que já mapearam seus ciclos.</p>' +
    '</div>');

    v.querySelector('.prize').addEventListener('click', redirectToast);
    montarPlayer(v, 15); // trocar pela duração real quando o áudio entrar

    var cta = setCta('Analisando...', redirectToast, true);
    var fill = v.querySelector('.fill');
    var num = v.querySelector('.dial-mid .n');
    var mine = state.index, dur = 1600, t0 = null, ultimo = -1;

    // um quadro por frame do navegador, sem transição CSS competindo com o script
    function frame(ts) {
      if (state.index !== mine) return;
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      fill.style.strokeDashoffset = ARC * (1 - eased * r.pct / 100);
      var n = Math.round(eased * r.pct);
      if (n !== ultimo) { num.textContent = n; ultimo = n; }
      if (p < 1) { requestAnimationFrame(frame); return; }
      v.querySelectorAll('.meter b').forEach(function (bar, i) {
        setTimeout(function () { bar.style.width = bar.dataset.w + '%'; }, i * 110);
      });
      cta.disabled = false;
      cta.textContent = 'Ver como quebrar';
    }
    requestAnimationFrame(frame);
    return v;
  }

  // barras da onda: alturas fixas, para o desenho não mudar a cada render
  function ondas(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      var h = 22 + Math.round(Math.abs(Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.53) * 0.4) * 78);
      out += '<i style="height:' + h + '%"></i>';
    }
    return out;
  }

  // player sem áudio ainda: a faixa corre no relógio, pronta para receber o arquivo
  function montarPlayer(root, total) {
    var wrap = root.querySelector('.player');
    var btn = wrap.querySelector('.play');
    var bars = wrap.querySelectorAll('.wave i');
    var tNow = wrap.querySelector('.t-now');
    var tocando = false, pos = 0, ultimo = 0, raf = null;
    var mine = state.index;

    function mmss(s) {
      var m = Math.floor(s / 60), r = Math.floor(s % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    }
    function pintar() {
      var lidas = Math.round(pos / total * bars.length);
      for (var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < lidas);
      tNow.textContent = mmss(pos);
      wrap.style.setProperty('--pos', (pos / total * 100) + '%');
    }
    function passo(ts) {
      if (state.index !== mine || !tocando) return;
      if (!ultimo) ultimo = ts;
      pos = Math.min(total, pos + (ts - ultimo) / 1000);
      ultimo = ts;
      pintar();
      if (pos >= total) { parar(); pos = 0; pintar(); return; }
      raf = requestAnimationFrame(passo);
    }
    function parar() {
      tocando = false; ultimo = 0;
      if (raf) cancelAnimationFrame(raf);
      wrap.classList.remove('tocando');
      btn.setAttribute('aria-label', 'Ouvir a leitura do seu resultado');
    }

    btn.addEventListener('click', function () {
      if (tocando) { parar(); return; }
      tocando = true;
      wrap.classList.add('tocando');
      btn.setAttribute('aria-label', 'Pausar');
      raf = requestAnimationFrame(passo);
    });

    // clicar na onda salta para o ponto
    wrap.querySelector('.wave').addEventListener('click', function (e) {
      var r = this.getBoundingClientRect();
      pos = Math.max(0, Math.min(total, (e.clientX - r.left) / r.width * total));
      pintar();
    });

    pintar();
  }

  function toneClass(t) {
    return t === 'danger' ? 'negative' : (t === 'warn' ? 'warning' : 'positive');
  }

  // aviso fixo abaixo do topo, enquanto o usuário refaz respostas depois de ver o resultado
  function recalcBanner() {
    if (document.querySelector('.recalc')) return;
    var r = el('<div class="recalc" role="status" aria-live="polite">' +
      '<span class="spin"></span><span>Recalculando novamente</span></div>');
    topbar.insertAdjacentElement('afterend', r);
  }

  function clearRecalc() {
    state.recalcular = false;
    var r = document.querySelector('.recalc');
    if (r) r.remove();
  }

  // o botão do resultado não navega: só avisa que o redirecionamento está a caminho
  function redirectToast() {
    if (document.querySelector('.toast')) return;
    var t = el('<div class="toast" role="status" aria-live="polite">' +
      '<span class="spin"></span><span>Redirecionando você para a página</span></div>');
    ctabar.appendChild(t); // depois do wrapper, que setCta reaproveita
    setTimeout(function () {
      t.classList.add('saindo');
      setTimeout(function () { t.remove(); }, 260);
    }, 2000);
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

  /* ---------- retomar de onde parou ---------- */
  function askResume(s) {
    var step = STEPS[s.index];
    var qSteps = STEPS.filter(function (x) {
      return x.type === 'single' || x.type === 'multi' || x.type === 'scale';
    });
    var doneQ = qSteps.filter(function (x, i) { return i <= qSteps.indexOf(step); }).length;
    var pct = Math.max(5, Math.round((s.index + 1) / STEPS.length * 100));

    var m = el('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">' +
      '<div class="modal-card">' +
        '<div class="modal-ring">' +
          '<svg viewBox="0 0 84 84" width="84" height="84">' +
            '<circle cx="42" cy="42" r="37" fill="none" stroke="rgba(235,225,211,.14)" stroke-width="7"/>' +
            '<circle cx="42" cy="42" r="37" fill="none" stroke="#3aae92" stroke-width="7" stroke-linecap="round"' +
              ' transform="rotate(-90 42 42)" stroke-dasharray="' + (2 * Math.PI * 37) + '"' +
              ' stroke-dashoffset="' + (2 * Math.PI * 37 * (1 - pct / 100)) + '"/>' +
          '</svg>' +
          '<b>' + pct + '<i>%</i></b>' +
        '</div>' +
        '<h2 id="mt">Você já começou</h2>' +
        '<p>Seu progresso está salvo' + (doneQ > 0 ? ', são <b>' + doneQ + '</b> respostas guardadas' : '') +
          '. Quer continuar de onde parou?</p>' +
        '<button class="btn" data-go="continuar">Continuar de onde parei</button>' +
        '<button class="linkbtn" data-go="reiniciar">Começar de novo</button>' +
      '</div></div>');

    m.querySelector('[data-go="continuar"]').addEventListener('click', function () {
      state.answers = s.answers || {};
      state.sent = !!s.sent;
      m.remove();
      document.body.classList.remove('blurred');
      go(s.index);
    });
    m.querySelector('[data-go="reiniciar"]').addEventListener('click', function () {
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      state.answers = {};
      state.sent = false;
      m.remove();
      document.body.classList.remove('blurred');
      go(-1);
    });

    document.body.appendChild(m);
    document.body.classList.add('blurred');
  }

  back.addEventListener('click', prev);
  renderIntro();
  if (saved && (saved.index >= 0 || saved.sent)) askResume(saved);
})();
