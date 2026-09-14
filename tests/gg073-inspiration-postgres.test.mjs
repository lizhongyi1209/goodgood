import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {inspirationOperation} from '../server/inspiration/api.mjs';
import {inspectReferenceCleanup} from '../server/references/cleanup-repository.mjs';

test('GG-073 named disposable SQL publication, reuse, likes, shared permissions and audited withdrawal',{skip:process.env.GOODGOOD_GG073_INTEGRATION!=='1'},async()=>{
  const url=new URL(process.env.GOODGOOD_GG073_DATABASE_URL??'http://invalid');
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname));assert.match(url.pathname,/^\/goodgood_gg073_inspiration_test[a-z0-9_]*$/);assert.equal(process.env.GOODGOOD_GG073_NO_WORKER,'1');
  const pool=new pg.Pool({connectionString:url.href,max:4});
  const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  try {
    assert.equal((await pool.query('SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()')).rowCount,0);
    assert.equal((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount,0);
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY,status text);
      CREATE TABLE workspaces(id uuid PRIMARY KEY,kind text,name text,status text,personal_owner_id uuid);
      CREATE TABLE workspace_memberships(id uuid,workspace_id uuid,owner_id uuid,role text,status text);
      CREATE TABLE reference_assets(id uuid PRIMARY KEY,owner_id uuid,creator_owner_id uuid,workspace_id uuid,object_key text,original_file_name text,pixel_width int,pixel_height int,upload_state text,moderation_state text,object_deleted_at timestamptz,cleanup_lease_owner uuid,cleanup_lease_expires_at timestamptz,cleanup_eligible_at timestamptz,expires_at timestamptz,error_code text);
      CREATE TABLE personal_profiles(owner_id uuid,display_name text,handle text,avatar_reference_id uuid);
      CREATE TABLE generation_batches(id uuid PRIMARY KEY,owner_id uuid,workspace_id uuid,prompt text,reference_snapshot jsonb,model_id text,catalog_model_id text,catalog_model_name text,aspect_ratio text,resolution text,requested_count int,image_line text,thinking_level text,google_search bool,quality text,background text,output_format text);
      CREATE TABLE generation_jobs(id uuid PRIMARY KEY,owner_id uuid,workspace_id uuid,state text);
      CREATE TABLE assets(id uuid PRIMARY KEY,owner_id uuid,workspace_id uuid,job_id uuid,batch_id uuid,object_key text,pixel_width int,pixel_height int,moderation_state text);
      CREATE TABLE projects(owner_id uuid,reference_snapshot jsonb);
      CREATE TABLE creation_drafts(owner_id uuid,reference_snapshot jsonb,expires_at timestamptz);`);
    await pool.query(await readFile(new URL('../migrations/0036_gg073_inspiration_cases.sql',import.meta.url),'utf8'));
    await pool.query(`INSERT INTO users VALUES($1,'active'),($2,'active'),($3,'active'),($4,'suspended')`,[id(1),id(2),id(3),id(4)]);
    await pool.query(`INSERT INTO workspaces VALUES($1,'personal','first','active',$4),($2,'personal','second','active',$5),($3,'personal','owner','active',$6),($7,'organization','company','active',NULL)`,[id(11),id(12),id(13),id(1),id(2),id(3),id(14)]);
    await pool.query(`INSERT INTO reference_assets(id,owner_id,creator_owner_id,workspace_id,object_key,original_file_name,pixel_width,pixel_height,upload_state,moderation_state) VALUES($1,$4,$4,$5,'before/one','one.png',1024,1024,'ready','accepted'),($2,$4,$4,$5,'unselected/private','two.png',1024,1024,'ready','accepted'),($3,$6,$6,$7,'other/private','other.png',1024,1024,'ready','accepted'),($8,$4,$4,$5,'avatar/one','avatar.png',128,128,'ready','accepted')`,[id(21),id(22),id(23),id(1),id(11),id(2),id(12),id(24)]);
    await pool.query(`INSERT INTO personal_profiles VALUES($1,'Jony','jony',$2)`,[id(1),id(24)]);
    const snapshot=JSON.stringify([{id:id(21),name:'one.png'},{id:id(22),name:'two.png'}]);
    await pool.query(`INSERT INTO generation_batches VALUES($1,$2,$3,'高清放大，保留人物和构图',$4::jsonb,'nano-banana-2','nano-banana-2','Nano Banana 2','1:1','4K',4,'dedicated','high',false,'auto','auto','png')`,[id(31),id(1),id(11),snapshot]);
    await pool.query(`INSERT INTO generation_jobs VALUES($1,$2,$3,'succeeded')`,[id(41),id(1),id(11)]);
    await pool.query(`INSERT INTO assets VALUES($1,$2,$3,$4,$5,'results/one',4096,4096,'accepted')`,[id(51),id(1),id(11),id(41),id(31)]);
    await pool.query(`INSERT INTO generation_batches SELECT $1,owner_id,$2,prompt,reference_snapshot,model_id,catalog_model_id,catalog_model_name,aspect_ratio,resolution,requested_count,image_line,thinking_level,google_search,quality,background,output_format FROM generation_batches WHERE id=$3`,[id(32),id(14),id(31)]);
    await pool.query(`INSERT INTO generation_jobs VALUES($1,$2,$3,'succeeded')`,[id(42),id(1),id(14)]);
    await pool.query(`INSERT INTO assets VALUES($1,$2,$3,$4,$5,'company/private',4096,4096,'accepted')`,[id(52),id(1),id(14),id(42),id(32)]);
    const resources={pool,signRead:async key=>`http://127.0.0.1/fixture/${key}`};
    const call=(action,input={},who=1,caseId)=>inspirationOperation({action,id:caseId,input,ownerContext:{ownerId:id(who),systemRole:who===3?'site_owner':'member'},resources});
    const publish={assetId:id(51),beforeReferenceId:id(21),title:'高清放大图片',description:'保留构图与细节',consent:true};
    assert.equal((await call('list')).items.length,0);
    const prepared=await call('prepare',{assetId:id(51)});assert.equal(prepared.beforeOptions.length,2);assert.equal(prepared.author.handle,'jony');assert.ok(!JSON.stringify(prepared).includes('owner_id'));
    await assert.rejects(call('prepare',{assetId:id(51)},2),error=>error.status===404);
    await assert.rejects(call('publish',{...publish,assetId:id(52)}),error=>error.status===404);
    await assert.rejects(call('publish',{...publish,beforeReferenceId:id(23)}),error=>error.code==='INSPIRATION_BEFORE_UNAVAILABLE');
    const [first,retry]=await Promise.all([call('publish',publish),call('publish',publish)]);
    assert.equal(first.id,retry.id);assert.equal((await pool.query('SELECT * FROM inspiration_events')).rowCount,1);
    const detail=await call('detail',{},2,first.id);assert.equal(detail.canWithdraw,false);assert.equal(detail.before.url,'http://127.0.0.1/fixture/before/one');assert.ok(!JSON.stringify(detail).includes('unselected/private'));assert.ok(!('owner_id' in detail));
    await pool.query(`UPDATE personal_profiles SET display_name='Changed',handle='changed',avatar_reference_id=NULL WHERE owner_id=$1`,[id(1)]);
    assert.equal((await call('detail',{},2,first.id)).author.handle,'jony');
    const recipe=await call('use',{},2,first.id);assert.equal(recipe.recipe.prompt,prepared.prompt);assert.equal(recipe.recipe.count,1);assert.deepEqual(recipe.recipe.references,[]);assert.ok(!JSON.stringify(recipe).includes('results/one'));assert.ok(!('expectedPriceVersion' in recipe.recipe));assert.ok(!('projectId' in recipe.recipe));
    const likes=await Promise.all([call('like',{liked:true},2,first.id),call('like',{liked:true},2,first.id)]);assert.equal(likes[1].likes,1);assert.equal((await call('detail',{},2,first.id)).liked,true);
    assert.equal((await call('like',{liked:false},2,first.id)).likes,0);assert.equal((await call('like',{liked:false},2,first.id)).likes,0);
    assert.equal((await call('list',{query:'高清'},2)).items.length,1);assert.equal((await call('list',{query:"' OR 1=1"},2)).items.length,0);
    await assert.rejects(call('withdraw',{},2,first.id),error=>error.status===403);
    await assert.rejects(call('list',{},4),error=>error.status===403);
    // Published avatar stays protected after author changes private profile.
    await pool.query(`UPDATE reference_assets SET upload_state='expired',expires_at=now()-interval '1 day' WHERE id=$1`,[id(24)]);
    assert.equal((await inspectReferenceCleanup(pool,{now:new Date()})).protected,1);
    assert.equal((await call('detail',{},3,first.id)).canWithdraw,true);
    await call('withdraw',{},3,first.id);
    for(const action of ['detail','use','like','withdraw']) await assert.rejects(call(action,action==='like'?{liked:true}:{},2,first.id),error=>error.status===404);
    assert.equal((await call('list',{},2)).items.length,0);assert.equal((await pool.query('SELECT * FROM assets')).rowCount,2);assert.equal((await pool.query('SELECT * FROM generation_jobs')).rowCount,2);
    assert.equal((await pool.query("SELECT action FROM inspiration_events ORDER BY created_at,id")).rows.at(-1).action,'owner_remove');
    assert.equal((await inspectReferenceCleanup(pool,{now:new Date()})).eligibleToStage,1);
    await assert.rejects(call('publish',publish),error=>error.code==='INSPIRATION_REMOVED');
    await call('withdraw',{},3,first.id);assert.equal((await pool.query('SELECT * FROM inspiration_events')).rowCount,2);
    // Author withdrawal allows a new publication; owner removal above cannot be bypassed.
    await pool.query(`INSERT INTO assets SELECT $1,owner_id,workspace_id,job_id,batch_id,object_key,pixel_width,pixel_height,moderation_state FROM assets WHERE id=$2`,[id(53),id(51)]);
    const again=await call('publish',{...publish,assetId:id(53),beforeReferenceId:null});assert.equal(again.likes,0);assert.equal(again.before,null);await call('withdraw',{},1,again.id);
    const republished=await call('publish',{...publish,assetId:id(53),beforeReferenceId:null});assert.notEqual(republished.id,again.id);await call('withdraw',{},1,republished.id);
    // Same-millisecond rows must retain microseconds in keyset cursors.
    for(let n=100;n<121;n++) {
      await pool.query(`INSERT INTO assets SELECT $1,owner_id,workspace_id,job_id,batch_id,object_key,pixel_width,pixel_height,moderation_state FROM assets WHERE id=$2`,[id(n),id(51)]);
      await call('publish',{...publish,assetId:id(n),beforeReferenceId:null,title:`分页${n}`});
    }
    await pool.query(`UPDATE inspiration_cases SET created_at='2026-09-14T00:00:00.123456Z' WHERE deleted_at IS NULL`);
    const page1=await call('list',{},2),page2=await call('list',{cursor:page1.nextCursor},2);
    assert.equal(page1.items.length,20);assert.equal(page2.items.length,1);assert.ok(!page1.items.some(item=>item.id===page2.items[0].id));assert.equal(page2.nextCursor,null);
  } finally {await pool.end();}
});
