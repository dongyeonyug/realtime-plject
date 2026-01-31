const redisClient = require('../config/redis');
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {


  // 1. 헤더에서 토큰 추출 (보통 'Authorization: Bearer 토큰' 형식)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {

    // 1. ✅ Redis 블랙리스트 확인
    const isBlacklisted = await redisClient.get(token);
    if (isBlacklisted) {
      return res.status(403).json({ message: "이미 로그아웃된 토큰입니다. 다시 로그인하세요." });
    }

    // 2. 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // 로그인 때 쓴 비밀키와 동일해야 함
    
    // 3. 요청(req) 객체에 유저 정보 담기 (컨트롤러에서 쓸 수 있게 함)
    req.user = decoded; 
    
    next(); // 검문 통과! 다음 함수(컨트롤러)로 이동
  } catch (err) {
    return res.status(403).json({ message: "유효하지 않은 토큰입니다." });
  }
};

module.exports = {authMiddleware};