# Project Guardrails
- Work tests-first and prefer minimal, localized diffs.
- No new dependencies unless strictly required; update lockfiles if added.
- Preserve public APIs; avoid unrelated refactors or reformatting.
- Cite sources (paths/URLs) for nontrivial APIs used.
- Uphold invariants and add/extend tests for new behavior (include at least one property/invariant test when modifying logic).
- Apply security hygiene: no secrets in logs, validate inputs, safe error handling.
