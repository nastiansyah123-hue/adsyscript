import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {adminClient} from '../supabase/admin';import {decrypt} from '../crypto';import {AppError} from '../generate';
import {productInput,QnaModelError,requestQna} from './core';
export function qnaDbError(error:{code?:string}|null){
 if(!error)return;
 if(error.code==='23505')throw new AppError('Nama produk ini sudah digunakan.');
 if(['42P01','PGRST205','PGRST202','42883'].includes(error.code||''))throw new AppError('Q&A belum diaktifkan. Jalankan migrasi 202611100001_qna.sql di Supabase terlebih dahulu.',503);
 if(['23503','42501','PGRST116'].includes(error.code||''))throw new AppError('Data Q&A tidak ditemukan atau bukan milik akunmu.',404);
 throw new AppError('Perubahan Q&A belum dapat disimpan. Periksa isian dan coba lagi.',400);
}
export async function qnaOverview(db:SupabaseClient,ownerId:string,batchId?:string){
 const [products,batches]=await Promise.all([db.from('products').select('*').eq('owner_id',ownerId).order('name').limit(500),db.from('qna_batch_overview').select('*').eq('owner_id',ownerId).order('created_at',{ascending:false}).limit(50)]);qnaDbError(products.error);qnaDbError(batches.error);
 const active=batchId||batches.data?.[0]?.id;let items:Record<string,any>[]=[];let batch=null;
 if(active){const [one,all]=await Promise.all([db.from('qna_batch_overview').select('*').eq('id',active).eq('owner_id',ownerId).maybeSingle(),db.from('qna_items').select('*').eq('batch_id',active).eq('owner_id',ownerId).order('ordinal')]);qnaDbError(one.error);qnaDbError(all.error);if(!one.data)throw new AppError('Kumpulan Q&A tidak ditemukan.',404);batch=one.data;items=all.data||[]}
 return {products:products.data||[],batches:batches.data||[],batch,items};
}
export async function qnaProgress(db:SupabaseClient,ownerId:string,batchId:string){
 const [one,all]=await Promise.all([db.from('qna_batch_overview').select('*').eq('id',batchId).eq('owner_id',ownerId).maybeSingle(),db.from('qna_items').select('*').eq('batch_id',batchId).eq('owner_id',ownerId).order('ordinal')]);
 qnaDbError(one.error);qnaDbError(all.error);if(!one.data)throw new AppError('Kumpulan Q&A tidak ditemukan.',404);
 return {batch:one.data,items:all.data||[]};
}
export async function processQna(batchId:string,ownerId:string){
 const db=adminClient();const [{data:batch,error},{data:key,error:keyError}]=await Promise.all([
  db.from('qna_batches').select('knowledge_snapshot').eq('id',batchId).eq('owner_id',ownerId).maybeSingle(),
  db.from('user_credentials').select('api_key_encrypted').eq('owner_id',ownerId).maybeSingle(),
 ]);qnaDbError(error);qnaDbError(keyError);if(!batch)throw new AppError('Kumpulan Q&A tidak ditemukan.',404);if(!key)throw new AppError('Hubungkan OpenAI di Pengaturan terlebih dahulu.',412);
 let apiKey:string;try{apiKey=decrypt(key.api_key_encrypted)}catch{throw new AppError('Koneksi OpenAI perlu disimpan ulang di Pengaturan.',412)}
 const product=productInput.parse(batch.knowledge_snapshot);
 const {data:claimed,error:claimError}=await db.rpc('claim_qna_items',{p_batch_id:batchId,p_owner_id:ownerId,p_limit:3});qnaDbError(claimError);
 if(!claimed?.length)return {claimed:0,finished:0};
 try{
  const answers=await requestQna({apiKey,model:process.env.OPENAI_MODEL||'gpt-4.1-mini',product,questions:claimed.map((q:Record<string,any>)=>({id:q.id,ordinal:q.ordinal,question:q.question}))});
  let finished=0;
  for(const answer of answers){const item=claimed.find((q:Record<string,any>)=>q.id===answer.id);const {data,error}=await db.rpc('finish_qna_item',{p_id:answer.id,p_token:item.lease_token,p_answer:answer.answer,p_status:answer.status,p_reason:answer.reason,p_evidence:answer.evidence,p_error:null});qnaDbError(error);if(data)finished++}
  return {claimed:claimed.length,finished};
 }catch(e){const message=e instanceof QnaModelError?e.message:e instanceof AppError?e.message:'Jawaban belum dapat dibuat. Coba ulang pertanyaan yang gagal.';
  await Promise.all(claimed.map((q:Record<string,any>)=>db.rpc('finish_qna_item',{p_id:q.id,p_token:q.lease_token,p_answer:'',p_status:'failed',p_reason:'',p_evidence:[],p_error:message})));
  throw new AppError(message,e instanceof QnaModelError?e.status:502);
 }
}
