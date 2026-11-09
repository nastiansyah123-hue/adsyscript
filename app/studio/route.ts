import {NextResponse} from 'next/server';import {sessionClient} from '@/lib/supabase/server';import {publicConfig} from '@/lib/supabase/config';import {HTML} from '@/lib/studio/ui';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!publicConfig())return NextResponse.redirect(new URL('/',request.url));const s=await sessionClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.redirect(new URL('/login',request.url));return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'}})}
