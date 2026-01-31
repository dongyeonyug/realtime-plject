import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard'; // 방금 만든 문서생성 버튼 페이지
import Editor from './components/Editor';       // 소켓 통신을 하는 에디터 페이지
import Login from './components/Login';       // 소켓 통신을 하는 에디터 페이지
import Signup from './components/Signup';       // 소켓 통신을 하는 에디터 페이지

function App() {
  // 실제 서비스라면 로그인 후 유저 정보를 가져오겠지만, 
  // 지금은 테스트를 위해 임의의 유저 ID를 사용합니다.
  const userId = "newuser1";

  return (
    <Router>
      <Routes>
        {/* 1. 메인 페이지 (새 문서 만들기 버튼이 있는 곳) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        {/* 2. 에디터 페이지 (/:docId는 주소 뒤의 숫자를 변수로 받겠다는 뜻) */}
        <Route path="/signup" element={<Signup/>} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/edit/:docId" element={<Editor />} />
      </Routes>
    </Router>
  );
}

export default App;