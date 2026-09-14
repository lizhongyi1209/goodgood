import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {readPersonalProfile,updatePersonalProfile} from '../server/profile/api.mjs';
import {inspectReferenceCleanup} from '../server/references/cleanup-repository.mjs';

test('GG-072 disposable SQL profile persistence, unique handles, versions and owner/avatar isolation',{skip:process.env.GOODGOOD_GG072_INTEGRATION!=='1'},async()=>{
 const url=new URL(process.env.GOODGOOD_GG072_DATABASE_URL??'http://invalid');
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname));assert.match(url.pathname,/^\/goodgood_gg072_profile_test[a-z0-9_]*$/);assert.equal(process.env.GOODGOOD_GG072_NO_WORKER,'1');
 const pool=new pg.Pool({connectionString:url.href,max:1});
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 try {
  assert.equal((await pool.query(`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()`)).rowCount,0);
  assert.equal((await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`)).rowCount,0);
  await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY,status text);
   CREATE TABLE workspaces(id uuid PRIMARY KEY,kind text,name text,status text,personal_owner_id uuid);
   CREATE TABLE workspace_memberships(id uuid,workspace_id uuid,owner_id uuid,role text,status text);
   CREATE TABLE reference_assets(id uuid PRIMARY KEY,owner_id uuid,creator_owner_id uuid,workspace_id uuid,upload_state text,moderation_state text,object_key text,object_deleted_at timestamptz,cleanup_lease_owner uuid,cleanup_lease_expires_at timestamptz,cleanup_eligible_at timestamptz,expires_at timestamptz,error_code text);
   CREATE TABLE inspiration_cases(before_reference_id uuid,author_snapshot jsonb,deleted_at timestamptz);
   CREATE TABLE generation_batches(owner_id uuid,reference_snapshot jsonb);
   CREATE TABLE projects(owner_id uuid,reference_snapshot jsonb);
   CREATE TABLE creation_drafts(owner_id uuid,reference_snapshot jsonb,expires_at timestamptz);`);
  await pool.query(await readFile(new URL('../migrations/0035_gg072_personal_profiles.sql',import.meta.url),'utf8'));
  await pool.query(`INSERT INTO users VALUES($1,'active'),($2,'active'),($3,'suspended')`,[id(1),id(2),id(3)]);
  await pool.query(`INSERT INTO workspaces VALUES($1,'personal','one','active',$4),($2,'personal','two','active',$5),($3,'organization','team','active',NULL)`,[id(4),id(5),id(6),id(1),id(2)]);
  await pool.query(`INSERT INTO reference_assets(id,owner_id,creator_owner_id,workspace_id,upload_state,moderation_state) VALUES($1,$4,$4,$6,'ready','accepted'),($2,$5,$5,$7,'ready','accepted'),($3,$4,$4,$8,'ready','accepted')`,[id(10),id(11),id(12),id(1),id(2),id(4),id(5),id(6)]);
  const resources={pool};const ownerContext={ownerId:id(1)};const input={displayName:'Jony',handle:'@JONY',avatarReferenceId:null,version:0};
  assert.equal((await readPersonalProfile({ownerContext,resources})).version,0);assert.equal((await pool.query('SELECT * FROM personal_profiles')).rowCount,0);
  assert.equal((await updatePersonalProfile({ownerContext,input,resources})).handle,'jony');
  await assert.rejects(updatePersonalProfile({ownerContext,input,resources}),error=>error.code==='PROFILE_CONFLICT');
  await assert.rejects(updatePersonalProfile({ownerContext:{ownerId:id(2)},input,resources}),error=>error.code==='PROFILE_HANDLE_TAKEN');
  for(const avatarReferenceId of [id(11),id(12),id(99)]) await assert.rejects(updatePersonalProfile({ownerContext,input:{...input,version:1,avatarReferenceId},resources}),error=>error.code==='PROFILE_AVATAR_INVALID');
  const saved=await updatePersonalProfile({ownerContext,input:{...input,version:1,avatarReferenceId:id(10)},resources});assert.equal(saved.version,2);assert.equal(saved.avatarReferenceId,id(10));
  assert.equal((await readPersonalProfile({ownerContext,resources})).displayName,'Jony');assert.equal((await readPersonalProfile({ownerContext:{ownerId:id(2)},resources})).handle,null);
  await assert.rejects(readPersonalProfile({ownerContext:{ownerId:id(3)},resources}),error=>error.status===403);
  // Even an expired avatar stays protected in the shared cleanup projection.
  await pool.query(`UPDATE reference_assets SET upload_state='expired',expires_at=now()-interval '1 day' WHERE id=$1`,[id(10)]);
  const cleanup=await inspectReferenceCleanup(pool,{now:new Date()});assert.equal(cleanup.protected,1);assert.equal(cleanup.eligibleToStage,0);
  assert.equal((await updatePersonalProfile({ownerContext,input:{...input,version:2,avatarReferenceId:null},resources})).version,3);
  assert.equal((await inspectReferenceCleanup(pool,{now:new Date()})).eligibleToStage,1);
 } finally {await pool.end();}
});
