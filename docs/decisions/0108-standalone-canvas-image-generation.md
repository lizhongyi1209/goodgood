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
