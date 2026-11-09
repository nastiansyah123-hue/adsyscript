import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {publicConfig} from './config';
export async function sessionClient(){const config=publicConfig();if(!config)throw new Error('Supabase belum dikonfigurasi.');const jar=await cookies();return createServerClient(config.url,config.key,{cookies:{getAll(){return jar.getAll()},setAll(items){try{for(const item of items)jar.set(item.name,item.value,item.options)}catch{/* Server Components cannot set cookies; proxy refreshes the session. */}}}})}
