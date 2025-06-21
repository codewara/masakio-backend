require('dotenv').config();

const cloudinary = require('./cloudinary');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const PORT = process.env.DB_PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// GET
app.get('/wishlist', (req, res) => {
  db.query(`
    SELECT rec.id_resep, rec.nama_resep, rec.thumbnail, COUNT(rev.id_resep) as review_count, ROUND(AVG(rev.rating), 1) as rating
    FROM wishlist w
    JOIN resep rec ON w.id_resep = rec.id_resep
    JOIN user u ON w.id_user = u.id_user
    JOIN review rev ON rev.id_resep = w.id_resep
    WHERE w.id_user = ?
    GROUP BY rec.id_resep
  `, [1], // Profile ID 1
  (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/recipes', (req, res) => {
  db.query(`
    SELECT rec.id_resep, rec.nama_resep, rec.thumbnail, COUNT(rev.id_resep) as review_count, ROUND(AVG(rev.rating), 1) as rating
    FROM resep rec
    LEFT JOIN review rev ON rev.id_resep = rec.id_resep
    GROUP BY rec.id_resep
  `,
  (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// POST
app.post('/wish/:id', (req, res) => {
  db.query(
    'INSERT INTO wishlist (id_user, id_resep) VALUES (?, ?)',
    [1, req.params.id],
  );
});

app.post('/unwish/:id', (req, res) => {
  db.query(
    'DELETE FROM wishlist WHERE id_user = ? AND id_resep = ?',
    [1, req.params.id],
  );
});

app.listen(PORT, () => {
  db.getConnection((err) => {
    if (err) {
      console.error('Database connection failed:', err);
      return;
    } console.log('Database connected successfully');
  });

  if (cloudinary.config().cloud_name) {
    console.log('Cloudinary configured successfully');
  }
});
