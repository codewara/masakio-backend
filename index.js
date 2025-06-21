require('dotenv').config();

const cloudinary = require('./cloudinary');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const PORT = process.env.DB_PORT;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Welcome to the Recipe API'));

app.use('/auth', require('./routes/auth'));

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
