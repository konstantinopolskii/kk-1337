---
source: bdm/images/cases/ibinom/slide-1..17.jpg (linked from the page: "check my redesign for the professional DNA analysis tool")
title: "4W R&D for DNA Tool Targeted on US Market"
author: Konstantin Konstantinopolskii (KK)
date: 2015
collection: KK's process — cases
tags: [R&D, data visualization, printed report, parallel delivery, inventing a form, testing in the real environment]
---

# 4W R&D for DNA Tool Targeted on US Market

**Question/task.** "iBinom had proof of concept for mutation analysis tool. Back in 2013, the team raised 500K in investments." "In 2015, the team was preparing for the bioinformatics exhibition in the US. After the tests, the team faced the need for a full redesign. Within a month." KK did not know bioinformatics: "It was an interesting puzzle to solve, so I stepped in."

**Gist.** They started with the most critical thing: the printed report for the doctor. They worked in parallel with development, aligning every discovery with the team. Forty columns of data were fitted onto an A4 sheet through visualisation iterations; they checked it on printouts held in hands ("crush-test"). When a standard chart did not work, they invented a new one: a mutation frequency scale based on the arcsine. The app, the reports and the identity were redone in three weeks.

## How the author reasons (slides in order)
1. Context, figures, the deadline, "Team've reached out to KK."
2. "I had zero knowledge in the bioinformatics field… I was young and ready for sleepless nights."
3. **What there was:** "User interface for DNA sample uploading." (the upload screen and the results table); "Printed report." ("Statistical data" and "The identified polymorphisms"); "A sample of data we needed to bring into the printed report." (a raw data table of about 40 columns). "What we had to redesign & deliver within three weeks."
4. **"To release this fast, we needed to set up a parallel delivery. Any discovery should've been aligned with the team. We started from the printed report. It was a critical part."**
5. **Visualisation iterations:** several variants of the mutation block ("Design iterations to find the right visualisation: clean, intuitive, and aesthetically pleasant."); "Parallel validation in development." "It was crazy-hard to fit forty columns of data on the A4 list."
6. **"To be as real as possible, we constantly crush-test the report samples."** Photos of printouts held in hands, with pen marks ("critical"), and a doctor's workplace.
7. **The new mutation frequency chart.** "We've even invented the industry's new mutation frequency chart. Mutation frequency is a set of infinitely small fractional numbers from 0 to 1 (0.0001, 0.001, 0.1, 0.6). You can't plot them on a linear scale – it'll just be zero. At the same time, adjusting the scale will make charts incomparable. We've come up with a chart based on the arcsin of each number." Three reference views: Pathogenic / Better to check / Clearly pathogenic (a fan of lines from one point: the higher the frequencies, the wider the fan "opens").
8. **Ready.** The report "Dementia, progressing. Mutations report" in hands; "We've presented the design and collected the user's feedback." "During the work, the report received 10 new databases." "The right one in the photo is the final version, printed from the app."
9. **The application:** "Application followed the report style mixed with the look & feel of modern web apps." "Uploading page focused on patients. We've quickly won doctors' hearts with this move." "On the result's page have seen the same design and structure as in the report." "Even the technical information page has got a stylish layout with inspiring illustrations."
10. "Implementation required constant alignment with developers." A collage of dozens of intermediate mock-ups.
11. A testimonial from the CEO, Andrei Afanasyev: "Understanding bioinformatics in a couple of weeks while orchestrating the team is something I've never seen before." The outcome: "The whole app, reports, and identity were redesigned and delivered in three weeks. R&D with the same complexity and urgency level will cost around $100K."

## Principles and rules
- **Start with the most critical artifact**, the one the product is bought for (here, the printed report for the doctor), and derive the rest from it.
- **Learn the domain to the level at which you can make decisions**, even if you have two weeks.
- **Parallel delivery requires aligning every discovery immediately.**
- **Test in the real environment:** print the report, hold it in your hands, write on it with a pen. A screen mock-up does not show how a document lives.
- **If the existing form does not convey the meaning, invent a new one** (the arcsine scale). This is exactly the case for stepping outside the system: the standard tool distorts the data.
- **One structure across all media:** the results screen repeats the structure of the report, so the user does not have to relearn.
- **The interface is built around the user's main object** (the patient, not the file).

## Gotchas
- Do not design the report only on screen: 40 columns on A4 can only be checked by printing.
- Do not fit the chart's scale to each case: the charts become incomparable.
- Do not hoard discoveries until the end: in parallel development they must reach the team at once.

## How to apply
- Find the artifact where value and complexity meet, and start with it.
- For data with a huge spread of magnitudes, look for a scale that keeps both distinguishability and comparability (logarithm, arcsine, verbal categories).
- Prototype in the final environment: print, a phone in the hand, a slow network.

## Links
- Working with numbers and perception — library/bureau/kuzmin-numbers/
- Modular layout and dense information — library/bureau/vahromeev-typography-layout/
- Coordination of elements and structure — library/bureau/chiltsova-coordination/
