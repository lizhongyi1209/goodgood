import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { verifyArtifactSecurityEvidence } from "./artifact-security-contract.mjs";
import { readProductionEvidence } from "./production-readiness-contract.mjs";

export function parseArtifactSecurityArguments(argumentsList) {
  const options = {};
  const names = {
    "--artifact-file": "artifactFile",
    "--evidence-file": "evidenceFile",
    "--github-token-file": "githubTokenFile",
  };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const name = names[argument];
    if (!name) throw new Error("Unknown artifact-security argument.");
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--") || options[name]) {
      throw new Error("Artifact-security arguments require one value each.");
    }
    options[name] = path.resolve(value);
    index += 1;
  }
  if (!options.artifactFile || !options.evidenceFile) {
    throw new Error("--artifact-file and --evidence-file are required.");
  }
  return Object.freeze(options);
}

function readGithubToken(filePath) {
  if (!filePath) return undefined;
  const metadata = lstatSync(filePath);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.size < 1 ||
    metadata.size > 4 * 1024 ||
    (process.platform !== "win32" && (metadata.mode & 0o077) !== 0)
  ) {
    throw new Error("GitHub token file is unsafe.");
  }
  const token = readFileSync(filePath, "utf8").trim();
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{19,3999}$/.test(token)) {
    throw new Error("GitHub token file is invalid.");
  }
  return token;
}

export async function importArtifactSecurityEvidence({
  artifactFile,
  evidenceFile,
  fetchImpl = fetch,
  githubTokenFile,
  now,
}) {
  return verifyArtifactSecurityEvidence({
    artifactFileBytes: readFileSync(artifactFile),
    evidenceDocument: readProductionEvidence(evidenceFile),
    fetchImpl,
    githubToken: readGithubToken(githubTokenFile),
    now,
  });
}

async function main() {
  try {
    const report = await importArtifactSecurityEvidence(
      parseArtifactSecurityArguments(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch {
    process.stderr.write(
      `${JSON.stringify(
        {
          checks: [
            {
              detail: "Artifact-security evidence could not be read or verified.",
              id: "execution",
              status: "fail",
            },
          ],
          evidence: null,
          ok: false,
          provenance: null,
          release: null,
          schemaVersion: 1,
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
