# ADR 0143: Durable Kling video generation in the canvas

- Status: Accepted
- Date: 2026-10-05
- Related tasks: GG-382, GG-384

## Decision

Implement a numbered video generator with the existing image chat presentation and one mixed text/image/video input. Its three controls are model, generation type and video parameters. Support Omni text, first frame, first/last frame, reference, video edit and Kling motion control. The user's attached O1Key contract is authoritative: create and query under `/kling/omni-video/kling-3.0-omni` or `/kling/motion-control/kling-3.0`, using `contents/settings/options` and the reseller task response. Do not substitute the official task envelope or add undocumented element/cancel APIs.

Omni starts at 720p, five seconds, 16:9, audio off and single shot. Motion exposes only resolution, character orientation and original/off audio; duration comes from its validated video. Preserve connected materials when changing types and show missing/incompatible roles before submission. Images use the owned private originals; upstream video receives a server-created readable URL, never client-supplied URLs or representative frames.

Use dedicated durable video jobs and the existing Worker, with server-side credentials and ownership checks. Persist the submission attempt before calling upstream, and never repeat an ambiguous paid POST automatically. Poll by the returned task ID, retain failed slots and freeze retry inputs. Persist successful provider results before private video ingestion; an ingestion retry only saves that result. No cancellation is advertised because the attached API has no cancellation endpoint.

The user selected prices by model, resolution and duration. Configure positive integer per-second platform credit rates in the server-only `GOODGOOD_VIDEO_CREDIT_RATES_JSON`, keyed by provider model then resolution; missing rates fail closed. No numerical rate has been authorized yet. Omni quotes requested seconds; motion quotes the ceiling of the authorized source video's decoded duration. Reseller `cost` remains separate. Reserve before dispatch, settle after private delivery succeeds, and release confirmed failures. Saving failures and ambiguous submissions retain reservations until reconciled. Never borrow text's fixed twenty credits. User-upload limits remain the existing 20 MiB MP4 policy; generated video ingestion is separately bounded at 200 MiB.

This changes the prior transient-only video scope specifically for canvas Kling. Existing Seedance preview remains transient and unrelated. Source, migration, runtime activation and production are separate states. The user retains manual acceptance: no automatic builds, code checks, tests, browser acceptance, migration application or restart in GG-384.

## Temporary local activation · 2026-10-05 · GG-385

The user now authorizes the agent to pick temporary rates and activate the local backend for manual canvas UI acceptance. Omni720p/1080p/4k use 10/20/40 platform credits per second; motion720p/1080p use 10/20. The default five-second720p Omni quote is50 credits. Keep these server-only in the external local pricing file; they do not describe provider monetary costs. This authorization includes additive local0067/0068 migrations, the necessary build and replacement of Web/the unique Worker, with existing Vite/data retained. It does not authorize automatic real generation, code checks/tests/browser acceptance or production changes.
