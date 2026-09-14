# ADR 0077: Case editor and private prompt presets

- Status: Accepted
- Task: GG-074
- Date: 2026-09-14
- Supersedes: ADR0076 publication Sheet and always-visible prompt decisions

## Decision

Create a dedicated same-shell case editing page from own image detail. Authors
edit title, description and reusable prompt, choose public/hidden prompt and
side-by-side/pointer-wipe comparison, then review and explicitly publish.
Existing cases default to public prompt and side-by-side comparison.

Public cases expose the saved prompt and load the existing editable composer.
Hidden cases expose no original prompt even to a reproducing user or site owner.
Their dedicated same-shell reproduction page shows a preset badge and an optional
supplement textbox, own image uploads/library and current model/price parameters.
Submitting combines preset plus a newline plus trimmed supplement, or preset
alone when supplement is empty. No automatic generation. This combines strings;
it does not promise that downstream models keep presets immune to prompt injection.

Persist hidden effective prompts in a server-only table atomically with normal
generation/billing/outbox records. Browser-facing batch prompt contains only a
preset label and supplement. Worker reads the frozen effective prompt; normal
job/asset/profile/project/admin DTOs never include it. Retrying a failed preset
job preserves its effective prompt. A derived hidden-preset output cannot be
published as a new reusable case to reveal or redistribute its original preset.
Case removal blocks new preset submissions; already accepted jobs retain frozen
input and normal reserve/settle/release behavior. Idempotent retries do not create
another reservation and cannot mutate the frozen private input.

Pointer-wipe uses the selected before/after images with a dividing line following
the pointer; keyboard and touch can use the same accessible range control.
Pure text-to-image cases have no before image and show only the output.

No production publication/deployment, paid provider tests or social scope growth.
