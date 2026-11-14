# Update Komentar TikTok — adsyscript

1. Jalankan `supabase/migrations/202611140001_tiktok.sql` di Supabase SQL Editor. Migrasi Q&A `202611100001_qna.sql` harus sudah terpasang. Data lama tidak dihapus.
2. Salin file dalam ZIP update ke root repository GitHub, mengikuti foldernya, lalu commit. Tunggu Vercel selesai deploy.
3. Buka Pengaturan → Akun & koneksi → Koneksi Apify. Masukkan API token dari https://console.apify.com/settings/integrations . Token disimpan terenkripsi menggunakan APP_ENCRYPTION_KEY yang sudah ada, terpisah per akun. Jangan masukkan token ke GitHub atau chat.
4. Buka Q&A → Komentar TikTok. Tempel link video publik (link pendek TikTok juga diterima), pilih maksimal 50/100/200 komentar; default 100. Klik Ambil komentar.
5. Setelah selesai, pilih komentar yang ingin dijawab, pilih produk dari Product Knowledge, lalu Simpan pilihan & generate jawaban. Jawaban tampil di kumpulan Q&A biasa, tanpa tag ekspresi. Tidak memposting ke TikTok.

Tidak ada environment variable Vercel baru. Konfigurasi Supabase, APP_ENCRYPTION_KEY, dan OpenAI yang sudah ada tetap diperlukan. Kredit Apify dan biaya OpenAI terpisah. Paket gratis/biaya mengikuti layanan masing-masing.

## Perilaku impor

- Menggunakan actor `clockworks/tiktok-comments-scraper` melalui API resmi Apify, bukan API komentar resmi TikTok. Input actor: postURLs, commentsPerPost, maxRepliesPerComment=0.
- Satu pengambilan aktif per akun. Run asinkron tersimpan di Supabase; cek status tidak memulai run baru. Halaman dapat ditutup, lalu dibuka untuk melanjutkan pemeriksaan. Tidak membutuhkan cron baru.
- Histori menampilkan 20 pengambilan terbaru; hasil lama tidak otomatis dihapus. Kumpulan Q&A tetap dapat dibuka dari riwayat Q&A.
- Request ID mencegah pengiriman ulang request yang sama. Konversi satu impor menjadi satu kumpulan Q&A bersifat atomik dan idempoten.
- Hasil dibatasi sesuai pilihan, tanpa balasan komentar. Provider menerima batas hasil dan batas biaya maksimal USD 0,30 per run; tidak menjamin biaya nol atau jumlah komentar tertentu.
- Jika proses awal terputus, status ditandai belum pasti. Periksa Runs di Apify Console sebelum mengambil ulang supaya tidak membayar dua run. Tidak mencoba ulang scrape secara otomatis.
- Video privat/dihapus, komentar dibatasi, dan kendala TikTok/Apify dapat menghasilkan nol komentar atau gagal. Kredit paket gratis tidak dijamin cukup selamanya.
- Komentar disimpan sebagai teks dan tidak menjadi sumber kebenaran produk. Jawaban tetap memerlukan pemeriksaan sebelum digunakan, khususnya kesehatan dan anak.

## Validasi

Tes unit kontrak API dengan respons tiruan, validasi URL/jumlah, penanganan error tanpa membocorkan token, dan tes PostgreSQL untuk akses antar akun/rahasia/konversi atomik. Alur browser diuji menggunakan API tiruan. Pengambilan TikTok nyata perlu token Apify milik pengguna setelah deployment.
