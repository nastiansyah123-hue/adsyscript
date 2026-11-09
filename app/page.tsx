import {redirect} from 'next/navigation';
import {publicConfig} from '@/lib/supabase/config';
export const dynamic='force-dynamic';
export default function Home(){if(publicConfig())redirect('/studio');return <main className="setup"><a className="brand" href="/login"><span className="brandmark"/>adsyscript</a><h1>Studio siap dihubungkan.</h1><p>Versi Vercel + Supabase sudah disiapkan. Hubungkan proyek Supabase dan lengkapi environment deployment untuk mengaktifkan login dan penyimpanan.</p><ol><li>Jalankan migrasi database dalam folder <code>supabase/migrations</code>.</li><li>Isi environment Supabase, enkripsi, URL aplikasi, dan Cron di Vercel.</li><li>Atur URL konfirmasi akun di Supabase Authentication.</li></ol><a href="/login">Lihat halaman login →</a></main>}
