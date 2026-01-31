// src/config/db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  
  host: process.env.DB_HOST,
  port:process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // ✅ 이제 안전합니다!
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 외부에서 사용할 수 있도록 내보냅니다.
module.exports = db;