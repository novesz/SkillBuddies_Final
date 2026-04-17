import React, { useState } from "react";
import "../styles/SupportPage.css";
import Header from "../components/header/Header";
import axios from "axios";

function SupportPage({isLoggedIn, setIsLoggedIn}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessages, setSuccessMessages] = useState([]);


  function addSuccessMessage(message) {
    const id = Date.now(); // unique ID
    setSuccessMessages((prev) => [...prev, { id, message }]);
  
    // Automatically remove after 3 seconds
    setTimeout(() => {
      setSuccessMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 3000);
  }
  
  // Named function version of handleSubmit
  async function handleSubmit(e) {
    e.preventDefault(); // Prevent page reload
    setLoading(true);
    setError(null);
  
    const Email = e.target.email.value;
    const Text = e.target.desc.value;
  
    try {
      const response = await axios.post("http://localhost:3001/tickets/create", {
        Email,
        Text,
      });
      e.target.reset(); // Clear the form
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to submit ticket. Please try again.");
    } finally {
      setLoading(false);
      addSuccessMessage("Ticket submitted successfully!");
    }
  }

  return (
    <div className="sb-page support-page">
      <Header isLoggedIn = {isLoggedIn} setIsLoggedIn = {setIsLoggedIn}/>
      <main className="support-main">
        <h2 className="support-title">Support Page</h2>
        <p className="support-subtitle">
          Get a ticket and our support team will help you as soon as possible
        </p>

        <form className="support-form" onSubmit={handleSubmit}>
          <div className="support-field">
            <label htmlFor="email">email:</label>
            <input
              id="email"
              type="email"
              placeholder="example@gmail.com"
              required
            />
          </div>

          <div className="support-field">
            <label htmlFor="desc">describe here:</label>
            <textarea
              id="desc"
              placeholder="describe your issues or problems here..."
              rows="6"
              required
            />
          </div>

          <button type="submit" className="support-submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>

          {error && <p className="error-message">{error}</p>}
        </form>
        <div className="success-message-container">
          {successMessages.map((msg) => (
            <div key={msg.id} className="success-message">
              {msg.message}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

export default SupportPage;
