import {handle} from '@/lib/api';
export const runtime='nodejs';export const maxDuration=180;
type Context={params:Promise<{operation:string}>};
export async function GET(request:Request,c:Context){return handle(request,(await c.params).operation)}
export async function POST(request:Request,c:Context){return handle(request,(await c.params).operation)}
