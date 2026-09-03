# ADR 0013: Dedicated staging secret-reader group

- Status: Accepted
- Date: 2026-09-03

## Context

The first M7 application start pulled the immutable image and applied all ten
migrations, but both application roles restarted before becoming healthy. The
image correctly runs as the unprivileged `node` user. Docker Compose implements
file-backed secrets as read-only bind mounts, so the host files retained their
`root:root 0600` ownership and the container user could not read them.

Making the secrets world-readable, running the application as root, or placing
the values in environment variables would weaken the accepted staging boundary.
Compose target `uid`, `gid`, and `mode` fields do not remap a local file-backed
secret, so that syntax alone does not solve the observed host permission issue.

## Decision

Create a dedicated host group named `goodgood-runtime-secrets`, without adding
the SSH administrator to it. Store the four application secret files as
`root:goodgood-runtime-secrets` with mode `0640`. Record that group's numeric
GID as the non-secret `GOODGOOD_STAGING_SECRET_GID` release value and add only
that supplementary GID to the application containers.

The staging preflight requires a positive numeric GID, exact `0640` secret-file
permissions, and matching file GIDs on Linux. Runtime configuration continues
to reference only the `/run/secrets/...` mounts, and secret values remain absent
from Compose environment data, image layers, logs, and the repository.

## Consequences

- The non-root image user can read only secret files deliberately mounted into
  its container and shared with the dedicated group.
- The SSH administrator still needs `sudo` to read or replace application
  secrets and is not made a member of the reader group.
- Host provisioning and secret rotation must preserve the dedicated group and
  `0640` mode; owner-only `0600` now fails the application staging preflight.
- Local file-backed Compose secrets remain a staging-host mechanism. A future
  orchestrator-native secret store may replace this group bridge without
  changing runtime secret paths.
