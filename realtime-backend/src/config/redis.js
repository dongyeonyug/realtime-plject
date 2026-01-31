const redis = require('redis');

// Redis 클라이언트 생성 (기본 포트 6379)
const redisClient = redis.createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().then(() => console.log('✅ Redis 연결 성공!'));

module.exports = redisClient;