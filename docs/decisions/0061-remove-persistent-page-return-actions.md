# ADR 0061: Remove persistent page-header return actions

- Status: Accepted
- Date: 2026-09-13
- Task: GG-050
- Refines: existing page-header navigation; no route or authorization changes

## Decision

Remove the persistent top-right return actions from the five audited page
families: Assets, credit activity, distributor management, enterprise management
and site-owner account management. Do not replace them with another return
button, breadcrumb, clickable logo or new navigation until a concrete need is
accepted. Enterprise content tabs and the existing main navigation remain.

The scope is the normal page header, including loading/empty/read-failure
states. Keep dialog/detail close controls, error-body recovery actions,
`新建创作`, logout, browser history and legacy scoped-creation recovery intact.
Remove unused return callbacks, icon imports and dedicated button styles.

## Consequences

Shared-shell pages continue to use existing navigation. `/admin/users` remains
a standalone page with logout and no in-page return entry; its shared-shell
integration is not authorized by this request. Enterprise directory URLs and
multi-company behavior remain compatible, but no header points back to the
directory. No creative state, backend access, business identity, credit or
persisted record is changed. This is a local candidate, not a production release.
