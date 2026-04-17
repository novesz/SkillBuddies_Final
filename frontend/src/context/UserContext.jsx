import React, { createContext, useContext, useEffect, useState, useRef } from "react";

const UserContext = createContext(null);
const STORAGE_KEY = "sb.avatarUrl";
const DEFAULT_AVATAR = "/avatars/BB.png";

const normalizeAvatar = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return DEFAULT_AVATAR;
  const trimmed = url.trim();
  if (trimmed.startsWith("http") || trimmed.startsWith("/")) return trimmed;
  return "/" + trimmed;
};

export function UserProvider({ children }) {
  const [avatarUrl, setAvatarUrlRaw] = useState(DEFAULT_AVATAR);
  const [userRank, setUserRank] = useState(1);
  const initialized = useRef(false); // csak az init után mentünk localStorage-ba

  const setAvatarUrl = (url) => setAvatarUrlRaw(normalizeAvatar(url));

  // load from localStorage on init
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAvatarUrlRaw(normalizeAvatar(saved));
    initialized.current = true;
  }, []);

  // csak az init UTÁN mentünk localStorage-ba, hogy ne írjuk felül a default értékkel
  useEffect(() => {
    if (!initialized.current) return;
    if (avatarUrl) localStorage.setItem(STORAGE_KEY, avatarUrl);
  }, [avatarUrl]);

  const value = { avatarUrl, setAvatarUrl, userRank, setUserRank };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
