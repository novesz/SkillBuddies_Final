import { useState, useEffect } from "react";
import AvatarPicker from "../components/profile/AvatarPicker.jsx";
import SkillManager from "../components/profile/SkillManager.jsx";
import PasswordPanel from "../components/profile/PasswordPanel.jsx";
import Header from "../components/header/Header.jsx";
import "../styles/Profile.css";
import { useUser } from "../context/UserContext";

export default function UserSettings({ isLoggedIn, setIsLoggedIn }) {
  const [user, setUser] = useState({
    name: "",
    email: "",
    avatarUrl: "",
    skills: [],
  });
  const { setAvatarUrl } = useUser();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError("");
        setMessage("");

        const resp = await fetch("http://localhost:3001/users/me/profile", {
          credentials: "include",
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to load profile.");

        setUser({
          name: data.name || "",
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          skills: Array.isArray(data.skills) ? data.skills : [],
        });

        setAvatarUrl(data.avatarUrl || "");
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setError("");
      setMessage("");

      const resp = await fetch("http://localhost:3001/users/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          avatarUrl: user.avatarUrl,
          skills: user.skills,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to save.");

      setMessage("Profile saved successfully ✅");
      setAvatarUrl(user.avatarUrl);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3001/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      setIsLoggedIn(false);
    }
  };

  return (
    <>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="profile-wrap">
        <section className="profile-card">
          <header className="profile-header">
            <h1>User settings</h1>
            <p className="muted">{user.email}</p>
          </header>

          <div className="profile-grid">
            <AvatarPicker
              value={user.avatarUrl}
              onChange={(url) => setUser((u) => ({ ...u, avatarUrl: url }))}
            />

            <SkillManager
              skills={user.skills}
              onAdd={(s) =>
                setUser((u) =>
                  u.skills.includes(s) ? u : { ...u, skills: [...u.skills, s] }
                )
              }
              onRemove={(s) =>
                setUser((u) => ({
                  ...u,
                  skills: u.skills.filter((x) => x !== s),
                }))
              }
            />
          </div>

          <div className="row-right" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="button" onClick={handleSaveProfile}>
              Save profile
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <PasswordPanel
            onSubmit={async ({ current, next }) => {
              setError("");
              setMessage("");

              try {
                if (!current || !next) {
                  throw new Error("Current and new password are required.");
                }

                const resp = await fetch("http://localhost:3001/users/me/change-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ current, next }),
                });

                const data = await resp.json().catch(() => ({}));

                if (!resp.ok) {
                  const serverMessage =
                    data?.message || data?.error || resp.statusText || "Failed to update password.";
                  throw new Error(serverMessage);
                }

                setMessage("Password changed ✅");
                alert("Password changed successfully!");
              } catch (err) {
                console.error("Change password error:", err);
                setError(err.message);
                alert(err.message);
              }
            }}
          />

          <div className="logout-row">
            <button className="btn btn-danger" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
