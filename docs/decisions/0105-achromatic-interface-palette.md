# ADR 0105: Achromatic interface palette

- Status: Accepted; ADR 0107 adds a narrow red exception for asset Delete, and ADR 0110 adds a narrow blue exception for the canvas image selection frame
- Date: 2026-09-25
- Task: GG-118
- Supersedes: ADR 0002 for the interface accent role (identity section only)

## Context

ADR 0002 fixed a "Palace Red material accent" as part of GoodGood's visual
language, and its consequences state plainly that rebranding requires deliberate
asset/token migration rather than local CSS changes. `AGENTS.md` and
`docs/DESIGN_SYSTEM.md` carried that decision forward as a visual invariant,
including a standing ban on blue as a primary accent.

The owner has now directed a replacement: the interface must carry no red, type
and icons must be black, there must be no chromatic status color, and button
states must use a light gray background. Two reference images supplied by the
owner show the target: a black circular mark, hairline black-stroke icons, a
light gray rounded tile marking the current navigation item, black type, and
neutral gray surfaces.

This is a replacement, not a refinement. The incumbent red is not being tuned;
it is being removed.

## Decision

The interface palette becomes achromatic.

- `--ink` `#111111` is the type and icon color. Type and icons are black.
- `--canvas` `#ffffff` with `--white` `#ffffff`; surfaces separate by hairline
  rules and light gray fills rather than by tinted canvas.
- The primary action uses a near-black fill (`#1a1a1a`) with white foreground.
- Selection, hover, active, and open states use light gray fills. The current
  navigation item is marked by a light gray rounded tile, per the owner's
  reference.
- Focus uses a near-black ring, so keyboard focus remains visible against gray
  fills and white surfaces without introducing a hue.
- The red accent tokens (`--accent`, `--accent-deep`, `--accent-light`,
  `--accent-soft`) are removed rather than repointed, so no residual red can
  survive behind a familiar name.
- Hand-written red-family values in feature stylesheets are replaced with
  achromatic equivalents. This includes the ad hoc reds that were never driven
  by a token.
- The Double G mark and the GoodGood wordmark are recolored to black; the
  Feihong send mark follows the same treatment.
- Error, warning, and success stops are conveyed by icon, wording, weight, and
  placement. They are not conveyed by hue alone, and no chromatic status color
  is introduced in their place.
- No chromatic accent is introduced anywhere else. The result is genuinely
  achromatic, not a red-free palette that quietly gained a different hue.

## Scope boundary

This decision does not change product vocabulary, ownership, routes,
provider boundaries, or any product behavior. It does not change layout,
spacing, type scale, radii, or component structure except where a state
previously relied on red to be legible.

Palace Red remains a historical fact of GG-001 through GG-106 records and of
the deployed build. It is not restored, and its removal is not claimed as
deployed until a separate release completes.

## Consequences

- The interface is monochrome. Hierarchy must therefore be carried by weight,
  size, spacing, and fill rather than by hue. Where an element previously read
  as important only because it was red, that element needs a structural cue
  instead, or it will read as unimportant.
- Error and destructive states lose their conventional color. They must name
  the problem in words and carry a non-color cue, or they become
  indistinguishable from body copy.
- Keyboard focus must be verified against light gray fills specifically, since
  the removed red focus glow previously provided contrast against them.
- Any future reintroduction of color is a new ADR, not a tweak. The
  achromatic decision is binding until an owner decision replaces it.
- `AGENTS.md` and `docs/DESIGN_SYSTEM.md` must be updated in the same change,
  because both currently state Palace Red as a binding visual invariant.
