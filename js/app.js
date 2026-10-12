import * as C from './core.js';
import { POOL_FILE } from './config.js';

const KEY = 'ecs-progress-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let pool, state, examState = null;

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (C.validateProgress(s)) return s; } catch {}
  return { app: 'extra-class-study', version: 1, cards: {}, exams: [], poolId: null };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

function poolBar() {
  const st = C.poolStatus(pool);
  const bar = $('#pool-bar');
  bar.className = st.state;
  const fmt = d => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const range = `${fmt(st.from)} – ${fmt(st.until)}`;
  const msg = {
    valid: `Valid ${range} · <strong>${st.daysLeft} days left</strong>`,
    expiring: `⚠️ <strong>Pool expires in ${st.daysLeft} days</strong> (${fmt(st.until)}). Test before then or study the new pool.`,
    expired: `⛔ <strong>This pool EXPIRED ${fmt(st.until)}.</strong> Exams now use a newer pool — do not rely on these questions.`,
    future: `This pool takes effect ${fmt(st.from)} (valid ${range}).`,
  }[st.state];
  bar.innerHTML = `<div>${esc(pool.name)} pool</div><div>${msg}</div>`;
}

function figures(q) {
  return q.figures.map(f => `<figure><img src="figures/${esc(f)}.svg" alt="Figure ${esc(f)}" loading="lazy"><figcaption class="small muted">Figure ${esc(f)}</figcaption></figure>`).join('');
}
const groupTitle = id => pool.groups.find(g => g.id === id)?.title || '';

function record(q, correct, confident = true) {
  state.cards[q.id] = C.sm2(state.cards[q.id], C.gradeToQuality(correct, confident));
  save();
}

function filterSelect(cur) {
  const opts = pool.subelements.map(s => `<optgroup label="${s.id} ${esc(s.title)}"><option value="${s.id}" ${cur === s.id ? 'selected' : ''}>${s.id} — all groups</option>${pool.groups.filter(g => g.subelement === s.id).map(g => `<option value="${g.id}" ${cur === g.id ? 'selected' : ''}>${g.id} ${esc(g.title.slice(0, 50))}</option>`).join('')}</optgroup>`).join('');
  return `<select id="filter" aria-label="Topic"><option value="">Adaptive: all topics</option>${opts}</select>`;
}

const views = {
  home() {
    const r = C.readiness(pool, state.cards);
    const seen = Object.keys(state.cards).filter(id => pool.questions.some(q => q.id === id)).length;
    const due = pool.questions.filter(q => state.cards[q.id]?.due <= Date.now()).length;
    return `<h1>Extra Class Study</h1>
    <div class="card"><h2>Readiness</h2><div class="big">${r.percent}%</div>
      <div class="bar"><i style="width:${r.percent}%"></i></div>
      <p class="small muted">Estimated exam score ≈ ${r.expected}/50 (pass is ${pool.passScore}). ${r.likelyPass ? '<span class="pass">Looking ready — confirm with practice exams.</span>' : 'Keep studying your weak areas.'}</p></div>
    <div class="card"><p>${seen}/${pool.questions.length} questions seen · ${due} due for review</p>
      <button class="btn primary" data-go="study">Continue adaptive study</button>
      <button class="btn" data-go="quiz">Flashcards</button>
      <button class="btn" data-go="exam">Practice exam (50 Q)</button></div>
    <p class="small muted">Source: ${esc(pool.source.publisher)}, ${esc(pool.source.document)}. ${pool.withdrawn.length} withdrawn questions excluded (${pool.withdrawn.join(', ')}).</p>`;
  },
  study(filter = sessionStorage.getItem('filter') || '') {
    const q = C.nextQuestion(pool, state.cards, { filter: filter || null });
    if (!q) return `<p>No questions.</p>`;
    const c = state.cards[q.id];
    const order = C.shuffle([0, 1, 2, 3]);
    setTimeout(() => {
      $('#filter').onchange = e => { sessionStorage.setItem('filter', e.target.value); render('study'); };
      document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = +b.dataset.a, ok = a === q.correct;
        document.querySelectorAll('[data-a]').forEach(x => { x.disabled = true; if (+x.dataset.a === q.correct) x.classList.add('correct'); });
        if (!ok) b.classList.add('wrong');
        record(q, ok);
        $('#after').innerHTML = `<p class="${ok ? 'pass' : 'fail'}"><strong>${ok ? 'Correct' : 'Incorrect'}</strong> — answer ${'ABCD'[q.correct]}.</p>
          ${q.explanation ? `<p>${esc(q.explanation)}</p>` : ''}${q.refs ? `<p class="small muted">Reference: 47 CFR §${esc(q.refs)}</p>` : ''}
          <p class="small muted">Next review: ${ok ? new Date(state.cards[q.id].due).toLocaleDateString() : 'in 10 minutes'}</p>
          <button class="btn primary" id="next">Next question</button>`;
        $('#next').onclick = () => render('study');
        $('#next').focus();
      });
    });
    return `${filterSelect(filter)}
      <div class="card"><div class="small muted"><span class="qid">${q.id}</span> · ${esc(groupTitle(q.group))}${c?.seen ? ` · seen ${c.seen}×` : ' · new'}</div>
      <p>${esc(q.question)}</p>${figures(q)}
      ${order.map((a, i) => `<button class="btn" data-a="${a}">${'ABCD'[i]}. ${esc(q.answers[a])}</button>`).join('')}
      <div id="after"></div></div>`;
  },
  quiz() {
    const filter = sessionStorage.getItem('filter') || '';
    const q = C.nextQuestion(pool, state.cards, { filter: filter || null });
    setTimeout(() => {
      $('#filter').onchange = e => { sessionStorage.setItem('filter', e.target.value); render('quiz'); };
      $('#reveal').onclick = () => {
        $('#back').hidden = false; $('#reveal').hidden = true;
      };
      document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
        state.cards[q.id] = C.sm2(state.cards[q.id], +b.dataset.g); save(); render('quiz');
      });
    });
    return `${filterSelect(filter)}<div class="card"><div class="small muted"><span class="qid">${q.id}</span> · flashcard</div>
      <p>${esc(q.question)}</p>${figures(q)}
      <button class="btn primary" id="reveal">Show answer</button>
      <div id="back" hidden><p><strong>${'ABCD'[q.correct]}. ${esc(q.answers[q.correct])}</strong></p>
      <p class="small muted">How well did you know it?</p>
      <div class="row"><button class="btn" data-g="1">Again</button><button class="btn" data-g="3">Hard</button><button class="btn" data-g="4">Good</button><button class="btn" data-g="5">Easy</button></div></div></div>`;
  },
  exam() {
    if (!examState) {
      setTimeout(() => $('#start').onclick = () => {
        examState = { qs: C.generateExam(pool), answers: [], i: 0, started: Date.now() }; render('exam');
      });
      return `<h1>Practice exam</h1><div class="card"><p>50 questions drawn one per group, matching the official Element 4 distribution. Passing is ${pool.passScore} correct (74%). No feedback until the end, like the real exam.</p>
        <button class="btn primary" id="start">Start exam</button></div>
        ${state.exams.slice(-5).reverse().map(e => `<p class="small">${new Date(e.at).toLocaleString()}: <span class="${e.passed ? 'pass' : 'fail'}">${e.correct}/50 ${e.passed ? 'PASS' : 'FAIL'}</span></p>`).join('')}`;
    }
    const ex = examState;
    if (ex.i >= ex.qs.length) {
      const r = C.scoreExam(ex.qs, ex.answers, pool.passScore);
      ex.qs.forEach((q, i) => record(q, ex.answers[i] === q.correct));
      state.exams.push({ at: Date.now(), correct: r.correct, passed: r.passed }); save();
      const missed = ex.qs.map((q, i) => [q, ex.answers[i]]).filter(([q, a]) => a !== q.correct);
      examState = null;
      return `<h1 class="${r.passed ? 'pass' : 'fail'}">${r.correct}/50 — ${r.passed ? 'PASS' : 'FAIL'}</h1>
        <div class="card"><h2>Missed (${missed.length})</h2>${missed.map(([q, a]) => `<p class="small"><span class="qid">${q.id}</span> ${esc(q.question)}<br>✔ ${esc(q.answers[q.correct])}${a != null ? `<br><span class="fail">✘ ${esc(q.answers[a])}</span>` : ''}</p>`).join('') || '<p>None!</p>'}</div>
        <button class="btn primary" data-go="exam">Done</button>`;
    }
    const q = ex.qs[ex.i];
    setTimeout(() => {
      document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { ex.answers[ex.i] = +b.dataset.a; ex.i++; render('exam'); });
      $('#quit').onclick = () => { if (confirm('Abandon this exam?')) { examState = null; render('exam'); } };
    });
    return `<div class="small muted">Question ${ex.i + 1} of 50 · <button class="btn" style="display:inline;width:auto;min-height:0;padding:2px 8px;margin:0" id="quit">Quit</button></div>
      <div class="bar"><i style="width:${ex.i * 2}%"></i></div>
      <div class="card"><p><span class="qid">${q.id}</span> ${esc(q.question)}</p>${figures(q)}
      ${q.answers.map((t, a) => `<button class="btn" data-a="${a}">${'ABCD'[a]}. ${esc(t)}</button>`).join('')}</div>`;
  },
  progress() {
    const m = C.allMastery(pool, state.cards);
    setTimeout(() => {
      $('#export').onclick = () => {
        const blob = new Blob([JSON.stringify({ ...state, poolId: pool.poolId, exportedAt: new Date().toISOString() }, null, 1)], { type: 'application/json' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `extra-study-progress-${new Date().toISOString().slice(0, 10)}.json` });
        a.click(); URL.revokeObjectURL(a.href);
      };
      $('#import').onchange = async e => {
        try {
          const d = JSON.parse(await e.target.files[0].text());
          if (!C.validateProgress(d)) throw new Error('Not a progress file');
          if (confirm('Replace current progress with imported file?')) { state = { exams: [], ...d }; save(); render('progress'); }
        } catch (err) { alert('Import failed: ' + err.message); }
      };
      $('#reset').onclick = () => { if (confirm('Erase all progress?')) { localStorage.removeItem(KEY); state = load(); render('progress'); } };
    });
    return `<h1>Progress</h1>
      ${pool.subelements.map(s => `<div class="card"><h2>${s.id} ${esc(s.title)} <span class="small muted">(${s.examQuestions} on exam)</span></h2>
        <div class="grid">${pool.groups.filter(g => g.subelement === s.id).map(g => `<span class="qid">${g.id}</span><div class="bar" title="${esc(g.title)}"><i style="width:${Math.round(m.groups[g.id] * 100)}%"></i></div><span class="small">${Math.round(m.groups[g.id] * 100)}%</span>`).join('')}</div></div>`).join('')}
      <div class="card"><h2>Backup</h2><p class="small muted">Progress is stored only on this device.</p>
        <button class="btn primary" id="export">Export progress</button>
        <label class="small">Import progress file <input type="file" id="import" accept="application/json,.json"></label>
        <button class="btn" id="reset">Reset progress</button></div>`;
  },
};

function render(name) {
  location.hash = name;
  $('#view').innerHTML = views[name]();
  poolBar();
  document.querySelectorAll('#tabs button').forEach(b => b.dataset.view === name ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-view],[data-go]');
  if (!t) return;
  if (examState && examState.i < 50 && (t.dataset.view || t.dataset.go) !== 'exam' && !confirm('Leave the exam in progress?')) return;
  if ((t.dataset.view || t.dataset.go) !== 'exam') examState = null;
  render(t.dataset.view || t.dataset.go);
});

(async () => {
  pool = await (await fetch(POOL_FILE)).json();
  state = load();
  state.poolId = pool.poolId;
  const h = location.hash.slice(1);
  render(views[h] ? h : 'home');
  setInterval(poolBar, 3600000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
