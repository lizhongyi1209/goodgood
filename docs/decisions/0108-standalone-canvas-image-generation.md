# ADR 0108: Standalone canvas image generation

- Status: Accepted for GG-125 local implementation
- Date: 2026-09-26
- Task: GG-125
- Supersedes: GG-124's shared workspace shell and empty-only canvas presentation.

## Context

The first `/canvas` mounted React Flow inside the main lobby shell and did not create images. The operator has now specified a separate canvas interface, outside the lobby, with the most common image generation actions. The white, quiet React Flow surface remains the visual baseline.

## Decision

- `/canvas` owns a full-viewport page. The main workspace links to it with a normal route transition; the canvas offers a compact return to creation.
- The first canvas tool supports a prompt, up to ten private reference images, an available image model, aspect ratio, resolution and output count. It reads the existing billing catalog/quote and uses the same authenticated reference upload and durable image generation boundaries as `/create`. Video, node wiring and canvas persistence are later work.
- A deliberate Generate action creates temporary result nodes on the canvas. In-progress, successful and failed states stay visible; successful images link to their existing asset detail. Node positions are local to this page and are not advertised as saved. Existing generation jobs and assets remain durable server records.
- Keep the background pure white and use the installed React Flow UI zoom control. Do not add a grid, sample nodes or default attribution badge.

## Consequences

Opening `/canvas` no longer preserves an in-memory `/create` form through a shared React shell. It does not erase the existing durable creation draft or projects. Refreshing `/canvas` clears its local node arrangement; saved canvas documents need a separate product and persistence decision. All actual provider calls remain behind explicit user submission and the GoodGood backend.

## GG-203 addendum · canvas eight-image Nano batches (2026-09-30)

The canvas image-settings count choices display numbers only. Nano Banana 2 and Nano Banana Pro now offer `1 / 2 / 4 / 8`, with one still the default. GPT canvas models and the lobby composer retain their existing `1 / 2 / 4` choices. Preserve saved count values and resolve an unsupported choice when changing to another model; do not silently submit eight to a GPT adapter.

Eight Nano outputs use eight existing single-image provider requests in one recoverable task set, never a new native `n=8` parameter. All eight outputs must succeed before the existing atomic batch is stored and settled; failures retain the existing release policy. Before enqueueing, admission requires an active count-eight quote for the exact managed model, resolution and enabled line. Migration 0051 appends initial quotes at eight times each active single-image price and opens the generation-batch and price-record count constraints. Later managed-price edits publish count-eight versions for Nano adapters only. Missing quotes fail closed. Canvas project JSON accepts the new draft value without changing its schema version, while legacy lobby draft/project schemas and selection controls remain unchanged. The existing single-node stack and explicit expand/collapse control render all returned outputs. No request is submitted without the user's generation action.
