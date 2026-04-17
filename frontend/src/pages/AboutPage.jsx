import React from "react";
import "../styles/AboutPage.css";
import Header from "../components/header/Header";

export default function AboutPage({isLoggedIn, setIsLoggedIn}) {
  return (
    <div className="about-page">
      <Header isLoggedIn = {isLoggedIn} setIsLoggedIn = {setIsLoggedIn} className="sticky-header" />
      <div className="about-card">
        <h1 className="about-title">About Page</h1>
        <p className="about-text">
          SkillBuddies is a place where learning becomes social. Here, you can
          find groups of like-minded people who want to learn the same skills as
          you—whether it’s coding, languages, art, fitness, or anything in
          between. Instead of learning alone, you join a supportive community,
          share progress, and stay motivated together.
        </p>
      </div>

      <div className="contacts-row">
        <div className="contacts-card">
          <div className="badge">Contacts</div>
          <label className="field-label">E-mail</label>
          <div className="field-value">SkillBuddies.support@gmail.com</div>
        </div>

        <div className="social-card">
          <div className="badge">Social</div>
          <div className="social-inner">
            <img src="/insta-logo.png" alt="Instagram Logo" className="insta-icon" />
            <span className="social-handle">@SkillBuddies</span>
          </div>
        </div>
      </div>
    </div>
  );
}
