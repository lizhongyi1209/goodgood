# ADR 0128: Model prompt limits and final composition preview

- Status: Accepted for GG-292, code-only implementation; user verification pending
- Date: 2026-10-02
- Task: [GG-292](../tasks/GG-292-model-prompt-limits.md)
- Supersedes: ADR 0124's fixed 4,000-character combined image prompt limit

## Decision

Use one shared prompt policy for image submission in the canvas, creation composer and backend. GPT Image 2 / 2.5 sunburst / 2.5 flare accept at most 32,000 characters. Nano Banana 2 / Pro initially use the same 32,000-character application boundary; Gemini's native limits are tokens, not characters, and include references/context. Do not display an estimated token count as a provider measurement. Seedream 5.0 Pro keeps the current 4,000-character application boundary until the intermediary contract is clarified. Its recommendation of up to 300 Chinese characters or 600 English words is advisory and never a submission gate.

Count Unicode code points consistently on both sides, including the blank lines inserted between connected texts and the generator's additional description. Stored plain text, generator drafts, creation drafts and project prompts have a model-independent 32,000-character capacity. Switching models preserves the draft; only submission uses the selected image model's boundary. Never automatically truncate, rewrite or summarize an oversized prompt. Keep Markdown's separate existing storage boundary.

The canvas offers a read-only preview of the exact submitted plain prompt, current model limit and excess count. Connected nonempty text inputs can move up/down. Swap their existing positions in the persisted edge array for that generator; preserve unrelated edges, node order and other generators. Additional description stays last. Editing, disconnection and reordering update the preview. Clicking generate still captures one immutable prompt snapshot.

Widen the two existing SQL prompt CHECK constraints through additive migration `0062_gg292_prompt_storage_limits.sql`; do not modify historical migrations or existing data. GG-291 owns migration 0061. No migration, build, service restart, provider request or production action is authorized by this task. Backend activation and local verification remain the user's next step.

## Evidence and boundaries

- [OpenAI image generation reference](https://developers.openai.com/api/reference/resources/images/methods/generate): GPT Image prompt maximum 32,000 characters. This does not assert an unverified edit-endpoint limit or a third-party gateway guarantee.
- [Gemini 3.1 Flash Image](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image): native input 131,072 tokens; [Gemini 3 Pro Image](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image): native input 65,536 tokens. [Token documentation](https://ai.google.dev/gemini-api/docs/tokens) covers multimodal input and countTokens. GoodGood's current intermediary paths do not expose a reliable preflight tokenizer.
- [Seedream image API](https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh): the writing-length recommendation is not a confirmed hard limit. Keep application policy and advice separate.

Official documents were reviewed on 2026-10-02. This changes prompt policy, not routing, billing, generation count or model identity. Existing JSON project versions and ordered edges require no schema change.
