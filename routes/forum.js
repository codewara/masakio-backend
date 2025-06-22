const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    db.query(`
        SELECT d.id_discuss, u.nama_user, u.foto, d.gambar, d.caption, d.timestamp, d.jumlah_like, COUNT(d2.reply_to) AS jumlah_reply
        FROM discussion d
        JOIN user u ON d.id_user = u.id_user
        LEFT JOIN discussion d2 ON d.id_discuss = d2.reply_to
        WHERE d.reply_to IS NULL
        GROUP BY d.id_discuss
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/add', (req, res) => {
    const { id_user, gambar, caption } = req.body;
    if (!id_user || !gambar || !caption) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    db.query('INSERT INTO discussion (id_user, gambar, caption, timestamp, jumlah_like, reply_to) VALUES (?, ?, ?, NOW(), 0, NULL)',
    [id_user, gambar, caption], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Discussion added successfully', id_discuss: results.insertId });
    });
});

module.exports = router;