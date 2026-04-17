import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useGroupFinder } from "../context/GroupFinderContext";
import "../styles/GroupFinder.css";

/**
 * Modal: "Join a group by Id!" – csoport kód (PublicID) mező, Join gomb.
 * A Chat oldal 3-csík menüjében "Csoport kód" alatt generálható/másolható a kód.
 */
export default function GroupFinderModal() {
  const { close } = useGroupFinder();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const handleClose = (e) => {
    if (e?.target?.dataset?.backdrop !== undefined) close();
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setError("");
    const publicId = code.trim().toUpperCase();
    if (!publicId) {
      setError("Please enter the group code.");
      return;
    }

    setLoading(true);
    axios
      .post(
        "http://localhost:3001/chats/joinByCode",
        { publicId },
        { withCredentials: true }
      )
      .then((res) => {
        window.dispatchEvent(new CustomEvent("chats-updated"));
        close();
        navigate("/chat");
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message || "Could not join.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div
      className="groupfinder-backdrop"
      data-backdrop
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="groupfinder-title"
    >
      <div className="groupfinder-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="groupfinder-close"
          aria-label="Close"
          onClick={close}
        >
          ×
        </button>
        <h2 id="groupfinder-title" className="groupfinder-title">
          Join with group code
        </h2>
        <p className="groupfinder-hint">Enter the group code (e.g. from the Chat menu).</p>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            className="groupfinder-input"
            placeholder="Group code (e.g. BSF4WS)"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            aria-label="Group code"
            maxLength={6}
            autoComplete="off"
          />
          {error && <p className="groupfinder-error">{error}</p>}
          <button type="submit" className="groupfinder-join" disabled={loading}>
            {loading ? "..." : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
