# ADR 0094: Local reference preview and bounded provider inputs

- Status: Accepted
- Date: 2026-09-23
- Task: GG-103

## Context

The current tray starts a browser blob preview before uploading, but its lazy image and uploading opacity make the image appear unfinished. Ten large files upload concurrently, and a timed-out completion request can report failure after the server has accepted the material. The generation Worker later uploads the original private object to O1Key with only a per-file byte check. Model APIs and O1Key's URL-based gateway have different payload contracts, so a single official inline-data limit is not a reliable bound for this route.

## Decision

- Keep the validated original as the private reusable material. Within the existing raw upload acceptance range, show its local preview immediately while bounded background uploads proceed. Upload and validation failures remain recoverable on the tray.
- For Nano Banana and GPT Image generation, derive the bytes sent to O1Key on the server. Each derived image is at most 10,000,000 bytes. A separate aggregate budget and pixel bound protect many-reference requests; never silently drop or reorder references. Preserve alpha when transforming. Fail before a billable generation submission if a reference cannot fit.
- Treat these as GoodGood operational limits for the currently configured O1Key route, not as a claim that all official Gemini or OpenAI endpoints share the same limits. Keep route limits together and recheck them when the gateway transport changes.
- Do not put production R2 or model credentials in the browser. Cloudflare Images is an optional future processing implementation; R2 storage alone does not transform outbound provider bytes.

## Consequences

The preview can be used while upload and validation continue. The model receives an intentionally bounded derivative while the library and editor retain the original. Compression can reduce fine detail in unusually large inputs, so the transform should pass through images already within budget and use high-quality settings before reducing dimensions.
