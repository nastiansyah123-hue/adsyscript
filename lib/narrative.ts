import {z} from 'zod';

export const scriptsSchema=z.object({contents:z.array(z.object({
  title:z.string().trim().min(1).max(180),
  body:z.string().trim().min(1).max(12000),
})).min(1).max(5)});
export type Script={title:string;body:string};
export class NarrativeError extends Error {
  constructor(message:string,public status=502){super(message)}
}

export function narrativeSpec(duration:number){
  const seconds=Math.max(15,Math.min(180,Number(duration)||60));
  return {seconds,minWords:Math.ceil(seconds*2),maxWords:Math.ceil(seconds*3.5),
    minParagraphs:Math.max(4,Math.ceil(seconds/6)),maxParagraphs:Math.max(6,Math.ceil(seconds/4))};
}
const expression=/^\[(curious|surprised|amused|excited|serious|whispers|thoughtful|dramatic|softly)\]\s+\S/;
export function validateScripts(value:unknown,count:number,duration?:number):Script[]{
  const parsed=scriptsSchema.parse(value);
  if(parsed.contents.length!==count||new Set(parsed.contents.map(c=>c.title.toLocaleLowerCase('id-ID'))).size!==count||new Set(parsed.contents.map(c=>c.body.replace(/\s+/g,' ').toLocaleLowerCase('id-ID'))).size!==count)
    throw new Error('Jumlah naskah atau variasi judul belum sesuai.');
  if(duration!==undefined){
    const spec=narrativeSpec(duration);
    for(const [index,script] of parsed.contents.entries()){
      const paragraphs=script.body.replace(/\r\n/g,'\n').trim().split(/\n\s*\n/);
      const words=script.body.replace(/\[[^\]]*\]/g,' ').match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)?.length||0;
      const prefix='Naskah '+(index+1)+': ';
      if(words<spec.minWords||words>spec.maxWords)
        throw new Error(prefix+'panjang harus '+spec.minWords+'–'+spec.maxWords+' kata; sekarang '+words+'.');
      if(paragraphs.length<spec.minParagraphs||paragraphs.length>spec.maxParagraphs)
        throw new Error(prefix+'harus '+spec.minParagraphs+'–'+spec.maxParagraphs+' paragraf pendek, dipisahkan satu baris kosong.');
      if(paragraphs.some(p=>!expression.test(p)||(p.match(/\[[^\]]*\]/g)||[]).length!==1))
        throw new Error(prefix+'setiap paragraf harus diawali tepat satu penanda ekspresi yang didukung.');
      if(!/\?["”’']?$/.test(paragraphs.at(-1)!.trim()))
        throw new Error(prefix+'tutup dengan satu pertanyaan yang relevan untuk penonton.');
    }
  }
  return parsed.contents;
}

const styleExample=`[curious] Pernah nggak sih... pas kamu jongkok atau berdiri, tiba-tiba lutut berbunyi... krek!

[surprised] Padahal nggak jatuh, nggak terbentur, tapi kok lutut bisa bunyi sendiri?

[amused] Jangan-jangan... lututnya mulai minta pensiun?

[serious] Tenang! Bunyi pada lutut cukup umum terjadi, dan nggak selalu berarti sendimu rusak.

[thoughtful] Bunyi atau sensasi berderak pada sendi sering disebut krepitasi. Penyebabnya bisa berbeda-beda pada setiap orang.

[curious] Tapi... dari mana sebenarnya suara itu berasal?

[thoughtful] Suara bisa berkaitan dengan perubahan tekanan di dalam sendi, atau pergerakan tendon dan jaringan di sekitarnya. Jadi, bunyinya saja belum cukup untuk menentukan penyebabnya.

[serious] Nah, yang perlu diperhatikan bukan cuma bunyinya, tapi apakah ada gejala lain yang menyertai.

[whispers] Kalau bunyinya tidak disertai keluhan lain, biasanya tidak mendesak. Tetapi, tetap perhatikan perubahan yang kamu rasakan.

[dramatic] Jika disertai nyeri, bengkak, lutut terasa terkunci, atau sulit digerakkan, sebaiknya periksakan ke tenaga kesehatan.

[softly] Untuk menjaga tubuh tetap nyaman, lakukan aktivitas secara bertahap sesuai kemampuanmu. Hindari memaksakan gerakan yang terasa nyeri.

[curious] Sekarang jujur... lutut kamu pernah bunyi krek waktu jongkok atau naik tangga?`;

export type NarrativeContext={tema:string;kategori:string;arahanKategori?:string;topik:string;
  audiens:string;gaya:string;durasiDetik:number;arahanTema?:string;hindariJudul:string[]};
export function narrativeMessages(context:NarrativeContext,count:number){
  const spec=narrativeSpec(context.durasiDetik);
  return [
    {role:'system' as const,content:`Kamu penulis naskah voice-over video pendek berbahasa Indonesia. Tulis NASKAH NARASI UTUH siap dibacakan, dengan rasa ingin tahu, cerita yang berkembang, dan emosi yang alami.
FORMAT WAJIB:
- Setiap naskah memiliki ${spec.minWords}–${spec.maxWords} kata yang diucapkan, tidak termasuk penanda ekspresi. Usahakan sekitar ${Math.round(spec.seconds*2.7)} kata. Durasi ${spec.seconds} detik adalah perkiraan; jangan mengklaim ketepatan durasi rekaman.
- Setiap body memiliki ${spec.minParagraphs}–${spec.maxParagraphs} paragraf pendek. Pisahkan paragraf dengan satu baris kosong (\\n\\n dalam JSON).
- Setiap paragraf diawali tepat SATU tag: [curious], [surprised], [amused], [excited], [serious], [whispers], [thoughtful], [dramatic], atau [softly]. Tag selalu di awal paragraf, bukan disisipkan di tengah kalimat. Pilih ekspresi sesuai isi; jangan memaksakan humor atau dramatisasi.
- Alur: hook yang dekat dengan pengalaman penonton → rasa penasaran atau kejutan → penjelasan bertahap dengan detail konkret → hal yang perlu diperhatikan → pertanyaan penutup untuk interaksi.
- Gunakan percakapan Indonesia yang luwes seperti "kamu", "nggak", "bayangin", "tapi coba pikirin" bila sesuai gaya. Sapaan "Bu/Pak" hanya jika diminta secara eksplisit, bukan otomatis dari target audiens. Hindari pembuka promosi seperti "Saksikan", "Simak tips berikut", "Berikut adalah" serta kalimat iklan generik.
- Narasi harus punya isi yang berkembang. Jangan mengisi jumlah kata dengan pengulangan atau kalimat kosong. Jangan memberi judul bagian seperti Hook/Isi/CTA, bullet list, markdown, atau keterangan produksi di body.
- Untuk kesehatan, jelaskan fakta secara hati-hati, tanpa diagnosis, janji penyembuhan, atau menganggap satu penyebab berlaku untuk semua orang. Sebutkan tanda bahaya atau pemeriksaan hanya jika relevan. Untuk anak, sesuaikan usia, hindari lelucon atau materi yang menakutkan. Jangan membuat fakta, angka, atau sumber palsu.
- Masing-masing naskah punya satu sudut pembahasan yang berbeda. Jangan sekadar mengganti beberapa kata pada cerita yang sama. Ikuti tema, kategori, audiens, dan arahan pengguna sambil mempertahankan struktur narasi ini.
Contoh IRAMA dan FORMAT, bukan bahan untuk disalin ke semua tema:
${styleExample}
Keluarkan hanya JSON object {"contents":[{"title":"judul yang spesifik","body":"naskah lengkap dengan tag dan baris kosong"}]}. Jangan menambahkan pengantar atau komentar di luar JSON.`},
    {role:'user' as const,content:JSON.stringify({...context,jumlah:count,panjangPerNaskah:spec,
      instruksi:'Buat setiap naskah sampai selesai. Lima konten berarti lima narasi utuh, bukan lima tips pendek.'})},
  ];
}

export async function requestNarratives(options:{apiKey:string;model:string;context:NarrativeContext;
  count:number;fetcher?:typeof fetch}):Promise<Script[]>{
  const {apiKey,model,context,count,fetcher=fetch}=options;
  const messages:{role:'system'|'user'|'assistant';content:string}[]=narrativeMessages(context,count);
  const spec=narrativeSpec(context.durasiDetik);
  for(let attempt=0;attempt<2;attempt++){
    let response:Response;
    try{response=await fetcher('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages,response_format:{type:'json_object'},
        max_completion_tokens:Math.min(14000,count*(spec.maxWords*3+spec.maxParagraphs*14+160))}),
      signal:AbortSignal.timeout(attempt===0?80000:50000),cache:'no-store',
    })}catch{throw new NarrativeError('OpenAI belum merespons tepat waktu. Silakan coba lagi.');}
    if(!response.ok)throw new NarrativeError(response.status===429?
      'Kuota atau batas permintaan OpenAI tercapai. Periksa tagihan API.':response.status===401?
      'API key OpenAI tidak valid. Perbarui koneksi di pengaturan.':
      'OpenAI belum berhasil merespons. Coba lagi sebentar.',response.status===429?429:502);
    let raw='',reason='JSON naskah belum valid.';
    try{
      const data=await response.json();raw=data.choices?.[0]?.message?.content||'';
      if(data.choices?.[0]?.finish_reason==='length')throw new Error('Respons terpotong. Lengkapi seluruh naskah dalam batas panjang yang ditentukan.');
      return validateScripts(JSON.parse(raw),count,context.durasiDetik);
    }catch(e){if(e instanceof Error)reason=e.message.slice(0,500);}
    if(attempt===0){
      if(raw)messages.push({role:'assistant',content:raw});
      messages.push({role:'user',content:'Perbaiki JSON sebelumnya. '+reason+' Kembalikan tepat '+count+
        ' narasi UTUH dengan judul berbeda. Setiap body wajib memenuhi panjang, paragraf bertag, dan pertanyaan penutup. Jangan menjelaskan koreksinya.'});
    }
  }
  throw new NarrativeError('Naskah belum memenuhi panjang atau format narasi setelah diperiksa. Hasil belum disimpan; silakan coba lagi.');
}
