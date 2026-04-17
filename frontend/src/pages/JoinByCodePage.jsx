import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * Direct link: /chat/join/BSF4WS
 * Ha be vagy jelentkezve, automatikusan beléptet a csoportba és átirányít /chat-re.
 */
export default function JoinByCodePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | joining | ok | error
  const [error, setError] = useState("");

  useEffect(() => {
    const publicId = (code || "").trim().toUpperCase();
    if (!publicId) {
      setStatus("error");
      setError("Invalid link.");
      return;
    }

    axios
      .post(
        "http://localhost:3001/chats/joinByCode",
        { publicId },
        { withCredentials: true }
      )
      .then(() => {
        setStatus("ok");
        navigate("/chat", { replace: true });
      })
      .catch((err) => {
        setStatus("error");
        const msg = err.response?.data?.error || err.message || "Could not join.";
        setError(msg);
        if (err.response?.status === 401) {
          navigate("/login?redirect=/chat/join/" + publicId);
        }
      });
  }, [code, navigate]);

  if (status === "loading" || status === "joining" || status === "ok") {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Joining group...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p style={{ color: "#c62828" }}>{error}</p>
      <button type="button" onClick={() => navigate("/chat")}>
        Back to Chat
      </button>
    </div>
  );
}
