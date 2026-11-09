import {sessionClient} from '@/lib/supabase/server';
export async function POST(request:Request){const u=new URL(request.url);if(request.headers.get('origin')!==u.origin)return Response.json({error:'Origin tidak diizinkan.'},{status:403});const s=await sessionClient();await s.auth.signOut();return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})}
