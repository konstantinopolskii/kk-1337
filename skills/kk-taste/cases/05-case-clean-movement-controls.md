---
source: https://claude.ai/artifact/1nhafNNnn5QSYih5MwMbhb ("Clean Movement Controls", KK's artifact; sent as an example of recent UI work)
title: "Clean Movement Controls — the movement panel of the DSL2 editor"
author: KK + Claude (iterations with KK's comments)
date: 2026-09
collection: KK's process — cases
tags: [iterations, cleanness, table, proximity, alignment, one width, data for priorities, domain units, quasimode]
---

# Clean Movement Controls — how KK brings an interface to "clean"

**Question/task.** The movement settings panel (animations of cards between scenes) in the DSL2 editor: a 407 px column next to the stage where the animation plays. The original panel is overloaded and illogical. A person needs to see which movements the scene has and to change quickly what gets changed most often.

**Gist.** Six attempts before the approved version. Each of KK's remarks rests on a specific principle of perception. The page states the outcome as "what clean means" for this panel: no arrows; a table where nothing jumps; labels touch their values; the timeline, the curves and the values share one width; no boxes around values; three kinds of rows; three colours with meaning; helpers only at the moment of action. These are the answers for a dense tool used daily, where every row opens in place; the principles carry over, the answers may not (references/anti-defaults.md). The order and accessibility of the settings were derived from data: which settings were changed most often in the repository's history.

## How the iterations went (KK's remarks verbatim)

1. **The editor today.** "I don't understand why we have so much settings on the SCENE level in the movement, it seems as something that should live inside on the beats level, no? Plus I don't understand why you have sometimes 2 more 1 more knobs, why? No sense at all."
   - Settings sit far from the motion they drive.
   - One value has two homes (a knob and a row field), and they fight.
   - "N more knobs" folds by where a value is stored, not by what it means.
   - Knobs that change no frame look live; numbers have no units.
   
   The picture: a dark column with the fields "enter from 2163,7", "land −200", "duration ms 1000", "ease bounce.out", technical ids ("seq.nc-leads-zero.88c84e", "fly-across-cut@1"), and below them a list of five movements ("card-demos arrives", "card-sales arrives", "card-demos slides over", "card-leads slides in", "card-sales slides over").
2. **Mockup v1.** "Much better. But still not enough simple and intuitive. … you need to read a lot in order to understand at least something."
   - Too much text to read: the picture has a long block of rules ("A move is one gesture…", eight points) and a legend of symbols.
   - Navigation inside the cards was overcomplicated.
3. **Mockup v2.** "We don't need to duplicate the entire animation inside, we have it on the screen on the left. The back button is weird and it breaks our logic. … You can have a sparkline, but you draft a whole control center. For what?"
   - It repeated the animation inside the panel, although the stage is already visible on the left. A duplicate is noise.
   - Pages with a back button instead of opening in place.
   - A whole page to change a 0.2 s length; three taps to reach a setting.
   - Seconds on the ruler, though time is beats underneath.
   
   The picture: four levels, "Scene → Thing → Gesture → Setting", with breadcrumbs, coloured lanes, a large preview, "Discard / Save".
4. **Draft v3.** "It's much closer. But now you need to make it clean. Right now it's not clean."
   - Thumbnails with coloured borders and ← arrows.
   - A different colour per object, curves in three colours.
   - A strip of seven curve buttons on every open movement; checkboxes.
   - A ruler row of its own; the rows "Parts 3" and "All settings 8" with counts.
5. **Iteration 1** ("Closed" / "Open: what you change" / "More: everything else"). "What is this?" · "→ near − is a very bad thing" · "What is on the right, 1 2 3?" · "Why it's hidden under more? If that's a card?" · "Is it a movement?" · "Is it a morph or what?" · "Didn't I show one Bounce line with two columns?" · "Show the objects iconically, without arrows and borders."
   - A featureless thin bar; an arrow next to a minus sign.
   - Unexplained beat numbers; objects hidden under More.
   - Rows that did not say what they are; an unnamed morph.
   - Related values on separate rows; no object pictures.
6. **Iteration 2.** "Didn't I ask not to use arrows?" · "Right-align the labels, so they connect to the fields." · "Weird square after 0." · "Previews aligned as a table, so the headlines don't jump." · "Curve isn't aligned by the width with the fields." · "The dark grey background on fields made the design much worse."
   - Chevrons are arrows too.
   - Labels far from their values.
   - A diamond marker reading as a stray square.
   - Pictures of different widths pushed names around; curves and fields of different widths; grey boxes.
7. **Approved (iteration 3).** A table with no arrows and no boxes. The object pictures sit in one column, right-aligned against their names; the names start on one line. The setting labels are right-aligned and sit right up against their values. The timeline, the curves and the values share the same two edges. A pair of values reads like time: start on the left, end on the right. The scene headline is large (18 px), with "3 beats" on the right. A morph that happens at once is a thin tick at the start of the timeline. While you drag the end of a bar, the beat lines, the end handle and the hint "2 beats" appear.

## "What clean means" for this panel (the page's own list)
The decisions for this panel. The principle behind each, and when the decision flips, are in references/anti-defaults.md ("Panel and settings: a worked case").
- **No arrows.** A row opens when you click it. Nothing points anywhere.
- **A table.** Pictures right-aligned against their names; every name starts on one line. Nothing jumps from row to row.
- **Labels touch their values.** Setting labels are right-aligned, next to the value they name.
- **One width.** The timeline, the curves and the values share the same two edges.
- **No boxes.** Values are plain text. Start on the left, end on the right, like time.
- **Three kinds of rows.** A curve on the timeline is a movement. A picture is an object. A grey label is a setting.
- **Three colours.** White is what you change. Grey is labels and defaults. Yellow is not saved.
- **Helpers when you act.** Beat lines, the end handle and the length appear while you drag.

## The research the decisions rested on
- **Data on how often settings change.** From the repository's history: 29 commits changed movement settings. Length: 24 commits, Motion speed: 17, Position: 17, Feel: 16, Start: 15, Wait: 11, Fade: 7, Size: 6, Bounce: 4, Words: 1. This sets the accessibility: the most frequent sits right on the bar, with no clicks; the next takes one click (open the movement); the rare ones take one more click, on an object. (Translator's note: in the chart, the bar holds Length, Motion speed and Start; one click opens Position and Feel; Wait, Fade, Size, Bounce and Words sit on an object.) The grey number next to each is how many values changed; counting commits is fairer, because bulk renames inflate the values.
- **The domain's units.** The grid under everything is the beat (an atom = ⅛ of a beat, 50 ms at 150 BPM). 20 of 31 scenes start between beats; 0 of 26 motion lengths are a whole number of beats (they are stored in ms); 12 of 26 are not even on the ⅛-beat grid (682.5 ms). (Translator's note: the Russian note said «0 из 26 длительностей движения не равны целому числу битов», which reverses the source; the source says 0 of 26 are a whole number of beats.) The conclusion: show lengths in beats, and while dragging, show the song's real beats.
- **Competitors: Pixelmator.** One list; an item opens right where it is, and the others stay in view; no pages and no back button. The main controls show, the rest stay hidden until you ask; each has its own on/off and reset. The picture lives on the canvas and is never repeated in the panel.
- **Questions to decide, with a recommendation.** Q1 "Is this the clean you mean?": yes, implement it. Q2 "Dragging a bar's end: squeeze the motion, or cut it off?": the recommendation is to squeeze. Q3 "Older cards: one row for both, as one setting of the move?": the recommendation is yes.
- **The earlier attempts are kept**, "so future agents learn from them".

## The principles behind the remarks
- A setting lives next to what it controls. A value has one home. Grouping goes by meaning, not by where the value is stored (informativeness, coordination of structure).
- Do not repeat what is already visible on the screen: the animation is on the canvas on the left, so in the panel it is a duplicate (remove everything superfluous, УВЛ).
- Open in place instead of leading off to pages with "back". The scale of the interface matches the setting: "You can have a sparkline, but you draft a whole control center. For what?" (minimizing the construction).
- Every element says what it is: a nameless bar, the digits 1 2 3, a diamond and an unnamed morph provoke "What is this?" (the newcomer's view, significance).
- Arrows, chevrons, borders, coloured outlines, grey boxes, seven curve buttons: here, novelty without significance, noise. Every row opened in place and people used the panel daily, so the marks told them nothing.
- Proximity: a label touches its value; related values sit in one row ("one Bounce line with two columns").
- Alignment and one width: names do not jump, curves and values share edges (continuity, modularity).
- One grammar of form: the kind of row says unambiguously what it is (similarity, "one device, one meaning").
- Colour only with meaning: three meanings for the whole panel.
- Helpers appear for the duration of the action (a quasimode: the state exists while it is held).
- Frequency of use determines accessibility, and the data confirms it.
- Time is in the domain's units (beats), not in the milliseconds that suit a programmer.

## Gotchas (for Claude, from KK's remarks)
- These gotchas are this panel's answers: a dense tool used daily, where every row opens in place. The principles behind them, and when the decisions flip, are in references/anti-defaults.md ("Panel and settings: a worked case").
- Do not put arrows and chevrons where a row opens on click.
- Do not tear a label away from its value: right-align the labels, right up against the field.
- Do not put values in boxes and do not fill fields with dark grey.
- Do not let pictures of different widths shift the names: make a column.
- Do not make curves, timelines and fields of different widths.
- Do not hide significant objects under "More".
- Do not show numbers and markers without explanation ("1 2 3", the diamond).
- Do not duplicate in the panel what is already visible on the canvas.
- Do not lead off to a separate page for a single setting.
- Do not put an arrow next to a minus sign: "→ −200" reads as arithmetic.
- Do not make people read: if you have to read a lot to understand, the interface is not solved.

## A note on the report page
The report itself (the wrapper around the panel) was not the subject of the design; in KK's words it is "not superpolished". Its styling shows the model's typical defaults: monospaced all-caps pill labels, section numbers "1, 2, 3", a warm off-white background. The panel shows how the principles were applied in its context; the wrapper shows the defaults to avoid (see references/anti-defaults.md).

## Links
- Proximity, inner and outer — library/bureau/vahromeev-typography-layout/, library/gestalt/02-*.md
- Informativeness, УВЛ, the newcomer's view — library/bureau/nechaeva-interface-principles/
- Modality and quasimodes — same place, 20160308
- Coordination and structuring — library/bureau/chiltsova-coordination/
- Animation and curves — library/motion/
