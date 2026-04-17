/**
 * Először leállítja, ami a 3001-es porton fut (Windows),
 * majd elindítja a backend szervert.
 * Használat: node start-backend.js
 */
const { execSync, spawn } = require("child_process");
const path = require("path");

const PORT = 3001;

function killProcessOnPort() {
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    const lines = out.trim().split("\n");
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && /^\d+$/.test(last) && line.includes("LISTENING")) {
        pids.add(last);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
        console.log(`Port ${PORT} felszabadítva (PID ${pid} leállítva).`);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // netstat nem talált semmit = nincs semmi a porton
  }
}

killProcessOnPort();

console.log("Backend indítása...");
const child = spawn("node", [path.join(__dirname, "server.js")], {
  stdio: "inherit",
  cwd: __dirname,
});

child.on("error", (err) => {
  console.error("Hiba:", err);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
