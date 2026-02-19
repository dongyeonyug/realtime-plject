const db = require("../config/db");
const Redis = require("ioredis");
const redis = new Redis();

const createDocument = async (req, res) => {

  // 토큰에서 추출한 유저의 고유 번호(PK)를 가져온다.
  const userNo = req.user.id;

  try {
    // 2. MySQL DB(documents 테이블)에 새로운 행(Row)을 추가.
    // 제목은 "제목 없는 문서", 내용은 빈 값("")으로 초기 세팅.
    const query =
      "INSERT INTO documents (userNo, title, content) VALUES (?, ?, ?)";
    const [result] = await db.execute(query, [userNo, "제목 없는 문서", ""]);

    // MySQL이 자동으로 생성해준 (documents)문서의 고유 ID(Primary Key)를 가져옴.
    // 이 ID는 소켓 통신에서 '방 번호'의 기준이 된다.
    const newDocId = result.insertId;

    res.status(201).json({
      message: "새 문서 방이 생성되었습니다.",
      docId: newDocId, // 프론트엔드는 이 ID를 받아 해당 방 주소로 이동함
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("문서 생성 실패");
  }
};

// 특정 유저의 모든 문서 목록 가져오기 (대시보드용)
// 유저가 생성한 모든 문서를 확인할 수 있습니다.
const readUserDocuments = async (req, res) => {
  const userNo = req.user.id; // 토큰에서 추출한 유저의 고유 번호(PK)

  try {
    const query =
      "SELECT id, title, content, created_at, updated_at FROM documents WHERE userNo = ? ORDER BY updated_at DESC";
    const [rows] = await db.execute(query, [userNo]);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("문서 목록을 가져오는 데 실패했습니다.");
  }
};

//현재 사용되지 않습니다.
// // 2특정 문서 하나만 가져오기 (에디터 입장 시 호출)
// const readDocumentById = async (req, res) => {
//   const { docId } = req.params;
//   const userNo = req.user.userNo; // 현재 접속자

//   try {
//     const query = "SELECT * FROM documents WHERE id = ?";
//     const [rows] = await db.execute(query, [docId]);

//     if (rows.length === 0) return res.status(404).send("문서 없음");

//     // 소유권 체크
//     if (rows[0].user_id !== userNo) {
//       return res.status(403).json({ message: "이 문서를 볼 권한이 없습니다." });
//     }

//     res.status(200).json(rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("문서 정보를 불러오는 데 실패했습니다.");
//   }
// };


//  redis와 mysql 두 가지 DB를 사용하여 실시간 데이터 저장을 구현합니다.
// 모든 요청이 mysql로만 몰리면 B 락(Lock)이 걸리거나 느려질 수 있기에, 하드디스크 보다 빠른 메모리를 사용, 즉 레디스를 활용하는 것이 실시간 편집 기능 구현에 적합하다 판단했습니다.

// DB 동기화
const syncToMysql = async (id, userNo, title, content) => {
  try {
    const query = `
  INSERT INTO documents (id, userNo, title, content)
  VALUES (?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    content = VALUES(content), 
    updated_at = NOW();
`;
    await db.execute(query, [id, userNo, title, content]);
    console.log(`[DB] 문서 저장 완료`);
  } catch (err) {
    console.error("[DB Error]", err);
  }
};

// API 요청 처리 
// 사용자가 에디터에서 글을 쓰면 프론트엔드는 아주 짧은 주기로 이 API를 호출함.
const saveTemp = async (req, res) => {
  const { id, title, content } = req.body;
  const userNo = req.user ? req.user.id : null; // 토큰 정보 , 토큰에서 추출한 유저의 고유 번호(PK)

  if (!userNo) return res.status(401).json({ message: "로그인이 필요합니다." });

  try {

    // 해당 문서의 권한 설정 조회
    const [rows] = await db.execute(
      "SELECT userNo, public_role FROM documents WHERE id = ?",
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "문서 없음" });

    const doc = rows[0];

    // 편집 권한 검증
    //req.user.id와 DB의 doc.userNo를 비교하여, 본인이거나 편집 권한(editor)이 있는 사람만 수정할 수 있도록 함.
    const isOwner = Number(doc.userNo) === Number(userNo);
    //본인 외의 사람에게 문서 편집 권한을 줄 수 있습니다.
    const canEdit = isOwner || doc.public_role === 'editor';
    if (!canEdit) {
      return res.status(403).json({ message: "이 문서를 편집할 권한이 없습니다." });
    }

    // Redis에 문서 제목과 내용 모두 임시 저장 (JSON 형태로 한 번에 저장)
    const redisData = JSON.stringify({ title, content });
    await redis.set(`temp_doc:${id}`, redisData, "EX", 86400); // 24시간 유지
   

    // 비동기로 DB 동기화 실행
    await syncToMysql(id, userNo, title, content);

     res.status(200).json({ status: "success" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

//DB에 저장되어 있던 문서의 제목과 내용을 불러옵니다.
const getDocument = async (req, res) => {
  // 1. 프론트엔드에서 /api/documents/detail/1 로 보냈으므로
  // 라우터 설정이 /detail/:docId 라면 아래처럼 받아야 합니다.
  const { docId } = req.params;
  const userNo = req.user ? req.user.id : null; // 로그인 안 했을 수도 있으므로

  try {
    // 2. DB 조회
    const [rows] = await db.execute(
      "SELECT id, userNo, title, content, public_role FROM documents WHERE id = ?",
      [docId],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "문서 없음" });

    let doc = rows[0];

    // // 3. 권한 체크
    // if (Number(doc.userNo) !== Number(userNo)) {
    //   return res.status(403).json({ message: "권한 없음" });
    // }

    //값의 종류: 'private'(비공개), 'viewer'(링크가 있으면 보기 가능), 'editor'(링크가 있으면 편집 가능)
    // 1. 소유자인지 확인
    const isOwner = userNo && Number(doc.userNo) === Number(userNo);

    // 2. 권한 판별
    if (!isOwner && doc.public_role === 'private') {
      return res.status(403).json({ message: "비공개 문서입니다." });
    }


    // 프론트엔드에게 이 유저가 '읽기 전용'인지 알려줌
    const canEdit = isOwner || doc.public_role === 'editor';


    // 4. Redis 데이터 처리 (핵심!)
    const tempData = await redis.get(`temp_doc:${docId}`); // 변수명을 docId로 통일

    if (tempData) {
      try {
        const parsedData = JSON.parse(tempData);

        // 데이터가 객체 형태인지 확인 후 알맹이만 추출
        if (parsedData && typeof parsedData === "object") {
          doc.title = parsedData.title ?? doc.title;
          doc.content = parsedData.content ?? doc.content;
        }
      } catch (e) {
        // 만약 Redis에 JSON이 아닌 생 텍스트가 들어있었다면 그대로 대입
        doc.content = tempData;
      }
    }

    res.status(200).json({doc,canEdit});
  } catch (err) {
    console.error("서버 에러 상세:", err); // 터미널에서 에러 원인 확인용
    res.status(500).json({ message: "서버 오류 발생" });
  }
};



const deleteDocument = async (req, res) => {
  const { docId } = req.params;
  const userNo = req.user.id; // authMiddleware에서 넘겨준 인증 정보

  try {
    // 1. 해당 문서의 작성자가 누구인지 먼저 확인
    const [doc] = await db.execute('SELECT userNo FROM documents WHERE id = ?', [docId]);

    if (doc.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 문서입니다." });
    }

    // 2. 권한 검증: 문서 소유자와 현재 요청자가 일치하는지 확인
    if (Number(doc[0].userNo) !== Number(userNo)) {
      return res.status(403).json({ message: "본인이 작성한 문서만 삭제할 수 있습니다." });
    }

    // 3. 일치한다면 삭제 수행
    await db.execute('DELETE FROM documents WHERE id = ?', [docId]);
    
    res.status(200).json({ message: "문서가 성공적으로 삭제되었습니다." });

  } catch (error) {
    console.error("문서 삭제 에러:", error);
    res.status(500).json({ message: "서버 오류로 문서를 삭제하지 못했습니다." });
  }
};


// backend/controllers/docController.js
// const updateShareSettings = async (req, res) => {
//   const { docId, role } = req.body;
//   const userNo = req.user.id; // 현재 요청자

//   try {
//     // 1. 문서 주인인지 확인
//     const [doc] = await db.execute("SELECT userNo FROM documents WHERE id = ?", [docId]);
//     if (doc.length === 0) return res.status(404).send("문서 없음");
    
//     if (Number(doc[0].userNo) !== Number(userNo)) {
//       return res.status(403).json({ message: "주인만 공유 설정을 변경할 수 있습니다." });
//     }

//     // 2. public_role 업데이트
//     await db.execute(
//       "UPDATE documents SET public_role = ? WHERE id = ?",
//       [role, docId]
//     );

//     res.status(200).json({ message: "Success" });
//   } catch (err) {
//     res.status(500).send("Server Error");
//   }
// };



// 컨트롤러에서 io 객체를 가져오거나, 이벤트를 발생시키는 로직 추가
const updateShareSettings = async (req, res) => {
  const { docId, role } = req.body;
  const userNo = req.user.id; // 현재 요청자(토큰에서 추출)

  try {
    // 1. 문서 주인인지 확인
    const [doc] = await db.execute("SELECT userNo FROM documents WHERE id = ?", [docId]);
    
    if (doc.length === 0) {
      return res.status(404).json({ message: "문서가 존재하지 않습니다." });
    }
    
    if (Number(doc[0].userNo) !== Number(userNo)) {
      return res.status(403).json({ message: "주인만 공유 설정을 변경할 수 있습니다." });
    }

    // 2. DB의 public_role 업데이트
    await db.execute(
      "UPDATE documents SET public_role = ? WHERE id = ?",
      [role, docId]
    );

    // 3. ✅ 실시간 권한 변경 알림 전송 (Socket.io 브로드캐스트)
    // server.js에서 app.set('io', io)를 설정했다고 가정합니다.
    const io = req.app.get('io'); 
    
    if (io) {
      // 해당 문서 방(docId)에 있는 모든 사람에게 '권한이 변경됨'을 알림
      io.to(docId.toString()).emit("permission_changed", { 
        newRole: role 
      });
      console.log(`[Socket] Room ${docId} 권한 변경 알림 전송: ${role}`);
    }

    res.status(200).json({ message: "공유 설정이 변경되었습니다." });
  } catch (err) {
    console.error("공유 설정 변경 에러:", err);
    res.status(500).json({ message: "서버 오류 발생" });
  }
};

module.exports = {
  createDocument,
  saveTemp,
  getDocument,
  readUserDocuments,
  readDocumentById,
  updateShareSettings,
  deleteDocument
};
