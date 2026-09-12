import { spawnSync } from "node:child_process";

const down = process.argv.includes("--down");
const environment = {
  ...process.env,
  GOODGOOD_MAILPIT_PORT: process.env.GOODGOOD_MAILPIT_PORT ?? "58029",
  GOODGOOD_MOCK_GENERATION_PORT:
    process.env.GOODGOOD_MOCK_GENERATION_PORT ?? "31031",
  GOODGOOD_OBJECT_STORAGE_CONSOLE_PORT:
    process.env.GOODGOOD_OBJECT_STORAGE_CONSOLE_PORT ?? "59030",
  GOODGOOD_OBJECT_STORAGE_PORT:
    process.env.GOODGOOD_OBJECT_STORAGE_PORT ?? "59029",
  GOODGOOD_POSTGRES_PORT: process.env.GOODGOOD_POSTGRES_PORT ?? "55429",
  GOODGOOD_VALKEY_PORT: process.env.GOODGOOD_VALKEY_PORT ?? "56429",
  GOODGOOD_WEB_PORT: process.env.GOODGOOD_WEB_PORT ?? "31029",
  GOODGOOD_WORKER_HEALTH_PORT:
    process.env.GOODGOOD_WORKER_HEALTH_PORT ?? "31030",
};
const baseArguments = [
  "compose",
  "--project-name",
  "goodgood-gg029",
  "-f",
  "compose.yaml",
  "-f",
  "compose.email-otp-local.yaml",
];
const arguments_ = down
  ? [...baseArguments, "down"]
  : [...baseArguments, "up", "--build", "--detach", "--wait"];
const result = spawnSync("docker", arguments_, {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!down) {
  console.log(
    JSON.stringify({
      event: "email_otp.local_ready",
      inbox: `http://127.0.0.1:${environment.GOODGOOD_MAILPIT_PORT}`,
      web: `http://127.0.0.1:${environment.GOODGOOD_WEB_PORT}`,
    }),
  );
}
