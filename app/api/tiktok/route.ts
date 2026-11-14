import {z} from 'zod';import {getIdentity,json,safeError} from '@/lib/api';import {AppError} from '@/lib/generate';import {TikTokError} from '@/lib/tiktok/core';import {checkTikTok,removeTikTokToken,saveTikTokToken,startTikTok,tiktokOverview} from '@/lib/tiktok/service';
export const runtime='nodejs';export const maxDuration=60;
function failure(e:unknown){return e instanceof TikTokError?json({error:e.message},e.status):safeError(e)}
export async function GET(){try{const {user}=await getIdentity();return json(await tiktokOverview(user.id))}catch(e){return failure(e)}}
export async function POST(request:Request){try{const {db,user}=await getIdentity();if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Origin tidak diizinkan.',403);const raw=await request.text();if(raw.length>20000)throw new AppError('Data terlalu besar.',413);let b;try{b=JSON.parse(raw)}catch{throw new AppError('Data tidak valid.')}
 switch(b.action){
 case 'token-save':return json(await saveTikTokToken(user.id,z.string().trim().min(20).max(300).regex(/^[A-Za-z0-9_-]+$/).parse(b.token)));
 case 'token-remove':return json(await removeTikTokToken(user.id));
 case 'start':return json(await startTikTok(user.id,b));
 case 'check':return json(await checkTikTok(user.id,z.uuid().parse(b.id)));
 case 'convert':{const input=z.object({id:z.uuid(),productId:z.uuid(),title:z.string().trim().min(1).max(180),commentIds:z.array(z.string().min(1).max(200)).min(1).max(200)}).parse(b);const {data,error}=await db.rpc('tiktok_create_qna',{p_import_id:input.id,p_product_id:input.productId,p_title:input.title,p_comment_ids:input.commentIds});if(error)throw new AppError('Komentar belum dapat dijadikan Q&A. Periksa pilihan, produk aktif, dan migrasi TikTok.',400);return json({id:data})}
 default:throw new AppError('Operasi TikTok tidak ditemukan.',404);
 }
 }catch(e){return failure(e)}}
