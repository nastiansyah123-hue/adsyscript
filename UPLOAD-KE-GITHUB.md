# Upload adsyscript ke GitHub

1. Ekstrak `adsyscript.zip` di komputer.
2. Buka folder `adsyscript` hasil ekstraksi.
3. Di GitHub, buat repository baru bernama `adsyscript`. Pilih **Private**. Jangan menambahkan README otomatis agar tidak bentrok.
4. Pilih **uploading an existing file** atau **Add file → Upload files**.
5. Unggah **isi** folder `adsyscript`, bukan ZIP-nya. Pastikan `package.json`, `package-lock.json`, `app/`, `lib/`, `supabase/`, dan `vercel.json` berada di root repository. Sertakan file tersembunyi `.gitignore`, `.env.example`, dan folder `.github/` bila aplikasi file komputer menampilkannya.
6. Klik **Commit changes**.
7. Di Vercel, pilih **Add New → Project**, lalu impor repository tersebut. Gunakan preset **Next.js** dengan Root Directory repository paling atas.
8. Sebelum web bisa dipakai, buat proyek Supabase, jalankan SQL pada `supabase/migrations/`, dan isi environment variables di Vercel sesuai `README.md`.

Jangan unggah `.env.local`, API key, atau service-role key ke GitHub. ZIP ini hanya berisi kode aplikasi dan panduan, tanpa password, API key, atau data pengguna.

Fitur daftar/login memerlukan konfigurasi Supabase Auth. Pembuatan konten memerlukan API key OpenAI yang disimpan oleh setiap pengguna melalui Pengaturan. Jadwal otomatis perlu konfigurasi Vercel Cron sesuai README.
