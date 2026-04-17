import { useState, useEffect } from "react";

export default function SkillManager({ skills, onAdd, onRemove }) {
  const [value, setValue] = useState("");
  const [allSkills, setAllSkills] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/skills", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setAllSkills(data.map((s) => s.Skill).filter(Boolean));
      })
      .catch((err) => console.error("Error loading skills", err));
  }, []);

  useEffect(() => {
    const text = value.trim().toLowerCase();

    if (!text) {
      setSuggestions([]);
      return;
    }

    const filtered = allSkills
      .filter(
        (skill) =>
          skill.toLowerCase().startsWith(text) && !skills.includes(skill)
      )
      .slice(0, 5);

    setSuggestions(filtered);
  }, [value, allSkills, skills]);

  const trimmed = value.trim();
  const exactMatch =
    trimmed && allSkills.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  const canAdd = !!exactMatch && !skills.includes(exactMatch);

  const addSkillAndClear = (skill) => {
    onAdd(skill);
    setValue("");
    setSuggestions([]);
  };

  const tryAdd = () => {
    if (!canAdd || !exactMatch) return;
    addSkillAndClear(exactMatch);
  };

  const handleSuggestionClick = (skill) => {
    if (skills.includes(skill)) return;
    addSkillAndClear(skill);
  };

  return (
    <section className="skills-section card">
      <div className="skills-title">Skills</div>

      <div className="tag-list">
        {skills.map((s) => (
          <span className="tag" key={s}>
            {s}
            <button
              type="button"
              className="tag-x"
              aria-label={`Remove ${s}`}
              onClick={() => onRemove(s)}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="add-row">
        <div className="skills-input-wrapper">
          <input
            className="input"
            placeholder="Add a skill…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? (e.preventDefault(), tryAdd()) : null)}
          />

          {suggestions.length > 0 && (
            <ul className="skills-suggestions">
              {suggestions.map((skill) => (
                <li key={skill} onClick={() => handleSuggestionClick(skill)}>
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="btn" type="button" onClick={tryAdd} disabled={!canAdd}>
          Add
        </button>
      </div>
    </section>
  );
}
