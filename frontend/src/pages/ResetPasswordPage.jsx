import React from "react";
import "../styles/ResetPasswordPage.css";
import Header from "../components/header/Header";
export default function ForgotPasswordPage({isLoggedIn, setIsLoggedIn}) {
    return (
      <div className="forgot-page">
        <Header isLoggedIn = {isLoggedIn} setIsLoggedIn = {setIsLoggedIn}/>
        <div className="forgot-container">
          <h2 className="forgot-title">FORGOT PASSWORD</h2>
          <form className="forgot-form">
            <input type="email" placeholder="Enter your email" required />
            <button type="submit" className="forgot-button">
              SEND RESET LINK
            </button>
          </form>
          <div className="forgot-links">
            <a href="/login">Back to Login</a>
            <a href="/register">Create new account</a>
          </div>
        </div>
      </div>
    );
  }
  
