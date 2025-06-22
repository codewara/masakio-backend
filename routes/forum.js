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

router.get('/:id', (req, res) => {
    const id = req.params.id;
    result = {};
    db.query(`
        SELECT d.id_discuss, u.nama_user, u.foto, d.gambar, d.caption, d.timestamp, d.jumlah_like
        FROM discussion d
        JOIN user u ON d.id_user = u.id_user
        WHERE d.id_discuss = ?
    `, [id], (err, results) => {
        result =  results[0];
        if (err) return res.status(500).json({ error: err.message });
        if (!result) return res.status(404).json({ error: 'Discussion not found' });

        db.query(`
            SELECT d2.id_discuss, u2.nama_user, u2.foto, d2.gambar, d2.caption, d2.timestamp, d2.jumlah_like, COUNT(d.reply_to) AS jumlah_reply
            FROM discussion d2
            JOIN user u2 ON d2.id_user = u2.id_user
            LEFT JOIN discussion d ON d2.reply_to = d.id_discuss
            WHERE d2.reply_to = ?
            GROUP BY d2.id_discuss
        `, [id], (err, replyResults) => {
            if (err) return res.status(500).json({ error: err.message });
            result.replies = replyResults;
            res.json(result);
        });
    });
});

router.post('/add', (req, res) => {
    const { id_user, gambar, caption } = req.body;
    db.query('INSERT INTO discussion (id_user, gambar, caption, timestamp, jumlah_like, reply_to) VALUES (?, ?, ?, NOW(), 0, NULL)',
    [id_user, gambar ?? null, caption], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Discussion added successfully', id_discuss: results.insertId });
    });
});

module.exports = router;