// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// modul ini menangani endpoint untuk mendapatkan daftar resep dalam bentuk card
/**
 * Endpoint-endpoint tersedia:
 * 1. GET /card_recipe/all
 *    - Mengambil semua resep dalam bentuk card 
 *    - (id_resep, nama_resep, jumlah_view, thumbnail, nama_penulis, rating, jumlah_review)
 * 
 * 2. GET /card_recipe/user/:user_id
 *    - Mengambil resep yang dibuat oleh pengguna tertentu
 *    - (id_resep, nama_resep, jumlah_view, thumbnail, nama_penulis, rating, jumlah_review, tanggal_dibuat)
 * 
 * 3. GET /card_recipe/count/:user_id
 *    - Menghitung jumlah resep yang dibuat oleh pengguna tertentu
 *    - (total_resep)
 * 
 * 4. GET /card_recipe/category/:category_id
 *    - Mengambil resep berdasarkan kategori tertentu
 *    - (id_resep, nama_resep, jumlah_view, thumbnail, nama_penulis, rating, jumlah_review)
 */

// Endpoint untuk mendapatkan semua card recipe (tampilan kartu resep)
router.get('/all', (req, res) => {
    // Menjalankan query SQL untuk mendapatkan daftar resep dengan informasi penting untuk card
    db.query(`
        SELECT 
            resep.id_resep,             -- ID resep
            resep.nama_resep,           -- Nama resep
            resep.jumlah_view,          -- Jumlah dilihat
            resep.thumbnail,            -- Foto/gambar resep
            
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

// Endpoint untuk mendapatkan card recipe milik user tertentu
router.get('/user/:user_id', (req, res) => {
    // Mengambil ID user dari parameter URL
    const userId = req.params.user_id;
    
    // Validasi ID user
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID user tidak valid' });
    }
    
    // Menjalankan query SQL untuk mendapatkan daftar resep milik user tertentu
    db.query(`
        SELECT 
            resep.id_resep,             -- ID resep
            resep.nama_resep,           -- Nama resep
            resep.jumlah_view,          -- Jumlah dilihat
            resep.thumbnail,            -- Foto/gambar resep
            
            -- Nama penulis resep
            user.nama_user AS nama_penulis,
            
            -- Rating dengan handling NULL (jika belum ada review)
            CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(review.rating), 2)
            END AS rating,
            
            -- Total review
            COUNT(review.id_review) AS jumlah_review,
            
            -- Tanggal pembuatan resep
            resep.created_at AS tanggal_dibuat

        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        LEFT JOIN review ON resep.id_resep = review.id_resep
        WHERE resep.id_user = ?         -- Filter berdasarkan ID user
        GROUP BY 
            resep.id_resep,
            resep.nama_resep, 
            resep.jumlah_view,
            resep.thumbnail,
            resep.created_at,
            user.nama_user
        ORDER BY resep.created_at DESC   -- Urutkan berdasarkan tanggal terbaru
    `, [userId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Jika tidak ada resep yang ditemukan, kirim array kosong
        if (results.length === 0) {
            return res.json([]);
        }
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Endpoint untuk mendapatkan jumlah resep yang dibuat oleh user tertentu
router.get('/count/:user_id', (req, res) => {
    // Mengambil ID user dari parameter URL
    const userId = req.params.user_id;
    
    // Validasi ID user
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'ID user tidak valid' });
    }
    
    // Menjalankan query SQL untuk menghitung jumlah resep milik user tertentu
    db.query(`
        SELECT COUNT(*) AS total_resep
        FROM resep
        WHERE id_user = ?
    `, [userId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim hasil dalam format JSON
        res.json({ total_resep: results[0].total_resep });
    });
});

// Endpoint untuk mendapatkan card recipe berdasarkan kategori
router.get('/category/:category_id', (req, res) => {
    // Mengambil ID kategori dari parameter URL
    const categoryId = req.params.category_id;
    
    // Validasi ID kategori
    if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ error: 'ID kategori tidak valid' });
    }
    
    // Menjalankan query SQL untuk mendapatkan daftar resep berdasarkan kategori
    db.query(`
        SELECT 
            resep.id_resep,             -- ID resep
            resep.nama_resep,           -- Nama resep
            resep.jumlah_view,          -- Jumlah dilihat
            resep.thumbnail,            -- Foto/gambar resep
            
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
        WHERE resep.id_kategori = ?     -- Filter berdasarkan ID kategori
        GROUP BY 
            resep.id_resep,
            resep.nama_resep, 
            resep.jumlah_view,
            resep.thumbnail,
            user.nama_user
        ORDER BY rating DESC, jumlah_review DESC, resep.jumlah_view DESC
    `, [categoryId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
