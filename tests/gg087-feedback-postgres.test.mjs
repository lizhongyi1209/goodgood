import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import {applyMigrations} from '../server/persistence/migrate.mjs';
import {createFeedback,listFeedback,readFeedback,readFeedbackImage,replyFeedback} from '../server/feedback/api.mjs';
test('GG087 named empty no-Worker PostgreSQL verifies feedback/image atomicity, ownership, replies and idempotency',{
  skip:process.env.GOODGOOD_GG087_INTEGRATION!=='1',timeout:60000,
},async()=>{
  const url=new URL(process.env.GOODGOOD_GG087_DATABASE_URL??'http://invalid');assert.ok(['127.0.0.1','localhost'].includes(url.hostname));assert.equal(url.port,'54449');assert.match(url.pathname,/^\/goodgood_gg087_feedback_test[a-z0-9_]*$/);assert.equal(process.env.GOODGOOD_GG087_NO_WORKER,'1');
  const pool=new pg.Pool({connectionString:url.href,max:8});
  try {
    assert.equal((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount,0);assert.equal((await pool.query('SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()')).rowCount,0);
    assert.equal((await applyMigrations({databaseUrl:url.href,logger:{log(){}}})).at(-1),'0041_gg087_problem_feedback.sql');
    const actor=randomUUID(),owner=randomUUID(),other=randomUUID();
    for(const [id,status] of [[actor,'active'],[owner,'pending'],[other,'active']])await pool.query('INSERT INTO users(id,email,status) VALUES($1,$2,$3)',[id,`gg087-${id}@example.invalid`,status]);
    await pool.query(`INSERT INTO system_role_assignments(id,owner_id,role,source,assigned_by_operator_id,reason,idempotency_key,operation_hash) VALUES($1,$2,'site_owner','bootstrap','gg087-test','isolated','gg087-owner',$3)`,[randomUUID(),actor,'a'.repeat(64)]);
    const objects=new Map();let putCount=0,failPut=0;
    const resources={pool,config:{objectStorage:{bucket:'gg087-memory',provisioningMode:'verify'}},storage:{async send(command){const args=command.input;if(command.constructor.name==='PutObjectCommand'){putCount++;if(putCount===failPut)throw Error('injected storage failure');objects.set(args.Key,Buffer.from(args.Body));}if(command.constructor.name==='DeleteObjectCommand')objects.delete(args.Key);if(command.constructor.name==='GetObjectCommand'){const bytes=objects.get(args.Key);return {ContentLength:bytes.length,Body:{async transformToByteArray(){return bytes;}}};}return {};}}};
    const png=await sharp({create:{width:128,height:128,channels:3,background:'#eeeeee'}}).png().toBuffer(),files=[{mimeType:'image/png',bytes:png}],ownerContext={ownerId:owner};
    const make=(overrides={})=>createFeedback({resources,ownerContext,input:{category:'generation',message:'图片生成页面出现错误'},files,idempotencyKey:'gg087-create-first',...overrides});
    const results=await Promise.all([make(),make()]);assert.deepEqual(results.map(r=>r.replayed).sort(),[false,true]);assert.equal(results[0].id,results[1].id);assert.equal(objects.size,1);
    const ticketId=results[0].id,detail=await readFeedback({resources,ownerContext,ticketId});assert.equal(detail.status,'open');assert.equal(detail.images.length,1);assert.doesNotMatch(JSON.stringify(detail),/object_key|ownerEmail|fingerprint/);
    assert.deepEqual((await readFeedbackImage({resources,ownerContext,ticketId,position:1})).bytes,png);
    await assert.rejects(readFeedback({resources,ownerContext:{ownerId:other},ticketId}),e=>e.status===404);await assert.rejects(readFeedbackImage({resources,ownerContext:{ownerId:other},ticketId,position:1}),e=>e.status===404);
    assert.equal((await listFeedback({resources,ownerContext:{ownerId:other}})).items.length,0);
    assert.equal((await readFeedback({resources,ownerContext:{ownerId:actor},ticketId,administrator:true})).ownerEmail.includes(owner),true);
    await assert.rejects(make({input:{category:'other',message:'changed'}}),e=>e.status===409);
    const before=putCount;await assert.rejects(make({idempotencyKey:'gg087-invalid-image',files:[{mimeType:'image/jpeg',bytes:png}]}),e=>e.status===400);assert.equal(putCount,before);
    failPut=putCount+2;await assert.rejects(make({idempotencyKey:'gg087-storage-fault',files:[...files,...files]}),/injected storage/);assert.equal(objects.size,1);assert.equal((await pool.query('SELECT 1 FROM feedback_tickets WHERE request_key=$1',['gg087-storage-fault'])).rowCount,0);failPut=0;
    // Simulate a committed transaction with a lost COMMIT response; keep reachable images.
    let fault=true;const faultPool={query:pool.query.bind(pool),async connect(){const client=await pool.connect();return {release:()=>client.release(),async query(sql,args){const result=await client.query(sql,args);if(sql==='COMMIT'&&fault){fault=false;throw Error('lost COMMIT response');}return result;}};}};
    await assert.rejects(make({resources:{...resources,pool:faultPool},idempotencyKey:'gg087-lost-commit'}),/lost COMMIT/);assert.equal(objects.size,2);assert.equal((await make({idempotencyKey:'gg087-lost-commit'})).replayed,true);
    const adminContext={ownerId:actor},action={resources,ownerContext:adminContext,ticketId,input:{status:'processing',message:'已收到，正在检查',version:1},idempotencyKey:'gg087-reply-first'};
    const replies=await Promise.all([replyFeedback(action),replyFeedback(action)]);assert.deepEqual(replies.map(r=>r.replayed).sort(),[false,true]);
    const updated=await readFeedback({resources,ownerContext,ticketId});assert.equal(updated.status,'processing');assert.equal(updated.version,2);assert.equal(updated.events.length,1);assert.equal(updated.events[0].message,'已收到，正在检查');
    await assert.rejects(replyFeedback({...action,idempotencyKey:'gg087-stale-version'}),e=>e.code==='FEEDBACK_VERSION_CONFLICT');await assert.rejects(replyFeedback({...action,ownerContext:{ownerId:other}}),e=>e.status===403);
    await replyFeedback({...action,input:{status:'resolved',message:'',version:2},idempotencyKey:'gg087-resolve'});assert.equal((await readFeedback({resources,ownerContext,ticketId})).events.length,2);
    assert.equal((await listFeedback({resources,ownerContext:adminContext,administrator:true,input:{status:'resolved'}})).items.length,1);
    await assert.rejects(pool.query('DELETE FROM feedback_events'),/immutable/);
    for(let index=0;index<21;index++)await pool.query("INSERT INTO feedback_tickets(id,owner_id,category,message,request_key,fingerprint) VALUES($1,$2,'other','分页验证',$3,'fixture')",[randomUUID(),other,`gg087-page-${index}`]);
    const page=await listFeedback({resources,ownerContext:{ownerId:other}});assert.equal(page.items.length,20);assert.ok(page.nextCursor);const next=await listFeedback({resources,ownerContext:{ownerId:other},input:{cursor:page.nextCursor}});assert.equal(next.items.length,1);assert.equal(page.items.some(i=>i.id===next.items[0].id),false);
    await assert.rejects(make({ownerContext:{ownerId:other},idempotencyKey:'gg087-rate-limit'}),e=>e.status===429);
    await pool.query("UPDATE users SET status='suspended' WHERE id=$1",[actor]);await assert.rejects(replyFeedback({...action,idempotencyKey:'gg087-inactive-admin'}),e=>e.status===403);
  }finally{await pool.end();}
});
