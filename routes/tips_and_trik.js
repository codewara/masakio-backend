// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db'); // Pastikan path ke db.js sudah benar

/**
 * Modul ini menangani semua endpoint API terkait Tips dan Trik.
 * Termasuk operasi:
 * - Mendapatkan daftar semua tips (ringkasan)
 * - Mendapatkan detail tips berdasarkan ID (termasuk hashtag)
 * - Menambahkan tips baru (termasuk hashtag)
 * - Menghapus tips berdasarkan ID (termasuk hashtag terkait)
 */

// ✅ GET /tips/all — Mengambil semua tips (hanya info dasar tanpa hashtag)
/*
Endpoint : GET https://masakio.up.railway.app/tips/all
Fungsi  : Mengambil daftar ringkasan semua tips yang diurutkan dari terbaru.
Respons : Array objek tips, masing-masing berisi:
          { id_tips, nama_uploader, judul, foto }
*/
router.get('/all', (req, res) => {
    console.log('[Tips-Backend] Menerima permintaan GET /tips/all');
    db.query(`
        SELECT 
            tips.id_tips,
            user.nama_user AS nama_uploader,
            tips.judul,
            tips.foto
        FROM tips
        INNER JOIN user ON tips.id_user = user.id_user
        ORDER BY tips.timestamp DESC
    `, (err, results) => {
        if (err) {
            console.error('[Tips-Backend] Error saat mengambil semua tips:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`[Tips-Backend] Berhasil mengambil ${results.length} tips.`);
        res.json(results);
    });
});

// ✅ GET /tips/:id_tips — Mengambil detail tips + hashtag
/*
Endpoint : GET https://masakio.up.railway.app/tips/{id_tips}
Fungsi  : Mengambil detail lengkap tips berdasarkan ID, termasuk daftar hashtag yang terkait.
Params  : id_tips - ID numerik dari tips yang ingin dilihat detailnya (dari URL path)
Respons : Objek tips yang berisi:
          { id_tips, id_user, nama_user, judul, deskripsi, foto, timestamp, hashtags (string dipisahkan koma) }
          Atau status 404 jika tips tidak ditemukan.
*/
router.get('/:id_tips', (req, res) => {
    const tipsId = req.params.id_tips;
    console.log(`[Tips-Backend] Menerima permintaan GET /tips/${tipsId}`);

    // Validasi ID tips
    if (!tipsId || isNaN(tipsId)) {
        console.warn(`[Tips-Backend] ID tips tidak valid: ${tipsId}`);
        return res.status(400).json({ error: 'ID tips tidak valid' });
    }

    db.query(`
        SELECT 
            tips.id_tips,
            tips.id_user,
            user.nama_user,
            tips.judul,
            tips.deskripsi,
            tips.foto,
            tips.timestamp,
            GROUP_CONCAT(DISTINCT tag_tips.nama SEPARATOR ',') AS hashtags
        FROM tips
        INNER JOIN user ON tips.id_user = user.id_user
        LEFT JOIN tag_tips ON tips.id_tips = tag_tips.id_tips
        WHERE tips.id_tips = ?
        GROUP BY tips.id_tips
    `, [tipsId], (err, results) => {
        if (err) {
            console.error(`[Tips-Backend] Error saat mengambil detail tips ID ${tipsId}:`, err.message);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            console.warn(`[Tips-Backend] Tips dengan ID ${tipsId} tidak ditemukan.`);
            return res.status(404).json({ error: 'Tips tidak ditemukan' });
        }

        console.log(`[Tips-Backend] Berhasil mengambil detail tips ID ${tipsId}.`);
        console.log("✅ Query Result:", results[0]); // Debug log untuk hasil query
        res.json(results[0]);
    });
});


// ✅ POST /tips/add — Menambahkan tips baru + hashtag
/*
Endpoint : POST https://masakio.up.railway.app/tips/add
Fungsi  : Menambahkan tips baru ke database, dan jika ada, menambahkan hashtag terkait.
Body    : JSON objek berisi:
          {
            id_user: (int) ID user yang mengunggah tips (WAJIB),
            judul: (string) Judul tips (WAJIB),
            deskripsi: (string) Isi deskripsi tips (WAJIB),
            foto: (string) URL foto cover tips (hasil dari Cloudinary),
            hashtags: (array of string) Daftar hashtag (opsional, bisa kosong)
          }
Respons : Status 201 (Created) jika berhasil, atau 400/500 jika ada error.
*/
router.post('/add', (req, res) => {
    const { id_user, judul, deskripsi, foto, hashtags } = req.body;
    console.log(`[Tips-Backend] Menerima permintaan POST /tips/add. Data:`, req.body);

    // Validasi data dasar
    if (!id_user || !judul || !deskripsi) {
        console.warn('[Tips-Backend] Data tidak lengkap untuk penambahan tips.');
        return res.status(400).json({ error: 'Data tidak lengkap (id_user, judul, deskripsi wajib).' });
    }

    const timestamp = new Date(); // Dapatkan timestamp saat ini

    // Transaksi database: Tambah tips utama dulu
    db.query(`
        INSERT INTO tips (id_user, judul, deskripsi, foto, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `, [id_user, judul, deskripsi, foto, timestamp], (err, result) => {
        if (err) {
            console.error('[Tips-Backend] Error saat menambahkan tips ke tabel tips:', err.message);
            return res.status(500).json({ error: err.message });
        }

        const id_tips_baru = result.insertId;
        console.log(`[Tips-Backend] Tips baru berhasil ditambahkan dengan ID: ${id_tips_baru}`);

        // Jika ada hashtag, tambahkan ke tabel tips_tag
        if (Array.isArray(hashtags) && hashtags.length > 0) {
            const tagValues = hashtags.map(tag => [id_tips_baru, tag.trim()]); // Trim spasi berlebih
            console.log(`[Tips-Backend] Menambahkan ${tagValues.length} hashtag untuk tips ID ${id_tips_baru}:`, tagValues);
            db.query(`
                INSERT INTO tag_tips (id_tips, nama)
                VALUES ?
            `, [tagValues], (tagErr) => {
                if (tagErr) {
                    console.error('[Tips-Backend] Error saat menambahkan hashtag ke tabel tag_tips:', tagErr.message);
                    // Penting: Anda mungkin ingin melakukan rollback tips jika hashtag gagal,
                    // atau cukup log error dan tetap berikan status sukses untuk tips.
                    // Untuk saat ini, kita akan mengembalikan error 500.
                    return res.status(500).json({ error: tagErr.message });
                }
                console.log(`[Tips-Backend] Hashtag berhasil ditambahkan untuk tips ID ${id_tips_baru}.`);
                res.status(201).json({ message: 'Tips dan hashtag berhasil ditambahkan', id_tips: id_tips_baru });
            });
        } else {
            console.log(`[Tips-Backend] Tips ditambahkan (tanpa hashtag) dengan ID: ${id_tips_baru}.`);
            res.status(201).json({ message: 'Tips berhasil ditambahkan (tanpa hashtag)', id_tips: id_tips_baru });
        }
    });
});

// ✅ DELETE /tips/:id_tips/delete — Menghapus tips + hashtag
/*
Endpoint : DELETE https://masakio.up.railway.app/tips/{id_tips}/delete
Fungsi  : Menghapus tips dari database dan semua hashtag terkait.
Params  : id_tips - ID numerik dari tips yang ingin dihapus (dari URL path)
Respons : Status 200 (OK) jika berhasil, atau 400/404/500 jika ada error.
*/
router.delete('/:id_tips/delete', (req, res) => {
    const id_tips = req.params.id_tips;
    console.log(`[Tips-Backend] Menerima permintaan DELETE /tips/${id_tips}/delete`);

    // Validasi ID tips
    if (!id_tips || isNaN(id_tips)) {
        console.warn(`[Tips-Backend] ID tips tidak valid untuk penghapusan: ${id_tips}`);
        return res.status(400).json({ error: 'ID tips tidak valid' });
    }

    // Mulai transaksi untuk memastikan konsistensi data
    db.beginTransaction(err => {
        if (err) {
            console.error('[Tips-Backend] Error memulai transaksi:', err.message);
            return res.status(500).json({ error: err.message });
        }

        // Hapus hashtag terkait terlebih dahulu
        db.query('DELETE FROM tag_tips WHERE id_tips = ?', [id_tips], (tagErr, tagResult) => {
            if (tagErr) {
                console.error('[Tips-Backend] Error saat menghapus hashtag terkait:', tagErr.message);
                return db.rollback(() => res.status(500).json({ error: tagErr.message }));
            }
            console.log(`[Tips-Backend] ${tagResult.affectedRows} hashtag dihapus untuk tips ID ${id_tips}.`);

            // Kemudian hapus tips itu sendiri
            db.query('DELETE FROM tips WHERE id_tips = ?', [id_tips], (tipsErr, tipsResult) => {
                if (tipsErr) {
                    console.error('[Tips-Backend] Error saat menghapus tips:', tipsErr.message);
                    return db.rollback(() => res.status(500).json({ error: tipsErr.message }));
                }

                if (tipsResult.affectedRows === 0) {
                    console.warn(`[Tips-Backend] Tips dengan ID ${id_tips} tidak ditemukan untuk dihapus.`);
                    return db.rollback(() => res.status(404).json({ error: 'Tips tidak ditemukan' }));
                }

                // Commit transaksi jika semua berhasil
                db.commit(commitErr => {
                    if (commitErr) {
                        console.error('[Tips-Backend] Error saat commit transaksi:', commitErr.message);
                        return db.rollback(() => res.status(500).json({ error: commitErr.message }));
                    }
                    console.log(`[Tips-Backend] Tips ID ${id_tips} dan hashtag terkait berhasil dihapus.`);
                    res.json({ message: 'Tips dan hashtag berhasil dihapus' });
                });
            });
        });
    });
});

// Mengekspor router agar dapat digunakan di file utama aplikasi (misal: index.js atau app.js)
module.exports = router;
