import {z} from 'zod';
export class TikTokError extends Error{constructor(message:string,public status=400){super(message)}}
export function videoUrl(raw:string){
 let u:URL;try{u=new URL(raw.trim())}catch{throw new TikTokError('Masukkan link video TikTok yang valid.')}
 const h=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.tiktok.com','tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com'].includes(h))throw new TikTokError('Gunakan link HTTPS video TikTok, termasuk link pendek vm/vt.tiktok.com.');
 if(['vm.tiktok.com','vt.tiktok.com'].includes(h)){if(!/^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))throw new TikTokError('Link pendek TikTok tidak valid.')}
 else if(!/^\/@[^/]+\/video\/\d{10,30}\/?$/.test(u.pathname)&&!/^\/t\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))throw new TikTokError('Masukkan link satu video, bukan profil atau pencarian TikTok.');
 u.search='';u.hash='';return u.toString();
}
export const startInput=z.object({requestId:z.uuid(),url:z.string().max(2000).transform(videoUrl),limit:z.union([z.literal(50),z.literal(100),z.literal(200)]).default(100)});
export type Comment={id:string;text:string;author:string;likes:number};
export function commentsFromDataset(raw:unknown,limit:number):Comment[]{
 if(!Array.isArray(raw))throw new TikTokError('Format hasil Apify belum dikenali.',502);
 const seen=new Set<string>(),out:Comment[]=[];
 for(const item of raw){if(!item||typeof item!=='object')continue;const r=item as Record<string,unknown>;if(typeof r.text!=='string')continue;const text=r.text.trim();if(!text||text.length>4000)continue;const id=String(r.cid??r.id??'row-'+out.length);if(seen.has(id))continue;seen.add(id);out.push({id,text,author:typeof r.uniqueId==='string'?r.uniqueId.slice(0,120):'',likes:typeof r.diggCount==='number'&&Number.isFinite(r.diggCount)?Math.max(0,r.diggCount):0});if(out.length>=limit)break}return out;
}
export async function apify(path:string,token:string,options:RequestInit={},fetcher:typeof fetch=fetch){
 let response:Response;try{response=await fetcher('https://api.apify.com/v2/'+path,{...options,headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)})}catch{throw new TikTokError('Apify belum merespons. Periksa status impor sebelum memulai lagi.',502)}
 if(!response.ok)throw new TikTokError(response.status===401||response.status===403?'Token Apify tidak valid atau belum memiliki izin.':response.status===402?'Kredit Apify tidak mencukupi. Periksa penggunaan di Apify Console.':response.status===429?'Apify sedang membatasi permintaan. Tunggu sebentar lalu periksa status lagi.':'Permintaan Apify belum berhasil. Periksa Apify Console.',response.status===429?429:502);
 try{return await response.json()}catch{throw new TikTokError('Respons Apify belum dapat dibaca.',502)}
}
export function actorRequest(url:string,limit:number){return {postURLs:[url],commentsPerPost:limit,maxRepliesPerComment:0}}
