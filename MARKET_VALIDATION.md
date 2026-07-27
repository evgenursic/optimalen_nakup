# Market validation

Updated: 2026-07-26

This document is a test plan, not proof of product-market fit. No interview, conversion, willingness
to pay, or retention result is considered validated until the underlying dated evidence is stored in
the private research workspace. Direct personal data must not be committed to this public
repository.

## Positioning hypothesis

For Slovenian consumers making a high-consideration purchase, Optimalen Nakup turns a natural
language need into a transparent shortlist whose prices, constraints, trade-offs, and source
evidence can be inspected. The first wedge is not generic product discovery. It is reducing the time
and uncertainty involved in comparing cars, computers, and white goods across fragmented sources.

The product should earn trust through:

- explicit hard requirements before research starts;
- visible source coverage and freshness rather than an implied complete market view;
- deterministic extraction and scoring before model-written synthesis;
- evidence status on every material claim;
- neutral ranking with no affiliate or sponsored influence in v1; and
- a recommendation that explains total cost, risks, and rejected alternatives.

## Competitor and substitute matrix

Sources were accessed on 2026-07-26. Counts and availability are time-sensitive and must be
rechecked before external use.

| Product or substitute                                                                                           | Verified current capability                                                                                             | Business or trust signal                                                                                 | Gap the hypothesis tests                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Ceneje.si](https://www.ceneje.si/)                                                                             | Slovenian price comparison across millions of products and hundreds of stores; product and merchant comparisons         | Broad local inventory and an established price-comparison habit                                          | Whether users will value requirement-first research, evidence states, TCO, and cross-offer reasoning enough to use a narrower paid tool                                    |
| [idealo](https://www.idealo.co.uk/)                                                                             | Price comparison, history, alerts, favourites, filters, reviews, and regularly updated offers                           | Retailers pay a service fee; idealo states that paid placement cannot improve organic ranking            | Whether explicit evidence provenance and category-specific hard constraints differentiate from a mature comparison engine                                                  |
| [ChatGPT shopping research](https://openai.com/index/chatgpt-shopping-research/)                                | Conversational clarification, multi-site product research, cited buyer guides, comparisons, and organic recommendations | OpenAI warns that price and availability may still be wrong                                              | Whether a Slovenia-first workflow with saved structured requirements, deterministic verification, and auditable scoring creates defensible trust                           |
| [Perplexity Shop Like a Pro](https://hub-prod.perplexity.ai/hub/faq/what-is-shop-like-a-pro)                    | Query-tailored product cards and, for eligible US users and merchants, native checkout                                  | Product listings are described as algorithmic and unsponsored, while sponsored questions are separate    | Whether local source coverage, non-commerce neutrality, and evidence-level inspection matter more than checkout convenience                                                |
| [Google AI Mode shopping](https://blog.google/innovation-and-ai/products/google-io-2025-all-our-announcements/) | AI-assisted discovery backed by the Shopping Graph, price tracking, virtual try-on, and announced agentic checkout      | Benefits from a very large merchant/product graph                                                        | Whether deep comparison of a bounded Slovenian shortlist can beat breadth for complex, high-stakes purchases                                                               |
| [Which?](https://b2b.which.co.uk/about-us/how-we-test)                                                          | Laboratory tests, user trials, expert assessments, reliability surveys, and comparable test scores                      | Subscription-supported and states that it does not accept advertising, manufacturer freebies, or favours | Which? is a trust benchmark, not a direct local offer-search substitute; the test is whether source-backed web research is useful without claiming laboratory verification |
| Manual research                                                                                                 | Search tabs, store pages, spreadsheets, forums, calls, and advice from friends                                          | Flexible and familiar, but requires substantial time and leaves a weak audit trail                       | Primary substitute: measure saved time, missed constraints, confidence, and ability to revisit the decision                                                                |

Important interpretation limits:

- Inventory size does not imply complete market coverage.
- A cited retailer page is not equivalent to an independent laboratory test.
- Competitor feature availability can vary by country, account, and date.
- This matrix does not claim that the product is better; each claimed gap is an experiment.

## Landing-page message set

### Primary

**Najdite pravi nakup. Preverite vsak razlog.**

Povejte, kaj potrebujete. Optimalen Nakup primerja dovoljene javne ponudbe, preveri vaše zahteve ter
prikaže stroške, tveganja in dokaze za vsako priporočilo.

Primary call to action: **Pridruži se zaprti beti**

Trust line: Brez affiliate razvrščanja. Brez prikritih sponzorjev. Nejasni ali manjkajoči podatki so
vedno označeni.

### Supporting messages

- **Vaše zahteve so filter, ne opomba.** Pred iskanjem potrdite proračun, obvezne lastnosti in
  izključitve.
- **Cena ni celoten strošek.** Primerjava lahko upošteva dostavo, garancijo, energijo ali druge
  kategorijske stroške, kadar so podatki podprti.
- **Dokaz je en klik stran.** Vsaka materialna trditev pokaže vir, čas zajema, svežino in stopnjo
  zaupanja.
- **Delni rezultat ostane pošten rezultat.** Aplikacija pokaže pregledane vire in pokritost; ne
  predstavlja vzorca kot celotnega trga.

## Interview programme

### Recruitment

Recruit 15 participants in three cohorts:

- five people actively looking for a used or demonstrator vehicle within 90 days;
- five people replacing or upgrading a computer within 60 days; and
- five people buying a major white-good appliance within 60 days.

Seek a mix of research confidence, age, budget, and urban/rural location. Do not recruit only
friends or technology professionals. Record cohort, stage, and consent; keep names and contact
details outside Git.

### Problem interview, 30 minutes

1. Tell me about the last expensive item you researched and bought.
2. What triggered the purchase, and what would have made an option unacceptable?
3. Show me how you searched, compared, and kept track of options.
4. Which facts did you struggle to verify? How did you resolve disagreement between sources?
5. When did you feel confident enough to stop searching?
6. What did you worry about after purchasing?
7. What would make you distrust an automated recommendation?
8. Which part would you delegate, and which part would you insist on checking?
9. What did the process cost in time, missed work, travel, or expert help?
10. If this problem occurred again tomorrow, what would you do first?

Do not introduce the proposed solution before question ten. Ask for concrete recent behaviour
instead of hypothetical enthusiasm.

### Prototype task, 30 minutes

Give the participant a realistic category fixture and ask them to:

1. express the need in their own words;
2. correct and confirm the structured requirements;
3. interpret job progress and source coverage;
4. reject an offer that violates a hard requirement;
5. explain why the top result ranked first;
6. inspect one verified and one conflicting evidence record;
7. compare two offers;
8. save the search or request an alert; and
9. state what they would verify before purchasing.

Capture task completion, errors, time, evidence-drawer comprehension, trust changes, and the final
decision. Do not use live retailer traffic until the source policy and owner activation gates pass.

## Outreach scripts

### Direct message

> Živjo! Raziskujem, kako ljudje v Sloveniji primerjajo dražje nakupe, kot so avto, računalnik ali
> bela tehnika. Iščem osebe, ki tak nakup trenutno načrtujejo ali so ga opravile pred kratkim.
> Pogovor traja 30 minut; ne gre za prodajo. Zanimajo me vaš dejanski postopek, težave pri
> preverjanju podatkov in trenutek odločitve. Bi bili pripravljeni sodelovati?

### Community post

> Kako ste pri zadnjem večjem nakupu vedeli, da ste preverili dovolj ponudb? Za raziskavo novega
> slovenskega orodja iščemo kupce avtomobila, računalnika ali večjega gospodinjskega aparata.
> Potrebujemo 30-minutni prikaz resničnega postopka iskanja, ne mnenja o prodajni predstavitvi.
> Osebnih podatkov ali vsebine pogovora ne bomo objavili brez izrecnega soglasja.

## Pricing experiments

Public prices remain unconfigured until owner approval. Tests use price cards or test-mode checkout,
never an undisclosed real charge.

| Experiment          | Audience                                    | Variants                                            | Primary measure                                      | Decision threshold                                                                               |
| ------------------- | ------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Message-to-waitlist | Qualified landing visitors                  | Evidence-first vs. time-saved headline              | Qualified waitlist completion                        | Continue only with at least 10 completed target-cohort sign-ups and no material trust regression |
| Plan packaging      | Activated beta users                        | Per-research credits vs. monthly research allowance | Test checkout start after one completed result       | Require at least 20 exposed qualified users before interpreting                                  |
| Willingness to pay  | Interview participants after prototype task | Open-ended price, then randomized Starter/Pro cards | Stated purchase plus test-mode commitment            | Report distribution and objections; do not reduce it to an average                               |
| Evidence value      | Activated users                             | Summary-first vs. evidence-first default            | Evidence opens, decision confidence, task completion | Adopt only if comprehension improves without lowering completion                                 |

No result is statistically conclusive at small beta sample sizes. The purpose is to reject weak
packaging and expose objections, not manufacture precision.

## Analytics event contract

Events contain pseudonymous actor and workspace identifiers generated by the application. Never send
free-text prompts, email addresses, retailer account data, evidence excerpts, or full URLs to
product analytics.

| Event                     | Required safe properties                                          |
| ------------------------- | ----------------------------------------------------------------- |
| `landing_cta_selected`    | locale, placement, campaign bucket                                |
| `waitlist_submitted`      | locale, category interest, consent version                        |
| `workspace_bootstrapped`  | locale, acquisition bucket                                        |
| `intake_started`          | category, locale                                                  |
| `filter_spec_confirmed`   | category, hard-requirement count, preference count, budget bucket |
| `research_started`        | category, plan, configured page budget bucket                     |
| `research_state_changed`  | previous state, next state, elapsed bucket                        |
| `research_completed`      | category, result-count bucket, coverage bucket, duration bucket   |
| `research_cancelled`      | state, reason code, coverage bucket                               |
| `evidence_opened`         | evidence status, source-adapter identifier, result rank bucket    |
| `offer_pinned`            | category, rank bucket                                             |
| `comparison_opened`       | category, offer-count bucket                                      |
| `export_requested`        | format, row-count bucket                                          |
| `saved_search_created`    | category, cadence bucket                                          |
| `alert_opened`            | channel, alert type                                               |
| `billing_intent_started`  | plan, billing interval, experiment variant                        |
| `beta_feedback_submitted` | task stage, structured rating, issue category                     |

Retention reports use cohort-level aggregation. Small cohorts must be suppressed to avoid
re-identification.

## Thirty-day closed-beta plan

### Days 1–5: recruit and baseline

- Recruit the 15 target participants and run at least six problem interviews.
- Capture each participant's current workflow and an approximate time baseline.
- Tag objections without forcing them into the planned feature taxonomy.
- Review source activation only with explicit owner/legal approval.

Exit gate: at least four interviews describe repeated comparison or verification pain with recent
behavioural evidence.

### Days 6–10: moderated fixture prototype

- Run six moderated tasks across all three categories.
- Fix any blocker that prevents requirement confirmation, evidence comprehension, or comparison.
- Validate keyboard-only completion and 200% zoom with participants where possible.
- Select a pricing-card experiment; keep checkout in test mode.

Exit gate: at least five of six participants can identify a violated hard requirement and trace a
recommendation to evidence without facilitator instruction.

### Days 11–17: controlled activation

- Invite up to 20 qualified users in cohorts.
- Give each user one fixture-backed or explicitly permitted bounded research task.
- Monitor failures, unsupported claims, coverage, latency, and model cost daily.
- Conduct a five-minute follow-up immediately after the result.

Exit gate: no critical/high security issue, zero knowingly unsupported material claims, and at least
70% completion among users who confirm a filter specification.

### Days 18–24: repeat-use test

- Enable saved searches and in-app alerts for users with a completed task.
- Ask users to return for a second decision or revisit the first result after 72 hours.
- Run the selected packaging/test-checkout experiment.
- Compare confidence and research time against the participant's baseline.

Exit gate: at least five users return voluntarily or respond to a relevant alert, and at least three
state a concrete situation in which they would pay.

### Days 25–30: decision review

- Re-interview high-, medium-, and low-engagement users.
- Audit every reported recommendation issue against its stored evidence.
- Report funnel, cohort retention, research cost, source coverage, and pricing objections.
- Decide: proceed with the current wedge, narrow to one category, change positioning, or pause.

The owner review must include disconfirming evidence and all unresolved trust, source, and unit
economics risks. A waitlist count alone is not a release decision.
