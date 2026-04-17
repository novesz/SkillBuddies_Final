import { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import api from "./api/client";
import "./App.css";
import { useUser } from "./context/UserContext";
import { GroupFinderContext } from "./context/GroupFinderContext";

import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegistPage from "./pages/RegistPage";
import Profile from "./pages/Profile";
import UserSettings from "./pages/UserSettings";
import AboutPage from "./pages/AboutPage";
import SupportPage from "./pages/SupportPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import GroupEditor from "./pages/GroupEditor";
import ChatPage from "./pages/ChatPage";
import JoinByCodePage from "./pages/JoinByCodePage";
import GroupFinderModal from "./pages/GroupFinder";

import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import AdminPanelDownload from "./pages/AdminPanelDownload";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [groupFinderOpen, setGroupFinderOpen] = useState(false);
  const { setAvatarUrl, setUserRank, userRank } = useUser();
  const didMount = useRef(false); // <-- új: első render jelző

  const groupFinderValue = {
    isOpen: groupFinderOpen,
    open: () => setGroupFinderOpen(true),
    close: () => setGroupFinderOpen(false),
  };

  const DEFAULT_AVATAR = "/avatars/BB.png";

  // Initial auth + profile; when not logged in, reset avatar to default
  useEffect(() => {
    api
      .get("/auth/status")
      .then((response) => {
        const { loggedIn, userId: uid, rankID, username, avatarUrl } = response.data;
        setIsLoggedIn(loggedIn);
        if (loggedIn) {
          setUserId(uid ?? 0);
          setUserRank(rankID ?? 1);
          if (avatarUrl) {
            setAvatarUrl(avatarUrl);
          } else {
            api.get("/users/me/profile").then(({ data }) => {
              setAvatarUrl(data?.avatarUrl || DEFAULT_AVATAR);
            }).catch((err) => console.error("Profile load on init:", err));
          }
        } else {
          setUserId(0);
          setUserRank(1);
          setAvatarUrl(DEFAULT_AVATAR);
        }
      })
      .catch((error) => {
        console.error("Auth status error:", error);
        setIsLoggedIn(false);
        setUserId(0);
        setUserRank(1);
        setAvatarUrl(DEFAULT_AVATAR);
      })
      .finally(() => setAuthLoading(false));
  }, [setAvatarUrl, setUserRank]);

  // On logout (isLoggedIn becomes false), reset avatar – de NE az első renderkor
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (!isLoggedIn) setAvatarUrl(DEFAULT_AVATAR);
  }, [isLoggedIn, setAvatarUrl]);

  // Bejelentkezés után userId és userRank frissítése
  useEffect(() => {
    if (!isLoggedIn) return;
    api.get("/auth/status").then((res) => {
      if (res.data.loggedIn) {
        if (res.data.userId != null) setUserId(res.data.userId);
        if (res.data.rankID != null) setUserRank(res.data.rankID);
      }
    }).catch(() => {});
  }, [isLoggedIn, setUserRank]);

  // 403 (banned / session invalid) → force logout
  useEffect(() => {
    const onAuthLogout = () => {
      setIsLoggedIn(false);
      setUserId(0);
      setUserRank(1);
      setAvatarUrl(DEFAULT_AVATAR);
    };
    window.addEventListener("auth:logout", onAuthLogout);
    return () => window.removeEventListener("auth:logout", onAuthLogout);
  }, [setAvatarUrl, setUserRank]);

  return (
    <GroupFinderContext.Provider value={groupFinderValue}>
      <Routes>
        <Route
          path="/"
          element={<Home isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} userId={userId} />}
        />
        <Route
          path="/login"
          element={<LoginPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/register"
          element={<RegistPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} authLoading={authLoading}>
              <Profile isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} userId={userId} />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} authLoading={authLoading}>
              <Profile isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} userId={userId} />
            </PrivateRoute>
          }
        />
        <Route
          path="/usersettings"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} authLoading={authLoading}>
              <UserSettings isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            </PrivateRoute>
          }
        />
        <Route
          path="/about"
          element={<AboutPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/support"
          element={<SupportPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/resetpass"
          element={<ResetPasswordPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/groupeditor"
          element={<GroupEditor isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} userId={userId} />}
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} authLoading={authLoading}>
              <ChatPage isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} userId={userId} />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat/join/:code"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} authLoading={authLoading}>
              <JoinByCodePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/adminPanel"
          element={
            <AdminRoute isLoggedIn={isLoggedIn} userRank={userRank}>
              <AdminPanelDownload isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            </AdminRoute>
          }
        />
      </Routes>
      {groupFinderOpen && <GroupFinderModal />}
    </GroupFinderContext.Provider>
  );
}

export default App;
