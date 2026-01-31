import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

// Editor.jsx 상단
const socket = io("http://localhost:3000", {
  transports: ["websocket"], // ✅ 처음부터 웹소켓으로만 연결 시도 (에러 추적 쉬움)
  withCredentials: true
});

const Editor = () => {
  const { docId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState("변경사항 없음");
  const [loading, setLoading] = useState(true);

  const [canEdit, setCanEdit] = useState(false);
  const [publicRole, setPublicRole] = useState("private");

  const token = localStorage.getItem("token");

  // ✅ 문서 정보를 다시 불러오는 로직을 별도 함수로 추출 (소켓 리스너에서도 사용하기 위함)
  const fetchDocData = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/documents/detail/${docId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { doc, canEdit: permission } = response.data;

      setTitle(doc.title || "");
      setContent(doc.content || "");
      setCanEdit(permission);
      setPublicRole(doc.public_role || "private");
      
      setLoading(false);
    } catch (error) {
      if (error.response?.status === 403) {
        alert("문서에 접근할 수 있는 권한이 상실되었습니다.");
        navigate("/dashboard");
      }
      setLoading(false);
    }
  }, [docId, token, navigate]);

  // 1. 초기 로드 및 소켓 리스너 등록
  useEffect(() => {
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    fetchDocData();
    socket.emit("join_room", docId);

    // ✅ 실시간 데이터 수신
    socket.on("receive_content", (data) => {
      setTitle(data.title);
      setContent(data.content);
    });

    // ✅ 실시간 권한 변경 감지 (새로고침 없이 반영 핵심)
    socket.on("permission_changed", (data) => {
      console.log("실시간 권한 변경 알림 수신:", data.newRole);
      // 권한 정보가 바뀌었으므로 최신 정보를 서버에서 다시 가져옵니다.
      fetchDocData();
    });

    return () => {
      socket.off("receive_content");
      socket.off("permission_changed");
    };
  }, [docId, token, navigate, fetchDocData]);

  // 2. 자동 저장 (편집 권한 있을 때만)
  useEffect(() => {
    if (loading || !token || !canEdit) return;

    setSaveStatus("수정 중...");
    const delayTimer = setTimeout(async () => {
      try {
        await axios.post(
          "http://localhost:3000/api/save-temp",
          { id: docId, title, content },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSaveStatus("모든 변경사항이 저장됨");
      } catch (err) {
        setSaveStatus("저장 실패");
      }
    }, 1000);

    return () => clearTimeout(delayTimer);
  }, [title, content, docId, loading, token, canEdit]);

  // 공유 권한 변경 (드롭다운 변경 시 실행)
  const handleRoleChange = async (newRole) => {
    try {
      await axios.post(
        "http://localhost:3000/api/documents/share-settings",
        { docId, role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPublicRole(newRole);
      // 주인은 항상 canEdit이 true이므로 추가 fetch 없이 문구만 띄움
      alert("공유 설정이 변경되었습니다.");
    } catch (err) {
      alert("주인만 공유 설정을 변경할 수 있습니다.");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("링크가 복사되었습니다!");
  };

  const handleTitleChange = (e) => {
    if (!canEdit) return;
    const newTitle = e.target.value;
    setTitle(newTitle);
    socket.emit("edit_content", { docId, title: newTitle, content });
  };

  const handleContentChange = (e) => {
    if (!canEdit) return;
    const newContent = e.target.value;
    setContent(newContent);
    socket.emit("edit_content", { docId, title, content: newContent });
  };

  if (loading)
    return <div style={{ padding: "20px" }}>문서를 불러오는 중...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      {/* 상단 공유 도구 모음 */}
      <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 15px", backgroundColor: "#f8f9fa", borderRadius: "8px",
          marginBottom: "20px", border: "1px solid #eee",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#555" }}>공유 설정:</span>
          <select
            value={publicRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="private">🔒 나만 보기</option>
            <option value="viewer">👁️ 링크 접속 시 보기 가능</option>
            <option value="editor">✍️ 링크 접속 시 편집 가능</option>
          </select>
        </div>
        <button onClick={copyLink} style={{
            padding: "6px 12px", backgroundColor: "#1a73e8", color: "white",
            border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold",
          }}>
          링크 복사
        </button>
      </div>

      <header style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{canEdit ? "📝 편집 중" : "👁️ 읽기 전용"}</h2>
        <span style={{ fontSize: "12px", color: canEdit ? "green" : "#999", fontWeight: "bold" }}>
          ● {canEdit ? saveStatus : "변경 권한 없음"}
        </span>
      </header>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          readOnly={!canEdit}
          placeholder="문서 제목"
          style={{
            width: "100%", padding: "12px", fontSize: "20px", fontWeight: "bold",
            border: "1px solid #ddd", borderRadius: "4px", color: "#000000",
            backgroundColor: canEdit ? "#ffffff" : "#f5f5f5", outline: "none",
          }}
        />
      </div>

      <textarea
        value={content}
        onChange={handleContentChange}
        readOnly={!canEdit}
        placeholder="내용을 입력하세요..."
        rows="25"
        style={{
          width: "100%", padding: "12px", fontSize: "16px", border: "1px solid #ddd",
          borderRadius: "4px", lineHeight: "1.6", color: "#000000",
          backgroundColor: canEdit ? "#ffffff" : "#f5f5f5",
          cursor: canEdit ? "text" : "not-allowed", outline: "none", resize: "vertical",
        }}
      />
    </div>
  );
};

export default Editor;