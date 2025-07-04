const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');

router.post('/register', (req, res) => {
    const { username, email, password, birth_date, diseases } = req.body; // Add diseases to request body
    const hashpw = crypto.createHash('sha256').update(password).digest('hex');

    console.log('Diseases received:', diseases); // Log diseases data

    db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

        db.query('INSERT INTO user (nama_user, email, tanggal_lahir, created_at, password) VALUES (?, ?, ?, NOW(), ?)',
        [username, email, birth_date, hashpw], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            const userId = results.insertId; // Get the inserted user ID

            // Save diseases to riwayat_user table if provided
            if (diseases && Array.isArray(diseases)) {
                const diseaseValues = diseases.map(diseaseId => [userId, diseaseId]);
                db.query('INSERT INTO riwayat_user (id_user, id_penyakit) VALUES ?', [diseaseValues], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                });
            }

            db.query('SELECT * FROM user WHERE id_user = ?', [userId], (err, userResults) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(userResults[0]);
            });
        }); 
    });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const hashpw = crypto.createHash('sha256').update(password).digest('hex');
    
    // Langsung cek apakah email dan password valid
    db.query('SELECT * FROM user WHERE email = ? AND password = ?',
    [email, hashpw], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Jika tidak ditemukan, berarti email atau password salah
        if (results.length === 0) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }
        
        // Jika email dan password benar
        res.status(200).json(results[0]);
    });
});

module.exports = router;