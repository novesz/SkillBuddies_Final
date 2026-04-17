import React from "react";
import "../styles/LoginPage.css";
import Header from "../components/header/Header";
import { useState, useEffect } from "react";
import axios from "axios";

export default function LoginPage({isLoggedIn, setIsLoggedIn}) {
  return (
    <div className="login-page">
      <Header isLoggedIn = {isLoggedIn} setIsLoggedIn = {setIsLoggedIn}/>
      <div className="login-container">
        <h2 className="login-title">REGISTER</h2>
        <form className="login-form" onSubmit={(e) => {
            e.preventDefault();
            const password = e.target[3].value;
            const confirmPassword = e.target[4].value;

            if (password !== confirmPassword) {
              alert("Passwords do not match!");
              return;
            }
            axios.post("http://localhost:3001/users/create", 
              {
                name: document.getElementById("FName").value + " " + document.getElementById("LName").value,
                email: e.target[2].value,
                password: password
              }
            )
              .then(() => {
                alert("Registration successful!");
                window.location.href = "/login";
              })
              .catch((error) => {
                alert("Registration failed: " + (error.response?.data?.message || "An unexpected error occurred."));
              });
            
          }}>
          
          <div className="name-row">
            <input type="text" placeholder="First name" required id="FName"/>
            <input type="text" placeholder="Last name" required id="LName"/>
          </div>
          
          <input type="email" placeholder="Email" required autoComplete="email" />
          <input type="password" placeholder="Password" required />
          <input type="password" placeholder="Password again" required />

          <button type="submit" className="login-button">REGISTER</button>
        </form>

        <div className="login-links">
          <a href="/resetpass">Forgot password?</a>
          <a href="/login">Already have an account? Log in</a>
        </div>
      </div>
    </div>
  );
}
