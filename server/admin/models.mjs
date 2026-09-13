import {
  gptPricingQualities,
  specificationOutputPrice,
  modelQualityPriceContext,
} from "../../shared/contracts/gpt-quality-pricing.mjs";
import { randomUUID } from "node:crypto";
import {
  BANANA_LINES,
  supportsImageLines,
  isBananaLineReady,
  imagePriceContext,
  modelBananaLines,
  modelSpecificationPrices,
  isValidImageLine,
} from "../../shared/contracts/banana-lines.mjs";
import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { AdministrationError, adminAccessDeniedError } from "./errors.mjs";
import {
  MODEL_TEMPLATES,
  CREDIT_UNIT,
} from "../../shared/contracts/model-pricing.mjs";

function publicModel(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mediaType: row.media_type,
    adapterId: row.adapter_id,
    enabled: row.enabled,
    prices: row.prices,
    ...(supportsImageLines(row.adapter_id)
      ? { lines: modelBananaLines(row) }
      : {}),
    version: row.version,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function requireOwner(ownerContext, admin = true) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  if (admin && ownerContext.systemRole !== "site_owner")
    throw adminAccessDeniedError();
}

export function validateManagedModel(input) {
  const fail = (message) => {
    throw new AdministrationError("MODEL_REQUEST_INVALID", message, 400);
  };
  if (
    !input ||
    typeof input !== "object" ||
    !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(input.id ?? "")
  )
    fail("模型标识须为 2–80 位小写字母、数字、点、短横线或下划线。");
  const template = MODEL_TEMPLATES.find((item) => item.id === input.adapterId);
  if (!template) fail("请选择已接入的模型模板。");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (
    !name ||
    name.length > 80 ||
    description.length > 200 ||
    typeof input.enabled !== "boolean"
  )
    fail("请填写有效名称、说明和启用状态。");
  if (input.enabled && !template.ready)
    fail("该模板的生成线路尚未开放，暂时只能保存为禁用。");
  function parseSpecificationPrices(value, enabled) {
    const prices = {};
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail("规格价格格式无效。");
    for (const [resolution, price] of Object.entries(value)) {
      if (
        !template.resolutions.includes(resolution) ||
        !price ||
        !Number.isSafeInteger(price.output) ||
        price.output <= 0 ||
        price.output > 100000000 ||
        (template.mediaType === "video" &&
          (!Number.isSafeInteger(price.input) ||
            price.input < 0 ||
            price.input > 100000000))
      )
        fail("输出价必须大于零；参考秒价可以为零。价格精度为 1 积分。");
      const qualities = price.qualities;
      if (qualities !== undefined) {
        const allowed = gptPricingQualities(template.id).map((item) => item.id);
        if (
          !allowed.length ||
          !qualities ||
          typeof qualities !== "object" ||
          Array.isArray(qualities) ||
          Object.keys(qualities).some((id) => !allowed.includes(id)) ||
          allowed.some(
            (id) =>
              !Number.isSafeInteger(qualities[id]) ||
              qualities[id] <= 0 ||
              qualities[id] > 100000000,
          )
        )
          fail("请填齐该模型全部质量档位；价格必须为大于零的整数积分。");
      }
      prices[resolution] =
        template.mediaType === "video"
          ? { output: price.output, input: price.input }
          : { output: price.output, ...(qualities ? { qualities } : {}) };
    }
    if (
      Object.values(prices).some((price) => price.qualities) &&
      Object.values(prices).some((price) => !price.qualities)
    )
      fail("同一线路请统一使用固定价或质量定价。");
    if (
      enabled &&
      template.resolutions.some((resolution) => !prices[resolution])
    )
      fail("启用前请填齐该线路全部分辨率价格。");
    return prices;
  }
  let prices;
  let lines;
  if (supportsImageLines(template.id)) {
    const value = input.lines ?? {
      special: { enabled: input.enabled, prices: input.prices },
      quality: { enabled: false, prices: {} },
      dedicated: { enabled: false, prices: {} },
    };
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).some(
        (id) => !BANANA_LINES.some((line) => line.id === id),
      )
    )
      fail("线路配置无效。");
    lines = {};
    for (const { id, name: lineName } of BANANA_LINES) {
      const line = value[id];
      if (!line || typeof line.enabled !== "boolean")
        fail("请填写三条线路的启用状态。");
      if (line.enabled && !isBananaLineReady(template.id, id))
        fail(`${lineName}线路尚未接入，暂时只能保存为禁用。`);
      lines[id] = {
        enabled: line.enabled,
        prices: parseSpecificationPrices(
          line.prices,
          input.enabled && line.enabled,
        ),
      };
    }
    if (input.enabled && !Object.values(lines).some((line) => line.enabled))
      fail("启用模型前至少启用一条已定价线路。");
    prices = lines.special.prices;
  } else {
    if (input.lines && Object.keys(input.lines).length)
      fail("该模型不支持图片线路。");
    prices = parseSpecificationPrices(input.prices, input.enabled);
  }
  if (
    input.version !== null &&
    (!Number.isSafeInteger(input.version) || input.version < 1)
  )
    fail("版本无效，请刷新列表。");
  return {
    id: input.id,
    name,
    description,
    adapterId: template.id,
    mediaType: template.mediaType,
    enabled: input.enabled,
    ...(lines ? { lines } : {}),
    prices,
    version: input.version,
  };
}

export async function readManagedModels({
  ownerContext,
  resources = null,
  publicDirectory = false,
}) {
  requireOwner(ownerContext, !publicDirectory);
  const { pool } = resources ?? (await getGenerationResources());
  const result = await pool.query(
    "SELECT * FROM managed_models WHERE archived_at IS NULL ORDER BY updated_at, id",
  );
  return {
    models: result.rows
      .filter((row) => !row.archived_at && (!publicDirectory || row.enabled))
      .sort((left, right) => {
        const rank = (row) => {
          const index = MODEL_TEMPLATES.findIndex(
            (template) => template.id === row.id,
          );
          return index === -1 ? MODEL_TEMPLATES.length : index;
        };
        return rank(left) - rank(right) || left.id.localeCompare(right.id);
      })
      .map(publicModel),
  };
}

export async function saveManagedModel({
  ownerContext,
  input,
  resources = null,
}) {
  requireOwner(ownerContext);
  const model = validateManagedModel(input);
  const { pool } = resources ?? (await getGenerationResources());
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `managed-model:${model.id}`,
    ]);
    const previous = (
      await client.query(
        "SELECT * FROM managed_models WHERE id=$1 FOR UPDATE",
        [model.id],
      )
    ).rows[0];
    if ((previous?.version ?? null) !== model.version)
      throw new AdministrationError(
        "MODEL_VERSION_CONFLICT",
        "该模型已被更新或标识已存在，请刷新后重新编辑。",
        409,
      );
    if (previous?.archived_at)
      throw new AdministrationError(
        "MODEL_DISABLED",
        "该模型已移除，请刷新列表或添加新条目。",
        409,
      );
    if (previous && previous.adapter_id !== model.adapterId)
      throw new AdministrationError(
        "MODEL_REQUEST_INVALID",
        "已保存的接入模板不能更换，请添加新模型条目。",
        400,
      );
    const next = (
      await client.query(
        `INSERT INTO managed_models (id,name,description,media_type,adapter_id,enabled,prices,lines)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) ON CONFLICT (id) DO UPDATE SET name=$2,description=$3,
      enabled=$6,prices=$7::jsonb,lines=$8::jsonb,version=managed_models.version+1,updated_at=now() RETURNING *`,
        [
          model.id,
          model.name,
          model.description,
          model.mediaType,
          model.adapterId,
          model.enabled,
          JSON.stringify(model.prices),
          JSON.stringify(model.lines ?? {}),
        ],
      )
    ).rows[0];
    if (model.mediaType === "image") {
      const scopes = supportsImageLines(model.adapterId)
        ? BANANA_LINES.map(({ id }) => ({
            line: id,
            prices: model.lines[id].prices,
          }))
        : [{ line: undefined, prices: model.prices }];
      for (const scope of scopes) {
        const priorPrices = previous
          ? modelSpecificationPrices(previous, scope.line)
          : null;
        if (
          priorPrices &&
          JSON.stringify(priorPrices) === JSON.stringify(scope.prices)
        )
          continue;
        for (const [resolution, price] of Object.entries(scope.prices)) {
          for (const quality of price.qualities
            ? [
                "auto",
                ...gptPricingQualities(model.adapterId).map((item) => item.id),
              ]
            : [undefined]) {
            for (const count of model.adapterId === "nano-banana-pro"
              ? [1]
              : [1, 2, 4]) {
              await client.query(
                `INSERT INTO price_versions (id,model_id,resolution,output_count,plan_context,version,credit_unit,credit_amount,effective_from)
              SELECT $1,$2,$3,$4,$7,COALESCE(MAX(version),0)+1,$5,$6,now() FROM price_versions
              WHERE model_id=$2 AND resolution=$3 AND output_count=$4 AND plan_context=$7`,
                [
                  randomUUID(),
                  model.id,
                  resolution,
                  count,
                  CREDIT_UNIT,
                  String(specificationOutputPrice(price, quality) * count),
                  quality
                    ? modelQualityPriceContext(model, scope.line, quality)
                    : imagePriceContext(scope.line),
                ],
              );
            }
          }
        }
      }
    }
    await client.query(
      `INSERT INTO managed_model_events (id,model_id,actor_owner_id,before_record,after_record)
      VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)`,
      [
        randomUUID(),
        model.id,
        ownerContext.ownerId,
        previous ? JSON.stringify(previous) : null,
        JSON.stringify(next),
      ],
    );
    await client.query("COMMIT");
    return { model: publicModel(next) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveManagedModel({
  ownerContext,
  input,
  resources = null,
}) {
  requireOwner(ownerContext);
  if (
    !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(input?.id ?? "") ||
    !Number.isSafeInteger(input?.version) ||
    input.version < 1
  )
    throw new AdministrationError(
      "MODEL_REQUEST_INVALID",
      "请刷新列表后重新移除模型。",
      400,
    );
  const { pool } = resources ?? (await getGenerationResources());
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `managed-model:${input.id}`,
    ]);
    const previous = (
      await client.query(
        "SELECT * FROM managed_models WHERE id=$1 FOR UPDATE",
        [input.id],
      )
    ).rows[0];
    if (!previous || previous.archived_at)
      throw new AdministrationError(
        "MODEL_DISABLED",
        "该模型已移除或不存在，请刷新列表。",
        409,
      );
    if (previous.version !== input.version)
      throw new AdministrationError(
        "MODEL_VERSION_CONFLICT",
        "该模型已被更新，请刷新后重新移除。",
        409,
      );
    const next = (
      await client.query(
        "UPDATE managed_models SET archived_at=now(),enabled=false,version=version+1,updated_at=now() WHERE id=$1 RETURNING *",
        [input.id],
      )
    ).rows[0];
    await client.query(
      "INSERT INTO managed_model_events (id,model_id,actor_owner_id,before_record,after_record) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)",
      [
        randomUUID(),
        input.id,
        ownerContext.ownerId,
        JSON.stringify(previous),
        JSON.stringify(next),
      ],
    );
    await client.query("COMMIT");
    return { archived: true, id: input.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function requireEnabledImageModel(client, input) {
  const id = input.catalogModelId ?? input.modelId;
  const row = (
    await client.query("SELECT * FROM managed_models WHERE id=$1 FOR SHARE", [
      id,
    ])
  ).rows[0];
  if (
    !row ||
    row.archived_at ||
    !row.enabled ||
    row.media_type !== "image" ||
    row.adapter_id !== input.modelId ||
    !isValidImageLine(input.modelId, input.imageLine) ||
    (supportsImageLines(input.modelId) &&
      (!isBananaLineReady(input.modelId, input.imageLine) ||
        !modelBananaLines(row)[input.imageLine ?? "special"]?.enabled)) ||
    !modelSpecificationPrices(row, input.imageLine)[input.resolution]
  ) {
    throw new AdministrationError(
      "MODEL_DISABLED",
      "该模型或规格当前不可用，请刷新模型列表后选择其他模型。",
      409,
    );
  }
  return row;
}
