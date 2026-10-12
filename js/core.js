// Pure logic: no DOM. Shared by app and unit tests.
export const DAY = 86400000;

/** SM-2 update. quality 0-5. Returns new card state. */
export function sm2(card, quality, now = Date.now()) {
  const c = { ef: 2.5, reps: 0, interval: 0, due: 0, seen: 0, correct: 0, lapses: 0, ...card };
  c.seen++;
  if (quality >= 3) {
    c.correct++;
    c.reps++;
    c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 6 : Math.round(c.interval * c.ef);
  } else {
    c.reps = 0; c.interval = 0; c.lapses++;
  }
  c.ef = Math.max(1.3, c.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  // failed cards come back in 10 minutes
  c.due = quality >= 3 ? now + c.interval * DAY : now + 10 * 60000;
  c.last = now;
  return c;
}

/** Map a quiz result to SM-2 quality. */
export function gradeToQuality(correct, confident = true) {
  return correct ? (confident ? 5 : 3) : 1;
}

/** Group mastery 0..1: smoothed accuracy * coverage. */
export function groupMastery(pool, cards, groupId) {
  const qs = pool.questions.filter(q => q.group === groupId);
  if (!qs.length) return 0;
  let acc = 0, cov = 0;
  for (const q of qs) {
    const c = cards[q.id];
    if (!c || !c.seen) continue;
    cov++;
    const recency = c.reps > 0 ? Math.min(1, 0.6 + c.reps * 0.1) : 0.3;
    acc += ((c.correct + 1) / (c.seen + 2)) * recency;
  }
  return cov ? (acc / cov) * (cov / qs.length) : 0;
}

export function allMastery(pool, cards) {
  const g = {};
  for (const grp of pool.groups) g[grp.id] = groupMastery(pool, cards, grp.id);
  const s = {};
  for (const sub of pool.subelements) {
    const ids = pool.groups.filter(x => x.subelement === sub.id).map(x => g[x.id]);
    s[sub.id] = ids.reduce((a, b) => a + b, 0) / (ids.length || 1);
  }
  return { groups: g, subelements: s };
}

/** Pick next question: due reviews first, else weighted by group weakness, new questions mixed in. */
export function nextQuestion(pool, cards, { now = Date.now(), rng = Math.random, filter = null, exclude = [] } = {}) {
  let qs = pool.questions.filter(q => !exclude.includes(q.id));
  if (filter) qs = qs.filter(q => q.group.startsWith(filter));
  if (!qs.length) return null;
  const due = qs.filter(q => cards[q.id]?.seen && cards[q.id].due <= now)
    .sort((a, b) => cards[a.id].due - cards[b.id].due);
  if (due.length) return due[0];
  const m = allMastery(pool, cards).groups;
  const weights = qs.map(q => {
    const c = cards[q.id];
    const weak = 1.2 - (m[q.group] ?? 0);           // weaker group => higher weight
    const fresh = !c || !c.seen ? 1.5 : 0.25 / (1 + (c.reps || 0)); // prefer unseen over not-yet-due
    return Math.max(0.001, weak * fresh);
  });
  return weightedPick(qs, weights, rng);
}

export function weightedPick(items, weights, rng = Math.random) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/** Practice exam: one question from each group (50 groups => 50 questions), per NCVEC distribution. */
export function generateExam(pool, rng = Math.random) {
  const exam = [];
  for (const g of pool.groups) {
    const qs = pool.questions.filter(q => q.group === g.id);
    if (qs.length) exam.push(qs[Math.floor(rng() * qs.length)]);
  }
  return exam;
}

export function scoreExam(exam, answers, passScore = 37) {
  const correct = exam.filter((q, i) => answers[i] === q.correct).length;
  return { correct, total: exam.length, passed: correct >= passScore };
}

/** Readiness 0..100: expected exam score from per-group mastery vs pass mark. */
export function readiness(pool, cards) {
  const { groups } = allMastery(pool, cards);
  const expected = pool.groups.reduce((a, g) => a + 0.25 + 0.75 * (groups[g.id] || 0), 0); // 25% guess floor
  return { expected: Math.round(expected * 10) / 10, percent: Math.round(Math.min(1, expected / pool.examSize) * 100), likelyPass: expected >= pool.passScore + 2 };
}

/** Pool validity status. */
export function poolStatus(pool, now = new Date()) {
  const from = new Date(pool.validFrom + 'T00:00:00');
  const until = new Date(pool.validUntil + 'T23:59:59');
  const daysLeft = Math.ceil((until - now) / DAY);
  let state = 'valid';
  if (now < from) state = 'future';
  else if (now > until) state = 'expired';
  else if (daysLeft <= 180) state = 'expiring';
  return { state, daysLeft, from, until };
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function validateProgress(obj) {
  return obj && typeof obj === 'object' && obj.app === 'extra-class-study' && typeof obj.cards === 'object';
}
