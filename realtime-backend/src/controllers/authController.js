//회원가입,로그인,로그아웃 관련 로직입니다.

const bcrypt = require("bcrypt");
const db = require("../config/db"); // 기존 DB 설정 불러오기

const redisClient = require('../config/redis');
const jwt = require('jsonwebtoken');

//회원가입
const register = async (req, res) => {
  const { user_id, email, password, name } = req.body;

  try {
    // 1. 이미 존재하는 이메일인지 확인
    const [existingUserByEmail] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
    if (existingUserByEmail.length > 0)
      return res.status(400).json({ message: "이미 존재하는 이메일입니다." });

    // 이미 존재하는 아이디인지 확인
    const [existingUserById] = await db.execute(
      "SELECT * FROM users WHERE user_id = ?",
      [user_id],
    );
    if (existingUserById.length > 0)
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });

    // 비밀번호 암호화 (Salt사용)
    //해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 저장
    await db.execute(
      "INSERT INTO users (user_id,email,password, name) VALUES (?, ?, ?, ?)",
      [user_id, email, hashedPassword, name],
    );

    res.status(201).json({ message: "회원가입 성공!" });
  } catch (err) {
    // MySQL의 중복 키 에러 코드는 'ER_DUP_ENTRY' 또는 1062
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "아이디 또는 이메일이 이미 사용 중입니다." });
    }
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
};

//로그인
const login = async (req, res) => {
  const { user_id, password } = req.body;

  try {
    const [users] = await db.execute("SELECT * FROM users WHERE user_id = ?", [
      user_id,
    ]);
    if (users.length === 0)
      return res.status(400).json({ message: "유저를 찾을 수 없습니다." });

    const user = users[0];

    // 비밀번호 비교
    //user.password 즉 db에서 해싱된 값을 불러옴.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "비밀번호가 틀렸습니다." });

    // JWT 토큰 생성 (유효기간 1일)
    const token = jwt.sign(
      { id: user.id, loginId: user.user_id }, // id: 숫자 PK, loginId: 문자열 아이디, 토큰 안에 박제해둘 정보
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({ token, userNo: user.id, name: user.name });
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
  }
};

//로그아웃
const logout = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(400).json({ message: "토큰이 없습니다." });

    // 토큰 해독해서 만료 시간(exp) 확인
    const decoded = jwt.decode(token);
    const timeLeft = decoded.exp * 1000 - Date.now(); // 밀리초 단위 계산

    if (timeLeft > 0) {
      // Redis에 블랙리스트 등록 (키: 토큰, 값: "logout")
      // timeLeft(ms) 동안 즉, jwt토큰의 남은 유효기간동안 유지되고 자동 삭제됨
      await redisClient.setEx(token, Math.ceil(timeLeft / 1000), "logout");
    }

    res.status(200).json({ message: "로그아웃 성공 (토큰 무효화 완료)" });
  } catch (error) {
    res.status(500).json({ message: "로그아웃 처리 중 오류 발생" });
  }
};


module.exports = { register, login,logout };
