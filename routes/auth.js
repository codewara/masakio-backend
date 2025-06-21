const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');

router.post('/register', (req, res) => {
    const { username, email, password, birth_date } = req.body;
    const hashpw = crypto.createHash('sha256').update(password).digest('hex');

    db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

        db.query('INSERT INTO user (nama_user, email, tanggal_lahir, created_at, password) VALUES (?, ?, ?, NOW(), ?)',
        [username, email, birth_date, hashpw], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query('SELECT * FROM user WHERE id_user = ?', [results.insertId], (err, userResults) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(userResults[0]);
            });
        }); 
    });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const hashpw = crypto.createHash('sha256').update(password).digest('hex');

    db.query('SELECT * FROM user WHERE email = ? AND password = ?',
    [email, hashpw], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Email atau password salah' });
        res.status(200).json(results[0]);
    });
});

module.exports = router;