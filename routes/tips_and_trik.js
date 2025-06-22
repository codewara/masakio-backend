// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// modul ini menangani endpoint untuk mendapatkan tips memasak
/*
Endpoint : https://masakio.up.railway.app/tips/all
Fungsi : Mengambil semua tips memasak
         (id_tips, nama_uploader, judul, foto)
 */

// Endpoint untuk mendapatkan semua tips memasak (dalam bentuk card)
router.get('/all', (req, res) => {
    // Menjalankan query SQL untuk mendapatkan daftar tips
    db.query(`
        SELECT 
            tips.id_tips,           -- ID unik tips
            user.nama_user AS nama_uploader, -- Nama pengguna yang mengunggah tips
            tips.judul,             -- Judul tips
            tips.foto               -- URL foto tips
            
        FROM tips
        INNER JOIN user ON tips.id_user = user.id_user
        ORDER BY tips.timestamp DESC  -- Tips terbaru ditampilkan di awal
    `, (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim hasil dalam format JSON
        res.json(results);
    });
});

// Endpoint untuk mendapatkan detail tips berdasarkan id_tips
router.get('/:id_tips', (req, res) => {
    // Mengambil ID tips dari parameter URL
    const tipsId = req.params.id_tips;
    
    // Validasi ID tips
    if (!tipsId || isNaN(tipsId)) {
        return res.status(400).json({ error: 'ID tips tidak valid' });
    }
    
    // Menjalankan query SQL untuk mendapatkan detail tips
    db.query(`
        SELECT 
            tips.id_tips,           -- ID unik tips
            tips.id_user,           -- ID pengguna yang mengunggah
            user.nama_user,         -- Nama pengguna yang mengunggah
            tips.judul,             -- Judul tips
            tips.deskripsi,         -- Isi/deskripsi tips
            tips.foto,              -- URL foto tips
            tips.timestamp          -- Waktu pengunggahan
            
        FROM tips
        INNER JOIN user ON tips.id_user = user.id_user
        WHERE tips.id_tips = ?      -- Filter berdasarkan ID tips
    `, [tipsId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Jika tips tidak ditemukan, kirim respons error 404
        if (results.length === 0) {
            return res.status(404).json({ error: 'Tips tidak ditemukan' });
        }
        
        // Kirim hasil dalam format JSON
        res.json(results[0]);
    });
});

// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
