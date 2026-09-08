# ADR 0032: Open model-aware multi-output counts

- Status: Accepted
- Date: 2026-09-08
- Refines: ADR 0003, ADR 0004, ADR 0030, and ADR 0031
- Related tasks: GG-009 and GG-010

## Context

GoodGood already exposes the product count values `1 / 2 / 4`, but the durable
generation capability accepts only one output. GPT Image 2's O1Key contract
supports an integer `n`, while the current Nano Banana 2 contract has no output
count parameter. The worker and database also currently assume one Asset per
generation job, so merely enabling the selector would silently discard all but
the first provider output.

The operator first required counts 2 and 4 for GPT Image 2, then explicitly
extended the same product capability to Nano Banana 2. GPT Image 2 can request
several images through one upstream task with `n`; Nano Banana 2 has no native
count field, so its output count must be orchestrated without changing the
provider contract. Every generated image remains priced at 10 credits.

## Decision

- GPT IMAGE 2 accepts counts `1`, `2`, and `4`. One click creates one durable
  batch/job and one O1Key task with `n` equal to the frozen requested count.
- Nano Banana 2 also accepts counts `1`, `2`, and `4`. A count-N GoodGood batch
  creates N O1Key tasks, each using the documented single-output Banana payload.
  The worker persists submission progress after every returned task ID and a
  submission-started marker immediately before every following POST. It resumes
  only known-safe remaining submissions after a restart and polls the task set
  in stable ordinal order. It never sends an unsupported `n` field to Banana.
- A GPT or Banana batch reserves and settles `10 / 20 / 40` credits for `1 / 2 / 4`
  outputs. The composer keeps 10 credits per image visible and also exposes the
  selected batch total.
- A successful provider result set must contain exactly the requested number of
  images. The worker downloads and fully decodes every image, stores deterministic
  ordinal object keys, and commits all ordered Asset records in one database
  transaction before settling credits.
- Multi-output completion is all-or-nothing in this first version. If any output
  is missing, malformed, cannot be stored, or cannot be committed, the job does
  not expose a partial successful batch. Stored objects from that execution are
  deleted where possible, and terminal provider failures release the full
  reservation according to the existing recovery contract.
- Asset identity remains per image. A job may own several Assets ordered by a
  persisted positive ordinal; API presentation signs and returns all accepted
  assets in ordinal order.

## Consequences

- Creators can request two or four GPT or Banana images without repeated clicks, while
  repeated clicks can still create independent concurrent batches.
- Banana 2/4 consumes 2/4 upstream generation tasks; GPT 2/4 consumes one native
  task. This difference stays behind the provider boundary and is visible in
  durable attempt evidence for recovery and cost audit.
- Existing single-output rows receive ordinal `1`. The prior unique `job_id`
  Asset constraint becomes a unique `(job_id, ordinal)` constraint.
- Billing remains deterministic and transactional because one batch has one
  immutable count-specific quote and one reservation/settlement pair.
- Partial-result UX remains reserved for a later provider and persistence
  design. This narrower all-or-nothing rule is explicit so the asset library and
  credit ledger cannot disagree about a partially completed batch.
- This ADR authorizes local implementation and verification only. Production
  deployment and a paid real-provider smoke remain separately approved steps.
