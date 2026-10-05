# Product and integration boundary

## Purpose

Butterfly helps a media buyer connect or upload their own creative, organise it, inspect a structured JEV analysis, review the supporting evidence, decide what to change, create an iteration, and track the work.

The scraper or Meta import is an input. The product is the review and iteration loop around the advertiser's own creative.

## Primary user loop

```text
Sign in
  → connect Meta or upload creative
  → browse and organise the library
  → open an ad
  → inspect JEV findings and evidence
  → confirm or correct a finding
  → create or save an iteration
  → review the work queue
  → attach a later result to the version
```

## What is implemented

- Public marketing and authenticated-workspace shells
- Passwordless and Google sign-in UI states
- Meta connection/import and local upload UI states
- Searchable, filterable, paginated grid and table library
- Saved groups, comparison, and batch selection
- Extensible analysis-property definitions and filters
- Analysis lifecycle, grouped findings, confidence, provenance, evidence, correction, transcript, and timeline
- Neural ideation with source provenance
- Batch creative composition and paused-ad handoff rehearsal
- Creative Canvas, Work Queue, Team, and Settings
- Browser-local persistence, recovery, error, empty, read-only, permission, partial, and failure states

## What is deliberately not implemented

- Live authentication or account security
- Meta OAuth, account sync, delivery reads, or publishing
- A JEV/model API
- Backend persistence or multi-user collaboration
- Email/SMS verification or invitation delivery
- Billing, API keys, competitor discovery, or market research

All current accounts, analysis, delivery figures, work records, and team actions are fixtures. User uploads remain available for the browser session; only their local records persist after reload.

## Integration seams

Preserve the existing UI contracts while replacing these adapters:

1. Authentication session and verification actions
2. Meta connection, account selection, sync, delivery data, and paused-ad creation
3. JEV job lifecycle, property definitions, findings, evidence, and corrections
4. Storage for groups, notes, drafts, versions, settings, and team state
5. Invitation delivery and role enforcement

The analysis schema must remain server-declared and extensible. Do not hardcode the current property count. Historical findings must keep an immutable snapshot of the definition used when they were created.

Publishing must remain explicitly paused until a separate, approved activation step exists.
