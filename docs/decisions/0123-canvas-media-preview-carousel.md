# ADR 0123: Canvas media preview carousel

- Status: Accepted for GG-249 local implementation
- Date: 2026-10-01
- Task: GG-249
- Supersedes: GG-238's fullscreen, image-only scope and native scrolling rail for the canvas image preview entry only.

## Decision

The canvas image expand action opens a bounded floating viewer. The complete original image fits within a stage with explicit available width and height. The right rail contains current-scope images and video frame previews, without a visible title or scrollbar. Vertical wheel gestures select adjacent items; thumbnails align to the right, pack closely and may overlap. The selected thumbnail scales toward the left above its neighbors, with smooth movement and scaling. Reduced motion disables animation.

Keep click/arrow navigation, bounded ends, loading/retry, Escape and trigger focus restoration. Selected videos reuse the existing node-style canvas playback and private URL refresh. This is transient viewing only. The asset-page image viewer and original standalone video entry retain their current behavior. No backend, generation, upload or project persistence changes are required.
