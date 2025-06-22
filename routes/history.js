// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// modul ini menangani endpoint untuk mendapatkan riwayat resep yang dilihat oleh pengguna
/*
Endpoint : https://masakio.up.railway.app/history/{id_user}
Fungsi : Mengambil semua riwayat resep yang pernah dilihat oleh pengguna tertentu
Params : id_user - ID pengguna yang riwayat resepnya ingin dilihat
 */

// Endpoint untuk mendapatkan riwayat resep berdasarkan id_user
router.get('/:id', (req, res) => {    // Mengambil ID user dari parameter URL
    const userId = req.params.id;
    
    // Menjalankan query SQL untuk mendapatkan riwayat resep
    db.query(`SELECT 
            h.id_history,
            rec.id_resep,
            rec.nama_resep,
            rec.thumbnail,
            h.timestamp AS waktu_dilihat,
            (SELECT COUNT(*) FROM review WHERE review.id_resep = rec.id_resep) AS review_count,
            (SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM review WHERE review.id_resep = rec.id_resep) AS rating
        FROM 
            history h
        JOIN 
            resep rec ON h.id_resep = rec.id_resep
        WHERE 
            h.id_user = ?
        ORDER BY 
            h.timestamp DESC
        LIMIT 10
    `, [userId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Endpoint untuk menambah riwayat resep yang dilihat
/*
Endpoint : https://masakio.up.railway.app/history
Method : POST
Fungsi : Menambah riwayat resep yang dilihat oleh pengguna
Body : 
{
    "id_user": "ID pengguna yang melihat resep",
    "id_resep": "ID resep yang dilihat"
}
Note: Hanya menyimpan 10 riwayat terbaru per pengguna. Jika lebih, maka yang terlama akan dihapus
*/
router.post('/', (req, res) => {
    // Mengambil data dari body request
    const { id_user, id_resep } = req.body;

    // Validasi input
    if (!id_user || !id_resep) {
        return res.status(400).json({ error: 'id_user dan id_resep diperlukan' });
    }

    // Menambah timestamp saat ini
    const timestamp = new Date();

    // Proses menggunakan transaksi untuk memastikan operasi atomic
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });

        // 1. Cek jumlah entry history untuk user ini
        db.query(
            'SELECT COUNT(*) as count FROM history WHERE id_user = ?', 
            [id_user], 
            (err, results) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: err.message });
                    });
                }

                const count = results[0].count;

                // 2. Jika sudah ada 10 atau lebih entry, hapus yang terlama
                if (count >= 10) {
                    db.query(
                        'DELETE FROM history WHERE id_user = ? ORDER BY timestamp ASC LIMIT 1', 
                        [id_user], 
                        (err, results) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ error: err.message });
                                });
                            }

                            // 3. Sisipkan entry baru
                            insertNewHistory();
                        }
                    );
                } else {
                    // Jika belum mencapai 10 entry, langsung sisipkan
                    insertNewHistory();
                }
            }
        );

        // Fungsi untuk menyisipkan history baru
        function insertNewHistory() {
            db.query(
                'INSERT INTO history (id_user, id_resep, timestamp) VALUES (?, ?, ?)',
                [id_user, id_resep, timestamp],
                (err, results) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }

                    // Commit transaksi jika berhasil
                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ error: err.message });
                            });
                        }

                        res.status(201).json({
                            message: 'Riwayat berhasil ditambahkan',
                            id_history: results.insertId,
                            id_user,
                            id_resep,
                            timestamp
                        });
                    });
                }
            );
        }
    });
});



// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
