import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [formData, setFormData] = useState({
    user_id: "",
    email: "",
    password: "",
    name: "",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3000/api/auth/register", formData);
      alert("회원가입 성공! 로그인해주세요.");
      navigate("/"); // 가입 성공 시 로그인 페이지로 이동
    } catch (err) {
      alert(err.response?.data?.message || "회원가입 실패");
    }
  };

  return (
    <div>
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        {/* ✅ 아이디 입력창 추가 */}
        <input
          type="text"
          placeholder="사용자 아이디"
          onChange={(e) =>
            setFormData({ ...formData, user_id: e.target.value })
          }
          required
        />
        <input
          type="email"
          placeholder="이메일"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />
        <input
          type="text"
          placeholder="닉네임"
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <button type="submit">가입하기</button>
      </form>
    </div>
  );
};

export default Signup;
