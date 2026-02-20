// socket.js
const { Server } = require('socket.io');

const socketHandler = (server) => {
  // 이미 서버에 바인딩된 io가 있는지 확인하거나 새로 생성
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('유저 접속:', socket.id);

    socket.on('join_room', (docId) => {
      socket.join(String(docId));
      console.log(`방 입장: ${docId}`);
    });

    socket.on('edit_content', (data) => {
      socket.to(String(data.docId)).emit('receive_content', data);
    });

    socket.on('disconnect', () => {
      console.log('유저 접속 해제:', socket.id);
    });
  });

  return io; // server.js에서 사용할 수 있도록 리턴
};

module.exports = socketHandler;
