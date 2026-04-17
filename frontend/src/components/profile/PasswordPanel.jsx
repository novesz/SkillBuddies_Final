import { useState, useId, useEffect } from "react";

const COOLDOWN_URL = "http://localhost:3001/users/me/password-cooldown";

export default function PasswordPanel({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cooldown, setCooldown] = useState(null); // { canChange: boolean, hoursLeft?: number }
  const [cooldownLoading, setCooldownLoading] = useState(false);
  const titleId = useId();

  const fetchCooldown = async () => {
    setCooldownLoading(true);
    try {
      const resp = await fetch(COOLDOWN_URL, { credentials: "include" });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setCooldown({ canChange: data.canChange !== false, hoursLeft: data.hoursLeft });
      } else {
        setCooldown({ canChange: true });
      }
    } catch {
      setCooldown({ canChange: true });
    } finally {
      setCooldownLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchCooldown();
  }, [open]);

  const handleToggle = () => {
    setOpen((v) => !v);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) return alert("New passwords do not match.");
    if (cooldown && !cooldown.canChange) return;
    try {
      await onSubmit({ current, next });
      setCurrent("");
      setNext("");
      setConfirm("");
      await fetchCooldown();
      // panel nyitva marad, így látszik: "X óra van hátra"
    } catch {
      // hibaüzenet a szülő kezeli
    }
  };

  const disabled = cooldown && !cooldown.canChange;

  return (
    <section className={`password-section ${open ? "open" : ""}`}>
      <button
        type="button"
        className="pw-heading"
        aria-expanded={open}
        aria-controls={titleId}
        onClick={handleToggle}
      >
        <span>Change password</span>
        <i className="chev" aria-hidden="true" />
      </button>

      <form
        id={titleId}
        className="pw-panel"
        onSubmit={submit}
        aria-hidden={!open}
      >
        <p className="pw-info">
          You can change your password once every 24 hours.
        </p>

        {cooldownLoading && (
          <p className="text muted">Loading…</p>
        )}

        {!cooldownLoading && cooldown && !cooldown.canChange && (
          <p className="pw-cooldown">
            <strong>{cooldown.hoursLeft} hour(s)</strong> left until you can change your password again.
          </p>
        )}

        {!cooldownLoading && (!cooldown || cooldown.canChange) && (
          <>
            <label className="field">
              <span className="text">Current password</span>
              <input
                className="input"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="text">New password</span>
              <input
                className="input"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="text">New password again</span>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>

            <div className="row-right">
              <button className="btn btn-primary" type="submit">
                Save password
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
