import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  runAccountDeletionCycle,
} from "../server/account-deletion/orchestrator.mjs";

const NOW = new Date("2026-09-07T10:00:00.000Z");

function resources() {
  return {
    config: { objectStorage: { bucket: "private-deletion-test" } },
    pool: {},
    storage: {},
  };
}

function identityAdapter() {
  return {
    async deleteIdentity() {},
    async disableIdentity() {},
  };
}

function lifecycle(overrides = {}) {
  return {
    overdue: 0,
    processing: 0,
    waitCompleted: 0,
    waitDue: 0,
    waitLeased: 0,
    ...overrides,
  };
}

function commonPass(overrides = {}) {
  return {
    claimed: 0,
    completed: 0,
    deferred: 0,
    failed: 0,
    lostLease: 0,
    ...overrides,
  };
}

function injectedRunners(overrides = {}) {
  return {
    async completion() {
      return {
        ...commonPass(),
        deletedIdentities: 0,
        deletedSessions: 0,
        expiredCredits: "0",
      };
    },
    async creative() {
      return { ...commonPass(), deletedRecords: 0 };
    },
    async identities() {
      return {
        ...commonPass(),
        deleted: 0,
        disabled: 0,
        identitiesClaimed: 0,
      };
    },
    async objects() {
      return { ...commonPass(), deleted: 0, objectsClaimed: 0 };
    },
    async preview() {
      return lifecycle();
    },
    async wait() {
      return commonPass();
    },
    ...overrides,
  };
}

function captureLogger() {
  const errors = [];
  const infos = [];
  return {
    errors,
    infos,
    logger: {
      error(message) { errors.push(message); },
      info(message) { infos.push(message); },
    },
  };
}

test("account-deletion cycle composes all real passes in order with aggregate-only evidence", async () => {
  const order = [];
  const captured = captureLogger();
  let previewCount = 0;
  const waitClaims = [{ requestId: "request-private-success" }];
  const objectClaims = [{
    objects: [{
      assetIds: ["asset-private-success"],
      objectKey: "private/owner-secret/image.png",
      referenceIds: [],
    }],
    requestId: "request-private-success",
  }];
  const creativeClaims = [{
    inventorySha256: "a".repeat(64),
    requestId: "request-private-success",
    targetRecordCount: 4,
  }];
  const identityClaims = [{
    identities: [{
      disabled: false,
      id: "identity-private-success",
      issuer: "https://fake-identity.invalid/oidc",
      subject: "subject-private-success",
    }],
    requestId: "request-private-success",
    targetIdentityCount: 1,
  }];
  const completionClaims = [{ requestId: "request-private-success" }];

  const result = await runAccountDeletionCycle(resources(), {
    batchSize: 1,
    deleteObject: async ({ bucket, key }) => {
      assert.equal(bucket, "private-deletion-test");
      order.push(`object-delete:${key}`);
    },
    identityAdapter: {
      async disableIdentity({ subject }) {
        order.push(`identity-disable:${subject}`);
      },
      async deleteIdentity({ subject }) {
        order.push(`identity-delete:${subject}`);
      },
    },
    identityBatchSize: 1,
    logger: captured.logger,
    now: NOW,
    objectBatchSize: 1,
    repositories: {
      completion: {
        async claimAccountDeletionCompletionStep() {
          order.push("completion-claim");
          return completionClaims.shift() ?? null;
        },
        async completeAccountDeletionLocally() {
          order.push("completion-complete");
          return {
            completed: true,
            deletedIdentityCount: 1,
            deletedSessionCount: 2,
            expiredCreditAmount: "100",
          };
        },
        async deferAccountDeletionCompletionStep() {
          assert.fail("successful completion must not defer");
        },
      },
      creative: {
        async claimAccountDeletionCreativeStep() {
          order.push("creative-claim");
          return creativeClaims.shift() ?? null;
        },
        async deleteAccountDeletionCreativeRecords() {
          order.push("creative-delete");
          return { completed: true, deletedRecordCount: 4 };
        },
        async deferAccountDeletionCreativeStep() {
          assert.fail("successful creative deletion must not defer");
        },
      },
      identities: {
        async claimAccountDeletionIdentityStep() {
          order.push("identity-claim");
          return identityClaims.shift() ?? null;
        },
        async markAccountDeletionIdentityDeleted() {
          order.push("identity-record-deleted");
          return { newlyRecorded: true, recorded: true };
        },
        async markAccountDeletionIdentityDisabled() {
          order.push("identity-record-disabled");
          return { newlyRecorded: true, recorded: true };
        },
        async resolveAccountDeletionIdentityStep() {
          order.push("identity-resolve");
          return { resolved: true, state: "completed" };
        },
      },
      objects: {
        async claimAccountDeletionObjectStep() {
          order.push("object-claim");
          return objectClaims.shift() ?? null;
        },
        async markAccountDeletionObjectSucceeded() {
          order.push("object-record");
          return true;
        },
        async resolveAccountDeletionObjectStep() {
          order.push("object-resolve");
          return { resolved: true, state: "completed" };
        },
      },
      wait: {
        async claimAccountDeletionWaitStep() {
          order.push("wait-claim");
          return waitClaims.shift() ?? null;
        },
        async inspectAccountDeletionLifecycle() {
          previewCount += 1;
          order.push(`preview-${previewCount}`);
          return previewCount === 1
            ? lifecycle({ processing: 1, waitDue: 1 })
            : lifecycle({ waitCompleted: 1 });
        },
        async resolveAccountDeletionWaitStep() {
          order.push("wait-resolve");
          return { resolved: true, state: "completed" };
        },
      },
    },
  });

  assert.deepEqual(order, [
    "preview-1",
    "wait-claim",
    "wait-resolve",
    "object-claim",
    "object-delete:private/owner-secret/image.png",
    "object-record",
    "object-resolve",
    "creative-claim",
    "creative-delete",
    "identity-claim",
    "identity-disable:subject-private-success",
    "identity-record-disabled",
    "identity-delete:subject-private-success",
    "identity-record-deleted",
    "identity-resolve",
    "completion-claim",
    "completion-complete",
    "preview-2",
  ]);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.alertCodes, []);
  assert.deepEqual(result.totals, {
    claimed: 5,
    completed: 5,
    deferred: 0,
    failed: 0,
    lostLease: 0,
  });
  assert.equal(result.passes.deletePrivateObjects.deleted, 1);
  assert.equal(result.passes.deleteCreativeRecords.deletedRecords, 4);
  assert.equal(result.passes.deleteExternalIdentities.deleted, 1);
  assert.equal(result.passes.anonymizeGoodGoodAccount.expiredCredits, "100");
  assert.equal(captured.errors.length, 0);
  assert.equal(captured.infos.length, 1);
  assert.doesNotMatch(
    JSON.stringify({ logs: captured.infos, result }),
    /owner-secret|request-private|subject-private|identity-private|asset-private/,
  );
});

test("account-deletion cycle treats an empty bounded pass as a successful no-op", async () => {
  const emptyRepository = {
    async claimAccountDeletionCompletionStep() { return null; },
    async claimAccountDeletionCreativeStep() { return null; },
    async claimAccountDeletionIdentityStep() { return null; },
    async claimAccountDeletionObjectStep() { return null; },
    async claimAccountDeletionWaitStep() { return null; },
    async inspectAccountDeletionLifecycle() { return lifecycle(); },
  };
  const captured = captureLogger();
  const result = await runAccountDeletionCycle(resources(), {
    identityAdapter: identityAdapter(),
    logger: captured.logger,
    now: NOW,
    repositories: {
      completion: emptyRepository,
      creative: emptyRepository,
      identities: emptyRepository,
      objects: emptyRepository,
      wait: emptyRepository,
    },
  });

  assert.equal(result.status, "ok");
  assert.deepEqual(result.totals, commonPass());
  assert.equal(captured.errors.length, 0);
  assert.equal(captured.infos.length, 1);
});

test("account-deletion cycle continues after handled failures and emits fixed redacted alerts", async () => {
  const phases = [];
  const captured = captureLogger();
  let previews = 0;
  const result = await runAccountDeletionCycle(resources(), {
    identityAdapter: identityAdapter(),
    logger: captured.logger,
    now: NOW,
    requestId: "request-must-not-be-logged",
    runners: injectedRunners({
      async completion() {
        phases.push("completion");
        return {
          ...commonPass({ claimed: 1, completed: 1 }),
          deletedIdentities: 1,
          deletedSessions: 1,
          expiredCredits: "25",
        };
      },
      async creative() {
        phases.push("creative");
        return { ...commonPass(), deletedRecords: 0 };
      },
      async identities() {
        phases.push("identities");
        return {
          ...commonPass(),
          deleted: 0,
          disabled: 0,
          identitiesClaimed: 0,
        };
      },
      async objects() {
        phases.push("objects");
        return { ...commonPass(), deleted: 0, objectsClaimed: 0 };
      },
      async preview() {
        previews += 1;
        return lifecycle(previews === 1 ? { overdue: 1 } : {});
      },
      async wait(_pool, options) {
        phases.push("wait");
        assert.match(options.workerId, /^account-deletion-cycle-.+-wait$/);
        return {
          ...commonPass({
            claimed: 2,
            deferred: 1,
            failed: 1,
            lostLease: 1,
          }),
          ownerId: "owner-must-be-stripped",
        };
      },
    }),
  });

  assert.deepEqual(phases, [
    "wait",
    "objects",
    "creative",
    "identities",
    "completion",
  ]);
  assert.equal(result.status, "attention");
  assert.deepEqual(result.alertCodes, [
    "ACCOUNT_DELETION_PASS_FAILED",
    "ACCOUNT_DELETION_LEASE_LOST",
    "ACCOUNT_DELETION_DEADLINE_OVERDUE",
  ]);
  assert.equal("ownerId" in result.passes.waitForSubmittedJobs, false);
  assert.equal(captured.errors.length, 3);
  assert.doesNotMatch(
    JSON.stringify({ logs: captured, result }),
    /request-must-not|owner-must-be-stripped/,
  );
});

test("account-deletion cycle aborts remaining mutations on an unexpected phase failure", async () => {
  const captured = captureLogger();
  let previews = 0;
  const result = await runAccountDeletionCycle(resources(), {
    identityAdapter: identityAdapter(),
    logger: captured.logger,
    now: NOW,
    runners: injectedRunners({
      async completion() {
        assert.fail("completion must not run after an aborted object phase");
      },
      async creative() {
        assert.fail("creative deletion must not run after an aborted object phase");
      },
      async identities() {
        assert.fail("identity deletion must not run after an aborted object phase");
      },
      async objects() {
        throw new Error("private/object-key and owner@example.invalid");
      },
      async preview() {
        previews += 1;
        return lifecycle();
      },
      async wait() {
        return commonPass({ claimed: 1, completed: 1 });
      },
    }),
  });

  assert.equal(result.status, "aborted");
  assert.equal(result.abortedPhase, "deletePrivateObjects");
  assert.deepEqual(result.alertCodes, ["ACCOUNT_DELETION_CYCLE_ABORTED"]);
  assert.equal(result.passes.waitForSubmittedJobs.completed, 1);
  assert.equal(result.passes.deletePrivateObjects, null);
  assert.equal(result.passes.deleteCreativeRecords, null);
  assert.equal(previews, 2);
  assert.match(captured.errors[0], /ACCOUNT_DELETION_CYCLE_ABORTED/);
  assert.doesNotMatch(captured.errors.join("\n"), /object-key|owner@example/);
});

test("account-deletion cycle fails closed when lifecycle observation is unavailable", async () => {
  const captured = captureLogger();
  const never = async () => assert.fail("no deletion phase may run without preview");
  const result = await runAccountDeletionCycle(resources(), {
    identityAdapter: identityAdapter(),
    logger: captured.logger,
    now: NOW,
    runners: injectedRunners({
      completion: never,
      creative: never,
      identities: never,
      objects: never,
      async preview() {
        throw new Error("request-secret lifecycle query failed");
      },
      wait: never,
    }),
  });

  assert.equal(result.status, "aborted");
  assert.equal(result.abortedPhase, "lifecyclePreview");
  assert.deepEqual(result.alertCodes, ["ACCOUNT_DELETION_OBSERVATION_FAILED"]);
  assert.deepEqual(result.totals, commonPass());
  assert.match(captured.errors[0], /ACCOUNT_DELETION_OBSERVATION_FAILED/);
  assert.doesNotMatch(captured.errors.join("\n"), /request-secret|query failed/);
});

test("account-deletion cycle validates its bounded server-only dependency surface", async () => {
  await assert.rejects(
    runAccountDeletionCycle(resources()),
    /identity deletion adapter/i,
  );
  await assert.rejects(
    runAccountDeletionCycle(resources(), {
      batchSize: 101,
      identityAdapter: identityAdapter(),
    }),
    /batchSize must be an integer between 1 and 100/,
  );
  await assert.rejects(
    runAccountDeletionCycle(
      { config: { objectStorage: {} }, pool: {}, storage: {} },
      { identityAdapter: identityAdapter() },
    ),
    /bucket is required/,
  );

  const source = await readFile(
    new URL("../server/account-deletion/orchestrator.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /authing-identity-adapter|process\.env|server\/runtime|setInterval|setTimeout/,
  );
});
