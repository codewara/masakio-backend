const express = require('express');
const router = express.Router();
const db = require('../db');

// Mendapatkan semua daftar penyakit
router.get('/', (req, res) => {
    db.query('SELECT * FROM penyakit ORDER BY nama_penyakit ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// Mendapatkan riwayat penyakit pengguna berdasarkan ID
router.get('/user/:userId', (req, res) => {
    const userId = req.params.userId;
    
    const query = `
        SELECT p.id_penyakit, p.nama_penyakit
        FROM riwayat_user rp
        JOIN penyakit p ON rp.id_penyakit = p.id_penyakit
        WHERE rp.id_user = ?
        ORDER BY p.nama_penyakit ASC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// Menambahkan penyakit ke riwayat pengguna
router.post('/user/add', (req, res) => {
    const { userId, diseaseId } = req.body;
    
    if (!userId || !diseaseId) {
        return res.status(400).json({ error: 'userId dan diseaseId harus disediakan' });
    }
      // Cek apakah penyakit sudah ada di riwayat user
    db.query(
        'SELECT * FROM riwayat_user WHERE id_user = ? AND id_penyakit = ?',
        [userId, diseaseId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Jika sudah ada, tidak perlu ditambahkan lagi
            if (results.length > 0) {
                return res.status(200).json({ message: 'Penyakit sudah ada dalam riwayat' });
            }
            
            // Jika belum ada, tambahkan ke riwayat
            db.query(
                'INSERT INTO riwayat_user (id_user, id_penyakit) VALUES (?, ?)',
                [userId, diseaseId],
                (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ 
                        message: 'Penyakit berhasil ditambahkan ke riwayat',
                        id: results.insertId
                    });
                }
            );
        }
    );
});

// Menambahkan penyakit ke riwayat pengguna berdasarkan nama penyakit
router.post('/user/add-by-name', (req, res) => {
    const { userId, diseaseName } = req.body;
    
    if (!userId || !diseaseName) {
        return res.status(400).json({ error: 'userId dan diseaseName harus disediakan' });
    }
    
    // Cek apakah penyakit ada di database
    db.query(
        'SELECT * FROM penyakit WHERE nama_penyakit = ?',
        [diseaseName],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Jika penyakit tidak ditemukan
            if (results.length === 0) {
                return res.status(404).json({ error: 'Penyakit tidak ditemukan' });
            }
            
            const diseaseId = results[0].id_penyakit;
              // Cek apakah penyakit sudah ada di riwayat user
            db.query(
                'SELECT * FROM riwayat_user WHERE id_user = ? AND id_penyakit = ?',
                [userId, diseaseId],
                (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Jika sudah ada, tidak perlu ditambahkan lagi
                    if (results.length > 0) {
                        return res.status(200).json({ message: 'Penyakit sudah ada dalam riwayat' });
                    }
                    
                    // Jika belum ada, tambahkan ke riwayat
                    db.query(
                        'INSERT INTO riwayat_user (id_user, id_penyakit) VALUES (?, ?)',
                        [userId, diseaseId],
                        (err, results) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.status(201).json({ 
                                message: 'Penyakit berhasil ditambahkan ke riwayat',
                                id: results.insertId
                            });
                        }
                    );
                }
            );
        }
    );
});

// Menghapus penyakit dari riwayat pengguna
router.delete('/user/remove', (req, res) => {
    const { userId, diseaseId } = req.body;
    
    if (!userId || !diseaseId) {
        return res.status(400).json({ error: 'userId dan diseaseId harus disediakan' });
    }
      db.query(
        'DELETE FROM riwayat_user WHERE id_user = ? AND id_penyakit = ?',
        [userId, diseaseId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Riwayat penyakit tidak ditemukan' });
            }
            
            res.status(200).json({ message: 'Penyakit berhasil dihapus dari riwayat' });
        }
    );
});

// Menghapus penyakit dari riwayat pengguna berdasarkan nama penyakit
router.delete('/user/remove-by-name', (req, res) => {
    const { userId, diseaseName } = req.body;
    
    if (!userId || !diseaseName) {
        return res.status(400).json({ error: 'userId dan diseaseName harus disediakan' });
    }
    
    // Cek apakah penyakit ada di database
    db.query(
        'SELECT * FROM penyakit WHERE nama_penyakit = ?',
        [diseaseName],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Jika penyakit tidak ditemukan
            if (results.length === 0) {
                return res.status(404).json({ error: 'Penyakit tidak ditemukan' });
            }
            
            const diseaseId = results[0].id_penyakit;
            
            db.query(
                'DELETE FROM riwayat_user WHERE id_user = ? AND id_penyakit = ?',
                [userId, diseaseId],
                (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    if (results.affectedRows === 0) {
                        return res.status(404).json({ error: 'Riwayat penyakit tidak ditemukan' });
                    }
                    
                    res.status(200).json({ message: 'Penyakit berhasil dihapus dari riwayat' });
                }
            );
        }
    );
});

module.exports = router;
