// controllers/userController.js
const db = require('../config/db'); // 기존 db 설정 불러오기

const createUser = async (req, res) => {
  const { id, password, email, name } = req.body;

  try {
    // 중복 아이디 체크
    const [existingUser] = await db.execute('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }

    // 사용자 삽입
    const query = `INSERT INTO users (user_id, password, email, name) VALUES (?, ?, ?, ?)`;
    await db.execute(query, [id, password, email, name]);

    res.status(201).json({ message: "사용자가 생성되었습니다.", userId: id });
  } catch (err) {
    console.error(err);
    res.status(500).send("서버 에러");
  }
};




// [READ] 사용자 정보 조회
const getUser = async (req, res) => {
  const { userid } = req.params;

  try {
    // 비밀번호(password)를 제외하고 조회하는 것이 정석입니다.
    const query = 'SELECT user_id, email, name FROM users WHERE user_id = ?';
    const [rows] = await db.execute(query, [userid]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("서버 에러");
  }
};

// [UPDATE] 사용자 정보 수정 (이름, 이메일 변경)
const updateUser = async (req, res) => {
  const { userid } = req.params;
  const { email, name } = req.body;

  try {
    const query = 'UPDATE users SET email = ?, name = ? WHERE user_id = ?';
    const [result] = await db.execute(query, [email, name, userid]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "수정할 사용자가 없습니다." });
    }

    res.status(200).json({ message: "사용자 정보가 성공적으로 수정되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).send("서버 에러");
  }
};

// [DELETE] 사용자 삭제 (회원 탈퇴)
const deleteUser = async (req, res) => {
  const { userid } = req.params;

  try {
    const query = 'DELETE FROM users WHERE user_id = ?';
    const [result] = await db.execute(query, [userid]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "삭제할 사용자가 없습니다." });
    }

    res.status(200).json({ message: "사용자가 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).send("서버 에러");
  }
};

module.exports = { createUser, getUser, updateUser, deleteUser };

