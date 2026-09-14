import { GenerationPersistenceError } from "../generation/repository.mjs";

export function hiddenPresetPrompt(preset, supplement = "") {
  if (
    typeof preset !== "string" ||
    !preset.trim() ||
    typeof supplement !== "string" ||
    supplement.trim().length > 4000
  )
    throw new GenerationPersistenceError(
      "INVALID_PROMPT",
      "补充提示词最多 4000 个字符。",
      400,
    );
  return supplement.trim()
    ? `${preset.trim()}\n${supplement.trim()}`
    : preset.trim();
}

export async function lockHiddenPreset(client, caseId, supplement) {
  const row = (
    await client.query(
      `SELECT c.prompt FROM inspiration_cases c
    JOIN assets a ON a.id=c.source_asset_id JOIN generation_jobs j ON j.id=a.job_id
    JOIN workspaces w ON w.id=a.workspace_id
    WHERE c.id=$1 AND c.deleted_at IS NULL AND c.prompt_visibility='hidden'
    AND a.moderation_state='accepted' AND j.state='succeeded'
    AND a.owner_id=c.owner_id AND j.owner_id=c.owner_id
    AND w.kind='personal' AND w.personal_owner_id=c.owner_id AND w.status='active'
    FOR SHARE OF c`,
      [caseId],
    )
  ).rows[0];
  if (!row)
    throw new GenerationPersistenceError(
      "INSPIRATION_NOT_FOUND",
      "案例已下架或预设不可用，请重新选择案例。",
      404,
    );
  return hiddenPresetPrompt(row.prompt, supplement);
}

export async function frozenPresetForJob(pool, jobId) {
  return (
    (
      await pool.query(
        "SELECT case_id,effective_prompt,parameters_hidden FROM inspiration_generation_prompts WHERE job_id=$1",
        [jobId],
      )
    ).rows[0] ?? null
  );
}
