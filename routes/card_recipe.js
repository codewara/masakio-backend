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


// Endpoint untuk memfilter resep berdasarkan kategori, bahan yang diinginkan, dan bahan yang tidak diinginkan
router.get('/filter', (req, res) => {
    // Mengambil dan memparse parameter category_id dari query URL, jika tidak ada maka gunakan null
    const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;
    
    // Mengambil parameter include dari query URL, memisahkan berdasarkan koma, dan mengubah setiap bahan menjadi lowercase untuk case-insensitive search
    const includeBahan = req.query.include ? 
        req.query.include.split(',').map(item => item.trim().toLowerCase()) : [];
    
    // Mengambil parameter exclude dari query URL dengan cara yang sama seperti include
    const excludeBahan = req.query.exclude ? 
        req.query.exclude.split(',').map(item => item.trim().toLowerCase()) : [];
    
    // Mencatat parameter filter yang digunakan ke console untuk debugging
    console.log('Filter Parameters:');
    console.log('- Category ID:', categoryId);
    console.log('- Include Bahan:', includeBahan);
    console.log('- Exclude Bahan:', excludeBahan);
    
    // Menyiapkan array untuk menyimpan parameter query yang akan digunakan dalam prepared statement
    let queryParams = [];
    // Array untuk menyimpan kondisi WHERE yang akan digunakan dalam query
    let whereConditions = [];
    // Array untuk menyimpan kondisi HAVING yang akan digunakan dalam query
    let havingConditions = [];
    
    // Memulai membuat query SQL dengan SELECT statement dasar
    let sql = `
        SELECT 
            resep.id_resep,                 -- ID resep yang unik
            resep.nama_resep,               -- Nama resep
            resep.jumlah_view AS total_views, -- Jumlah kali resep dilihat
            resep.thumbnail AS gambar_resep,  -- Gambar thumbnail resep
            resep.id_kategori,              -- ID kategori resep
            resep.thumbnail,                -- Thumbnail resep
            
            -- Nama penulis resep dari tabel user
            user.nama_user AS nama_penulis,
            
            -- Nama kategori dari tabel kategori
            kategori.kategori AS nama_kategori,
            
            -- Menghitung rating rata-rata, jika tidak ada review maka rating = 0
            CASE 
                WHEN COUNT(DISTINCT review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(review.rating), 2)
            END AS rating_rata_rata,
            
            -- Menghitung jumlah total review untuk resep
            COUNT(DISTINCT review.id_review) AS total_review
    `;
    
    // Jika ada parameter include (bahan yang diinginkan), tambahkan kolom untuk menghitung jumlah bahan yang cocok
    if (includeBahan.length > 0) {
        sql += `,
            -- Hitung berapa bahan yang cocok dengan kriteria include
            COUNT(DISTINCT CASE 
                -- Mengecek apakah nama_bahan (setelah ditrim dan lowercase) ada dalam daftar bahan yang diinginkan
                WHEN LOWER(TRIM(bahan.nama_bahan)) IN (${includeBahan.map(() => '?').join(',')}) 
                -- Jika cocok, hitung id_bahan tersebut
                THEN bahan.id_bahan 
                -- Jika tidak cocok, berikan NULL (tidak dihitung)
                ELSE NULL 
            END) AS matched_include_count`;
        
        // Menambahkan nilai bahan yang diinginkan ke parameter query
        queryParams.push(...includeBahan);
    }
    
    // Menambahkan klausa FROM dan JOIN untuk menghubungkan tabel-tabel yang diperlukan
    sql += `
        FROM resep
        -- Join dengan tabel user untuk mendapatkan info penulis
        INNER JOIN user ON resep.id_user = user.id_user
        -- Join dengan tabel kategori untuk mendapatkan nama kategori
        INNER JOIN kategori ON resep.id_kategori = kategori.id_kategori
        -- Left join dengan tabel bahan untuk memfilter berdasarkan bahan
        LEFT JOIN bahan ON resep.id_resep = bahan.id_resep
        -- Left join dengan tabel review untuk menghitung rating dan jumlah review
        LEFT JOIN review ON resep.id_resep = review.id_resep
    `;
    
    // Mulai membangun kondisi WHERE
    
    // 1. Filter berdasarkan kategori jika category_id disediakan
    if (categoryId !== null) {
        // Tambahkan kondisi untuk memfilter berdasarkan id_kategori
        whereConditions.push('resep.id_kategori = ?');
        // Tambahkan nilai category_id ke parameter query
        queryParams.push(categoryId);
    }
    
    // 2. Filter untuk mengecualikan resep dengan bahan yang tidak diinginkan
    if (excludeBahan.length > 0) {
        // Gunakan subquery NOT EXISTS untuk memastikan tidak ada bahan yang tidak diinginkan dalam resep
        const excludeSubquery = `
            NOT EXISTS (
                -- Subquery yang mencari bahan yang tidak diinginkan dalam resep
                SELECT 1 FROM bahan exclude_check 
                WHERE exclude_check.id_resep = resep.id_resep 
                -- Mengecek apakah nama_bahan (setelah ditrim dan lowercase) ada dalam daftar bahan yang tidak diinginkan
                AND LOWER(TRIM(exclude_check.nama_bahan)) IN (${excludeBahan.map(() => '?').join(',')})
            )`;
        // Tambahkan subquery ke kondisi WHERE
        whereConditions.push(excludeSubquery);
        // Tambahkan nilai bahan yang tidak diinginkan ke parameter query
        queryParams.push(...excludeBahan);
    }
    
    // Tambahkan klausa WHERE ke query jika ada kondisi WHERE yang ditetapkan
    if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Tambahkan klausa GROUP BY untuk mengelompokkan hasil berdasarkan resep
    sql += `
        GROUP BY 
            resep.id_resep,             -- Grouping berdasarkan id resep
            resep.nama_resep,           -- dan atribut resep lainnya
            resep.jumlah_view,
            resep.thumbnail,
            resep.id_kategori,
            user.nama_user,             -- serta nama penulis
            kategori.kategori           -- dan nama kategori
    `;
    
    // 3. Filter untuk memastikan resep mengandung semua bahan yang diinginkan
    if (includeBahan.length > 0) {
        // Kondisi HAVING untuk memastikan jumlah bahan yang cocok = jumlah bahan yang diinginkan
        // Ini memastikan semua bahan yang diinginkan ada dalam resep
        havingConditions.push('matched_include_count = ?');
        // Tambahkan jumlah bahan yang diinginkan ke parameter query
        queryParams.push(includeBahan.length);
    }
    
    // Tambahkan klausa HAVING ke query jika ada kondisi HAVING yang ditetapkan
    if (havingConditions.length > 0) {
        sql += ' HAVING ' + havingConditions.join(' AND ');
    }
    
    // Tambahkan klausa ORDER BY untuk mengurutkan hasil
    // Urutkan berdasarkan rating tertinggi, lalu jumlah review, dan terakhir jumlah view
    sql += ' ORDER BY rating_rata_rata DESC, total_review DESC, resep.jumlah_view DESC';
    
    // Cetak query SQL dan parameter yang digunakan untuk debugging
    console.log('Generated SQL:', sql);
    console.log('Query Parameters:', queryParams);
    
    // Eksekusi query dengan parameter yang telah disiapkan
    db.query(sql, queryParams, (err, results) => {
        // Handling error database
        if (err) {
            // Catat error ke console untuk debugging
            console.error('Database Error:', err.message);
            console.error('Failed SQL:', sql);
            console.error('Failed Parameters:', queryParams);
            // Kirim respons error dengan detail tambahan jika dalam mode development
            return res.status(500).json({ 
                error: err.message,
                sql_debug: process.env.NODE_ENV === 'development' ? sql : undefined 
            });
        }
        
        // Log jumlah resep yang ditemukan
        console.log(`Query executed successfully. Found ${results.length} recipes.`);
        
        // Format hasil query sebelum dikirim sebagai respons
        // Ini juga menghilangkan kolom 'matched_include_count' yang hanya digunakan untuk filtering
        const formattedResults = results.map(resep => ({
            id_resep: resep.id_resep,           // ID resep
            nama_resep: resep.nama_resep,       // Nama resep
            total_views: resep.total_views,     // Jumlah view
            gambar_resep: resep.gambar_resep,   // URL gambar resep
            nama_penulis: resep.nama_penulis,   // Nama pembuat resep
            nama_kategori: resep.nama_kategori, // Kategori resep
            rating_rata_rata: resep.rating_rata_rata, // Rating rata-rata
            total_review: resep.total_review,    // Jumlah review
            thumbnail: resep.thumbnail // Thumbnail resep
        }));
        
        // Kirim hasil dalam format JSON sebagai respons
        res.json(formattedResults);
    });
});




// Mengekspor router agar dapat digunakan di index.js
module.exports = router;
