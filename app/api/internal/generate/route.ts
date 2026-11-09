import {validCron} from '@/lib/crypto';import {generateRoom} from '@/lib/generate';import {json,safeError} from '@/lib/api';import {id} from '@/lib/validation';
export const runtime='nodejs';export const maxDuration=180;
export async function POST(request:Request){if(!validCron(request))return json({error:'Tidak diizinkan.'},401);try{const b=await request.json();return json(await generateRoom(id.parse(b.roomId)))}catch(e){return safeError(e)}}
