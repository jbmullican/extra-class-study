import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../js/core.js';
const pool = JSON.parse(readFileSync(new URL('../data/pool-extra-2024-2028.json', import.meta.url)));
const seeded = (s = 42) => () => (s = (s * 16807) % 2147483647) / 2147483647;

test('pool integrity', () => {
  assert.equal(pool.questions.length, 599);
  assert.equal(pool.groups.length, 50);
  for (const q of pool.questions) { assert.equal(q.answers.length, 4); assert.ok(q.correct >= 0 && q.correct < 4); }
  for (const id of pool.withdrawn) assert.ok(!pool.questions.find(q => q.id === id));
  assert.equal(pool.subelements.reduce((a, s) => a + s.examQuestions, 0), 50);
});
test('sm2 correct progression', () => {
  let c = C.sm2({}, 5, 0); assert.equal(c.interval, 1); assert.equal(c.due, C.DAY);
  c = C.sm2(c, 5, 0); assert.equal(c.interval, 6);
  const ef = c.ef; c = C.sm2(c, 5, 0); assert.equal(c.interval, Math.round(6 * ef));
});
test('sm2 lapse resets and floors EF', () => {
  let c = { ef: 1.35, reps: 4, interval: 30 };
  c = C.sm2(c, 1, 1000); assert.equal(c.reps, 0); assert.equal(c.interval, 0); assert.equal(c.ef, 1.3);
  assert.equal(c.due, 1000 + 600000); assert.equal(c.lapses, 1);
});
test('due cards come first', () => {
  const cards = { E5A01: { seen: 1, due: 5, reps: 1, correct: 1 } };
  assert.equal(C.nextQuestion(pool, cards, { now: 10 }).id, 'E5A01');
});
test('weak areas weighted higher', () => {
  const cards = {};
  for (const q of pool.questions) if (q.subelement !== 'E9') cards[q.id] = { seen: 5, correct: 5, reps: 3, due: 1e15 };
    else cards[q.id] = { seen: 5, correct: 0, reps: 0, due: 1e15 };
  const rng = seeded(); let e9 = 0;
  for (let i = 0; i < 500; i++) if (C.nextQuestion(pool, cards, { now: 0, rng }).subelement === 'E9') e9++;
  assert.ok(e9 / 500 > 0.4, `E9 share ${e9 / 500}`); // E9 is ~16% of pool
});
test('exam: 50 questions, one per group, matches subelement distribution', () => {
  const ex = C.generateExam(pool, seeded(7));
  assert.equal(ex.length, 50);
  assert.equal(new Set(ex.map(q => q.group)).size, 50);
  for (const s of pool.subelements) assert.equal(ex.filter(q => q.subelement === s.id).length, s.examQuestions);
});
test('exam scoring pass at 37', () => {
  const ex = C.generateExam(pool, seeded(3));
  const ans = ex.map((q, i) => (i < 37 ? q.correct : (q.correct + 1) % 4));
  assert.deepEqual(C.scoreExam(ex, ans), { correct: 37, total: 50, passed: true });
  ans[0] = (ans[0] + 1) % 4; assert.equal(C.scoreExam(ex, ans).passed, false);
});
test('pool status states', () => {
  assert.equal(C.poolStatus(pool, new Date('2026-10-12')).state, 'valid');
  assert.equal(C.poolStatus(pool, new Date('2028-03-01')).state, 'expiring');
  assert.equal(C.poolStatus(pool, new Date('2028-07-01T12:00')).state, 'expired');
  assert.equal(C.poolStatus(pool, new Date('2024-01-01')).state, 'future');
});
test('readiness grows with mastery', () => {
  const r0 = C.readiness(pool, {}); assert.equal(r0.expected, 12.5);
  const all = {}; for (const q of pool.questions) all[q.id] = { seen: 10, correct: 10, reps: 5 };
  assert.ok(C.readiness(pool, all).likelyPass);
});
