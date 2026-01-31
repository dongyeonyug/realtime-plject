import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import socket from '../socket';

const Dashboard = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const token = localStorage.getItem('token');
  const userNo = localStorage.getItem('userNo');
  const name = localStorage.getItem('name'); // ✅ 상단에서 name 정의

  // 1. 문서 목록 가져오기
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/documents/user-docs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDocs(response.data);
      } catch (error) {
        console.error("목록 로드 실패:", error);
      }
    };

    if (token) fetchDocs();
  }, [token]);

  // ✅ 로그아웃 핸들러
  const handleLogout = async () => {
  if (window.confirm("로그아웃 하시겠습니까?")) {
    try {
      // ✅ 서버에 로그아웃 요청 (토큰을 블랙리스트에 넣으라고 지시)
      await axios.post('http://localhost:3000/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // 소켓 끊기 및 스토리지 비우기
      if (socket) socket.disconnect();
      localStorage.clear();

      alert("로그아웃 되었습니다.");
      window.location.href = "/login";
    } catch (error) {
      console.error("로그아웃 요청 실패:", error);
      // 서버가 꺼져있어도 클라이언트는 일단 로그아웃 처리하는 게 좋음
      localStorage.clear();
      window.location.href = "/login";
    }
  }
};

  // ✅ 문서 삭제 핸들러 (인자로 docId를 받음)
  const handleDeleteDoc = async (docId, e) => {
    e.preventDefault(); // Link 이동 방지
    e.stopPropagation(); // 부모 요소 이벤트 전파 방지

    if (window.confirm("정말로 이 문서를 삭제하시겠습니까?")) {
      try {
        await axios.delete(`http://localhost:3000/api/documents/delete/${docId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // 삭제 성공 후 UI에서 해당 문서 제거
        setDocs(docs.filter(doc => doc.id !== docId));
        alert("문서가 삭제되었습니다.");
      } catch (error) {
        console.error("삭제 실패:", error);
        // 백엔드에서 보낸 403(권한 없음) 등 메시지 표시
        alert(error.response?.data?.message || "삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleCreateNewDoc = async () => {
    if (!userNo || !token) {
      alert("로그인이 필요한 서비스입니다.");
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:3000/api/create-doc',
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { docId } = response.data;
      alert(`새 문서가 생성되었습니다!`);
      navigate(`/edit/${docId}`);
    } catch (error) {
      console.error("문서 생성 에러:", error);
      alert("문서를 생성할 수 없습니다.");
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f7f9', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 40px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#333', margin: 0 }}>Docs Collaboration</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>👤 {name}님</span>
          <button 
            onClick={handleLogout}
            style={{
              padding: '6px 15px', backgroundColor: '#ff4d4f', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', padding: '50px', gap: '50px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ flex: 1, textAlign: 'center', backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h1 style={{ color: '#2c3e50', marginBottom: '30px' }}>반가워요, {name}님!</h1>
          <button 
            onClick={handleCreateNewDoc}
            style={{
              padding: '18px 40px', fontSize: '20px', backgroundColor: '#4CAF50',
              color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', transition: 'transform 0.2s'
            }}
          >
            + 새로운 문서 시작하기
          </button>
        </div>

        <div style={{ 
          width: '350px', backgroundColor: '#fff', padding: '25px', 
          borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' 
        }}>
          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', color: '#555' }}>최근 문서</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {docs.length > 0 ? (
              docs.map((doc) => (
                <li key={doc.id} style={{ 
                  padding: '12px', borderBottom: '1px solid #f0f0f0', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Link 
                      to={`/edit/${doc.id}`} 
                      style={{ textDecoration: 'none', color: '#1a73e8', fontSize: '16px', fontWeight: '600' }}
                    >
                      📄 {doc.title?.trim() || "제목 없는 문서"}
                    </Link>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>
                      {new Date(doc.updated_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* ✅ 삭제 버튼 추가: 클릭 시 doc.id를 전달 */}
                  <button 
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    style={{
                      padding: '5px 10px', backgroundColor: '#fff', color: '#ff4d4f',
                      border: '1px solid #ff4d4f', borderRadius: '4px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 'bold'
                    }}
                    onMouseOver={(e) => { e.target.style.backgroundColor = '#ff4d4f'; e.target.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.color = '#ff4d4f'; }}
                  >
                    삭제
                  </button>
                </li>
              ))
            ) : (
              <p style={{ color: '#999', textAlign: 'center', marginTop: '20px' }}>생성된 문서가 없습니다.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;