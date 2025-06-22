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
router.get('/:id', (req, res) => {
    // Mengambil ID user dari parameter URL
    const userId = req.params.id;
    
    // Menjalankan query SQL untuk mendapatkan riwayat resep 
    db.query(`
        SELECT 
            rec.id_resep,                 -- ID resep yang dilihat
            rec.nama_resep,               -- Nama resep
            rec.thumbnail,                -- Gambar thumbnail resep
            h.timestamp AS waktu_dilihat, -- Waktu resep dilihat
            COUNT(rev.id_resep) AS review_count, -- Jumlah review
            ROUND(AVG(rev.rating), 1) AS rating -- Rating rata-rata (1 desimal)
        FROM history h
        JOIN resep rec ON h.id_resep = rec.id_resep
        JOIN user u ON h.id_user = u.id_user
        LEFT JOIN review rev ON h.id_resep = rev.id_resep
        WHERE h.id_user = ?               -- Filter berdasarkan ID user
        GROUP BY rec.id_resep, h.timestamp
        ORDER BY h.timestamp DESC         -- Urutan berdasarkan yang terbaru dilihat
        LIMIT 50                          -- Batasi jumlah hasil
    `, [userId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
