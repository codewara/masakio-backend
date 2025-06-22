const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:id', (req, res) => {
    db.query(`
        SELECT rec.id_resep, rec.nama_resep, rec.thumbnail, COUNT(rev.id_resep) as review_count, ROUND(AVG(rev.rating), 1) as rating
        FROM wishlist w
        JOIN resep rec ON w.id_resep = rec.id_resep
        JOIN user u ON w.id_user = u.id_user
        JOIN review rev ON w.id_resep = rev.id_resep
        WHERE w.id_user = ?
        GROUP BY rec.id_resep
    `, [req.params.id],
    (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// POST
router.post('/add', (req, res) => {
    const {user_id, recipe_id} = req.body;
    db.query('SELECT * FROM wishlist WHERE id_user = ? AND id_resep = ?', [user_id, recipe_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Recipe already in wishlist' });
        db.query('INSERT INTO wishlist (id_user, id_resep) VALUES (?, ?)', [user_id, recipe_id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Recipe added to wishlist' });
        });
    });
});

router.delete('/remove', (req, res) => {
    const { user_id, recipe_id } = req.body;
    db.query('DELETE FROM wishlist WHERE id_user = ? AND id_resep = ?', [user_id, recipe_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Wishlist item not found' });
        res.status(200).json({ message: 'Recipe removed from wishlist' });
    });
});

module.exports = router;