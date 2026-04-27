# DealHub — Investor Eligibility Review

A working slice of a private placement deal platform's compliance workflow. Built as an exercise in product thinking for institutional financial services, with AI as a first-class participant in the verification pipeline.

**[→ Live demo](https://dealhub-7cpci1vsb-philip-landens-projects.vercel.app/)**

---

## What it does

Maintains an investor universe for a hypothetical broker-dealer ("DealHub") and runs prospective LPs through a four-gate eligibility check before any deal solicitation:

1. **Regulatory standard** — Accredited Investor (Reg D), Qualified Purchaser (3(c)(7)), or Qualified Institutional Buyer (Rule 144A) depending on the deal type
2. **Platform floor** — $25M internal threshold above the regulatory minimum, applied platform-wide for cross-deal eligibility and dry-powder confidence
3. **Banker coverage** — substantive relationship documented in the CRM; required for SEC compliance under Rule 506(b) and platform policy on all deals
4. **PSR pre-existing** — banker relationship must predate the deal launch; relationships formed after a deal launches are solicitation, not pre-existing

Investors who clear all four gates are Verified and eligible for deal access. Those that fall short land in one of three other buckets (Review Queue, Attestation Required, Rejected) with explicit flag reasons and audit trail entries.

## What's in it

- **Bulk ingestion** — paste a list of investor names; Claude classifies each into RIA / Hedge Fund / VC-PE / Family Office / Endowment with a confidence score and one-line reasoning
- **Three-system orchestration** — Claude classification + SEC IA registry lookup + CRM coverage lookup, run in sequence on every ingest with results shown in a routing-preview table before commit
- **Four-bucket queue** — Verified / Review Queue / Attestation Required / Rejected, with click-to-filter
- **Deal-as-filter** — select a deal from the filter dropdown and the table narrows to investors who clear all four gates for that specific deal
- **Quarterly re-verification** — banner appears when investors are 90+ days stale; bulk re-verify refreshes AUM, re-checks coverage, applies the 24-month coverage-decay rule, and updates audit trails
- **Per-investor audit trail** — chronological log of every state change (ingestion, classification, gate checks, status changes, coverage events) with actor, timestamp, and outcome
- **Family Office attestation path** — single-family offices are SEC-exempt under Rule 202(a)(11)(G)-1, so they cannot be ADV-verified; product handles them through a documentary attestation flow with Claude doing qualitative review of the packet for red flags

## Why it exists

The original idea was to build an AI-powered Form ADV extractor. It became this product through iteration with someone who'd actually worked at a broker-dealer's private placement platform. Each version was driven by a piece of domain knowledge that revealed why the previous version was naïve:

- **v1** — Form ADV PDF extraction with Claude
- **v2** — eligibility tiering against an institutional AUM threshold
- **v3** — multiple investor types with forked verification paths (Family Offices don't file ADV)
- **v4** — deal-type framework (regulation determines threshold, not user input)
- **v5** — Salesforce Lightning aesthetic, JPM-flavored deal codenames, platform floor concept
- **v6** — investor list as primary, deals as filters, bulk classification as the AI moment
- **v7** — three-system integration: Claude + IA registry + CRM, with banker coverage as a third gate
- **v8** — quarterly re-verification, 24-month coverage decay, full audit trail
- **v8.1** — PSR pre-existing check (relationships must predate deal launch)

The substance came from the user; the synthesis is what the project demonstrates.

## Stack

- **React** (functional components, hooks)
- **Tailwind** (utility classes for layout)
- **Custom CSS** for the Salesforce-Lightning-adjacent visual language
- **Lucide React** for iconography
- **Claude Sonnet 4** via the Anthropic API for investor-name classification and qualitative review of attestation packets

No backend. All data is mocked client-side. The Claude API is called directly from the artifact via `fetch()`.

## Demo data

The demo seeds ~22 investors covering the full taxonomy (real institutionals like Bridgewater, Yale, Ford Foundation; borderline fictional cases like Cobalt Ridge Capital; rejected sub-institutional firms; Family Offices in various states of attestation). The IA registry is mocked with ~50 well-known firms; the CRM is mocked with ~40 coverage assignments to fictional bankers (M. Chen on hedge funds, K. Hosseini on institutionals, T. Vargas on family offices, etc.).

The sample paste list includes 20 institutional names that exercise the full classification taxonomy and routing logic — including a couple of intentionally ambiguous fictional names (Cobblestone Wealth Partners, Brennan-Wexler Endowment Trust) that route to Review Queue with reason "Not found in registry — manual verification needed."

## Production considerations

In a real deployment this product would integrate with:

- **SEC IA bulk feed** for AUM verification (replaces the mocked IA registry)
- **Salesforce or proprietary CRM** like the Broker Dealer's CRM for coverage data (replaces the mocked CRM_COVERAGE table)
- **KYC vendor** like Refinitiv or NorthRow for sanctions, PEP, and AML screening (not in the demo)
- **Internal deal management system** that feeds the deal context (in the demo, deals are hardcoded)
- **Real audit log persistence** in an immutable store like an append-only database or compliance-grade event store

The architecture already separates concerns appropriately for these substitutions. The eligibility engine is a pure function. The registry/CRM lookups are abstracted helpers. The audit log is a structured event stream. None of the real-world integrations require restructuring; they're swap-the-data-source changes.

## What it taught me

How to think about compliance products as **layered policy** rather than a single rule:
- Regulation is the floor.
- Platform policy is the next layer up, applied uniformly to remove deal-by-deal compliance ambiguity.
- Coverage and PSR are temporal layers that enforce the *substantive* relationship requirement without lawyers having to argue about which exemption applies.

How AI fits into this kind of product: not as the decision-maker (rules engines do that — they're auditable and reproducible) but as the **interpreter** that turns messy human input (investor names, source-of-wealth narratives, partial Form ADV uploads) into structured data the rules engine can act on. Bulk classification of 20 names is a strong AI moment because the alternative is 20 minutes of human triage; the qualitative review of a Family Office attestation is a strong AI moment because pattern-matching on red flags is exactly what humans do badly under fatigue.

How to maintain the substantive-relationship requirement over time: not just at intake but through **decay rules** that strip stale coverage and **scheduled re-verification** that keeps the universe fresh. A platform that verifies once and never again is technically compliant the day it ships and progressively non-compliant from there.

## Running locally

```bash
npm install
npm run dev
```

The app expects an Anthropic API key for Claude calls. In the live demo this is handled by the artifact runtime; in a local fork you'd need to point the `callClaude` function at your own backend that holds the API key.

## License

MIT — feel free to fork, adapt, or use any of the rules-engine logic for your own compliance prototypes.
