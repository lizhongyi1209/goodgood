import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesRecordedChecksum,
  migrationChecksum,
} from "../server/persistence/migrate.mjs";

const LF = "-- migration\nCREATE TABLE example (id uuid);\n";
const CRLF = LF.replace(/\n/g, "\r\n");

test("migration checksums ignore line-ending encoding, not content", () => {
  // The same migration checked out with different line endings must produce the
  // same checksum, or a Windows checkout reports an up-to-date database as
  // edited and db:migrate refuses to run.
  assert.equal(migrationChecksum(LF), migrationChecksum(CRLF));

  // A real content change must still change the checksum.
  assert.notEqual(
    migrationChecksum(LF),
    migrationChecksum(LF.replace("example", "renamed")),
  );
  assert.notEqual(
    migrationChecksum(LF),
    migrationChecksum(`${LF}SELECT 1;\n`),
  );
});

test("legacy recorded checksums stay accepted while real edits still fail", () => {
  // Rows written before normalization hold a hash of the raw bytes on disk at
  // the time, which may have been LF or CRLF.
  const lfHash = migrationChecksum(LF);
  const crlfRawHash = migrationChecksum(CRLF);

  assert.ok(matchesRecordedChecksum(lfHash, LF));
  assert.ok(matchesRecordedChecksum(lfHash, CRLF));
  assert.ok(matchesRecordedChecksum(crlfRawHash, LF));
  assert.ok(matchesRecordedChecksum(crlfRawHash, CRLF));

  // A recorded hash of edited content is not a line-ending variant and must be
  // rejected rather than silently accepted.
  const editedHash = migrationChecksum(LF.replace("example", "renamed"));
  assert.equal(matchesRecordedChecksum(editedHash, LF), false);
  assert.equal(matchesRecordedChecksum("not-a-checksum", LF), false);
});
