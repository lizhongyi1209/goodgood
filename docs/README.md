# GoodGood documentation map

These documents are the product memory for humans and AI agents. Source code
describes what exists; these documents explain what must remain true and why.

| Document | Use it for |
| --- | --- |
| `PRODUCT.md` | Product definition, audience, terminology, scope |
| `PRODUCT_JOURNEY.md` | From-zero rationale, confirmed and rejected directions |
| `DESIGN_SYSTEM.md` | Brand, tokens, component sizing, layout rules |
| `UX_FLOWS.md` | User flows and interface state contracts |
| `ROUTES.md` | Implemented views and planned URL structure |
| `PROJECT_MAP.md` | Current files, ownership, target feature boundaries |
| `ARCHITECTURE.md` | Prototype and target production architecture |
| `DATA_MODEL.md` | Canonical entities and lifecycle constraints |
| `ERROR_HANDLING.md` | Error taxonomy, placement, recovery, observability |
| `TESTING.md` | Test pyramid, required scenarios, release gates |
| `DEPLOYMENT.md` | Local, staging, production and rollback workflow |
| `decisions/` | Architecture/product decision records (ADRs) |

## Authority order

When material conflicts, use this order:

1. A newly approved user decision recorded in an accepted ADR.
2. `AGENTS.md` invariants.
3. The relevant topic document above.
4. Existing tests and code behavior.
5. Old screenshots, mock data, and chat summaries.

If code differs from a confirmed contract, record it as implementation debt;
do not silently rewrite the contract to match the accident.
