import {z} from 'zod';import {getIdentity,json,safeError} from '@/lib/api';import {AppError} from '@/lib/generate';
import {batchInput,productInput} from '@/lib/qna/core';import {processQna,qnaDbError,qnaOverview,qnaProgress} from '@/lib/qna/service';
export const runtime='nodejs';export const maxDuration=180;
export async function GET(request:Request){try{const {db,user}=await getIdentity();const params=new URL(request.url).searchParams;const raw=params.get('batchId');const batchId=raw?z.uuid().parse(raw):undefined;return json(params.get('progress')==='1'&&batchId?await qnaProgress(db,user.id,batchId):await qnaOverview(db,user.id,batchId))}catch(e){return safeError(e)}}
export async function POST(request:Request){try{const {db,user}=await getIdentity();if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Origin tidak diizinkan.',403);const raw=await request.text();if(raw.length>1000000)throw new AppError('Data terlalu besar.',413);let body;try{body=JSON.parse(raw)}catch{throw new AppError('Data tidak valid.')}
 switch(body.action){
  case 'product-save':{const {id,...product}=productInput.parse(body.product);const query=id?db.from('products').update(product).eq('id',id).eq('owner_id',user.id):db.from('products').insert({...product,owner_id:user.id});const {data,error}=await query.select('id').single();qnaDbError(error);return json({ok:true,id:data?.id})}
  case 'batch-create':{const b=batchInput.parse(body);const {data,error}=await db.rpc('create_qna_batch',{p_product_id:b.productId,p_title:b.title,p_questions:b.questions});qnaDbError(error);return json({ok:true,id:data})}
  case 'process':return json(await processQna(z.uuid().parse(body.batchId),user.id));
  case 'retry-failed':{const {data,error}=await db.rpc('retry_qna_failed',{p_batch_id:z.uuid().parse(body.batchId)});qnaDbError(error);return json({ok:true,count:data})}
  case 'item-save':{const b=z.object({id:z.uuid(),answer:z.string().trim().min(1).max(12000),reviewed:z.boolean()}).parse(body);const {data,error}=await db.rpc('edit_qna_item',{p_id:b.id,p_answer:b.answer,p_reviewed:b.reviewed});qnaDbError(error);if(!data)throw new AppError('Jawaban sedang diproses atau tidak ditemukan.',409);return json({ok:true})}
  default:throw new AppError('Operasi Q&A tidak ditemukan.',404);
 }
}catch(e){return safeError(e)}}
