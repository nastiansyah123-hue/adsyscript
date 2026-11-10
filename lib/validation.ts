import {z} from 'zod';
const date=z.iso.date();
export const id=z.uuid();
export const manualGenerationInput=z.object({roomId:id,requestId:id,count:z.coerce.number().int().min(1).max(5).default(5)});
export const roomsInput=z.object({names:z.string().trim().min(1).max(2400),audience:z.string().trim().max(200).default('Umum'),style:z.string().trim().max(200).default('Santai & informatif'),duration:z.coerce.number().int().min(15).max(180).default(60),brief:z.string().trim().max(2000).default('')}).transform(b=>({...b,names:b.names.split(/\n/).map(s=>s.trim()).filter(Boolean)})).refine(b=>b.names.length>0&&b.names.length<=30&&b.names.every(n=>n.length<=80),'Isi 1–30 tema, maksimal 80 karakter per tema.');
export const categoryInput=z.object({roomId:id,name:z.string().trim().min(1).max(100),brief:z.string().trim().max(2000).default(''),focus:z.boolean().default(false),start:date,end:date}).refine(b=>b.end>=b.start,'Tanggal akhir harus setelah tanggal awal.');
export const topicInput=z.object({roomId:id,categoryId:id,name:z.string().trim().min(1).max(200),start:date,end:date}).refine(b=>b.end>=b.start,'Tanggal akhir harus setelah tanggal awal.');
export const roomUpdate=z.object({id,enabled:z.boolean().optional(),audience:z.string().trim().min(1).max(200).optional(),style:z.string().trim().min(1).max(200).optional(),brief:z.string().trim().max(2000).optional()});
export const contentUpdate=z.object({id,title:z.string().trim().min(1).max(180).optional(),body:z.string().trim().min(1).max(12000).optional(),status:z.enum(['draft','ready']).optional()});
export {scriptsSchema,validateScripts} from './narrative';
export function localDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(now)}
