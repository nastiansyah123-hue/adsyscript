'use client';
import {createBrowserClient} from '@supabase/ssr';
let client:ReturnType<typeof createBrowserClient>;
export function browserClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Supabase belum dikonfigurasi.');return client??=createBrowserClient(url,key)}
