import React from "react";
import "../../styles/Navbar.css";
import { Link } from "react-router-dom";
import { useGroupFinder } from "../../context/GroupFinderContext";

export default function Navbar({ userRank = 1 }) {
  const { open: openGroupFinder } = useGroupFinder();
  const showAdminPanel = userRank >= 2; // admin=2, owner=3

  return (
    <nav className="navbar">
      <div className="navbar-box">
        <ul>
          <li>
            <button type="button" className="navbar-btn-link" onClick={openGroupFinder}>
              Join by ID
            </button>
          </li>
          <li><Link to="/groupeditor">Create group</Link></li>
          <li><Link to="/chat">Chat</Link></li>
          <li><Link to="/support">Support</Link></li>
          <li><Link to="/about">About</Link></li>
          {showAdminPanel && (
            <li><Link to="/adminPanel">Admin panel</Link></li>
          )}
        </ul>
      </div>
    </nav>
  );
}
