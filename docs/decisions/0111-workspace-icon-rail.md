# ADR 0111: Workspace icon rail

- Status: Accepted for GG-153 local implementation
- Date: 2026-09-28
- Task: GG-153
- Supersedes: The desktop and compact workspace wordmark and text navigation specified in `docs/DESIGN_SYSTEM.md`; mobile branding stays unchanged.

## Context

The shared workspace uses a 206px desktop sidebar with icons and labels, and a 76px compact version below 1040px. The user provided a narrow icon-rail reference and requested the same treatment for both medium and large screens. They also requested the same abstract circular G icon already used in the standalone canvas header at the top of the workspace rail.

## Decision

- At widths above the existing 720px mobile breakpoint, the workspace uses one narrow, fixed icon rail. Navigation labels and the asset arrival count are removed from the visual layout, while accessible names and short hover/focus tooltips retain their meaning.
- The rail's top uses `public/goodgood-g-icon.svg`, matching `/canvas`. Activating it returns to the existing creation view through the same handler as the creation icon.
- Keep the current navigation destinations, account menu, selected state, asset arrival cue, and mobile header/navigation behavior. A selected item uses a shallow neutral fill; keyboard focus remains visible.

## Consequences

The shared workspace gives more horizontal room to image-first content at desktop sizes. The visual navigation no longer depends on text labels, so tooltips and accessible names are required for each action. This changes only the shared shell; `/canvas` remains independent. No assets, routes, account permissions, billing, or production state change.
