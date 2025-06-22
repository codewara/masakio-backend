require('dotenv').config(); //Load environment variables from .env file

const express = require('express'); // Inisialisasi Express.js
const cors = require('cors'); // Inisialisasi CORS untuk mengizinkan permintaan lintas domain
const db = require('./db'); // Inisialisasi koneksi database MySQL

const PORT = process.env.DB_PORT; // Port untuk server Express.js, port diambil dari variabel .env

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Welcome to the Recipe API')); // Endpoint utama untuk menguji server

app.use('/auth', require('./routes/auth'));  // Endpoint untuk otentikasi pengguna
app.use('/tips', require('./routes/tips_and_trik')); // Endpoint untuk tips memasak
app.use('/forum', require('./routes/forum')); // Endpoint untuk forum diskusi
app.use('/history', require('./routes/history')); // Endpoint untuk riwayat resep yang dilihat
app.use('/reviews', require('./routes/reviews')); // Endpoint untuk review resep
app.use('/diseases', require('./routes/diseases')); // Endpoint untuk penyakit
app.use('/wishlist', require('./routes/wishlist')); // Endpoint untuk daftar keinginan resep
app.use('/recipe', require('./routes/detail_recipe')); // Endpoint untuk detail resep
app.use('/card_recipe', require('./routes/card_recipe')); // Endpoint untuk tampilan card resep (termasuk resep per user)
app.use('/user', require('./routes/user')); // Endpoint untuk profil pengguna

app.listen(PORT, () => {
  db.getConnection((err) => {
    if (err) {
      console.error('Database connection failed:', err);
      return;
    } console.log('Database connected successfully');
  });
});
