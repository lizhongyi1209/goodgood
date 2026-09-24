# ADR 0098: Up arrow for composer submission

- Status: Accepted
- Date: 2026-09-24
- Task: GG-107

## Context

ADR 0002 established the Feihong mark as the image and video composer send
symbol. The creator has requested a familiar upward arrow at this action.

## Decision

- Use the same upward arrow icon for image and video generation buttons.
- Keep the 40px action target and position, with a 32px visible circle and a 17px
  arrow. Use a 22px composer corner radius on wide screens and 18px on mobile;
  the attached parameter drawer follows that radius.
- Keep accessible names, click behavior, availability rules, and support for
  submissions while earlier jobs run.
- Use the Palace Red accent for the button. Keep Feihong as an existing loading
  illustration where it is already used, outside the composer action.

This supersedes only ADR 0002's send symbol choice. Other brand and visual
decisions remain in force.

## Consequences

- The send action no longer depends on the Feihong image mask.
- Image and video modes show the same recognizable submit affordance.
