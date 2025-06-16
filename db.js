const mysql = require('mysql2');
require('dotenv').config({path: '.env'});

host = process.env.DB_HOST;
user = process.env.DB_USER;
pass = process.env.DB_PASSWORD;
database = process.env.DB_NAME;
port = process.env.PORT;

const db = mysql.createPool(`mysql://${user}:${pass}@${host}:${port}/${database}`);

module.exports = db;
