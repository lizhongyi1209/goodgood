# ADR 0143: Durable Kling video generation in the canvas

- Status: Accepted
- Date: 2026-10-05
- Related tasks: GG-382, GG-384

## Latest queried progress and zero waiting · 2026-10-07 · GG-416

The user changes GG-409 feedback: adopt each latest valid queried number rather
than the highest number ever observed. Zero remains a recorded real value but
does not stop the bounded visual waiting estimate. With unknown or zero progress,
show the estimated bar without a fake percentage; a positive report immediately
controls the number and bar, including a lower report. A later valid zero resumes
the estimate; a missing/invalid value retains the latest valid report. Preserve
phase caps, successful-delivery-only 100%, per-attempt isolation and timer cleanup
for hidden tabs, reduced motion and unmounts. The supplied response already uses
the supported top-level numeric progress contract; do not add speculative parser
fields or change Worker/API/database polling, billing, retries or image behavior.

## Draggable frame and a single action set · 2026-10-06 · GG-411

The user reports that GG-410 prevents dragging the video picture and that native player tools duplicate existing view/download actions, including inside the viewer. Replace native controls on both generated results and the detail player with a shared compact manual bar for play/pause, seeking, time and mute. Only the bar consumes drag/pan/key events; the picture remains a canvas drag surface. Keep one existing node view action and one download action, with no nested viewer/fullscreen/download tools in the detail player. Reuse the playback lifecycle with an explicit manual-only option; default reference-hover behavior remains unchanged. Keep source refresh, metadata, pause/cleanup and generation/billing behavior.

## Manual result playback · 2026-10-06 · GG-410

The user replaces automatic hover playback of generated canvas video results with manual inspection. Results start paused and expose native playback, pause and seeking controls; entering/leaving the card no longer changes playback and results do not loop automatically. Isolate player interaction from canvas dragging and panning. Pause when the page becomes hidden, the result viewer opens, or the source/scope unmounts; do not automatically resume. Keep reference-hover previews, the asset page, generation states, billing and persisted job data unchanged.

## Generation feedback and progress · 2026-10-06 · GG-409

The user keeps the visible label 生成中 through queued, submitting, running and saving, while backend states remain distinct. Reuse the actual provider progress already forwarded by the Worker and status API. Show a percentage only for reported progress and retain the latest known real progress if a later response omits it. Until real progress arrives, use a slow, bounded visual estimate with conservative phase caps; do not present an estimate as a reported percentage, and only successful delivery permits 100%. Keep each attempt independent, suspend simulated ticks in hidden tabs or reduced motion, and stop them on unmount/terminal recovery states. Do not change requests, polling, persistence, billing or automatic retries.

## Free model selection and compatible references · 2026-10-06 · GG-407

The user makes model selection independent of the attached media. Keep the selected model authoritative during later material reconciliation; missing media disables submission, not model selection, and must not silently switch back to Omni. On an explicit model change preserve text and as much compatible media as the configured contract allows, in tray order: Motion retains the first image and first video; Omni retains the first video and up to four images with video, or up to seven images without video. Remove only excess references/connections, preserving source nodes and assets. Reconcile the generation type and model-specific resolution, audio, roles and shot settings; Motion can remain selected with incomplete inputs, and returning to Omni starts with smart shots where permitted. Clear the displayed quote while new pricing loads. Batch edge removals as one state update, preserve existing frozen retry inputs and keep the active-task lock. No new provider or persistence fields, prices or automatic generation requests.

## Remove unspecified camera · 2026-10-06 · GG-406

The user removes 不指定运镜 from the single-shot submenu. Show only the seven existing camera references; preserve old single-shot drafts without forcing a new reference. This supersedes that one GG-405 option, with smart default and custom scenes unchanged.

## Explicit smart default and single-shot submenu · 2026-10-06 · GG-405

The user replaces the GG-401 hidden automatic choice with a visible 智能分镜 choice, retaining automatic multi-shot as the new-node default. Put camera references directly inside 单镜头, remove the separate 运镜参考 entry and 添加到提示词 label. Keep an unspecified-camera single-shot choice, selected mode indicators, the existing custom-scene dialog and provider restrictions. Selecting smart clears only exact inserted camera-reference lines, so an earlier generated single-shot instruction does not override the new mode; preserve all other user text and frozen inputs. Existing saved explicit choices remain intact. This is a frontend mode presentation change, with no new provider or persistence fields.

## Automatic default and custom scenes · 2026-10-06 · GG-401

The user makes automatic multi-shot the quiet default for new nodes, removes its explicit selection, and requests a screenshot-inspired custom-scene editor. Preserve restored/duplicated choices and frozen requests. Single-shot remains an explicit reversible choice. Official camera guidance supplies reference vocabulary; the configured Omni contract exposes no camera_control preset parameter, so references may only insert visible editable prompt text. Custom scenes use description cards with in-card duration controls, a top switch and a bottom total-duration popover, cancel and confirm. Distribute whole seconds so scene totals stay equal to the selected 3–15-second total, with at least one second each and at most six scenes. Only confirm applies the existing fields; switching custom off returns to automatic. Keep provider restrictions, pricing and task locks. This supersedes the old three-mode dialog and single-shot new-node default; unapproved GG-400 persistence extensions remain out of scope.

## Remove the composer add shortcut · 2026-10-06 · GG-399

Remove the left-hand plus button and its dedicated upload/asset-picker entry from the video composer. The parameter summary becomes the first toolbar control, without an empty slot. Remove unreachable composer-only handlers and controls; retain canvas connections and restoration, preview and removal of existing direct materials, as well as parameters, billing and generation. This replaces the GG-386 add-shortcut presentation only.

## Complete parameter summary · 2026-10-06 · GG-398

The user restores a complete collapsed summary: applicable ratio, resolution, duration, count and audio state. This supersedes the earlier duration-only-in-settings presentation. Use a mute/speaker icon with a short tooltip and an accessible complete button name, including fixed mute for feature-video input. Motion duration reads as following the video rather than displaying an ignored draft duration. Read the effective draft without changing settings, pricing, requests or task locks.

## Compact modes and meaningful settings · 2026-10-06 · GG-397

Rename reference_to_video to 全能参考 and place it above first/last frames in the menu, retaining internal IDs, routes and the existing automatic mode preference. Shorten hover rules, and size frame labels at 10px like thumbnail numbers. Hide settings already decided by input: aspect ratio for first-frame/reference-video/base-video inputs, and fixed audio/automatic storyboard controls for feature-video references. Motion continues to hide ratio, duration and storyboard. Determine UI visibility from all tray inputs, including pending media. The official Omni and Motion documents and supplied O1Key contract distinguish inherited aspect ratio from independently selectable output resolution; retain the resolution choice and do not assert it follows the source. Preserve editable duration unless the configured API documents inheritance, billing and frozen requests.

## In-image frame labels · 2026-10-06 · GG-396

Move the noninteractive first/last labels into the thumbnail's lower-left corner. Use compact semibold white text on a near-black backing for contrast across images, and exclude the overlay from pointer events. This replaces the external label placement without changing automatic role assignment, previews, removal, task snapshots or pricing.

## Mode-owned material roles · 2026-10-06 · GG-395

The user removes redundant material-role controls because the selected generation type already classifies inputs. Remove all editable role menus beneath thumbnails. Single-image/reference/edit/motion modes show no repeated role control. First/last-frame mode shows only noninteractive first/last labels. Derive first and optional last from the existing image tray order in editable drafts; text/video do not consume image positions and extra images retain the existing reference role. This supersedes editable explicit role selection, while active jobs, frozen submission/retry inputs and historical requests remain unchanged. Preserve preview/removal, existing material limits and pricing. Future interaction work should begin from the real user task and remove redundant choices rather than expose backend classifications as controls.

## Rule tooltips and single-image UI mode · 2026-10-06 · GG-394

Keep the type list compact with icons and names. Show concise material rules on hover/focus, including disabled options; disabled hover must not select an option. The user now defines image_to_video as exactly one image used as first_frame, with no extra references in that UI mode. Multiple images must use another compatible mode without losing materials; first/last-frame mode still permits an optional last frame. This is an explicit product boundary: the currently integrated Omni API documents first_frame plus refer_image combinations, so it must not be misreported as a universal upstream single-image restriction. Do not switch model routes or billing. Keep the historical shared provider contract permissive enough to restore and retry existing multi-image frozen records; enforce the new restriction for editable UI and new submissions. Persist this distinction and cite the exact official source in factual answers, rather than inferring from a UI label.

## Optional last frame and concise type menu · 2026-10-06 · GG-393

The user removes supplementary descriptions from video-type options and enables first/last-frame mode with one image. The official Omni API documentation fetched on this date explicitly permits first-frame-only and first-plus-last inputs, while excluding last-frame-only. Require the first frame, make the last optional, and keep the selected UI mode when the last image is removed. For a first-frame-only composition, freeze and submit the existing image_to_video type with the original first_frame content so the running legacy Web/Worker remain compatible; both modes use the same Omni provider route. Preserve first_last_frame when an actual last-frame input exists. This supersedes GG-392's two-image availability threshold and the former mandatory-last-frame check; prices, frozen retries and remaining limits are unchanged. No runtime update or real generation is performed.

## Material-driven types and model identity · 2026-10-06 · GG-392

Display the existing provider models as Kling O3 and Kling 3.0 with the user's monochrome Kling mark; retain their provider IDs and routes. Media is connected or selected before choosing a generation type. With no image/video only text-to-video is available; images allow image/reference generation and at least two images allow first/last frames. One video allows reference generation/video editing, and exactly one image plus one video enables motion control. Preserve provider image/video limits and reject excess materials rather than ignoring them. Disable incompatible types and models with concise requirements. When materials invalidate the current choice, choose a deterministic compatible type and redistribute roles without discarding materials. Retain a compatible user choice and explicit valid first/last roles. Pending uploads still block submission. Do not adapt active jobs, frozen inputs or independent retries, and never submit automatically due to this UI change. This supersedes the former choose-type-then-supply-material interaction only.

## Storyboard dialog · 2026-10-06 · GG-390

Move shot controls out of the video parameter popover into a focused Dialog, opened by 智能分镜 immediately after the generation-type control. Offer single, automatic and editable manual shots for supported Omni types; motion control and video editing remain excluded, and feature-video references force automatic shots. Stage edits locally and apply only on confirmation; cancel, outside dismissal and Escape discard them. Preserve the existing multiShot/shots contract and pricing. Manual generation uses only the effective shot prompts, incorporating connected text into the first shot without exceeding existing limits; retain the ordinary composer draft for returning to single/automatic mode. No new planning-provider call, backend protocol or charge is introduced.

## Generation quantity · 2026-10-06 · GG-389

Offer 1, 2 and 4 videos in the existing parameter controls, with a legacy-compatible default of 1. Persist this optional composer count in the canvas draft. Each video uses the unchanged single-video API, its own frozen input, request ID, result node and server-authoritative quote/reservation. Preallocate every result node before submission, show the total estimated credits, and retain failed nodes for individual retries of exactly one video. Keep ambiguous submissions on their original ID for query recovery; confirmed pre-acceptance failures retain a bounded message and frozen input in the draft. Do not invent an upstream count parameter or change provider pricing. Web needs the new draft validator before cloud persistence accepts these optional fields; Worker and database remain unchanged. Build/restart still require separate user authorization under the source-only agreement.

## Parameter resize recovery and duration copy · 2026-10-06 · GG-388

Keep the existing integer duration slider, but show the selected seconds only beside its label. Remove endpoint labels and duration from the collapsed parameter summary. Preserve the stored duration, range, pricing and motion-control behavior. The parameter panel must not size itself from the available-height variable written by Popper's size observer. Instead, compute its height cap from the trigger position and viewport in animation frames, write only changed caps and cancel on unmount; positioning, collision flipping and internal scrolling remain Radix behavior. Do not suppress global ResizeObserver errors. Source inspection identifies this feedback path, while manual reproduction and acceptance remain with the user.

## Decision

Implement a numbered video generator with the existing image chat presentation and one mixed text/image/video input. Its three controls are model, generation type and video parameters. Support Omni text, first frame, first/last frame, reference, video edit and Kling motion control. The user's attached O1Key contract is authoritative: create and query under `/kling/omni-video/kling-3.0-omni` or `/kling/motion-control/kling-3.0`, using `contents/settings/options` and the reseller task response. Do not substitute the official task envelope or add undocumented element/cancel APIs.

Omni starts at 720p, five seconds, 16:9, audio off and single shot. Motion exposes only resolution, character orientation and original/off audio; duration comes from its validated video. Preserve connected materials when changing types and show missing/incompatible roles before submission. Images use the owned private originals; upstream video receives a server-created readable URL, never client-supplied URLs or representative frames.

Use dedicated durable video jobs and the existing Worker, with server-side credentials and ownership checks. Persist the submission attempt before calling upstream, and never repeat an ambiguous paid POST automatically. Poll by the returned task ID, retain failed slots and freeze retry inputs. Persist successful provider results before private video ingestion; an ingestion retry only saves that result. No cancellation is advertised because the attached API has no cancellation endpoint.

The user selected prices by model, resolution and duration. Configure positive integer per-second platform credit rates in the server-only `GOODGOOD_VIDEO_CREDIT_RATES_JSON`, keyed by provider model then resolution; missing rates fail closed. No numerical rate has been authorized yet. Omni quotes requested seconds; motion quotes the ceiling of the authorized source video's decoded duration. Reseller `cost` remains separate. Reserve before dispatch, settle after private delivery succeeds, and release confirmed failures. Saving failures and ambiguous submissions retain reservations until reconciled. Never borrow text's fixed twenty credits. User-upload limits remain the existing 20 MiB MP4 policy; generated video ingestion is separately bounded at 200 MiB.

This changes the prior transient-only video scope specifically for canvas Kling. Existing Seedance preview remains transient and unrelated. Source, migration, runtime activation and production are separate states. The user retains manual acceptance: no automatic builds, code checks, tests, browser acceptance, migration application or restart in GG-384.

## Temporary local activation · 2026-10-05 · GG-385

The user now authorizes the agent to pick temporary rates and activate the local backend for manual canvas UI acceptance. Omni720p/1080p/4k use 10/20/40 platform credits per second; motion720p/1080p use 10/20. The default five-second720p Omni quote is50 credits. Keep these server-only in the external local pricing file; they do not describe provider monetary costs. This authorization includes additive local0067/0068 migrations, the necessary build and replacement of Web/the unique Worker, with existing Vite/data retained. It does not authorize automatic real generation, code checks/tests/browser acceptance or production changes.

## Composer alignment · 2026-10-05 · GG-386

The user requests alignment with the actual image generator composer. Use its660px viewport-clamped width and12px node offset, shared Attachment and image/text/video preview styling, parameter/type controls on the left and the model/credit generation action on the right. Replace the bespoke inline parameter form with the same Radix Popover surface and toggle/ratio vocabulary as the image settings; the portal prevents node-toolbar clipping and keeps composer height stable. Retain a compact duration Select and bounded scrolling for manual shots. Empty attachments do not create an extra row: add media from the small toolbar control. Long prompts receive the image composer expand/collapse and scroll affordances. Actual image source currently sends with CreditIcon/credit amount, so video uses that actual action rather than outdated ArrowUp notes. No image composer code, video contract, billing, provider, durable job behavior or runtime changes. UI acceptance remains manual.

## Duration slider · 2026-10-06 · GG-387

The user replaces the compact duration Select with a horizontal slider. Keep the existing integer3–15second domain, show the current seconds, preserve disabled states and source-derived motion duration. Quote and persistence contracts stay unchanged. This supersedes GG-386's duration-control presentation only.


## GG-418 · 官方 Seedance 双线路 · accepted 2026-10-07

用户接受GG-417规划并要求按官方实现。持久视频范围扩展为Seedance 2.5/2.0/Fast/Mini及Doubao MAX/Dreamina HC，沿既有chat/结果插槽/手动播放器，不重置Kling默认和冻结请求。官方能力驱动共享UI与后台校验；2.5首尾/首帧/编辑/延长固定adaptive，编辑-1，2.5支持纯音频及30/10/10，2.0按9/3/3。封装单条文本/角色/型号/端点/回执独立映射，-1报价先预留上限，成功按实际时长安全退差；平台价格独立，临时价格经用户确认后以源码默认表实现，外部配置可覆盖。音频沿现有私有资产/画布节点接入，不复制用户资产；参考顺序稳定、成功转存、失败单项重试、未知受理不自动POST。首版无Draft/MOV输出/工具UI（MOV输入沿私有视频资产支持），不发送Kling专属镜头字段。依据docs/tasks/GG-417-seedance-api-research.md所引官方及最新封装文档。任务GG-418仅源码，尚未运行验证或启用。

## GG-420 · 线路作为独立参数 · accepted 2026-10-08

用户要求将模型菜单内的HC/MAX线路改为左侧视频参数「线路」，值为Doubao/Dreamina。仅Seedance显示该参数，当前值进入左侧参数摘要；模型菜单所有型号沿Kling的图标、名称和选中标记行样式，不嵌入线路切换或HC/MAX标签。内部standard/backup与实际MAX/HC上游型号保持，切线路只更新可编辑草稿和既有报价/保存；冻结任务和Kling参数不改变。本条取代GG-418的线路展示位置与名称，未改变接口、定价或生成能力。

GG-421（2026-10-08）：用户指定以doubao.svg替换Seedance图标；使用与Kling一致的16px固定图标及黑色mask样式，取代此前26px彩色ByteDance图标。
