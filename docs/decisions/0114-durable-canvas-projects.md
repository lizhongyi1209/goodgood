# ADR 0114: Durable canvas projects

## GG-218 addendum · pages inside a canvas project (2026-09-30)

The operator requested a default 页面1 and up to ten pages per existing canvas project, with compact upper-left tabs, an add icon and equal visual icon/type height. Each page owns its nodes, edges, generator drafts, reference bindings and undo history. Existing schemaVersion1 documents become a single page without changing IDs or existing database rows; new schemaVersion2 documents persist an ordered pages array with stable page IDs/names and the same page content fields. Retain aggregate project limits, ownership/workspace authorization and CAS. Reject a legacy single-page write over an accepted multi-page project rather than silently discard pages.

The active page and each page's view are browser-local preferences, following the existing view/content split; a switch alone does not produce a cloud content write. Add/delete and page content edits retain existing local-first cloud sync. Upload and generation callbacks stay attached to the original page after switching, with no task resubmission. The operator confirmed deletion behind a second confirmation; retain at least one page, do not delete shared library assets, and block deletion while upload, generation or unresolved submission recovery is active. No page rename, cross-page connections or new route is included. Preserve GG-216's accurate distinction between pending files and terminal local submission placeholders.

- Status: Accepted for GG-173 local implementation
- Date: 2026-09-29
- Task: GG-173
- Supersedes: ADR 0108's temporary canvas document, node layout, generator draft, connection, and name lifetime.

## Context

The standalone canvas started as a temporary React Flow surface. Refreshing, closing, or losing the network discards its node layout, generator drafts, connections, and name. The operator now requires each canvas to be a resumable project, with prompt feedback when changes cannot reach the server. Existing creative `projects` are a different record: their save API requires at least one generation batch and restores a creation session rather than a graph. Empty canvases must not create a fake generation batch.

## Decision

- A canvas has a stable, client-generated UUID and an addressable `/canvas/:projectId` URL. Opening `/canvas` creates a new canvas identity, not a legacy creative project. The shared project index presents both kinds with their own restore destinations.
- Store a versioned canvas document in a distinct owner/workspace-scoped `canvas_projects` record. The document contains stable node identities, supported media asset references, node geometry, connections, per-generator prompt/model/settings and ready direct-reference IDs, and the viewport. Browser-only callbacks, Blob URLs, signed URLs, selection and transient menus are never persisted as server data. Server reads rehydrate media through authorized existing APIs.
- Save meaningful edits to IndexedDB first, including pending local `File` objects, then serialize remote saves. Coalesce movement frames and send the latest snapshot soon after an operation settles. A remote acknowledgment alone changes the status to synced. An interrupted upload retains its local file and can resume; a successful upload replaces the local placeholder with a durable asset ID and releases its local copy.
- Server writes carry an expected version and use compare-and-swap. An ambiguous response may be retried idempotently. When a second tab has written a different version, preserve both documents by saving this tab's dirty snapshot as a new canvas project and tell the user. No last-writer-wins overwrite.
- Failed or offline writes leave the local draft intact, show a clear unsynced state and retry on reconnection or explicit action. A reload restores a pending local snapshot before taking a remote result. A missing or unreadable local cache must not be described as saved. The existing generation and asset boundaries remain: creating or restoring a canvas never starts a provider request or spends credits.

## Consequences

This changes the previous explicit `/canvas` refresh-loss decision. Canvas project IDs remain separate from legacy creative project IDs, while the project index is a unified entry point. The browser cache is a recovery layer, not an authorization source or a replacement for server persistence. A ready asset remains an owner-scoped asset even if its node is removed; a pending local file needs IndexedDB capacity until its upload completes. The initial local implementation requires a backend checkpoint containing the new route and migration before the proxied 5173 interface can sync.

## GG-175 amendment · Separate content from the view

The operator chose content-scoped autosave after reviewing the initial GG-173 behavior. Pan, zoom, fit view, selection, hover, playback, and panel changes do not mark the canvas project dirty or send a server write. The last viewport is a per-browser preference saved after movement settles; an existing document viewport remains a fallback for older projects and is incidentally refreshed when actual content is saved. Node geometry, graph structure, generator inputs, name, ready asset identities, and result identities remain project content. Coalesce continuous gestures, compare normalized content before local writes, and skip server PUT when its normalized payload has not changed. The first empty project must still be created remotely. Browser-close handlers may attempt to flush pending work, but regular in-session persistence carries the durability guarantee; an asynchronous IndexedDB transaction at page close cannot be relied on.
