import React, { useState } from "react";
import "../styles/LoginPage.css";
import Header from "../components/header/Header";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function LoginPage({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();
  const { setAvatarUrl } = useUser();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    axios
      .post("http://localhost:3001/login", { Email: email, Password: password }, { withCredentials: true })
      .then((response) => {
        if (!response.data.loggedIn) {
          alert(response.data?.message || "Invalid email or password.");
          return;
        }
        setIsLoggedIn(true);
        return fetch("http://localhost:3001/users/me/profile", { credentials: "include" });
      })
      .then((resp) => {
        if (resp === undefined) return null;
        return resp.json ? resp.json() : null;
      })
      .then((data) => {
        setAvatarUrl(data?.avatarUrl || "/avatars/BB.png");
        alert("Login successful!");
        navigate("/");
      })
      .catch((error) => {
        alert(error.response?.data?.message || "Login failed");
      });
  };

  return (
    <div className="login-page">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <div className="login-container">
        <h2 className="login-title">LOGIN</h2>
        <form className="login-form" onSubmit={handleLogin} autoComplete="on">
          <input type="email" name="email" placeholder="Email" required autoComplete="email" />
          <input type="password" name="password" placeholder="Password" required autoComplete="current-password" />
          <button type="submit" className="login-button">LOGIN</button>
        </form>
        <div className="login-links">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setShowComingSoon(true); }}
          >
            Forgot password?
          </a>
          <a href="/register">Don't have an account? Register</a>
        </div>
        {showComingSoon && (
          <div className="coming-soon-modal" onClick={() => setShowComingSoon(false)}>
            <div className="coming-soon-content" onClick={(e) => e.stopPropagation()}>
              <h3>Coming Soon!</h3>
              <p>Password reset will be available soon.</p>
              <button onClick={() => setShowComingSoon(false)}>OK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
