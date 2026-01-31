import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        user_id,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userNo", res.data.userNo);
      localStorage.setItem("name", res.data.name);

      alert(`${res.data.name}님 환영합니다!`);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "로그인 실패");
    }
  };

  return (
    <div style={{ maxWidth: "300px", margin: "50px auto", textAlign: "center" }}>
      <h2>로그인</h2>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          type="text" // type="user_id"는 존재하지 않으므로 text로 수정했습니다.
          placeholder="아이디"
          value={user_id}
          onChange={(e) => setUserId(e.target.value)}
          required
          style={{ padding: "10px" }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "10px" }}
        />
        <button type="submit" style={{ padding: "10px", backgroundColor: "#1a73e8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          로그인
        </button>
      </form>

      {/* --- 회원가입 이동 섹션 추가 --- */}
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        계정이 없으신가요?{" "}
        <span 
          onClick={() => navigate("/signup")} 
          style={{ 
            color: "#1a73e8", 
            cursor: "pointer", 
            textDecoration: "underline",
            fontWeight: "bold" 
          }}
        >
          회원가입하기
        </span>
      </div>
    </div>
  );
};

export default Login;