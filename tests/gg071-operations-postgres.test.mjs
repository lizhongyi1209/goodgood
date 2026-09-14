import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import {readOperations,queryOperationsLog,readOperationsDetail} from '../server/admin/operations-repository.mjs';

const enabled=process.env.GOODGOOD_GG071_INTEGRATION==='1';
test('GG-071 isolated SQL calendar, exact unit conversion, enterprise attribution and ledger lookup',{skip:!enabled},async()=>{
  const url=new URL(process.env.GOODGOOD_GG071_DATABASE_URL??'http://invalid');
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  assert.match(url.pathname,/^\/goodgood_gg071_operations_test[a-z0-9_]*$/);
  assert.equal(process.env.GOODGOOD_GG071_NO_WORKER,'1');
  const pool=new pg.Pool({connectionString:url.href,max:1});
  const client=await pool.connect();
  try {
    const peers=await client.query(`SELECT application_name FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()`);
    assert.equal(peers.rowCount,0,'Disposable fixture database must have no other connections/Worker');
    const tables=await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
    assert.equal(tables.rowCount,0,'Named fixture database must be empty');
    await client.query(`CREATE TABLE users(id uuid,email text,created_at timestamptz);
      CREATE TABLE workspaces(id uuid,kind text,name text);
      CREATE TABLE credit_accounts(id uuid,owner_id uuid,unit text);
      CREATE TABLE workspace_credit_accounts(id uuid,unit text);
      CREATE TABLE generation_batches(id uuid,catalog_model_name text,model_id text,resolution text,aspect_ratio text,requested_count integer,image_line text,quality text,quoted_credit_amount bigint,quoted_credit_unit text);
      CREATE TABLE generation_jobs(id uuid,batch_id uuid,creator_owner_id uuid,workspace_id uuid,submitted_at timestamptz,completed_at timestamptz,state text,error_code text,started_at timestamptz);
      CREATE TABLE payment_orders(owner_id uuid,paid_at timestamptz,state text,provider text,currency text,credit_unit text,money_amount_minor bigint,credit_amount bigint);
      CREATE TABLE credit_ledger_entries(id uuid,account_id uuid,owner_id uuid,entry_type text,amount bigint,reason text,related_job_id uuid,prior_entry_id uuid,created_at timestamptz);
      CREATE TABLE workspace_credit_ledger_entries(id uuid,account_id uuid,workspace_id uuid,entry_type text,amount bigint,reason text,related_job_id uuid,prior_entry_id uuid,created_at timestamptz);`);
    const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
    const before='2026-09-13T15:59:59.999Z',start='2026-09-13T16:00:00Z',end='2026-09-14T16:00:00Z';
    await client.query(`INSERT INTO users VALUES($1,'creator@example.invalid',$3),($2,'owner@example.invalid',$4)`,[id(1),id(2),start,before]);
    await client.query(`INSERT INTO workspaces VALUES($1,'personal','个人'),($2,'organization','测试企业')`,[id(3),id(4)]);
    await client.query(`INSERT INTO credit_accounts VALUES($1,$3,'credit'),($2,$3,'credit-cny-cent')`,[id(5),id(6),id(1)]);
    await client.query(`INSERT INTO workspace_credit_accounts VALUES($1,'credit-cny-cent')`,[id(7)]);
    for(const n of [8,9,10,11]) await client.query(`INSERT INTO generation_batches VALUES($1,'提交时名称','nano-banana-2','2K','16:9',1,'special','auto',10,'credit')`,[id(n)]);
    await client.query(`INSERT INTO generation_jobs VALUES
      ($1,$5,$9,$10,$12,$11,'succeeded',NULL,$12),
      ($2,$6,$9,$13,$11,$11,'succeeded',NULL,$12),
      ($3,$7,$9,$10,$11,$11,'failed','GENERATION_FAILED',NULL),
      ($4,$8,$9,$10,$14,NULL,'queued',NULL,NULL)`,[id(12),id(13),id(14),id(15),id(8),id(9),id(10),id(11),id(1),id(3),start,before,id(4),end]);
    const personal=async(n,type,amount,account,job,prior,time=start,reason='generation')=>client.query(`INSERT INTO credit_ledger_entries VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id(n),id(account),id(1),type,String(amount),reason,job?id(job):null,prior?id(prior):null,time]);
    await personal(20,'reserve',-10,5,12,null,before);
    await personal(21,'settle',-10,5,12,20);
    await personal(22,'refund',5,5,12,21);
    await personal(23,'reserve',-9007199254740993n,6,14,null);
    await personal(24,'release',9007199254740993n,6,14,23);
    await personal(25,'grant',100,6,null,null,start,'credit_unit_exchange');
    await personal(26,'settle',-999,6,15,null,end);
    await client.query(`INSERT INTO workspace_credit_ledger_entries VALUES
      ($1,$3,$4,'reserve',-30,'generation',$5,NULL,$6),
      ($2,$3,$4,'settle',-30,'generation',$5,$1,$6)`,[id(27),id(28),id(7),id(4),id(13),start]);
    await client.query(`INSERT INTO payment_orders VALUES
      ($1,$3,'paid','manual','CNY','credit',123,100),
      ($1,$3,'paid','manual','CNY','credit-cny-cent',77,77),
      ($2,$4,'paid','manual','CNY','credit-cny-cent',999,999),
      ($2,$5,'paid','manual','CNY','credit-cny-cent',999,999),
      ($1,$3,'paid','fake','CNY','credit-cny-cent',999,999),
      ($1,$3,'pending','manual','CNY','credit-cny-cent',999,999),
      ($1,$3,'paid','manual','USD','credit-cny-cent',999,999)`,[id(1),id(2),start,before,end]);
    // Three overlapping runs on Sept 12; equal-time handoff cannot create 4.
    for(const [n,begin,finish] of [[40,'2026-09-11T15:55:00Z','2026-09-11T16:05:00Z'],
      [41,'2026-09-11T16:00:00Z','2026-09-11T16:10:00Z'],
      [42,'2026-09-11T16:00:00Z','2026-09-11T16:05:00Z'],
      [43,'2026-09-11T16:05:00Z','2026-09-11T16:15:00Z']]) {
      await client.query(`INSERT INTO generation_jobs(id,creator_owner_id,submitted_at,started_at,completed_at,state)
        VALUES($1,$2,$3,$3,$4,'succeeded')`,[id(n),id(1),begin,finish]);
    }
    await client.query(`INSERT INTO generation_jobs(id,creator_owner_id,submitted_at,completed_at,state)
      VALUES($1,$2,'2026-09-10T16:00:00Z','2026-09-10T16:10:00Z','succeeded')`,[id(44),id(1)]);
    // All production projection calls run under a real read-only transaction.
    await client.query('BEGIN READ ONLY');
    const reader={query:(...args)=>client.query(...args)};
    const dashboard=await readOperations(reader,{from:'2026-09-14',to:'2026-09-14'});
    assert.deepEqual(dashboard.days[0],{day:'2026-09-14',peak:'0',rechargeAmountMinor:'200',rechargeOrders:'2',rechargeUsers:'1',rechargeCredits:'277',creators:'1',succeeded:'2',failed:'1',cancelled:'0',users:'1',settled:'50',refunded:'10',released:'9007199254740993'});
    assert.equal(dashboard.concurrent,'0');assert.equal(dashboard.queued,'1');
    const peaks=await readOperations(reader,{from:'2026-09-10',to:'2026-09-12'});
    assert.deepEqual(peaks.days.map(d=>d.peak),['0',null,'3']);
    assert.ok(!Object.hasOwn(dashboard.days[0],'jobs'));
    const args={kind:'credits',from:'2026-09-14',to:'2026-09-14',limit:2,query:'creator@example.invalid',filter:'settle'};
    const charges=await queryOperationsLog(reader,args);
    assert.deepEqual(charges.items.map(item=>item.credits).sort(),['-20','-30']);
    assert.equal(charges.items.find(item=>item.fund==='organization').email,'creator@example.invalid');
    assert.equal(charges.next,null);
    const first=await queryOperationsLog(reader,{...args,filter:'',limit:1});
    const second=await queryOperationsLog(reader,{...args,filter:'',limit:1,cursor:first.next});
    assert.notEqual(first.items[0].id,second.items[0].id);
    const detail=await readOperationsDetail(reader,{kind:'tasks',id:id(12)});
    assert.equal(detail.job.model,'提交时名称');assert.equal(detail.job.quote,'20');
    assert.deepEqual(detail.timeline.map(item=>item.type),['reserve','settle','refund']);
    const failed=await queryOperationsLog(reader,{kind:'tasks',from:'2026-09-14',to:'2026-09-14',filter:'failed',limit:30});
    assert.equal(failed.items[0].id,id(14));
    assert.equal((await queryOperationsLog(reader,{...args,query:"' OR 1=1"})).items.length,0);
    await client.query('ROLLBACK');
    await client.query(`INSERT INTO generation_jobs(id,creator_owner_id,submitted_at,started_at,state)
      VALUES ($1,$3,now()-interval '10 seconds',now()-interval '10 seconds','running'),
        ($2,$3,now()-interval '10 seconds',now()-interval '10 seconds','refining')`,[id(45),id(46),id(1)]);
    await client.query('BEGIN READ ONLY');
    const today=(await client.query(`SELECT (now() AT TIME ZONE 'Asia/Shanghai')::date::text AS day`)).rows[0].day;
    const live=await readOperations(reader,{from:today,to:today});
    assert.equal(live.concurrent,'2');assert.equal(live.queued,'1');
    assert.ok(BigInt(live.days[0].peak)>=2n);
    await client.query('ROLLBACK');
  } finally {client.release();await pool.end();}
});
