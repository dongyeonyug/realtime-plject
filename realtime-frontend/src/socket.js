// src/socket.js
import { io } from "socket.io-client";

// 서버 주소를 입력하세요.
const socket = io("http://localhost:3000", {
  autoConnect: true, // 자동으로 연결 시도
});

export default socket;