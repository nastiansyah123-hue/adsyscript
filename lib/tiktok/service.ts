import 'server-only';
import {adminClient} from '../supabase/admin';import {encrypt,decrypt} from '../crypto';import {apify,actorRequest,commentsFromDataset,startInput,TikTokError} from './core';
function check(error:{code?:string}|null){if(!error)return;if(['42P01','PGRST205','PGRST202','42883'].includes(error.code||''))throw new TikTokError('Jalankan migrasi 202611140001_tiktok.sql di Supabase untuk mengaktifkan fitur ini.',503);throw new TikTokError('Data impor TikTok belum dapat disimpan.',503)}
async function tokenFor(owner:string){const {data,error}=await adminClient().from('tiktok_credentials').select('token_encrypted').eq('owner_id',owner).maybeSingle();check(error);if(!data)throw new TikTokError('Hubungkan token Apify di Pengaturan terlebih dahulu.',412);try{return decrypt(data.token_encrypted)}catch{throw new TikTokError('Simpan ulang token Apify di Pengaturan.',412)}}
export async function tiktokOverview(owner:string){const db=adminClient();const [key,jobs]=await Promise.all([db.from('tiktok_credentials').select('last_four').eq('owner_id',owner).maybeSingle(),db.from('tiktok_imports').select('id,video_url,comment_limit,status,run_id,comments,error,batch_id,created_at,updated_at').eq('owner_id',owner).order('created_at',{ascending:false}).limit(20)]);check(key.error);check(jobs.error);return {connected:!!key.data,lastFour:key.data?.last_four||'',imports:jobs.data||[]}}
export async function saveTikTokToken(owner:string,token:string){const encrypted=encrypt(token);await apify('users/me',token);const {error}=await adminClient().from('tiktok_credentials').upsert({owner_id:owner,token_encrypted:encrypted,last_four:token.slice(-4),updated_at:new Date().toISOString()});check(error);return {ok:true}}
export async function removeTikTokToken(owner:string){const {error}=await adminClient().from('tiktok_credentials').delete().eq('owner_id',owner);check(error);return {ok:true}}
export async function startTikTok(owner:string,raw:unknown){
 const input=startInput.parse(raw),db=adminClient(),token=await tokenFor(owner);
 const old=await db.from('tiktok_imports').select('id').eq('id',input.requestId).eq('owner_id',owner).maybeSingle();check(old.error);if(old.data)return {id:old.data.id};
 const inserted=await db.from('tiktok_imports').insert({id:input.requestId,owner_id:owner,video_url:input.url,comment_limit:input.limit});
 if(inserted.error?.code==='23505')throw new TikTokError('Masih ada impor berjalan. Periksa status impor tersebut terlebih dahulu.',409);check(inserted.error);
 try{
 const r=await apify('acts/clockworks~tiktok-comments-scraper/runs?timeout=300&maxItems='+input.limit+'&maxTotalChargeUsd=0.30',token,{method:'POST',body:JSON.stringify(actorRequest(input.url,input.limit))});
 if(typeof r?.data?.id!=='string'||!/^[a-zA-Z0-9]+$/.test(r.data.id))throw new TikTokError('ID proses Apify belum diterima. Periksa Apify Console.',502);
 const {error}=await db.from('tiktok_imports').update({run_id:r.data.id,status:'running',updated_at:new Date().toISOString()}).eq('id',input.requestId).eq('owner_id',owner);check(error);return {id:input.requestId};
 }catch(e){await db.from('tiktok_imports').update({status:'unknown',error:'Status permintaan belum pasti. Periksa Runs di Apify Console sebelum mengambil ulang; jangan jalankan berulang kali.',updated_at:new Date().toISOString()}).eq('id',input.requestId).eq('owner_id',owner);throw e}
}
export async function checkTikTok(owner:string,id:string){
 const db=adminClient(),result=await db.from('tiktok_imports').select('*').eq('id',id).eq('owner_id',owner).maybeSingle();check(result.error);const job=result.data;if(!job)throw new TikTokError('Impor tidak ditemukan.',404);
 if(job.status==='starting'){
 if(Date.now()-Date.parse(job.created_at)>120000){const r=await db.from('tiktok_imports').update({status:'unknown',error:'Proses awal terputus. Periksa Runs di Apify Console sebelum mengambil ulang.'}).eq('id',id).eq('owner_id',owner).eq('status','starting');check(r.error)}return {ok:true}}
 if(job.status!=='running')return {ok:true};
 const token=await tokenFor(owner),run=(await apify('actor-runs/'+encodeURIComponent(job.run_id),token)).data;
 if(!run||run.id!==job.run_id)throw new TikTokError('Status Apify belum dapat diverifikasi.',502);
 let update:Record<string,unknown>|null=null;
 if(run.status==='SUCCEEDED'){
 if(typeof run.defaultDatasetId!=='string'||!/^[a-zA-Z0-9]+$/.test(run.defaultDatasetId))throw new TikTokError('Dataset Apify tidak ditemukan.',502);
 const dataset=await apify('datasets/'+run.defaultDatasetId+'/items?format=json&clean=true&limit='+job.comment_limit,token);
 update={status:'ready',comments:commentsFromDataset(dataset,job.comment_limit),error:''};
 }else if(['FAILED','ABORTED','TIMED-OUT'].includes(run.status))update={status:'failed',error:'Pengambilan komentar terhenti di Apify. Video mungkin tidak tersedia atau komentar dibatasi. Periksa detail di Apify Console.'};
 if(update){const {error}=await db.from('tiktok_imports').update({...update,updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',owner).eq('status','running');check(error)}return {ok:true};
}
