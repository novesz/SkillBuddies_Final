import React, { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";
import "../../styles/Header.css";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import PfDropdown from "./PfDropdown";
import api from "../../api/client";

export default function Header({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const hambRef = useRef(null);
  const { avatarUrl, userRank } = useUser();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (hambRef.current && !hambRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(query)}`)
        .then((res) => {
          setSearchResults(res.data);
          setSearchOpen(res.data.length > 0);
        })
        .catch(console.error);
    }, 300);
  };

  const handleUserClick = (userId) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    navigate(`/profile/${userId}`);
  };

  return (
    <header className="sb-header">
      <div className="hamburger-wrap" ref={hambRef}>
        <button
          className={`sb-hamburger ${open ? "is-open" : ""}`}
          aria-label="Menu"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span></span><span></span><span></span>
        </button>

        {open && (
          <div className="hamburger-panel">
            <Navbar isLoggedIn={isLoggedIn} userRank={userRank} />
          </div>
        )}
      </div>

      <div className="sb-brand">
        <Link to="/">
          <img src="/SBLogo.png" alt="SkillBuddies" className="sb-logo-only" />
        </Link>
      </div>

      <div className="sb-user-search" ref={searchRef}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="user-search-input"
        />
        {searchOpen && searchResults.length > 0 && (
          <div className="user-search-dropdown">
            {searchResults.map((user) => (
              <div
                key={user.UserID}
                className="user-search-item"
                onClick={() => handleUserClick(user.UserID)}
              >
                <img
                  src={user.AvatarUrl || "/avatars/BB.png"}
                  alt={user.Username}
                  className="user-search-avatar"
                />
                <span>{user.Username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="sb-profile">
        <PfDropdown
          avatarUrl={avatarUrl}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
        />
      </div>
    </header>
  );
}
