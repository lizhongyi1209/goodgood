import { sessionExpiredError } from '../auth/errors.mjs';
import { getGenerationResources } from '../generation/resources.mjs';
import * as defaultRepository from './repository.mjs';
import { JcoinError } from './errors.mjs';
const UUID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function requireOwner(context, administrator=false) {
  if(!context?.ownerId) throw sessionExpiredError();
  if(context.accessStatus!=='active'||(administrator&&context.systemRole!=='site_owner')) throw new JcoinError('JCOIN_ACCESS_DENIED','当前账户没有平台币操作权限。',403);
  return context.ownerId;
}
export function validateJcoinQuery(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new JcoinError('JCOIN_INVALID','查询内容无效。');
  const limit=input.limit===undefined?20:Number(input.limit);
  if(!Number.isInteger(limit)||limit<1||limit>50) throw new JcoinError('JCOIN_INVALID','每页记录数必须为1至50。');
  let cursor=null;
  if(input.cursor) {
    try {if(typeof input.cursor!=='string'||input.cursor.length>500) throw new Error();cursor=JSON.parse(Buffer.from(input.cursor,'base64url').toString());
      if(!UUID.test(cursor.id)||typeof cursor.at!=='string'||Number.isNaN(Date.parse(cursor.at))) throw new Error();cursor={id:cursor.id,at:new Date(cursor.at).toISOString()};
    } catch {throw new JcoinError('JCOIN_INVALID','分页标识无效，请刷新后重试。');}
  }
  return {limit,cursor};
}
export async function readJcoin({ownerContext,input={},resources=null,repository=defaultRepository}) {
  const ownerId=requireOwner(ownerContext), query=validateJcoinQuery(input);
  const {pool}=resources??await getGenerationResources();
  const page=await repository.readOwnJcoin(pool,{ownerId,...query});
  return {balance:page.balance,earned:page.earned,reversed:page.reversed,todayEarned:page.todayEarned,nextCursor:page.nextCursor,
    items:page.items.map(item=>({id:item.id,kind:item.kind,amount:item.amount,consumptionCredits:item.consumptionCredits,occurredAt:item.occurredAt}))};
}
export async function queryJcoinPlan({ownerContext,resources=null,repository=defaultRepository}) {
  const ownerId=requireOwner(ownerContext,true),{pool}=resources??await getGenerationResources();
  return repository.readJcoinPlan(pool,{ownerId});
}
export async function actOnJcoinPlan({ownerContext,input,idempotencyKey,resources=null,repository=defaultRepository}) {
  const ownerId=requireOwner(ownerContext,true);
  if(!input||!['start','pause','resume','process'].includes(input.action)) throw new JcoinError('JCOIN_INVALID','平台币操作无效。');
  if(typeof idempotencyKey!=='string'||idempotencyKey.length<8||idempotencyKey.length>200||/[\u0000-\u001f\u007f]/.test(idempotencyKey)) throw new JcoinError('JCOIN_INVALID','缺少有效提交标识。');
  const {pool}=resources??await getGenerationResources();
  return repository.changeJcoinPlan(pool,{ownerId,action:input.action,idempotencyKey});
}
