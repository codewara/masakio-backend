// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// modul ini menangani endpoint untuk mendapatkan review dari sebuah resep
/*
Endpoint : https://masakio.up.railway.app/reviews/{id_resep}
Fungsi : Mengambil semua review untuk resep tertentu
         (nama_resep, nama_user, email, rating, komentar)
Params : id_resep - ID resep yang ingin dilihat reviewnya
 */

// Endpoint untuk mendapatkan review resep berdasarkan id_resep
router.get('/:id_resep', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id_resep;
    
    // Validasi ID resep
    if (!recipeId || isNaN(recipeId)) {
        return res.status(400).json({ error: 'ID resep tidak valid' });
    }
    
    // Menjalankan query SQL untuk mendapatkan daftar review untuk resep tertentu
    db.query(`
        SELECT 
            resep.nama_resep,       -- Nama resep yang direview
            user.nama_user,         -- Nama user yang memberikan review
            user.email,             -- Email user yang memberikan review
            review.rating,          -- Rating yang diberikan (skala 1-5)
            review.komentar         -- Komentar/ulasan yang diberikan

        FROM review
        INNER JOIN resep ON review.id_resep = resep.id_resep
        INNER JOIN user ON review.id_user = user.id_user
        WHERE resep.id_resep = ?    -- Filter berdasarkan ID resep
        ORDER BY review.id_review DESC  -- Review terbaru ditampilkan di awal
    `, [recipeId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Jika tidak ada review yang ditemukan, kirim array kosong
        if (results.length === 0) {
            return res.json([]);
        }
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Endpoint untuk mendapatkan statistik review dari sebuah resep
router.get('/stats/:id_resep', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id_resep;
    
    // Validasi ID resep
    if (!recipeId || isNaN(recipeId)) {
        return res.status(400).json({ error: 'ID resep tidak valid' });
    }
    
    // Menjalankan query SQL untuk mendapatkan statistik review
    db.query(`
        SELECT 
            COUNT(*) AS total_review,
            ROUND(AVG(rating), 2) AS rating_rata_rata,
            COUNT(CASE WHEN rating = 5 THEN 1 END) AS rating_5,
            COUNT(CASE WHEN rating = 4 THEN 1 END) AS rating_4,
            COUNT(CASE WHEN rating = 3 THEN 1 END) AS rating_3,
            COUNT(CASE WHEN rating = 2 THEN 1 END) AS rating_2,
            COUNT(CASE WHEN rating = 1 THEN 1 END) AS rating_1
        FROM review
        WHERE id_resep = ?
    `, [recipeId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Pastikan nilai tidak null
        const stats = results[0];
        stats.rating_rata_rata = stats.rating_rata_rata || 0;
        
        // Kirim hasil dalam format JSON
        res.json(stats);
    });
});

// Endpoint untuk menambahkan review baru
router.post('/add', (req, res) => {
    // Mengambil data review dari body request
    const { id_user, id_resep, rating, komentar } = req.body;
    
    // Validasi data yang diperlukan
    if (!id_user || !id_resep || !rating) {
        return res.status(400).json({ error: 'Data tidak lengkap. id_user, id_resep, dan rating diperlukan.' });
    }
    
    // Validasi rating (harus antara 1-5)
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: 'Rating harus berupa angka antara 1 sampai 5.' });
    }
    
    // Cek apakah user sudah pernah memberikan review pada resep ini
    db.query('SELECT * FROM review WHERE id_user = ? AND id_resep = ?', 
    [id_user, id_resep], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Jika user sudah pernah memberikan review, update review lama
        if (results.length > 0) {
            db.query('UPDATE review SET rating = ?, komentar = ?, updated_at = NOW() WHERE id_user = ? AND id_resep = ?',
            [rating, komentar || null, id_user, id_resep], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.status(200).json({ message: 'Review berhasil diperbarui', id_review: results[0].id_review });
            });
        } 
        // Jika belum pernah, buat review baru
        else {
            db.query('INSERT INTO review (id_user, id_resep, rating, komentar, created_at) VALUES (?, ?, ?, ?, NOW())',
            [id_user, id_resep, rating, komentar || null], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.status(201).json({ message: 'Review berhasil ditambahkan', id_review: results.insertId });
            });
        }
    });
});

// Endpoint untuk menghapus review
router.delete('/delete', (req, res) => {
    // Mengambil data dari body request
    const { id_user, id_resep } = req.body;
    
    // Validasi data yang diperlukan
    if (!id_user || !id_resep) {
        return res.status(400).json({ error: 'Data tidak lengkap. id_user dan id_resep diperlukan.' });
    }
    
    // Menghapus review dari database
    db.query('DELETE FROM review WHERE id_user = ? AND id_resep = ?',
    [id_user, id_resep], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Jika tidak ada review yang dihapus
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Review tidak ditemukan.' });
        }
        
        res.status(200).json({ message: 'Review berhasil dihapus.' });
    });
});

// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
