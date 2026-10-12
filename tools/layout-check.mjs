// Manual layout check (not run in CI). Usage: npm i -D playwright && npx playwright install webkit
// python3 -m http.server 8765 & node tools/layout-check.mjs after http://localhost:8765/   (screenshots -> /workspace/shots)
import { webkit, devices } from 'playwright';
const [,, tag, url] = process.argv;
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 15'], viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url);
await p.waitForSelector('#tabs button');
// simulate iPhone 15 safe areas (59px top / 34px bottom portrait)
await p.addStyleTag({ content: tag === 'before'
  ? '#pool-bar{padding-top:65px!important}main{padding-bottom:118px!important}nav{padding-bottom:40px!important}'
  : ':root{--sat:59px!important;--sab:34px!important}' });
// seed some progress so bars render
await p.evaluate(() => { const c = {}; ['E1A01','E5C10','E9H11','E0A12'].forEach(id => c[id] = { seen: 2, correct: 1, reps: 1, ef: 2.5, due: Date.now() + 9e7 }); localStorage.setItem('ecs-progress-v1', JSON.stringify({ app: 'extra-class-study', version: 1, cards: c, exams: [] })); });
const results = {};
for (const v of ['home', 'study', 'quiz', 'exam', 'progress']) {
  await p.reload(); await p.waitForSelector('#tabs button');
  await p.addStyleTag({ content: tag === 'before' ? '#pool-bar{padding-top:65px!important}main{padding-bottom:118px!important}nav{padding-bottom:40px!important}' : ':root{--sat:59px!important;--sab:34px!important}' });
  await p.click(`[data-view=${v}]`); await p.waitForTimeout(300);
  const m = async where => p.evaluate(where => {
    const sc = document.scrollingElement.scrollHeight > innerHeight + 1 && getComputedStyle(document.querySelector('main')).overflowY === 'visible' ? document.scrollingElement : document.querySelector('main');
    sc.scrollTop = where === 'top' ? 0 : sc.scrollHeight;
    const hb = document.querySelector('#pool-bar').getBoundingClientRect().bottom;
    const nt = document.querySelector('#tabs').getBoundingClientRect().top;
    const items = [...document.querySelectorAll('main > *, main .card > *, main .grid > *')].filter(e => e.getBoundingClientRect().height > 0);
    const first = document.querySelector('main > *').getBoundingClientRect();
    const last = items.reduce((a, e) => e.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? e : a).getBoundingClientRect();
    return { scroller: sc.tagName, headerBottom: Math.round(hb), navTop: Math.round(nt), firstTop: Math.round(first.top), lastBottom: Math.round(last.bottom), firstVisible: first.top >= hb - 0.5, lastVisible: last.bottom <= nt + 0.5 };
  }, where);
  const top = await m('top'); await p.waitForTimeout(100);
  if (v === 'progress') await p.screenshot({ path: `/workspace/shots/${tag}-progress-top.png` });
  const bot = await m('bottom'); await p.waitForTimeout(100);
  if (v === 'progress') await p.screenshot({ path: `/workspace/shots/${tag}-progress-bottom.png` });
  results[v] = { top: top.firstVisible, bottom: bot.lastVisible, detail: { top, bot } };
}
console.log(JSON.stringify(results, null, 1), errs);
await b.close();
