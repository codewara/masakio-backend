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
 * 3. GET /card_recipe/filter
 *    - Memfilter resep berdasarkan kategori, bahan yang diinginkan, dan bahan yang tidak diinginkan
 *    - Query params:
 *      - category_id: ID kategori resep (opsional)
 *      - include: Daftar bahan yang diinginkan, dipisahkan dengan koma (opsional)
 *      - exclude: Daftar bahan yang tidak diinginkan, dipisahkan dengan koma (opsional)
 *    - Returns: (id_resep, nama_resep, jumlah_view, thumbnail, nama_penulis, rating, jumlah_review)
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


router.get('/filter', (req, res) => {
    // Mengambil parameter filter dari query URL
    const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;
    const includeBahan = req.query.include ? 
        req.query.include.split(',').map(item => item.trim().toLowerCase()) : [];
    const excludeBahan = req.query.exclude ? 
        req.query.exclude.split(',').map(item => item.trim().toLowerCase()) : [];
    
    console.log('Filter Parameters:');
    console.log('- Category ID:', categoryId);
    console.log('- Include Bahan:', includeBahan);
    console.log('- Exclude Bahan:', excludeBahan);
    
    // Step 1: Ambil semua data resep dengan bahan dan kategori
    const sql = `
        SELECT 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view AS total_views,
            resep.thumbnail AS gambar_resep,
            resep.id_kategori,
            
            -- Nama penulis resep
            user.nama_user AS nama_penulis,
            
            -- Nama kategori
            kategori.kategori AS nama_kategori,
            
            -- Informasi bahan (GROUP_CONCAT untuk mendapatkan semua bahan dalam satu row)
            GROUP_CONCAT(DISTINCT bahan.nama_bahan) AS daftar_bahan,
            
            -- Rating dengan handling NULL
            CASE 
                WHEN COUNT(DISTINCT review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(review.rating), 2)
            END AS rating_rata_rata,
            
            -- Total review
            COUNT(DISTINCT review.id_review) AS total_review
            
        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        INNER JOIN kategori ON resep.id_kategori = kategori.id_kategori
        LEFT JOIN bahan ON resep.id_resep = bahan.id_resep
        LEFT JOIN review ON resep.id_resep = review.id_resep
        GROUP BY 
            resep.id_resep,
            resep.nama_resep, 
            resep.jumlah_view,
            resep.thumbnail,
            resep.id_kategori,
            user.nama_user,
            kategori.kategori
        ORDER BY resep.id_resep`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database Error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Retrieved ${results.length} recipes from database`);
        
        // Step 2: Filter data di JavaScript
        const filteredResults = results.filter(resep => {
            // Konversi daftar_bahan menjadi array (lowercase untuk comparison)
            const bahanArray = resep.daftar_bahan ? 
                resep.daftar_bahan.toLowerCase().split(',').map(item => item.trim()) : [];
            
            // Filter 1: Kategori (jika ada)
            if (categoryId !== null && resep.id_kategori !== categoryId) {
                return false;
            }
            
            // Filter 2: Include bahan (semua bahan yang diminta harus ada)
            if (includeBahan.length > 0) {
                const hasAllIncludedIngredients = includeBahan.every(requiredBahan => 
                    bahanArray.some(actualBahan => actualBahan.includes(requiredBahan))
                );
                
                if (!hasAllIncludedIngredients) {
                    return false;
                }
            }
            
            // Filter 3: Exclude bahan (tidak boleh ada bahan yang dikecualikan)
            if (excludeBahan.length > 0) {
                const hasExcludedIngredients = excludeBahan.some(excludedBahan => 
                    bahanArray.some(actualBahan => actualBahan.includes(excludedBahan))
                );
                
                if (hasExcludedIngredients) {
                    return false;
                }
            }
            
            return true; // Lolos semua filter
        });
        
        console.log(`After filtering: ${filteredResults.length} recipes match criteria`);
        
        // Step 3: Format hasil untuk response (sesuai format card resep)
        const formattedResults = filteredResults.map(resep => ({
            id_resep: resep.id_resep,
            nama_resep: resep.nama_resep,
            total_views: resep.total_views,
            gambar_resep: resep.gambar_resep,
            nama_penulis: resep.nama_penulis,
            nama_kategori: resep.nama_kategori,
            rating_rata_rata: resep.rating_rata_rata,
            total_review: resep.total_review,
            // Tambahan informasi untuk debugging
            daftar_bahan: resep.daftar_bahan
        }));
        
        // Step 4: Return hasil
        res.json(formattedResults);
    });
});



// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
