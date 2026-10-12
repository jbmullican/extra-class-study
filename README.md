# Extra Class Study

An adaptive study and quiz web app (installable PWA) for the **US Amateur Radio Extra Class — Element 4** exam.

> ## 📅 Question pool validity
> **This app uses the 2024–2028 Extra Class pool, valid July 1, 2024 through June 30, 2028.**
> Exams given on or after **July 1, 2028** use a new pool. The app shows the validity dates and a countdown on every screen, a warning banner starting 180 days before expiry, and a clear **EXPIRED** state after June 30, 2028.

**Use it:** https://jbmullican.github.io/extra-class-study/ — on iPhone, open in Safari → Share → *Add to Home Screen*. Works offline after the first load.

## Features
- **Adaptive study** — SM-2 spaced repetition per question, plus mastery tracking for every subelement and group. Due reviews come first; otherwise selection is weighted toward your weakest groups and unseen questions.
- **Flashcards** — self-grade *Again / Hard / Good / Easy* (SM-2 quality 1/3/4/5).
- **Practice exam** — 50 questions, one from each of the 50 groups (the official NCVEC distribution, e.g. 6 from E1, 8 from E7, 1 from E0). Passing is 37 correct. Results feed the scheduler.
- **Readiness score** — estimated exam score from your group mastery (with a 25% guessing floor).
- **Topic filter** — drill one subelement or group.
- **Progress** stays on your device (localStorage) with JSON export/import.
- Mobile-first, tuned for the iPhone 15 (393×852 pt viewport, safe-area insets), automatic dark mode.

## How adaptive learning works
1. Each answer updates the question's SM-2 card (ease factor ≥ 1.3; intervals 1 day → 6 days → interval × ease). Misses reset the card and bring it back in 10 minutes.
2. Group mastery = smoothed accuracy × recency × coverage of that group's questions.
3. Next question: the most overdue review; if nothing is due, a weighted random pick where weight = (1.2 − group mastery) × (1.5 for unseen, smaller for already-learned).

## Question pool data
- Source: **NCVEC Question Pool Committee**, *2024-2028 Extra Class Question Pool and Syllabus Public Release with 4th Errata (Feb 4, 2026)*, <https://www.ncvec.org/index.php/2024-2028-extra-class-question-pool-release>. Question pools are public domain.
- Figures E5-1, E6-1, E6-2, E6-3, E7-1, E7-2, E7-3, E9-1, E9-2 and E9-3 come from NCVEC's official SVG set (`e4_2024-svgs.zip`). They were checked against the current figure PDF (`Extra_Figures_2024-2028-1.pdf`, revised Jan 30, 2024), and E9-3 is the corrected horizontal Smith chart. Tap any figure in the app to zoom.
- Errata applied (all four NCVEC notices):
  - **Jan 31, 2024:** E9-3 Smith chart rotated to horizontal (∞ on the right); **E9E10** withdrawn; wording fixes to E1D07, E1F03 (answer D), E4D12 and E4D13 (100 W → 10 W), E6A06 (answer B); citations corrected for E1E10 [97.509(m)] and E1E11 [97.509(i)].
  - **Nov 8, 2024:** **E2A13** withdrawn.
  - **Sep 25, 2025:** **E6D07** withdrawn.
  - **Feb 4, 2026:** **E4D05** withdrawn.
- **599 active questions** (4 withdrawn; sections were not renumbered).
- Data file: `data/pool-extra-2024-2028.json`. To regenerate it, run `python3 tools/parse_pool.py pool.txt` (text extracted from the NCVEC .docx) and then `python3 tools/merge_explanations.py`.

### Explanations
Every question has a short explanation, shown after you answer in study mode, on the back of each flashcard, and in the practice-exam review. The explanations are **unofficial study aids written for this project**, not part of the NCVEC pool. They cite 47 CFR Part 97 where a rule applies (checked against eCFR, Oct 2026) and show a worked calculation for math questions. Entries marked ⚠️ (`explanationConfidence: "low"`) have a note in `explanationNote` explaining what still needs review. The source text is in `tools/explanations/*.py`. Corrections are welcome by pull request.

### Switching to the next pool (2028–2032)
Add `data/pool-extra-2028-2032.json` in the same schema (`validFrom`, `validUntil`, `subelements`, `groups`, `questions`), point `js/config.js` at it, and bump `VERSION` in `sw.js`. Progress is stored by question ID.

## Development
No build step and no runtime dependencies.
```sh
npm test                    # unit tests (node:test) for scheduler, exam generator, pool data
python3 -m http.server      # then open http://localhost:8000
```
GitHub Actions runs the tests on every PR and deploys `main` to GitHub Pages.

## License
GPL-3.0-or-later. See [LICENSE](LICENSE). Question pool text is public domain (NCVEC).
