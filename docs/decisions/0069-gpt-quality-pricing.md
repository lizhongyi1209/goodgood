# ADR 0069 — GPT quality pricing

- Status: Accepted
- Date: 2026-09-14
- Task: GG-063

The owner requests independent GPT quality pricing. This extends fixed line/resolution pricing: GPT IMAGE 2 has three explicit tiers, GPT IMAGE 2.5 has five. Preserve `output` prices and optionally add a complete `qualities` map for each resolution. Fixed lines and Banana remain compatible.

Use immutable price-version contexts for each quality and auto, preserving accepted quotes and settlement. Auto uses the highest configured tier with visible UI copy. GPT IMAGE 2 rejects xhigh/max; 2.5 supports them through validation, saved drafts/projects and upstream parameters.

Only dedicated lines receive fal output estimates at USD 1 = CNY 7, rounded upward to integer credits. Preserve names, switches and other prices. Reference dimensions differ from some GoodGood requests; adjustable estimates exclude inputs and margin. No production authority is implied.

GG-065 supersedes the GG-064 presentation: the owner requests dedicated quality details only through the pricing editor. The list keeps line/resolution ranges without quality tables or disclosure controls, saving vertical space. Use a compact content width and shorter name/price/action column gaps. Quality prices and billing semantics are unchanged.
