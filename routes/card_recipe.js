// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// modul ini menangani endpoint untuk mendapatkan daftar resep dalam bentuk card
/*
Endpoint : https://masakio.up.railway.app/card_recipe/all
Fungsi : Mengambil semua resep dalam bentuk card (id_resep, nama_resep, jumlah_view, thumbnail, nama_penulis, rating, jumlah_review)
 */

// Endpoint untuk mendapatkan semua card recipe (tampilan kartu resep)
router.get('/all', (req, res) => {
    // Menjalankan query SQL untuk mendapatkan daftar resep dengan informasi penting untuk card
    db.query(`
        SELECT 
            resep.id_resep,             -- ID resep
            resep.nama_resep,           -- Nama resep
            resep.jumlah_view, -- Jumlah dilihat
            resep.thumbnail, -- Foto/gambar resep
            
            -- Nama penulis resep
            user.nama_user AS nama_penulis,
            
            -- Rating dengan handling NULL (jika belum ada review)
            CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(review.rating), 2)
            END AS rating,
            
            -- Total review
            COUNT(review.id_review) AS jumlah_review

        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        LEFT JOIN review ON resep.id_resep = review.id_resep
        GROUP BY 
            resep.id_resep,
            resep.nama_resep, 
            resep.jumlah_view,
            resep.thumbnail,
            user.nama_user
        ORDER BY rating DESC, jumlah_review DESC, resep.jumlah_view DESC
    `, (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
