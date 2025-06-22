// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// Modul ini mengelola endpoint untuk mendapatkan detail resep, termasuk informasi dasar, alat, bahan, dan prosedur
/*
Endpoint : https://masakio.up.railway.app/recipe/basic/{id_resep}
Fungsi: Endpoint untuk mendapatkan informasi dasar resep, user, kategori, dan nutrisi

Endpoint : https://masakio.up.railway.app/recipe/alat/{id_resep}
Fungsi: Endpoint untuk mendapatkan daftar alat yang digunakan dalam resep

Endpoint : https://masakio.up.railway.app/recipe/bahan/{id_resep}
Fungsi: Endpoint untuk mendapatkan daftar bahan dan satuan yang digunakan dalam resep

Endpoint : https://masakio.up.railway.app/recipe/prosedur/{id_resep}
Fungsi: Endpoint untuk mendapatkan daftar prosedur dan langkah-langkahnya dalam resep

Endpoint : https://masakio.up.railway.app/recipe/tag/{id_resep}
Fungsi: Endpoint untuk mendapatkan daftar tag yang terkait dengan resep
*/ 

// 1. Endpoint untuk mendapatkan informasi dasar resep, user, kategori, dan nutrisi
router.get('/basic/:id', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id;
    const userId = req.query.user_id; // Optional parameter untuk check bookmark status
    
    // Menjalankan query SQL untuk mengambil data resep dengan join ke tabel terkait
    db.query(`
        SELECT 
            -- Data resep
            resep.id_resep,           -- ID unik resep
            resep.nama_resep,         -- Nama resep
            resep.deskripsi,          -- Deskripsi resep
            resep.video,              -- URL video tutorial resep
            resep.porsi,              -- Jumlah porsi resep
            resep.jumlah_like,        -- Jumlah like dari pengguna
            resep.jumlah_view,        -- Jumlah kali dilihat
            
            -- Data pembuat (user)
            user.id_user,             -- ID unik user pembuat resep
            user.nama_user AS pembuat,-- Nama user sebagai pembuat
            user.email AS email_pembuat,-- Email user pembuat
            user.tanggal_lahir,       -- Tanggal lahir pembuat
            user.created_at AS tanggal_daftar_pembuat,-- Tanggal pendaftaran user
            
            -- Data kategori
            kategori.id_kategori,     -- ID kategori resep
            kategori.kategori AS nama_kategori,-- Nama kategori resep
            
            -- Data nutrisi
            nutrisi.id_nutrisi,       -- ID data nutrisi
            nutrisi.karbohidrat,      -- Kandungan karbohidrat dalam gram
            nutrisi.protein,          -- Kandungan protein dalam gram
            nutrisi.lemak,            -- Kandungan lemak dalam gram
            nutrisi.serat,            -- Kandungan serat dalam gram
            
            -- Total durasi dari semua prosedur
            COALESCE((SELECT SUM(durasi) FROM prosedur WHERE prosedur.id_resep = resep.id_resep), 0) AS total_durasi,
            
            -- Estimasi harga total (misalnya Rp 2000 per bahan)
            COALESCE((SELECT COUNT(*) * 2000 FROM bahan WHERE bahan.id_resep = resep.id_resep), 0) AS estimasi_harga,
            
            -- Bookmark status (jika user_id tersedia)
            ${userId ? 'CASE WHEN wishlist.id_wishlist IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked' : '0 AS is_bookmarked'}
            
        FROM resep                    -- Tabel utama resep
        LEFT JOIN user ON resep.id_user = user.id_user -- Join dengan tabel user
        LEFT JOIN kategori ON resep.id_kategori = kategori.id_kategori -- Join dengan tabel kategori
        LEFT JOIN nutrisi ON resep.id_resep = nutrisi.id_resep -- Join dengan tabel nutrisi
        ${userId ? 'LEFT JOIN wishlist ON resep.id_resep = wishlist.id_resep AND wishlist.id_user = ?' : ''}
        WHERE resep.id_resep = ?      -- Filter berdasarkan ID resep
    `, userId ? [userId, recipeId] : [recipeId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        // Jika resep tidak ditemukan, kirim respons error 404
        if (results.length === 0) return res.status(404).json({ error: 'Recipe not found' });
        
        // Kirim data resep dalam format JSON
        res.json(results[0]);
    });
});

// 2. Endpoint untuk mendapatkan daftar alat yang digunakan dalam resep
router.get('/alat/:id', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id;
    
    // Menjalankan query SQL untuk mengambil data alat
    db.query(`
        SELECT 
            alat.id_alat,            -- ID unik alat
            alat.nama_alat,          -- Nama alat yang digunakan
            alat.jumlah              -- Jumlah alat yang diperlukan
        FROM alat                    -- Tabel alat
        WHERE alat.id_resep = ?      -- Filter berdasarkan ID resep
        ORDER BY alat.id_alat        -- Urutkan berdasarkan ID alat
    `, [recipeId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim daftar alat dalam format JSON
        res.json(results);
    });
});

// 3. Endpoint untuk mendapatkan daftar bahan dan satuan yang digunakan dalam resep
router.get('/bahan/:id', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id;
    
    // Menjalankan query SQL untuk mengambil data bahan dan satuan
    db.query(`
        SELECT 
            bahan.id_bahan,          -- ID unik bahan
            bahan.nama_bahan,        -- Nama bahan
            bahan.jumlah,            -- Jumlah bahan yang diperlukan
            satuan.id_satuan,        -- ID satuan yang digunakan
            satuan.nama_satuan       -- Nama satuan (misal: gram, sendok makan)
        FROM bahan                   -- Tabel bahan
        LEFT JOIN satuan ON bahan.id_satuan = satuan.id_satuan -- Join dengan tabel satuan
        WHERE bahan.id_resep = ?     -- Filter berdasarkan ID resep
        ORDER BY bahan.id_bahan      -- Urutkan berdasarkan ID bahan
    `, [recipeId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim daftar bahan dalam format JSON
        res.json(results);
    });
});

// 4. Endpoint untuk mendapatkan daftar prosedur dan langkah-langkahnya dalam resep
router.get('/prosedur/:id', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id;
    
    // Menjalankan query SQL untuk mengambil data prosedur dan langkah
    db.query(`
        SELECT 
            prosedur.id_prosedur,          -- ID unik prosedur
            prosedur.nama_prosedur,        -- Nama prosedur
            prosedur.urutan AS urutan_prosedur, -- Urutan prosedur dalam resep
            prosedur.durasi AS durasi_menit,    -- Durasi waktu dalam menit
            langkah.id_langkah,            -- ID langkah
            langkah.nama_langkah,          -- Deskripsi langkah
            langkah.urutan AS urutan_langkah    -- Urutan langkah dalam prosedur
        FROM prosedur                      -- Tabel prosedur 
        LEFT JOIN langkah ON prosedur.id_prosedur = langkah.id_prosedur -- Join dengan tabel langkah
        WHERE prosedur.id_resep = ?        -- Filter berdasarkan ID resep
        ORDER BY prosedur.urutan, langkah.urutan -- Urutkan berdasarkan urutan prosedur dan langkah
    `, [recipeId], (err, procedures) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Memproses hasil query untuk mengelompokkan langkah-langkah berdasarkan prosedur
        const processedProcedures = [];
        let currentProcedure = null;
        
        // Iterasi setiap baris hasil query
        procedures.forEach(row => {
            // Jika belum ada prosedur saat ini atau baris ini adalah prosedur baru
            if (!currentProcedure || currentProcedure.id_prosedur !== row.id_prosedur) {
                // Membuat objek prosedur baru
                currentProcedure = {
                    id_prosedur: row.id_prosedur,         // ID prosedur
                    nama_prosedur: row.nama_prosedur,     // Nama prosedur
                    urutan_prosedur: row.urutan_prosedur, // Urutan prosedur
                    durasi_menit: row.durasi_menit,       // Durasi dalam menit
                    langkah: []                           // Array untuk menyimpan langkah-langkah
                };
                // Menambahkan prosedur ke array hasil
                processedProcedures.push(currentProcedure);
            }
            
            // Menambahkan langkah ke prosedur jika langkah ada
            if (row.id_langkah) {
                currentProcedure.langkah.push({
                    id_langkah: row.id_langkah,           // ID langkah
                    nama_langkah: row.nama_langkah,       // Deskripsi langkah
                    urutan_langkah: row.urutan_langkah    // Urutan langkah
                });
            }
        });
        
        // Kirim data prosedur beserta langkah-langkahnya dalam format JSON
        res.json(processedProcedures);
    });
});

// 5. Endpoint untuk mendapatkan daftar tag yang terkait dengan resep
router.get('/tag/:id', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id;
    
    // Menjalankan query SQL untuk mengambil data tag
    db.query(`
        SELECT 
            tag.id_tag,              -- ID unik tag
            tag.nama_tag             -- Nama tag
        FROM tag                     -- Tabel tag
        WHERE tag.id_resep = ?       -- Filter berdasarkan ID resep
        ORDER BY tag.nama_tag        -- Urutkan berdasarkan nama tag secara alfabetis
    `, [recipeId], (err, results) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        
        // Kirim daftar tag dalam format JSON
        res.json(results);
    });
});

// Endpoint untuk mendapatkan semua informasi resep dalam satu panggilan API
router.get('/:id', (req, res) => {
    // Mengambil ID resep dari parameter URL
    const recipeId = req.params.id;
    // Membuat objek untuk menyimpan seluruh data resep
    const result = {};
    
    // Mendapatkan informasi dasar resep, user, kategori, dan nutrisi
    db.query(`
        SELECT 
            -- Data resep
            resep.id_resep,           -- ID unik resep
            resep.nama_resep,         -- Nama resep
            resep.deskripsi,          -- Deskripsi resep
            resep.video,              -- URL video tutorial resep
            resep.porsi,              -- Jumlah porsi resep
            resep.jumlah_like,        -- Jumlah like dari pengguna
            resep.jumlah_view,        -- Jumlah kali dilihat
            
            -- Data pembuat (user)
            user.id_user,             -- ID unik user pembuat resep
            user.nama_user AS pembuat,-- Nama user sebagai pembuat
            user.email AS email_pembuat,-- Email user pembuat
            user.tanggal_lahir,       -- Tanggal lahir pembuat
            user.created_at AS tanggal_daftar_pembuat,-- Tanggal pendaftaran user
            
            -- Data kategori
            kategori.id_kategori,     -- ID kategori resep
            kategori.kategori AS nama_kategori,-- Nama kategori resep
            
            -- Data nutrisi
            nutrisi.id_nutrisi,       -- ID data nutrisi
            nutrisi.karbohidrat,      -- Kandungan karbohidrat dalam gram
            nutrisi.protein,          -- Kandungan protein dalam gram
            nutrisi.lemak,            -- Kandungan lemak dalam gram
            nutrisi.serat             -- Kandungan serat dalam gram
            
        FROM resep                    -- Tabel utama resep
        LEFT JOIN user ON resep.id_user = user.id_user -- Join dengan tabel user
        LEFT JOIN kategori ON resep.id_kategori = kategori.id_kategori -- Join dengan tabel kategori
        LEFT JOIN nutrisi ON resep.id_resep = nutrisi.id_resep -- Join dengan tabel nutrisi
        WHERE resep.id_resep = ?      -- Filter berdasarkan ID resep    `, [recipeId], (err, basicInfo) => {
        // Jika terjadi error database, kirim respons error 500
        if (err) return res.status(500).json({ error: err.message });
        // Jika resep tidak ditemukan, kirim respons error 404
        if (basicInfo.length === 0) return res.status(404).json({ error: 'Recipe not found' });
        
        // Menyimpan informasi dasar ke dalam objek hasil
        result.info = basicInfo[0];
        
        // Mendapatkan daftar alat yang digunakan dalam resep
        db.query(`
            SELECT 
                alat.id_alat,            -- ID unik alat
                alat.nama_alat,          -- Nama alat yang digunakan
                alat.jumlah              -- Jumlah alat yang diperlukan
            FROM alat                    -- Tabel alat
            WHERE alat.id_resep = ?      -- Filter berdasarkan ID resep
            ORDER BY alat.id_alat        -- Urutkan berdasarkan ID alat        `, [recipeId], (err, tools) => {
            // Jika terjadi error database, kirim respons error 500
            if (err) return res.status(500).json({ error: err.message });
            
            // Menyimpan daftar alat ke dalam objek hasil
            result.alat = tools;
            
            // Mendapatkan daftar bahan dan satuan yang digunakan dalam resep
            db.query(`
                SELECT 
                    bahan.id_bahan,          -- ID unik bahan
                    bahan.nama_bahan,        -- Nama bahan
                    bahan.jumlah,            -- Jumlah bahan yang diperlukan
                    satuan.id_satuan,        -- ID satuan yang digunakan
                    satuan.nama_satuan       -- Nama satuan (misal: gram, sendok makan)
                FROM bahan                   -- Tabel bahan
                LEFT JOIN satuan ON bahan.id_satuan = satuan.id_satuan -- Join dengan tabel satuan
                WHERE bahan.id_resep = ?     -- Filter berdasarkan ID resep
                ORDER BY bahan.id_bahan      -- Urutkan berdasarkan ID bahan            `, [recipeId], (err, ingredients) => {
                // Jika terjadi error database, kirim respons error 500
                if (err) return res.status(500).json({ error: err.message });
                
                // Menyimpan daftar bahan ke dalam objek hasil
                result.bahan = ingredients;
                
                // Mendapatkan prosedur dan langkah-langkah dalam resep
                db.query(`
                    SELECT 
                        prosedur.id_prosedur,          -- ID unik prosedur
                        prosedur.nama_prosedur,        -- Nama prosedur
                        prosedur.urutan AS urutan_prosedur, -- Urutan prosedur dalam resep
                        prosedur.durasi AS durasi_menit,    -- Durasi waktu dalam menit
                        langkah.id_langkah,            -- ID langkah
                        langkah.nama_langkah,          -- Deskripsi langkah
                        langkah.urutan AS urutan_langkah    -- Urutan langkah dalam prosedur
                    FROM prosedur                      -- Tabel prosedur 
                    LEFT JOIN langkah ON prosedur.id_prosedur = langkah.id_prosedur -- Join dengan tabel langkah
                    WHERE prosedur.id_resep = ?        -- Filter berdasarkan ID resep
                    ORDER BY prosedur.urutan, langkah.urutan -- Urutkan berdasarkan urutan prosedur dan langkah                `, [recipeId], (err, procedures) => {
                    // Jika terjadi error database, kirim respons error 500
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Memproses hasil query untuk mengelompokkan langkah-langkah berdasarkan prosedur
                    const processedProcedures = [];
                    let currentProcedure = null;
                    
                    // Iterasi setiap baris hasil query
                    procedures.forEach(row => {
                        // Jika belum ada prosedur saat ini atau baris ini adalah prosedur baru
                        if (!currentProcedure || currentProcedure.id_prosedur !== row.id_prosedur) {
                            // Membuat objek prosedur baru
                            currentProcedure = {
                                id_prosedur: row.id_prosedur,         // ID prosedur
                                nama_prosedur: row.nama_prosedur,     // Nama prosedur
                                urutan_prosedur: row.urutan_prosedur, // Urutan prosedur
                                durasi_menit: row.durasi_menit,       // Durasi dalam menit
                                langkah: []                           // Array untuk menyimpan langkah-langkah
                            };
                            // Menambahkan prosedur ke array hasil
                            processedProcedures.push(currentProcedure);
                        }
                        
                        // Menambahkan langkah ke prosedur jika langkah ada
                        if (row.id_langkah) {
                            currentProcedure.langkah.push({
                                id_langkah: row.id_langkah,           // ID langkah
                                nama_langkah: row.nama_langkah,       // Deskripsi langkah
                                urutan_langkah: row.urutan_langkah    // Urutan langkah
                            });
                        }
                    });
                    
                    // Menyimpan daftar prosedur dan langkah ke dalam objek hasil
                    result.prosedur = processedProcedures;
                    
                    // Mendapatkan daftar tag yang terkait dengan resep
                    db.query(`
                        SELECT 
                            tag.id_tag,              -- ID unik tag
                            tag.nama_tag             -- Nama tag
                        FROM tag                     -- Tabel tag
                        WHERE tag.id_resep = ?       -- Filter berdasarkan ID resep
                        ORDER BY tag.nama_tag        -- Urutkan berdasarkan nama tag secara alfabetis                    `, [recipeId], (err, tags) => {
                        // Jika terjadi error database, kirim respons error 500
                        if (err) return res.status(500).json({ error: err.message });
                        
                        // Menyimpan daftar tag ke dalam objek hasil
                        result.tag = tags;
                        
                        // Mengirim respons lengkap dengan semua data resep
                        res.json(result);
                    });
                });
            });
        });
    });
});

// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
