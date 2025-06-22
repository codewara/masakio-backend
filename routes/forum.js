const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    db.query(`
        SELECT d.id_discuss, u.nama_user, u.foto, d.gambar, d.caption, d.timestamp, COUNT(l.id_discuss) AS jumlah_like, COUNT(d2.reply_to) AS jumlah_reply
        FROM discussion d
        JOIN user u ON d.id_user = u.id_user
        LEFT JOIN discussion d2 ON d.id_discuss = d2.reply_to
        LEFT JOIN likes l ON d.id_discuss = l.id_discuss
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
        SELECT d.id_discuss, u.nama_user, u.foto, d.gambar, d.caption, d.timestamp, COUNT(l.id_discuss) AS jumlah_like
        FROM discussion d
        JOIN user u ON d.id_user = u.id_user
        LEFT JOIN likes l ON d.id_discuss = l.id_discuss
        WHERE d.id_discuss = ?
    `, [id], (err, results) => {
        result =  results[0];
        if (err) return res.status(500).json({ error: err.message });
        if (!result) return res.status(404).json({ error: 'Discussion not found' });

        db.query(`
            SELECT d.id_discuss, u.nama_user, u.foto, d.gambar, d.caption, d.timestamp, COUNT(l.id_discuss) AS jumlah_like, COUNT(d2.reply_to) AS jumlah_reply
            FROM discussion d
            JOIN user u ON d.id_user = u.id_user
            LEFT JOIN discussion d2 ON d.id_discuss = d2.reply_to
            LEFT JOIN likes l ON d.id_discuss = l.id_discuss
            WHERE d.reply_to = ?
            GROUP BY d.id_discuss; 
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