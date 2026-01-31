const express = require("express");
const {
  createDocument,
  saveTemp,
  getDocument,
  readUserDocuments,
  readDocumentById,
  updateShareSettings,
  deleteDocument
} = require("../controllers/docController");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// 1. 문서 생성: 로그인한 사람만 가능
router.post("/create-doc", authMiddleware, createDocument);

// 2. 임시 저장: 로그인한 사람만 가능
router.post("/save-temp", authMiddleware, saveTemp);

// 3. 문서 상세 조회: 로그인한 사람만 가능
// (getDocument와 readDocumentById가 비슷해 보이는데, 하나로 통일하거나 용도를 나누시면 좋습니다)
router.get("/documents/detail/:docId", authMiddleware, getDocument);

// 4. 내 문서 목록 불러오기 (대시보드용)
router.get("/documents/user-docs", authMiddleware, readUserDocuments);

router.post("/documents/share-settings", authMiddleware, updateShareSettings);

router.delete("/documents/delete/:docId", authMiddleware, deleteDocument);



module.exports = {
  routes: router,
};