# Update: tambah konten setelah target harian terpenuhi

1. Di Supabase → **SQL Editor → New query**, jalankan isi file baru `supabase/migrations/202611100002_manual_content.sql` satu kali. Migrasi lama tidak perlu diulang.
2. Ekstrak ZIP pembaruan dan unggah isinya ke root repository GitHub, mengikuti struktur folder yang sama. Ganti file yang namanya sama, lalu commit agar Vercel melakukan deployment.
3. Di workroom → **Semua naskah**, klik **Tambah konten**, pilih 1, 3, atau 5 naskah, lalu klik **Buat naskah**. Kamu dapat membuat tambahan lagi setelah proses selesai.

Target otomatis tetap minimal 5 naskah per tema per hari. Tambahan manual tidak dibatasi menjadi total 5 sehari. Setiap permintaan manual menggunakan API key OpenAI akunmu.

Hasil generate otomatis masuk arsip. Tombol **Simpan perubahan** digunakan untuk menyimpan edit judul atau isi, bukan membuat salinan baru. **Unduh .txt** mengambil file naskah ke komputer.

Arsip menyimpan seluruh naskah 30 hari terakhir. Angka 30 adalah masa simpan dalam hari, bukan batas jumlah naskah. Pembaruan ini tidak membutuhkan ENV baru.
