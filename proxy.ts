import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {publicConfig} from './lib/supabase/config';
export async function proxy(request:NextRequest){let response=NextResponse.next({request});const config=publicConfig();if(!config)return response;const supabase=createServerClient(config.url,config.key,{cookies:{getAll(){return request.cookies.getAll()},setAll(items){for(const item of items)request.cookies.set(item.name,item.value);response=NextResponse.next({request});for(const item of items)response.cookies.set(item.name,item.value,item.options)}}});await supabase.auth.getUser();return response}
export const config={matcher:['/','/studio','/login','/reset-password','/api/:path*','/auth/:path*']};
