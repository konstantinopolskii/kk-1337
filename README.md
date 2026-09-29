# kk-1337

Skills that make Claude and Codex work the way KK (Konstantin Konstantinopolskii) does on anything a person will see, read, decide or act on: a screen, a flow, a page, a message, a CV, a deck.

Every decision answers one question: what must this person, at this moment, perceive and do, and what is the least that delivers it, with the most force, in a form that is only this product's?

| Skill | What it covers |
| --- | --- |
| **kk-1337** | The way of thinking, what is known about how people see, think and act, and how the work goes |
| **kk-shaping** | Understanding a task before drawing it: where it breaks, what it is worth, the answers |
| **kk-interface** | Everything the hand does: controls, states, errors, undo, navigation |
| **kk-typography** | Everything with words: what the text says, how it is set, where it sits |
| **kk-look** | The look: the soul, contrasts, colour, type, pictures and icons |
| **kk-motion** | Everything that moves, and how to measure it |

## Install

**Claude Code**

```
claude plugin marketplace add konstantinopolskii/kk-1337
claude plugin install kk-1337@kk-1337
```

Start a new session, and the skills are there. For updates, turn on auto-update in `/plugin` → Marketplaces, or run `claude plugin marketplace update kk-1337` and then `claude plugin update kk-1337@kk-1337`.

**Codex**

```
git clone https://github.com/konstantinopolskii/kk-1337.git ~/kk-1337
mkdir -p ~/.codex/skills && cp -R ~/kk-1337/skills/* ~/.codex/skills/
```

For updates, run `git -C ~/kk-1337 pull` and copy again.

**Claude app (claude.ai and desktop)**

Zip each folder in `skills/` on its own, with the folder at the root of the zip, and upload it in Customize → Skills → + → Create skill. It needs a Pro, Max, Team or Enterprise plan with code execution on.

## How to use it

Ask in plain words. The skills pick themselves up when a task has something people will see or read. To call one directly, type `/kk-1337:kk-1337` in Claude Code or `$kk-1337` in Codex.

What happens next:

- **It asks first.** One short message: how it reads your task, marked as assumptions, and up to five questions. Answer or correct it, and the work starts.
- **A review comes back as a page you answer in.** Select any words on it to comment, then press Copy and paste the comments back into the chat. Each finding shows the fix: in full detail when that is quick, as a bold marker sketch when it is real work.
- **A product or a flow is built in three steps:** bold marker sketches of whole flows, then high-fidelity shots of the two or three hardest moments, then the build.
- **A simple task goes straight to the result:** a page, a document, a small change, or content for a platform, where the platform's sizes, crops and rules are part of the brief.
- **Your calls stay yours.** Where there are real options, it shows them with its pick and builds none until you answer.

Things to ask:

- "Review the sign-up on https://…"
- "Make my CV in Google Docs"
- "Design a Reels cover for this video"
- "Sketch the onboarding flow for our app"
- "Rewrite this email so it's clear at a glance"

## Make it yours

Write what you like and how you work in `~/.kk-1337/me.md`: products and pages you think are good and why, what you never want to see, how you like to review. The skills read it first and follow it over their defaults, and after a round of your comments they offer to add what you taught them.

## Rendering checks

`skills/kk-1337/scripts/snap.cjs` renders a page the way people see it (a desktop and an iPhone, then blurred and in grey for the hierarchy) and audits its sizes, colours, targets and contrast; `--motion` measures how things move. The checks need Node.js and Playwright:

```
npm install -g playwright
npx playwright install chromium
```

Everything else works without them.

## Where it comes from

About 340 of KK's comments on agents' design work, from June to September 2026, distilled into principles, together with the Bureau Gorbunov's school of design, Maxim Ilyakhov's information style, Lyudmila Sarycheva's editing, Feynman's plain explaining, Ryan Singer's Shape Up, Ilya Birman's and Emil Kowalski's work on motion, and the research on perception and behaviour cited in each skill.

## License

MIT, © 2026 Konstantin Konstantinopolskii. Use it and change it; keep the notice.
