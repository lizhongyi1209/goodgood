import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadLocalEmailSmtpEnvironment } from "../scripts/local-email-smtp.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("real local email uses only external TLS SMTP settings and a separate password", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "goodgood-gg112-"));
  try {
    const passwordFile = path.join(directory, "password");
    const configFile = path.join(directory, "email.env");
    await writeFile(passwordFile, "test-password\n");
    const settings = (overrides = "") => [
      "GOODGOOD_EMAIL_FROM=GoodGood <no-reply@example.test>",
      "GOODGOOD_EMAIL_SMTP_HOST=smtp.example.test",
      "GOODGOOD_EMAIL_SMTP_PORT=465",
      "GOODGOOD_EMAIL_SMTP_SECURE=true",
      "GOODGOOD_EMAIL_SMTP_USERNAME=dev@example.test",
      `GOODGOOD_EMAIL_SMTP_PASSWORD_FILE=${passwordFile}`,
      overrides,
    ].join("\n");
    await writeFile(configFile, settings());
    const environment = await loadLocalEmailSmtpEnvironment(configFile, root);
    assert.equal(environment.GOODGOOD_EMAIL_SMTP_HOST, "smtp.example.test");
    assert.equal(environment.GOODGOOD_EMAIL_SENDING_ENABLED, "true");
    assert.equal(environment.GOODGOOD_EMAIL_SMTP_PASSWORD, "");
    assert.equal(environment.GOODGOOD_EMAIL_SMTP_PASSWORD_FILE, passwordFile);

    await writeFile(configFile, settings("DATABASE_URL=postgres://prod.example/goodgood"));
    await assert.rejects(loadLocalEmailSmtpEnvironment(configFile, root), /unsupported settings/);
    await writeFile(configFile, settings().replace("smtp.example.test", "127.0.0.1"));
    await assert.rejects(loadLocalEmailSmtpEnvironment(configFile, root), /non-loopback host/);
    await writeFile(configFile, settings().replace("SECURE=true", "SECURE=false"));
    await assert.rejects(loadLocalEmailSmtpEnvironment(configFile, root), /implicit TLS/);
    await writeFile(passwordFile, " \n");
    await writeFile(configFile, settings());
    await assert.rejects(loadLocalEmailSmtpEnvironment(configFile, root), /must not be empty/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
