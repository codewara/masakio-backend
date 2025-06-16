const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.PORT || 3000;

// Example GET
app.get('/wishlist', (req, res) => {
  db.query(`
    SELECT rec.nama_resep, rec.thumbnail, COUNT(rev.id_resep) as review_count, ROUND(AVG(rev.rating), 1) as rating
    FROM wishlist w
    JOIN resep rec ON w.id_resep = rec.id_resep
    JOIN user u ON w.id_user = u.id_user
    JOIN review rev ON rev.id_resep = w.id_resep
    WHERE w.id_user = ?
    GROUP BY rev.id_resep
  `, [1], // iniprofile si kucing sedih yah id nya 1
  (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Example POST
app.post('/', (req, res) => {
  // Add
});

app.listen(PORT, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
