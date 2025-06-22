// Impor Express framework untuk membuat API
const express = require('express');
// Membuat objek router untuk mengelola endpoint API
const router = express.Router();
// Impor modul database dari file db.js
const db = require('../db');

// Endpoint untuk mendapatkan semua card recipe (tampilan kartu resep)
router.get('/all', (req, res) => {
    const userId = req.query.user_id; // Optional parameter untuk check bookmark status
    
    // Query yang lebih detail untuk debug
    db.query(`
        SELECT 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user AS nama_penulis,
            
            -- Rating dengan handling NULL dan debug
            CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(CAST(review.rating AS DECIMAL(3,2))), 2)
            END AS rating,
            
            -- Total review per resep
            COUNT(review.id_review) AS jumlah_review,
            
            -- Total durasi dari semua prosedur
            COALESCE(SUM(prosedur.durasi), 0) AS total_durasi,
            
            -- Estimasi harga total (misalnya Rp 2000 per bahan)
            COUNT(DISTINCT bahan.id_bahan) * 2000 AS estimasi_harga,
            
            -- Bookmark status (jika user_id tersedia)
            ${userId ? 'CASE WHEN wishlist.id_wishlist IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked' : '0 AS is_bookmarked'},
            
            -- Debug: tampilkan semua rating untuk resep ini
            GROUP_CONCAT(review.rating) AS debug_ratings

        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        LEFT JOIN review ON resep.id_resep = review.id_resep
        LEFT JOIN prosedur ON resep.id_resep = prosedur.id_resep
        LEFT JOIN bahan ON resep.id_resep = bahan.id_resep
        ${userId ? 'LEFT JOIN wishlist ON resep.id_resep = wishlist.id_resep AND wishlist.id_user = ?' : ''}
        GROUP BY 
            resep.id_resep,
            resep.nama_resep, 
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user
        ORDER BY rating DESC, jumlah_review DESC, resep.jumlah_view DESC
    `, userId ? [userId] : [], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
        }
        
        // Format hasil dan tambah debug log
        const formattedResults = results.map(item => {
            console.log(`Resep ${item.nama_resep}:`);
            console.log(`  - Ratings: ${item.debug_ratings}`);
            console.log(`  - Average: ${item.rating}`);
            console.log(`  - Review count: ${item.jumlah_review}`);
            
            return {
                id_resep: item.id_resep,
                nama_resep: item.nama_resep,
                jumlah_view: parseInt(item.jumlah_view) || 0,
                thumbnail: item.thumbnail,
                porsi: parseInt(item.porsi) || 1,
                nama_penulis: item.nama_penulis,
                rating: parseFloat(item.rating) || 0.0,
                jumlah_review: parseInt(item.jumlah_review) || 0,
                total_durasi: parseInt(item.total_durasi) || 0,
                estimasi_harga: parseInt(item.estimasi_harga) || 0,
                is_bookmarked: parseInt(item.is_bookmarked) || 0,
                // Hapus debug_ratings dari response ke frontend
            };
        });
          console.log('Final formatted results:', formattedResults);
        res.json(formattedResults);
    });
});

// Endpoint untuk mendapatkan card recipe dengan filter
router.get('/filter', (req, res) => {
    const { category_id, include, exclude, user_id } = req.query;
    
    // Base query
    let query = `
        SELECT 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user AS nama_penulis,
            
            -- Rating dengan handling NULL
            CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(CAST(review.rating AS DECIMAL(3,2))), 2)
            END AS rating,
            
            -- Total review per resep
            COUNT(review.id_review) AS jumlah_review,
            
            -- Total durasi dari semua prosedur
            COALESCE(SUM(prosedur.durasi), 0) AS total_durasi,
            
            -- Estimasi harga total (misalnya Rp 2000 per bahan)
            COUNT(DISTINCT bahan.id_bahan) * 2000 AS estimasi_harga,
            
            -- Bookmark status (jika user_id tersedia)
            ${user_id ? 'CASE WHEN wishlist.id_wishlist IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked' : '0 AS is_bookmarked'}

        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        LEFT JOIN review ON resep.id_resep = review.id_resep
        LEFT JOIN prosedur ON resep.id_resep = prosedur.id_resep
        LEFT JOIN bahan ON resep.id_resep = bahan.id_resep
        ${user_id ? 'LEFT JOIN wishlist ON resep.id_resep = wishlist.id_resep AND wishlist.id_user = ?' : ''}
    `;
    
    const conditions = [];
    const params = [];
    
    // Add user_id parameter if provided (for bookmark check)
    if (user_id) {
        params.push(user_id);
    }
    
    // Filter by category
    if (category_id && !isNaN(category_id)) {
        conditions.push('resep.id_kategori = ?');
        params.push(parseInt(category_id));
    }
    
    // Filter by included ingredients
    if (include) {
        const includeIngredients = include.split(',').map(ing => ing.trim());
        if (includeIngredients.length > 0) {
            const includePlaceholders = includeIngredients.map(() => '?').join(',');
            conditions.push(`resep.id_resep IN (
                SELECT DISTINCT b.id_resep 
                FROM bahan b 
                WHERE LOWER(b.nama_bahan) IN (${includePlaceholders})
            )`);
            params.push(...includeIngredients.map(ing => ing.toLowerCase()));
        }
    }
    
    // Filter by excluded ingredients
    if (exclude) {
        const excludeIngredients = exclude.split(',').map(ing => ing.trim());
        if (excludeIngredients.length > 0) {
            const excludePlaceholders = excludeIngredients.map(() => '?').join(',');
            conditions.push(`resep.id_resep NOT IN (
                SELECT DISTINCT b.id_resep 
                FROM bahan b 
                WHERE LOWER(b.nama_bahan) IN (${excludePlaceholders})
            )`);
            params.push(...excludeIngredients.map(ing => ing.toLowerCase()));
        }
    }
    
    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }    // Add GROUP BY and ORDER BY
    query += `
        GROUP BY 
            resep.id_resep,
            resep.nama_resep, 
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user
        ORDER BY rating DESC, jumlah_review DESC, resep.jumlah_view DESC
    `;
    
    // Add LIMIT if specified
    const limit = req.query.limit;
    if (limit && !isNaN(parseInt(limit))) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
        }
        
        // Format hasil
        const formattedResults = results.map(item => ({
            id_resep: item.id_resep,
            nama_resep: item.nama_resep,
            jumlah_view: parseInt(item.jumlah_view) || 0,
            thumbnail: item.thumbnail,
            porsi: parseInt(item.porsi) || 1,
            nama_penulis: item.nama_penulis,
            rating: parseFloat(item.rating) || 0.0,
            jumlah_review: parseInt(item.jumlah_review) || 0,
            total_durasi: parseInt(item.total_durasi) || 0,
            estimasi_harga: parseInt(item.estimasi_harga) || 0,
            is_bookmarked: parseInt(item.is_bookmarked) || 0,
        }));
        
        console.log(`Filtered results: ${formattedResults.length} recipes found`);
        res.json(formattedResults);
    });
});

// Endpoint untuk mendapatkan rekomendasi berdasarkan penyakit user
router.get('/recommendations', (req, res) => {
    const userId = req.query.user_id;
    const limit = req.query.limit || 5;
    
    if (!userId) {
        // Jika tidak ada user_id, berikan rekomendasi berdasarkan rating tinggi
        return getTopRatedRecommendations(res, limit);
    }
    
    // Cek apakah user memiliki riwayat penyakit
    db.query(`
        SELECT DISTINCT p.id_penyakit, p.nama_penyakit 
        FROM riwayat_user ru 
        INNER JOIN penyakit p ON ru.id_penyakit = p.id_penyakit 
        WHERE ru.id_user = ?
    `, [userId], (err, diseases) => {
        if (err) {
            console.error('Error checking user diseases:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (diseases.length === 0) {
            // User tidak memiliki riwayat penyakit, berikan rekomendasi berdasarkan rating
            return getTopRatedRecommendations(res, limit, userId);
        }
        
        // User memiliki riwayat penyakit, berikan rekomendasi yang sesuai
        getDiseaseBasedRecommendations(res, diseases, limit, userId);
    });
});

// Function untuk mendapatkan rekomendasi berdasarkan rating tinggi
function getTopRatedRecommendations(res, limit, userId = null) {
    const userBookmarkJoin = userId ? 'LEFT JOIN wishlist ON resep.id_resep = wishlist.id_resep AND wishlist.id_user = ?' : '';
    const bookmarkSelect = userId ? 'CASE WHEN wishlist.id_wishlist IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked,' : '0 AS is_bookmarked,';
    const queryParams = userId ? [userId] : [];
    
    db.query(`
        SELECT 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user AS nama_penulis,
            
            CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(CAST(review.rating AS DECIMAL(3,2))), 2)
            END AS rating,
            
            COUNT(review.id_review) AS jumlah_review,
            COALESCE(SUM(prosedur.durasi), 0) AS total_durasi,
            COUNT(DISTINCT bahan.id_bahan) * 2000 AS estimasi_harga,
            
            ${bookmarkSelect}
            
            -- Prioritas untuk rekomendasi
            (CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(CAST(review.rating AS DECIMAL(3,2))), 2)
            END * 0.7 + 
            LEAST(COUNT(review.id_review) / 10.0, 1.0) * 0.3) AS recommendation_score

        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        LEFT JOIN review ON resep.id_resep = review.id_resep
        LEFT JOIN prosedur ON resep.id_resep = prosedur.id_resep
        LEFT JOIN bahan ON resep.id_resep = bahan.id_resep
        ${userBookmarkJoin}
        GROUP BY 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user
        ORDER BY recommendation_score DESC, resep.jumlah_view DESC
        LIMIT ?
    `, [...queryParams, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Error fetching top rated recommendations:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
}

// Function untuk mendapatkan rekomendasi berdasarkan penyakit
function getDiseaseBasedRecommendations(res, diseases, limit, userId) {
    // Mapping penyakit ke rekomendasi nutrisi/kategori
    const diseaseRecommendations = {
        'Diabetes': {
            // Hindari kategori cemilan, prioritaskan protein tinggi dan serat
            avoidCategories: [2], // cemilan
            nutritionCriteria: 'protein >= 15 AND serat >= 2 AND karbohidrat <= 30'
        },
        'Hipertensi': {
            // Prioritaskan makanan rendah sodium (kita assume sup mengandung sodium tinggi)
            avoidCategories: [3], // sup
            nutritionCriteria: 'lemak <= 10 AND protein >= 10'
        },
        'Penyakit Jantung': {
            // Hindari makanan tinggi lemak
            avoidCategories: [2], // cemilan
            nutritionCriteria: 'lemak <= 8 AND serat >= 3'
        },
        'Kolesterol Tinggi': {
            // Prioritaskan serat tinggi, lemak rendah
            nutritionCriteria: 'serat >= 3 AND lemak <= 10'
        },
        'Obesitas': {
            // Prioritaskan protein tinggi, karbohidrat rendah
            nutritionCriteria: 'protein >= 15 AND karbohidrat <= 25 AND lemak <= 12'
        }
    };
    
    // Gabungkan kriteria dari semua penyakit user
    let avoidCategories = [];
    let nutritionConditions = [];
    
    diseases.forEach(disease => {
        const criteria = diseaseRecommendations[disease.nama_penyakit];
        if (criteria) {
            if (criteria.avoidCategories) {
                avoidCategories = [...avoidCategories, ...criteria.avoidCategories];
            }
            if (criteria.nutritionCriteria) {
                nutritionConditions.push(`(${criteria.nutritionCriteria})`);
            }
        }
    });
    
    // Remove duplicates
    avoidCategories = [...new Set(avoidCategories)];
    
    // Build WHERE clause
    let whereConditions = [];
    if (avoidCategories.length > 0) {
        whereConditions.push(`resep.id_kategori NOT IN (${avoidCategories.join(',')})`);
    }
    if (nutritionConditions.length > 0) {
        whereConditions.push(`(${nutritionConditions.join(' OR ')})`);
    }
    
    const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';
    
    db.query(`
        SELECT 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user AS nama_penulis,
            
            CASE 
                WHEN COUNT(review.id_review) = 0 THEN 0.0
                ELSE ROUND(AVG(CAST(review.rating AS DECIMAL(3,2))), 2)
            END AS rating,
            
            COUNT(review.id_review) AS jumlah_review,
            COALESCE(SUM(prosedur.durasi), 0) AS total_durasi,
            COUNT(DISTINCT bahan.id_bahan) * 2000 AS estimasi_harga,
            
            CASE WHEN wishlist.id_wishlist IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked,
            
            -- Health score berdasarkan nutrisi
            (COALESCE(nutrisi.protein, 0) * 0.3 + 
             COALESCE(nutrisi.serat, 0) * 0.3 + 
             (50 - COALESCE(nutrisi.lemak, 50)) * 0.2 + 
             (100 - COALESCE(nutrisi.karbohidrat, 100)) * 0.2) AS health_score

        FROM resep
        INNER JOIN user ON resep.id_user = user.id_user
        LEFT JOIN review ON resep.id_resep = review.id_resep
        LEFT JOIN prosedur ON resep.id_resep = prosedur.id_resep
        LEFT JOIN bahan ON resep.id_resep = bahan.id_resep
        LEFT JOIN nutrisi ON resep.id_resep = nutrisi.id_resep
        LEFT JOIN wishlist ON resep.id_resep = wishlist.id_resep AND wishlist.id_user = ?
        WHERE 1=1 ${whereClause}
        GROUP BY 
            resep.id_resep,
            resep.nama_resep,
            resep.jumlah_view,
            resep.thumbnail,
            resep.porsi,
            user.nama_user,
            nutrisi.protein,
            nutrisi.serat,
            nutrisi.lemak,
            nutrisi.karbohidrat
        ORDER BY health_score DESC, rating DESC
        LIMIT ?
    `, [userId, parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Error fetching disease-based recommendations:', err);
            // Fallback ke top rated jika error
            return getTopRatedRecommendations(res, limit, userId);
        }
          if (results.length < limit) {
            // Jika tidak cukup resep yang sesuai kriteria kesehatan, 
            // fallback ke top rated untuk melengkapi
            console.log(`Only ${results.length} disease-based recipes found, falling back to top rated`);
            return getTopRatedRecommendations(res, limit, userId);
        } else {
            res.json(results);
        }
    });
}

module.exports = router;