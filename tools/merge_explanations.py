"""Merge hand-written explanations (tools/explanations/*.py: dict E = {id: text}, F = {id: note})
into the pool JSON. Flagged entries get explanationConfidence = "low" and an explanationNote."""
import glob, json, runpy, sys
POOL = sys.argv[1] if len(sys.argv) > 1 else 'data/pool-extra-2024-2028.json'
E, F = {}, {}
for f in sorted(glob.glob('tools/explanations/*.py')):
    d = runpy.run_path(f); E.update(d['E']); F.update(d['F'])
pool = json.load(open(POOL, encoding='utf-8'))
ids = {q['id'] for q in pool['questions']}
assert ids == set(E), (sorted(ids - set(E)), sorted(set(E) - ids))
for q in pool['questions']:
    q['explanation'] = E[q['id']]
    q.pop('explanationConfidence', None); q.pop('explanationNote', None)
    if q['id'] in F:
        q['explanationConfidence'] = 'low'; q['explanationNote'] = F[q['id']]
pool['explanations'] = {'author': 'extra-class-study contributors', 'license': 'GPL-3.0-or-later',
    'note': 'Explanations are unofficial study aids, not part of the NCVEC pool. Rule citations checked against eCFR 47 CFR Part 97 (2026-10-06). Entries with explanationConfidence "low" need review.',
    'count': len(E), 'flagged': sorted(F)}
json.dump(pool, open(POOL, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(E), 'explanations,', len(F), 'flagged:', ', '.join(sorted(F)))
