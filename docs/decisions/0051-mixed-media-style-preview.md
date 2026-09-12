# ADR 0051 — Mixed image/video creation and detail prototype

- Status: Accepted
- Date: 2026-09-13
- Task: GG-037

## Context

The owner rejected the oversized standalone GG-036 video progress/player block.
Images and videos should share creation layout and detail navigation. The owner
requests mock styling first, not durable video integration.

## Decision

Prototype a mixed, ratio-preserving creation masonry using existing image card
dimensions and gaps. Video progress occupies one output slot; completed covers
show a compact play/duration marker, with playback chrome reserved for detail.
Detail uses the existing large-stage/info/rail arrangement with mixed navigation.
Fixtures are isolated component state behind a preview-session opt-in URL.

## Consequences

This changes the standalone video presentation direction, not its provider or
persistence contract. Mock playback is explicitly labelled, uses checked-in
prototype artwork, and sends no provider requests. Final visual acceptance is
pending owner review; durable mixed-media assets/projects/URLs remain deferred.
