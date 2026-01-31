require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const http = require('http'); 
const app = express();
const socketHandler = require('./socket'); // socket.js 불러오기

// 라우터들...
const docRoutes = require('./src/routes/docRoutes');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');

app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true
}));
app.use(express.json());

// 라우터 등록
app.use('/api', authRoutes.routes);
app.use('/api', docRoutes.routes);
app.use('/api', userRoutes.routes);

// 1. HTTP 서버 생성
const server = http.createServer(app);

// 2. ✅ 소켓 핸들러에 서버 전달 및 io 객체 등록 (한 번만 실행)
const io = socketHandler(server); 
app.set('io', io); 

const PORT = process.env.PORT || 3000;

// 3. 서버 실행
server.listen(PORT, () => {
  console.log(`서버 작동 중: http://localhost:${PORT}`);
});