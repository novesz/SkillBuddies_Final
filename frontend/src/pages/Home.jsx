import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header/Header";
import "../styles/Home.css";
import axios from "axios";

export default function Home({ isLoggedIn, setIsLoggedIn, userId }) {
  const navigate = useNavigate();
  
  const [chips, setChips] = useState([]);          // skill-nevek a chipekhez
  const [selectedChips, setSelectedChips] = useState([]); // kiválasztott skillek
  const [searchText, setSearchText] = useState("");        // csoportnév kereső
  const [error, setError] = useState("");
  const [chipOffset, setChipOffset] = useState(0);       // chip carousel offset
  const [joiningId, setJoiningId] = useState(null);      // which group is being joined

  // infinite scroll state
  const PAGE_SIZE = 18;
  const [cards, setCards] = useState([]); // loaded (already filtered by backend)
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef(null);
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const loadingMoreRef = useRef(loadingMore);
  hasMoreRef.current = hasMore;
  loadingRef.current = loading;
  loadingMoreRef.current = loadingMore;

  // 🔹 Skillek (chipek) betöltése az adatbázisból
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const resp = await fetch("http://localhost:3001/skills");
        if (!resp.ok) throw new Error("Failed to load skills.");
        const data = await resp.json();
        // backend: SELECT SkillID, Skill FROM skills
        setChips(data.map((s) => s.Skill)); // csak a nevek kellenek chipnek
      } catch (err) {
        console.error("Hiba a skillek lekérésekor:", err);
        setError("Failed to load skills.");
      }
    };
    
    loadSkills();
  }, []);
  
  const debouncedSearch = useDebouncedValue(searchText, 300);

  const skillsQuery = useMemo(() => {
    if (selectedChips.length === 0) return "";
    // backend expects comma-separated skill names
    return selectedChips.join(",");
  }, [selectedChips]);

  const CHIPS_VISIBLE = 4; /* kevesebb egyszerre → nem csúszik a nyil alá, lapozás nyilakkal */
  const maxChipOffset = Math.max(0, Math.ceil(chips.length / CHIPS_VISIBLE) - 1);
  const visibleChips = useMemo(
    () => chips.slice(chipOffset * CHIPS_VISIBLE, chipOffset * CHIPS_VISIBLE + CHIPS_VISIBLE),
    [chips, chipOffset]
  );

  const loadGroupsPage = async ({ reset } = { reset: false }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const myRequestId = ++requestIdRef.current;

    if (reset) {
      setLoading(true);
      setLoadingMore(false);
      setError("");
      setCards([]);
      setNextOffset(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
      setError("");
    }

    try {
      const offset = reset ? 0 : nextOffset;

      const qs = new URLSearchParams();
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(offset));
      if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
      if (skillsQuery) qs.set("skills", skillsQuery);
      if (userId) qs.set("excludeUserId", String(userId));

      const resp = await fetch(`http://localhost:3001/groups?${qs.toString()}`);
      if (!resp.ok) throw new Error("Failed to load groups.");
      const payload = await resp.json();

      // Ignore out-of-order responses
      if (myRequestId !== requestIdRef.current) return;

      const rows = Array.isArray(payload) ? payload : payload.items;
      const normalized = (rows || []).map((g) => ({
        id: g.ChatID,
        title: g.ChatName,
        skills: g.Skills ? g.Skills.split(", ").filter(Boolean) : [],
        users: g.MemberCount || 0,
        pic: g.ChatPic || null,
      }));

      if (reset) {
        setCards(normalized);
      } else {
        // Duplikátumok kiszűrése: csak olyan kártyák kerülnek hozzá, amik még nincsenek a listában
        setCards((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newOnes = normalized.filter((c) => !existingIds.has(c.id));
          return newOnes.length === 0 ? prev : [...prev, ...newOnes];
        });
      }

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        setNextOffset(payload.nextOffset ?? (offset + normalized.length));
        setHasMore(Boolean(payload.hasMore));
      } else {
        setNextOffset(offset + normalized.length);
        setHasMore(normalized.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error("Hiba a csoportok lekérésekor:", err);
      setError("Failed to load groups.");
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Load first page on mount + when filters or userId change
  useEffect(() => {
    loadGroupsPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, skillsQuery, userId]);

  // Infinite scroll: csak akkor töltünk többet, ha a sentinel látszik és nincs már betöltés
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (isFetchingRef.current || loadingRef.current || loadingMoreRef.current) return;
        if (!hasMoreRef.current) return;

        loadGroupsPage({ reset: false });
      },
      { root: null, rootMargin: "320px 0px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, debouncedSearch, skillsQuery]);

  const handleChipClick = (chip) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleJoinGroup = async (chatId) => {
    if (!isLoggedIn) {
      alert("Please log in to join a group.");
      navigate("/login");
      return;
    }
    setJoiningId(chatId);
    try {
      await axios.post(
        "http://localhost:3001/chats/join",
        { ChatID: chatId },
        { withCredentials: true }
      );
      navigate("/chat", { state: { openChatId: chatId } });
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.error?.includes("already")) {
        navigate("/chat", { state: { openChatId: chatId } });
      } else {
        alert(err.response?.data?.error || "Failed to join group.");
      }
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="sb-page">
      <Header isLoggedIn = {isLoggedIn} setIsLoggedIn = {setIsLoggedIn}/>

      <main className="sb-content">
        {/* Kereső + chipek */}
        <section className="sb-search-wrap">
          <div className="sb-search">
            <input
              type="text"
              placeholder="Search groups by name"
              aria-label="Search groups by name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <svg className="sb-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <line
                x1="16.5"
                y1="16.5"
                x2="22"
                y2="22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="sb-chips-row">
            <button
              type="button"
              className="sb-chip-arrow"
              aria-label="Previous filters"
              onClick={() => setChipOffset((p) => Math.max(0, p - 1))}
              disabled={chipOffset === 0}
            >
              ‹
            </button>
            <ul className="sb-chips">
              {visibleChips.map((c) => (
                <li
                  key={c}
                  onClick={() => handleChipClick(c)}
                  className={selectedChips.includes(c) ? "sb-chip active" : "sb-chip"}
                >
                  {c}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="sb-chip-arrow"
              aria-label="Next filters"
              onClick={() => setChipOffset((p) => Math.min(maxChipOffset, p + 1))}
              disabled={chipOffset >= maxChipOffset}
            >
              ›
            </button>
          </div>
        </section>

        {error && <p className="sb-error">{error}</p>}

        {/* SZŰRT CSOPORTKÁRTYÁK */}
        <section className="sb-cards">
          {cards.map((card) => (
            <Card
              key={card.id}
              id={card.id}
              title={card.title}
              skills={card.skills}
              users={card.users}
              pic={card.pic}
              onJoin={handleJoinGroup}
              joining={joiningId === card.id}
            />
          ))}

          {loading && (
            <p className="sb-loading">Loading groups...</p>
          )}

          {!loading && cards.length === 0 && !error && (
            <p className="sb-empty">No groups match your filters.</p>
          )}

          {/* sentinel for infinite scroll */}
          <div ref={sentinelRef} className="sb-sentinel" />

          {loadingMore && (
            <p className="sb-loading sb-loading-more">Loading more...</p>
          )}

          {!loading && !loadingMore && !error && cards.length > 0 && !hasMore && (
            <p className="sb-end">You reached the end.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function Card({ id, title, skills, users, pic, onJoin, joining }) {
  return (
    <article className="sb-card">
      <div className="sb-card-header">
        <div className="sb-card-avatar">
          {pic ? (
            <img src={pic} alt={title} />
          ) : (
            <span>{title.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <h3>{title}</h3>
      </div>

      <ol className="sb-list">
        {skills.length === 0 && <li>No skills specified yet.</li>}
        {skills.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ol>

      <div className="sb-card-footer">
        <div className="sb-avatars">
          <span className="sb-av"></span>
          <span className="sb-av"></span>
          <span className="sb-av"></span>
        </div>
        <span className="sb-count">{users} users</span>
        <button 
          className="sb-join" 
          onClick={() => onJoin(id)}
          disabled={joining}
        >
          {joining ? "Joining..." : "Join"}
        </button>
      </div>
    </article>
  );
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
