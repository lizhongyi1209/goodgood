import { runAuthenticationPreflight } from "../server/auth/preflight.mjs";

const argumentsSet = new Set(process.argv.slice(2));
const unknownArguments = [...argumentsSet].filter(
  (argument) => argument !== "--allow-loopback",
);

if (unknownArguments.length > 0) {
  process.stderr.write(
    `Unknown authentication preflight argument: ${unknownArguments.join(", ")}\n`,
  );
  process.exitCode = 2;
} else {
  const allowLoopback = argumentsSet.has("--allow-loopback");
  if (allowLoopback && process.env.NODE_ENV === "production") {
    process.stderr.write("--allow-loopback is forbidden when NODE_ENV=production.\n");
    process.exitCode = 2;
  } else {
    const report = await runAuthenticationPreflight({ allowLoopback });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  }
}
