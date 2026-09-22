import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  defaultLocalProviderTokenFile,
  resolveLocalProviderTokenFile,
} from "../scripts/local-provider-secret.mjs";
import { parseCommand } from "../scripts/run-local-stack.mjs";

test("GG101 local stack accepts only the three named lifecycle commands", () => {
  assert.equal(parseCommand(["config"]), "config");
  assert.equal(parseCommand(["up"]), "up");
  assert.equal(parseCommand(["down"]), "down");
  assert.throws(() => parseCommand([]), /Expected exactly one command/);
  assert.throws(() => parseCommand(["up", "extra"]), /Expected exactly one command/);
});

test("GG101 real-provider secret must be one external non-empty token", async (context) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "goodgood-gg101-"));
  const repositoryRoot = path.join(temporaryDirectory, "repository");
  const secretFile = path.join(temporaryDirectory, "development-o1key-token");
  context.after(() => rm(temporaryDirectory, { force: true, recursive: true }));
  await writeFile(secretFile, "dedicated-development-token\n");

  assert.equal(
    await resolveLocalProviderTokenFile({
      environment: { GOODGOOD_LOCAL_O1KEY_KEY_FILE: secretFile },
      repositoryRoot,
    }),
    path.resolve(secretFile),
  );
  await assert.rejects(
    resolveLocalProviderTokenFile({
      environment: {
        GOODGOOD_LOCAL_O1KEY_KEY_FILE: path.join(repositoryRoot, "secret"),
      },
      repositoryRoot,
    }),
    /must live outside the repository/,
  );
  await writeFile(secretFile, "two\nlines\n");
  await assert.rejects(
    resolveLocalProviderTokenFile({
      environment: { GOODGOOD_LOCAL_O1KEY_KEY_FILE: secretFile },
      repositoryRoot,
    }),
    /exactly one token/,
  );
});

test("GG101 default token location stays outside the checkout convention", () => {
  assert.equal(
    defaultLocalProviderTokenFile({ USERPROFILE: "C:\\Users\\Developer" }),
    path.join(
      "C:\\Users\\Developer",
      ".claude",
      "goodgood-local-secrets",
      "o1key-api-key.txt",
    ),
  );
});
