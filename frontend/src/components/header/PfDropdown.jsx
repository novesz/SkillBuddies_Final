import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import "../../styles/Header.css";
import "../../styles/PfDropdown.css";

export default function PfDropdown({ avatarUrl, isLoggedIn, setIsLoggedIn }) {
  const [open, setOpen] = useState(false);
  const profileRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const togglePopup = () => {
    if (!open && profileRef.current) {
      const rect = profileRef.current.getBoundingClientRect();

      // ✅ VÁLTOZÁS: scrollY/scrollX nélkül (viewporthoz mérve)
      setPopupPosition({
        top: rect.bottom,
        left: rect.left - 70,
      });
    }
    setOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:3001/logout",
        {},
        { withCredentials: true }
      );
      setIsLoggedIn(false);
      alert("Logout successful!");
      setOpen(false);
    } catch (error) {
      alert("Logout failed");
      console.error(error);
    }
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={profileRef} className="profile-container">
      <img
        className="sb-profile-img profile-pic"
        aria-label="Menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={togglePopup}
        src={avatarUrl}
        alt="Profile"
      />

      {open && (
        <div
          className="profile-popup"
          // ✅ VÁLTOZÁS: position: fixed, hogy biztos látszódjon
          style={{
            position: "fixed",
            top: popupPosition.top,
            left: popupPosition.left,
            zIndex: 99999,
          }}
        >
          {isLoggedIn ? (
            <>
              <Link
                to="/usersettings"
                className="link-item"
                onClick={() => setOpen(false)}
              >
                <p>User settings</p>
              </Link>
              <Link
                to="/profile"
                className="link-item"
                onClick={() => setOpen(false)}
              >
                <p>Profile</p>
              </Link>

              <button
                className="link-item"
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  margin: "5px 0",
                  fontSize: "18px",
                  fontWeight: 500,
                  textDecoration: "underline",
                  color: "black",
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="link-item"
                onClick={() => setOpen(false)}
              >
                <p>Login</p>
              </Link>
              <Link
                to="/register"
                className="link-item"
                onClick={() => setOpen(false)}
              >
                <p>Register</p>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
