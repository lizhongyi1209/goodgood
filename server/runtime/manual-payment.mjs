import pg from "pg";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_MANUAL_PAYMENT_PRODUCT,
  previewManualPayment,
  recordManualPayment,
} from "../billing/manual-payment.mjs";

const { Pool } = pg;

export function parseManualPaymentArguments(arguments_) {
  const values = new Map();
  let execute = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--execute") {
      if (execute) throw new Error("--execute may be supplied only once.");
      execute = true;
      continue;
    }
    if (!["--email", "--operator", "--product-id", "--reference"].includes(argument)) {
      throw new Error(`Unknown manual payment argument: ${argument}`);
    }
    if (values.has(argument)) {
      throw new Error(`${argument} may be supplied only once.`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.`);
    }
    values.set(argument, value);
    index += 1;
  }
  for (const required of ["--email", "--operator", "--reference"]) {
    if (!values.has(required)) throw new Error(`${required} is required.`);
  }
  return {
    execute,
    input: {
      email: values.get("--email"),
      operatorId: values.get("--operator"),
      paymentReference: values.get("--reference"),
      productId: values.get("--product-id") ?? DEFAULT_MANUAL_PAYMENT_PRODUCT,
    },
  };
}

export async function runManualPaymentCommand({
  arguments_ = process.argv.slice(2),
  databaseUrl = process.env.DATABASE_URL,
  logger = console,
} = {}) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. For local use, run the Compose maintenance command documented in docs/DEPLOYMENT.md.",
    );
  }
  const command = parseManualPaymentArguments(arguments_);
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const result = command.execute
      ? await recordManualPayment(pool, command.input)
      : await previewManualPayment(pool, command.input);
    logger.log(
      JSON.stringify({
        event: command.execute
          ? "billing.manual_payment_recorded"
          : "billing.manual_payment_preview",
        mode: command.execute ? "execute" : "dry-run",
        ...result,
      }),
    );
    return result;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runManualPaymentCommand();
  } catch (error) {
    console.error(
      JSON.stringify({
        code: error?.code ?? "MANUAL_PAYMENT_FAILED",
        event: "billing.manual_payment_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  }
}
