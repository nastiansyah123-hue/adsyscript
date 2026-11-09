import ExcelJS from 'exceljs';import {unzipSync} from 'fflate';
export type ImportSheet={name:string;columns:{index:number;label:string}[];rows:{rowNumber:number;values:string[]}[];headerRow:number;suggestedColumn:number;suggestedFirstRow:number;suggestedFirstParagraph:boolean};
function cellText(value:ExcelJS.CellValue):string{
 if(value==null)return '';if(value instanceof Date)return value.toISOString();if(typeof value!=='object')return String(value);
 if('richText'in value)return value.richText.map(t=>t.text).join('');if('text'in value)return String(value.text);
 if('result'in value)return cellText(value.result as ExcelJS.CellValue);return '';
}
function inspectZip(buffer:Uint8Array){let total=0,count=0;unzipSync(buffer,{filter(entry){total+=entry.originalSize;if(++count>1000||entry.originalSize>20*1024*1024||total>30*1024*1024)throw new Error('Isi Excel terlalu besar. Gunakan file berisi daftar pertanyaan saja.');return false}})}
export async function readQuestionWorkbook(buffer:Uint8Array):Promise<{sheets:ImportSheet[]}>{
 if(buffer.byteLength>4*1024*1024)throw new Error('Ukuran Excel maksimal 4 MB.');inspectZip(buffer);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
 const sheets:ImportSheet[]=[];
 for(const sheet of workbook.worksheets){
  if(sheets.length>=8)break;
  const rows:ImportSheet['rows']=[];let maxCol=0;
  sheet.eachRow({includeEmpty:false},(row,n)=>{if(rows.length>=2000)throw new Error('Maksimal 2.000 baris per sheet untuk pratinjau.');const values:string[]=[];row.eachCell({includeEmpty:false},(cell,col)=>{if(col>32)return;const text=cellText(cell.value).slice(0,12000);values[col-1]=text;maxCol=Math.max(maxCol,col)});if(values.some(x=>x?.trim()))rows.push({rowNumber:n,values:Array.from({length:Math.max(values.length,1)},(_,i)=>values[i]||'')})});
  if(!rows.length)continue;
  let suggestedColumn=0,headerRow=0,best=0,suggestedFirstParagraph=false;
  for(const row of rows.slice(0,15))row.values.forEach((value,index)=>{const text=value.trim().toLowerCase();const score=/^(?:daftar\s+)?(?:pertanyaan|questions?|komentar)(?:\s+(?:pelanggan|customer|q&a))?$/.test(text)?100:/script|naskah.*(?:talent|voice)|voice.?over.*(?:awal|akhir)/.test(text)?60:0;if(score>best){best=score;suggestedColumn=index;headerRow=row.rowNumber;suggestedFirstParagraph=score===60}});
  const header=rows.find(r=>r.rowNumber===headerRow);
  const columns=Array.from({length:maxCol},(_,index)=>({index,label:((header?.values[index]||'').trim().slice(0,70)||'Kolom '+sheet.getColumn(index+1).letter)}));
  // Clear fallback labels rather than inferring a question from arbitrary file text.
  for(const c of columns)if(!header?.values[c.index]?.trim())c.label='Kolom '+sheet.getColumn(c.index+1).letter;
  sheets.push({name:sheet.name,columns,rows,headerRow,suggestedColumn,suggestedFirstRow:headerRow?headerRow+1:rows[0].rowNumber,suggestedFirstParagraph});
 }
 if(!sheets.length)throw new Error('Tidak ada data yang dapat dibaca dari Excel.');return {sheets};
}
export function extractQuestions(sheet:ImportSheet,column:number,firstRow:number,firstParagraph:boolean){
 const header=(sheet.rows.find(r=>r.rowNumber===sheet.headerRow)?.values[column]||'').trim();
 return sheet.rows.filter(r=>r.rowNumber>=firstRow).map(r=>r.values[column]||'').filter(value=>!header||value.trim()!==header).map(value=>{
  const text=value.replace(/\r\n/g,'\n').trim();return (firstParagraph?text.split(/\n\s*\n/)[0]:text).replace(/\s*\n\s*/g,' ').trim();
 }).filter(Boolean);
}
const labels:Record<string,string>={pending:'Belum diproses',processing:'Sedang diproses',done:'Selesai',needs_review:'Perlu konfirmasi',failed:'Gagal'};
export async function answerWorkbook(batch:{title:string;product_name:string},items:{ordinal:number;question:string;answer:string;status:string;review_reason?:string;error?:string|null;evidence?:{field:string;quote:string}[]}[]){
 const workbook=new ExcelJS.Workbook();workbook.creator='adsyscript';const sheet=workbook.addWorksheet('Q&A Talent',{views:[{state:'frozen',ySplit:1}]});
 sheet.columns=[{header:'No',key:'ordinal',width:7},{header:'Produk',key:'product',width:24},{header:'Pertanyaan',key:'question',width:55},{header:'Jawaban Talent',key:'answer',width:80},{header:'Status',key:'status',width:22},{header:'Catatan',key:'note',width:50},{header:'Dasar Product Knowledge',key:'evidence',width:70}];
 for(const item of [...items].sort((a,b)=>a.ordinal-b.ordinal))sheet.addRow({ordinal:item.ordinal,product:batch.product_name,question:String(item.question),answer:String(item.answer||''),status:labels[item.status]||item.status,note:item.error||item.review_reason||'',evidence:(item.evidence||[]).map(e=>e.field+': '+e.quote).join('\n')});
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'},size:12};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF273C31'}};sheet.getRow(1).height=28;
 sheet.eachRow((row,n)=>{row.alignment={vertical:'top',wrapText:true};if(n>1)row.font={size:12}});sheet.autoFilter={from:'A1',to:'G1'};
 return new Uint8Array(await workbook.xlsx.writeBuffer());
}
