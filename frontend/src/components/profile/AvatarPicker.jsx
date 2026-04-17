import React, { useRef, useState, useEffect } from "react";

const PRESETS = [
  "/avatars/BB.png","/avatars/BC.png","/avatars/BD.png",
  "/avatars/GS.png","/avatars/OD.png","/avatars/PB.png",
  "/avatars/PC.png","/avatars/RB.png","/avatars/RD.png",
  "/avatars/YC.png","/avatars/YS.png",
];

export default function AvatarPicker({ value, onChange }) {
  const listRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = listRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateArrows();
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
  }, []);

  const scrollByAmount = (dir) => {
    const el = listRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="avatar-section card">
      <div className="avatar-title">Profile picture</div>

      <div className="avatar-strip-wrap">
        <button type="button" className="nav-btn" onClick={() => scrollByAmount(-1)} disabled={!canLeft}>‹</button>

        <div className="avatar-strip" ref={listRef}>
          {PRESETS.map((src) => (
            <button
              key={src}
              type="button"
              className={`preset ${value === src ? "active" : ""}`}
              style={{ backgroundImage: `url(${src})` }}
              onClick={() => onChange?.(src)}
              aria-pressed={value === src}
              title="Use this avatar"
            />
          ))}
        </div>

        <button type="button" className="nav-btn" onClick={() => scrollByAmount(1)} disabled={!canRight}>›</button>
      </div>
    </section>
  );
}
