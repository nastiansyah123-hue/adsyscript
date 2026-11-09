# Update fitur Q&A adsyscript

## Untuk web yang sudah berjalan

1. Download dan ekstrak ZIP versi terbaru.
2. Di Supabase → **SQL Editor → New query**, salin dan jalankan **hanya** isi `supabase/migrations/202611100001_qna.sql`. File ini menambahkan tabel produk dan Q&A tanpa mengubah data konten harian.
3. Unggah kode terbaru ke repository GitHub yang terhubung ke Vercel, lalu commit. Sertakan file `package.json` dan `package-lock.json`, folder `app/api/qna/`, `lib/qna/`, `lib/studio/`, serta migrasi dan panduan terbaru. Paling mudah gunakan seluruh isi folder ZIP untuk memperbarui file yang sama.
4. Tunggu deployment Vercel selesai. Environment variables yang lama tetap digunakan; tidak ada ENV tambahan.
5. Masuk ke web, lalu buka **Pengaturan → Product Knowledge** dan tambahkan produk.
6. Buka **Q&A Produk**, pilih produk, masukkan pertanyaan, dan pilih **Simpan & generate**.

Jika repository berisi penyesuaianmu sendiri, bandingkan perubahannya sebelum mengganti seluruh file. Jangan unggah `.env.local`, password, atau API key ke GitHub.

## Input pertanyaan

- **Satu pertanyaan**: seluruh isi kotak dianggap satu pertanyaan, termasuk jika memakai beberapa baris.
- **Banyak sekaligus**: satu pertanyaan per baris; maksimal 200 pertanyaan dalam satu kumpulan.
- **Impor Excel**: pilih file `.xlsx` maksimal 4 MB, lalu periksa sheet, kolom, dan baris awal. Untuk Excel yang menggabungkan pertanyaan dan jawaban dalam satu sel, aktifkan **Ambil hanya paragraf pertama setiap sel**. Tinjau pratinjau sebelum menekan **Gunakan pertanyaan**.

Setiap pertanyaan tetap disimpan terpisah; pertanyaan yang sama tidak otomatis dibuang.

## Proses dan hasil

Satu klik memulai proses bertahap. Kamu boleh pindah menu selama halaman tetap terbuka. Jika halaman ditutup, buka kembali kumpulannya dan klik **Lanjutkan**. Jawaban yang sudah selesai tidak dibuat ulang. Gunakan **Coba ulang yang gagal** untuk pertanyaan yang belum berhasil.

Jawaban berupa percakapan untuk talent, **tanpa tag ekspresi**. Informasi yang belum cukup akan berstatus **Perlu konfirmasi**. Klik **Tinjau & edit** untuk memperbaiki jawaban, melihat dasar product knowledge, atau menandai bahwa jawabannya sudah dikonfirmasi. **Unduh Excel** mengekspor pertanyaan dan jawaban beserta statusnya.

Product knowledge memakai versi saat kumpulan dibuat. Setelah mengedit produk, buat kumpulan baru agar menggunakan informasi yang baru. Q&A tidak memakai jatah 5 konten harian dan tidak ikut penghapusan arsip konten harian 30 hari.
