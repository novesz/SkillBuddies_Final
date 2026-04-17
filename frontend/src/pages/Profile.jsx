import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/header/Header.jsx";
import axios from "axios";
import "../styles/Profile.css";
import "../styles/ProfileView.css";

// Egyszerű confirm modal komponens
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "28px 32px",
        maxWidth: "360px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
      }}>
        <p style={{ margin: "0 0 20px", fontSize: "1rem", color: "#0f172a", textAlign: "center" }}>{message}</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            padding: "10px 24px", borderRadius: "10px", border: "1px solid #d1d5db",
            background: "#f9fafb", cursor: "pointer", fontWeight: 500
          }}>Mégsem</button>
          <button onClick={onConfirm} style={{
            padding: "10px 24px", borderRadius: "10px", border: "none",
            background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600
          }}>Igen</button>
        </div>
      </div>
    </div>
  );
}

// Egyszerű info/hiba toast
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)",
      background: type === "error" ? "#ef4444" : "#10b981",
      color: "#fff", padding: "12px 28px", borderRadius: "12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999,
      fontSize: "1rem", fontWeight: 500, minWidth: "220px", textAlign: "center"
    }}>
      {message}
    </div>
  );
}

export default function Profile({ isLoggedIn, setIsLoggedIn }) {
  const { userId: paramUserId } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  const profileUserId = paramUserId ? parseInt(paramUserId, 10) : currentUserId;

  const [profile, setProfile] = useState({
    username: "", avatarUrl: "/images/default.png",
    skills: [], reviews: [], avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [userRankID, setUserRankID] = useState(null);
  const [banActionInProgress, setBanActionInProgress] = useState(false);

  // Modal + toast state
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const showConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  const isOwnProfile =
    currentUserId != null && profileUserId != null &&
    Number(currentUserId) === Number(profileUserId);

  const myReview =
    profile.reviews?.find((r) => Number(r.Reviewer) === Number(currentUserId)) || null;

  // 1. Auth/status
  useEffect(() => {
    axios.get("http://localhost:3001/auth/status", { withCredentials: true })
      .then((res) => {
        if (res.data.loggedIn) {
          setCurrentUserId(Number(res.data.userId));
          setIsAdmin(res.data.rankID >= 2);
          setIsOwner(res.data.rankID === 3);
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoaded(true));
  }, []);

  // 2. Profil betöltése
  useEffect(() => {
    if (!authLoaded) return;
    if (!profileUserId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    axios.get(`http://localhost:3001/users/${profileUserId}/public-profile`)
      .then((res) => {
        const data = res.data;
        setProfile({
          username: data.username || "User",
          avatarUrl: data.avatarUrl || "/images/default.png",
          skills: data.skills || [],
          reviews: data.reviews || [],
          avgRating: data.avgRating || 0,
        });
        const existing = (data.reviews || []).find(
          (r) => Number(r.Reviewer) === Number(currentUserId)
        );
        if (existing) { setFeedbackRating(existing.Rating || 0); setFeedbackText(existing.Content || ""); }
        else { setFeedbackRating(0); setFeedbackText(""); }
      })
      .catch((err) => setError(err.response?.data?.error || err.message || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [authLoaded, profileUserId]);

  // 3. Megtekintett user rankID-ja (admin/owner esetén)
  useEffect(() => {
    if (!authLoaded || !isAdmin || !profileUserId || isOwnProfile) {
      setUserRankID(null);
      return;
    }
    axios.get(`http://localhost:3001/users/${profileUserId}`)
      .then((res) => {
        const userData = Array.isArray(res.data) ? res.data[0] : res.data;
        setUserRankID(userData?.rankID ?? null);
      })
      .catch(() => setUserRankID(null));
  }, [authLoaded, isAdmin, profileUserId, isOwnProfile]);

  const isBanned = userRankID === 0;
  const isTargetAdmin = userRankID === 2;

  const avatarSrc = profile.avatarUrl?.startsWith("/") ? profile.avatarUrl : `/${profile.avatarUrl || ""}`;

  const refreshUserRank = useCallback(() => {
    if (!profileUserId) return;
    axios.get(`http://localhost:3001/users/${profileUserId}`)
      .then((res) => {
        const userData = Array.isArray(res.data) ? res.data[0] : res.data;
        setUserRankID(userData?.rankID ?? null);
      })
      .catch(() => {});
  }, [profileUserId]);

  const loadProfile = useCallback(() => {
    if (!profileUserId) return;
    axios.get(`http://localhost:3001/users/${profileUserId}/public-profile`)
      .then((res) => {
        const data = res.data;
        setProfile({
          username: data.username || "User",
          avatarUrl: data.avatarUrl || "/images/default.png",
          skills: data.skills || [],
          reviews: data.reviews || [],
          avgRating: data.avgRating || 0,
        });
        const existing = (data.reviews || []).find(
          (r) => Number(r.Reviewer) === Number(currentUserId)
        );
        if (existing) { setFeedbackRating(existing.Rating || 0); setFeedbackText(existing.Content || ""); }
        else { setFeedbackRating(0); setFeedbackText(""); }
      })
      .catch(() => {});
  }, [profileUserId, currentUserId]);

  // --- Admin akciók: saját modal, nem window.confirm ---
  const handleBanUser = () => {
    showConfirm(`Biztosan bannolod: ${profile.username}?`, async () => {
      setConfirmModal(null);
      setBanActionInProgress(true);
      try {
        await axios.put(`http://localhost:3001/users/${profileUserId}/ban`, {}, { withCredentials: true });
        showToast(`${profile.username} bannolva.`, "success");
        refreshUserRank();
      } catch (err) {
        showToast(err.response?.data?.error || "Hiba bannoláskor.", "error");
      } finally {
        setBanActionInProgress(false);
      }
    });
  };

  const handleUnbanUser = () => {
    showConfirm(`Biztosan feloldod a bant: ${profile.username}?`, async () => {
      setConfirmModal(null);
      setBanActionInProgress(true);
      try {
        await axios.put(`http://localhost:3001/users/${profileUserId}/unban`, {}, { withCredentials: true });
        showToast(`${profile.username} unbannolva.`, "success");
        refreshUserRank();
      } catch (err) {
        showToast(err.response?.data?.error || "Hiba unbannoláskor.", "error");
      } finally {
        setBanActionInProgress(false);
      }
    });
  };

  const handlePromoteAdmin = () => {
    showConfirm(`Admin lesz: ${profile.username}?`, async () => {
      setConfirmModal(null);
      setBanActionInProgress(true);
      try {
        await axios.put(`http://localhost:3001/users/${profileUserId}/promote-admin`, {}, { withCredentials: true });
        showToast(`${profile.username} admin lett.`, "success");
        refreshUserRank();
      } catch (err) {
        showToast(err.response?.data?.error || "Hiba admin kinevezéskor.", "error");
      } finally {
        setBanActionInProgress(false);
      }
    });
  };

  const handleDemoteAdmin = () => {
    showConfirm(`Leveszed az admin jogot: ${profile.username}?`, async () => {
      setConfirmModal(null);
      setBanActionInProgress(true);
      try {
        await axios.put(`http://localhost:3001/users/${profileUserId}/demote-admin`, {}, { withCredentials: true });
        showToast(`${profile.username} admin jog elvéve.`, "success");
        refreshUserRank();
      } catch (err) {
        showToast(err.response?.data?.error || "Hiba admin elvételkor.", "error");
      } finally {
        setBanActionInProgress(false);
      }
    });
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    if (!profileUserId || !currentUserId || feedbackRating < 1) return;
    setFeedbackSubmitting(true);
    const payload = { Rating: feedbackRating, Content: feedbackText, Reviewee: profileUserId };
    const isEdit = !!myReview;
    const promise = isEdit
      ? axios.put("http://localhost:3001/reviews/edit", payload, { withCredentials: true })
      : axios.post("http://localhost:3001/reviews/create", payload, { withCredentials: true });
    promise
      .then(() => { if (!isEdit) { setFeedbackRating(0); setFeedbackText(""); } loadProfile(); })
      .catch((err) => showToast(err.response?.data?.error || (isEdit ? "Could not update feedback." : "Could not submit feedback."), "error"))
      .finally(() => setFeedbackSubmitting(false));
  };

  const handleMessage = async () => {
    if (!profileUserId || !currentUserId) return;
    try {
      const res = await axios.post(
        "http://localhost:3001/chats/private",
        { otherUserId: profileUserId },
        { withCredentials: true }
      );
      navigate("/chat", { state: { openChatId: res.data.ChatID }, replace: false });
    } catch (err) {
      showToast(err.response?.data?.error || "Could not open chat.", "error");
    }
  };

  if (!authLoaded || loading) {
    return (
      <>
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="profile-view-wrap"><p>Loading...</p></main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="profile-view-wrap">
          <p className="form-error">{error}</p>
          {currentUserId && (
            <button className="btn btn-primary" onClick={() => navigate("/profile")}>Back to my profile</button>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      {/* Saját confirm modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Toast értesítő */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="profile-view-wrap">
        <section className="profile-view-card">
          <div className="profile-view-top">
            <img src={avatarSrc} alt={profile.username} className="profile-view-avatar" />
            <div className="profile-view-header">
              <h1>{profile.username}</h1>
              <p className="profile-view-join">Join Date: —</p>

              <div className="profile-view-buttons-container">
                {!isOwnProfile && currentUserId && (
                  <button type="button" className="profile-view-message-btn" onClick={handleMessage}>
                    Message
                  </button>
                )}

                {isAdmin && !isOwnProfile && userRankID !== null && (
                  isBanned ? (
                    <button type="button" className="profile-view-unban-btn"
                      onClick={handleUnbanUser} disabled={banActionInProgress}>
                      {banActionInProgress ? "..." : "Unban"}
                    </button>
                  ) : (
                    <button type="button" className="profile-view-ban-btn"
                      onClick={handleBanUser} disabled={banActionInProgress}>
                      {banActionInProgress ? "..." : "Ban"}
                    </button>
                  )
                )}

                {isOwner && !isOwnProfile && userRankID !== null && (
                  isTargetAdmin ? (
                    <button type="button" className="profile-view-demote-btn"
                      onClick={handleDemoteAdmin} disabled={banActionInProgress}>
                      {banActionInProgress ? "..." : "Demote Admin"}
                    </button>
                  ) : (
                    <button type="button" className="profile-view-promote-btn"
                      onClick={handlePromoteAdmin} disabled={banActionInProgress}>
                      {banActionInProgress ? "..." : "Make Admin"}
                    </button>
                  )
                )}
              </div>

              {isOwnProfile && (
                <button type="button" className="btn btn-primary profile-view-settings-btn"
                  onClick={() => navigate("/usersettings")}>
                  User settings
                </button>
              )}
            </div>
          </div>

          <div className="profile-view-sections">
            <section className="profile-view-section">
              <h3>Feedbacks about me...</h3>
              <div className="profile-view-stars" aria-label={`Rating: ${profile.avgRating} out of 5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`star ${i <= profile.avgRating ? "filled" : ""}`}>★</span>
                ))}
              </div>
              <div className="profile-view-feedback-box">
                {profile.reviews.length === 0 ? <p className="muted">No feedback yet.</p> : (
                  profile.reviews.map((r, i) => (
                    <div key={i} className="feedback-item">
                      <span className="feedback-rating">{r.Rating ? "★".repeat(r.Rating) : ""}</span>
                      {r.Content && <p>{r.Content}</p>}
                    </div>
                  ))
                )}
              </div>
              {!isOwnProfile && currentUserId && (
                <form className="feedback-form" onSubmit={handleSubmitFeedback}>
                  <p className="feedback-form-label">{myReview ? "Edit your rating:" : "Your rating:"}</p>
                  <div className="feedback-form-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button"
                        className={`feedback-star-btn ${i <= feedbackRating ? "filled" : ""}`}
                        onClick={() => setFeedbackRating(i)}
                        aria-label={`${i} star${i > 1 ? "s" : ""}`}>★</button>
                    ))}
                  </div>
                  <label className="feedback-form-label">Your opinion (optional):</label>
                  <textarea className="feedback-form-textarea" value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value.slice(0, 200))}
                    placeholder="Write your feedback..." rows={3} maxLength={200} />
                  <button type="submit" className="btn btn-primary feedback-form-submit"
                    disabled={feedbackSubmitting || feedbackRating < 1}>
                    {feedbackSubmitting ? "Saving…" : myReview ? "Update feedback" : "Submit feedback"}
                  </button>
                </form>
              )}
            </section>

            <section className="profile-view-section">
              <h3>Skills:</h3>
              <div className="profile-view-skills-box">
                {profile.skills.length === 0 ? <p className="muted">No skills listed.</p> : (
                  <ul className="profile-view-skills-list">
                    {profile.skills.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
