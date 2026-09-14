import { sessionExpiredError } from '../auth/errors.mjs';
import { getGenerationResources } from '../generation/resources.mjs';
import { AdministrationError, adminAccessDeniedError } from './errors.mjs';
import * as defaultRepository from './operations-repository.mjs';

// Historical ledger IDs include deterministic MD5 UUIDs with arbitrary version bits.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (message) => { throw new AdministrationError('ADMIN_REQUEST_INVALID',message,400); };
export function validateOperationsInput(input = {}, detail = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('查询内容无效。');
  const kind = input.kind ?? 'tasks';
  if (!['tasks','credits'].includes(kind)) invalid('日志类型无效。');
  if (detail) {
    if (typeof input.id !== 'string' || !UUID.test(input.id)) invalid('记录标识无效。');
    return {kind,id:input.id};
  }
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const from = input.from ?? today, to = input.to ?? today;
  for (const date of [from,to]) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) invalid('日期无效。');
  }
  const span = (Date.parse(to)-Date.parse(from))/86400000;
  if (span < 0 || span > 89) invalid('请选择最多 90 天的时间范围。');
  const query = input.query ?? '';
  if (typeof query !== 'string' || query.length > 100 || /[\u0000-\u001f\u007f]/.test(query)) invalid('搜索内容无效或超过 100 字符。');
  const filter = input.filter ?? '';
  const allowed = kind === 'tasks' ? ['','queued','running','refining','succeeded','failed','cancelled']
    : ['','grant','reserve','settle','release','refund','expire','adjust','transfer_in','transfer_out'];
  if (!allowed.includes(filter)) invalid('日志筛选无效。');
  const limit = input.limit ?? 30;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) invalid('每页记录数必须在 1 到 100 之间。');
  let cursor = null;
  if (input.cursor != null) {
    try {
      if (typeof input.cursor !== 'string' || input.cursor.length > 500) throw new Error();
      cursor = JSON.parse(Buffer.from(input.cursor,'base64url').toString());
      if (!UUID.test(cursor.id) || typeof cursor.createdAt !== 'string' || Number.isNaN(Date.parse(cursor.createdAt))) throw new Error();
      cursor = { id:cursor.id, createdAt:new Date(cursor.createdAt).toISOString() };
    } catch { invalid('分页标识无效，请重新查询。'); }
  }
  return {kind,from,to,query:query.trim(),filter,limit,cursor};
}

export async function readSiteOperations({ input = {}, ownerContext, resources = null, repository = defaultRepository, action = 'dashboard' }) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  if (ownerContext.systemRole !== 'site_owner') throw adminAccessDeniedError();
  if (!['dashboard','logs','detail'].includes(action)) invalid('查询操作无效。');
  const options = validateOperationsInput(input,action === 'detail');
  const {pool} = resources ?? await getGenerationResources();
  if (action === 'dashboard') return repository.readOperations(pool,options);
  if (action === 'detail') {
    const result = await repository.readOperationsDetail(pool,options);
    if (!result) throw new AdministrationError('ADMIN_RECORD_NOT_FOUND','记录不存在，请重新查询。',404);
    return result;
  }
  const result = await repository.queryOperationsLog(pool,options);
  return {items:result.items,nextCursor:result.next ? Buffer.from(JSON.stringify(result.next)).toString('base64url') : null};
}
