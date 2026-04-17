const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require('multer');
const { createRequestLogger } = require("./requestLogger");
const saltRounds = 10;


const JWT_SECRET = process.env.JWT_SECRET;
const server = require('http').createServer(app);
const WebSocket = require("ws");  
const wss = new WebSocket.Server({ server });

// Middleware


app.use(express.json());
app.use(cookieParser());
app.use(createRequestLogger());
app.use(cors(
    {
      origin: 'http://localhost:5173',
      credentials: true 
    }
));
// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME, 
    port: process.env.DB_PORT
});
const hashPassword = async (password) => {
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
};
const cookie = require("cookie");

// clients: Map<userId, Set<WebSocket>>
const clients = new Map();

wss.on("connection", (ws, req) => {
  try {
    // --- Parse cookies safely ---
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return ws.close(4002, "No token provided");

    // --- Verify JWT ---
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.userId;

    // --- Add socket to clients map ---
    if (!clients.has(ws.userId)) clients.set(ws.userId, new Set());
    clients.get(ws.userId).add(ws);

    ws.on("close", () => {
      clients.get(ws.userId)?.delete(ws);
      if (clients.get(ws.userId)?.size === 0) clients.delete(ws.userId);
    });

    console.log("✅ WS connected for user:", ws.userId);
  } catch (err) {
    console.error("❌ WS connection error:", err.message);
    return ws.close(4003, "Invalid token");
  }

  // --- Handle incoming messages ---
  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.type === "NEW_MESSAGE") {
        const { ChatID, Content } = data;

        if (!ChatID || !Content) return;

        // --- Check user belongs to chat ---
        const checkSql = "SELECT 1 FROM uac WHERE ChatID = ? AND UserID = ?";
        db.query(checkSql, [ChatID, ws.userId], (err, rows) => {
          if (err) return console.error("DB error (chat check):", err);
          if (rows.length === 0) return console.warn("User not in chat:", ws.userId, ChatID);

          // --- Get username for the message ---
          db.query("SELECT Username FROM users WHERE UserID = ?", [ws.userId], (err, userRows) => {
            if (err) return console.error("DB error (get username):", err);
            const username = userRows.length > 0 ? userRows[0].Username : `User ${ws.userId}`;

            // --- Insert message into DB ---
            const insertSql = "INSERT INTO msgs (ChatID, UserID, Content) VALUES (?, ?, ?)";
            db.query(insertSql, [ChatID, ws.userId, Content], (err, result) => {
              if (err) return console.error("DB error (insert message):", err);

              const messagePayload = {
                type: "NEW_MESSAGE",
                msg: {
                  MsgID: result.insertId,
                  ChatID,
                  UserID: ws.userId,
                  Username: username,
                  Content,
                  SentAt: new Date().toISOString(),
                },
              };

              // --- Broadcast to all users in this chat ---
              broadcastToChat(ChatID, messagePayload);
            });
          });
        });
      }
    } catch (err) {
      console.error("WS message error:", err);
    }
  });
});

// --- Broadcast function ---
function broadcastToChat(chatId, payload) {
  const sql = "SELECT UserID FROM uac WHERE ChatID = ?";
  db.query(sql, [chatId], (err, rows) => {
    if (err) return console.error("WS broadcast DB error:", err);

    rows.forEach(({ UserID }) => {
      const userSockets = clients.get(UserID);
      if (!userSockets) return;

      userSockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(payload));
          } catch (e) {
            console.error("WS send error:", e);
          }
        }
      });
    });
  });
}
// --- chat join code generator ---
function generateJoinCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
// Test route
app.get('/', (req, res) => {
    res.json('Server is running');
}); 
//users 
app.get('/users/all', (req, res) => {
    const sql = "SELECT * FROM users";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});

app.get('/users/search', (req, res) => {
    const query = (req.query.q || '').trim();
    if (query.length < 2) {
        return res.json([]);
    }
    const sql = `
        SELECT u.UserID, u.Username, p.URL AS AvatarUrl 
        FROM users u
        LEFT JOIN pictures p ON p.PicID = u.PfpID
        WHERE u.Username LIKE ? 
        LIMIT 10
    `;
    db.query(sql, [`%${query}%`], (err, results) => {
        if (err) {
            console.error('Error searching users:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
//login
function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    db.query("SELECT rankID FROM users WHERE UserID = ?", [req.userId], (err, rows) => {
      if (err) return res.status(500).json({ loggedIn: false });
      if (rows.length === 0 || rows[0].rankID === 0) {
        res.clearCookie("token");
        return res.status(403).json({ loggedIn: false, message: "Account is banned." });
      }
      next();
    });
  } catch (err) {
    return res.status(401).json({ loggedIn: false });
  }
}

  
app.get("/auth/status", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    db.query("SELECT rankID, Username, PfpID FROM users WHERE UserID = ?", [userId], (err, rows) => {
      if (err) return res.json({ loggedIn: true, userId, rankID: 1 });
      const rankID = rows.length ? rows[0].rankID : 1;
      const username = rows.length ? rows[0].Username : "";
      const pfpId = rows.length ? rows[0].PfpID : null;
      if (rankID === 0) {
        res.clearCookie("token");
        return res.json({ loggedIn: false });
      }
      if (!pfpId) {
        return res.json({ loggedIn: true, userId, rankID, username, avatarUrl: "" });
      }
      db.query("SELECT URL FROM pictures WHERE PicID = ?", [pfpId], (err2, picRows) => {
        const avatarUrl = picRows && picRows.length ? picRows[0].URL : "";
        res.json({ loggedIn: true, userId, rankID, username, avatarUrl });
      });
    });
  } catch {
    res.json({ loggedIn: false });
  }
});

  
app.post("/login", async (req, res) => {
  const { Email, Password } = req.body;

  // 1. Get user by email
  db.query("SELECT * FROM users WHERE Email = ?", [Email], async (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (results.length === 0) return res.status(401).json({ message: "Invalid email or password" });

      const user = results[0];

      try {
          // 2. Compare password with bcrypt
          const match = await bcrypt.compare(Password, user.Password);
          if (!match) return res.status(401).json({ message: "Invalid email or password" });

          if (user.rankID === 0) {
            return res.status(403).json({ message: "Account is banned." });
          }

          // 3. Password is correct → generate JWT
          const token = jwt.sign(
              { userId: user.UserID },
              process.env.JWT_SECRET,
              { expiresIn: "7d" }
          );

          // 4. Set cookie
          res.cookie("token", token, {
              httpOnly: true,
              sameSite: "lax",
              secure: false // set to true in production (HTTPS)
          });

          res.json({ loggedIn: true });
      } catch (error) {
          console.error("Error comparing passwords:", error);
          res.status(500).json({ message: "Internal server error" });
      }
  });
});
  
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ loggedIn: false });
});
// Admin check: rankID >= 2 means admin or owner (2=admin, 3=owner)
app.get("/checkAdmin", authMiddleware, (req, res) => {
  const sql = "SELECT rankID FROM users WHERE UserID = ?";
  db.query(sql, [req.userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.json(false);
    }
    const user = results[0];
    if (!user) return res.json(false);
    res.json(user.rankID >= 2);
  });
});
//users avatar skills profile
app.get("/users/me/profile", authMiddleware, (req, res) => {
  const userId = req.userId;

  const sqlUser = `
    SELECT u.Username, u.Email, p.URL AS avatarUrl
    FROM users u
    LEFT JOIN pictures p ON p.PicID = u.PfpID
    WHERE u.UserID = ?
  `;

  const sqlSkills = `
    SELECT s.Skill
    FROM skills s
    JOIN uas ON uas.SkillID = s.SkillID
    WHERE uas.UserID = ?
    ORDER BY s.Skill
  `;

  db.query(sqlUser, [userId], (err, userRows) => {
    if (err) {
      console.error("DB error (user):", err);
      return res.status(500).json({ error: "DB error (user)" });
    }
    if (userRows.length === 0) return res.status(404).json({ error: "Nincs ilyen felhasználó." });

    db.query(sqlSkills, [userId], (err, skillRows) => {
      if (err) {
        console.error("DB error (skills):", err);
        return res.status(500).json({ error: "DB error (skills)" });
      }

      res.json({
        name: userRows[0].Username,
        email: userRows[0].Email,
        avatarUrl: userRows[0].avatarUrl || "",
        skills: skillRows.map((r) => r.Skill),
      });
    });
  });
});


//users save

app.put("/users/me/profile", authMiddleware, (req, res) => {
  const userId = req.userId;
  const { avatarUrl, skills } = req.body;

  // DEBUG: mit kap a backend
  console.log("SAVE PROFILE userId:", userId);
  console.log("SAVE PROFILE avatarUrl:", avatarUrl);
  console.log("SAVE PROFILE skills:", skills);

  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: "skills must be an array" });
  }

  db.beginTransaction((err) => {
    if (err) {
      console.error("BEGIN TRANSACTION ERROR:", err);
      return res.status(500).json({ error: "Tranzakció indítási hiba.", details: err.message });
    }

    const saveSkillsPart = () => {
      const deleteSkillsSql = "DELETE FROM uas WHERE UserID = ?";
      db.query(deleteSkillsSql, [userId], (err) => {
        if (err) {
          console.error("Skillek törlési hiba:", err);
          return db.rollback(() =>
            res.status(500).json({ error: "Skillek törlési hiba.", details: err.message })
          );
        }

        if (skills.length === 0) {
          return db.commit((err) => {
            if (err) {
              console.error("Commit hiba:", err);
              return db.rollback(() =>
                res.status(500).json({ error: "Commit hiba.", details: err.message })
              );
            }
            return res.json({ message: "Profile saved" });
          });
        }

        const lookupSql = "SELECT SkillID, Skill FROM skills WHERE Skill IN (?)";
        db.query(lookupSql, [skills], (err, rows) => {
          if (err) {
            console.error("Skill lookup hiba:", err);
            return db.rollback(() =>
              res.status(500).json({ error: "Skill lookup hiba.", details: err.message })
            );
          }

          const skillIds = rows.map((r) => r.SkillID);

          if (skillIds.length !== skills.length) {
            return db.rollback(() =>
              res.status(400).json({ error: "Van olyan skill, ami nincs benne a skills táblában." })
            );
          }

          const insertValues = skillIds.map((id) => [userId, id]);
          const insertSql = "INSERT INTO uas (UserID, SkillID) VALUES ?";

          db.query(insertSql, [insertValues], (err) => {
            if (err) {
              console.error("Skill insert hiba:", err);
              return db.rollback(() =>
                res.status(500).json({ error: "Skill insert hiba.", details: err.message })
              );
            }

            db.commit((err) => {
              if (err) {
                console.error("Commit hiba:", err);
                return db.rollback(() =>
                  res.status(500).json({ error: "Commit hiba.", details: err.message })
                );
              }
              res.json({ message: "Profile saved" });
            });
          });
        });
      });
    };

    // ---- Avatar mentés: pictures + users.PfpID ----
    if (!avatarUrl) {
      return saveSkillsPart();
    }

    const findPicSql = "SELECT PicID FROM pictures WHERE URL = ? LIMIT 1";
    db.query(findPicSql, [avatarUrl], (err, rows) => {
      if (err) {
        console.error("Picture lookup hiba:", err);
        return db.rollback(() =>
          res.status(500).json({ error: "Picture lookup hiba.", details: err.message })
        );
      }

      const setUserPic = (picId) => {
        const updateUserSql = "UPDATE users SET PfpID = ? WHERE UserID = ?";
        db.query(updateUserSql, [picId, userId], (err) => {
          if (err) {
            console.error("PfpID mentési hiba:", err);
            return db.rollback(() =>
              res.status(500).json({ error: "Pfp mentési hiba.", details: err.message })
            );
          }

          // utána skillek
          saveSkillsPart();
        });
      };

      if (rows.length > 0) {
        return setUserPic(rows[0].PicID);
      }

      const insertPicSql = "INSERT INTO pictures (URL) VALUES (?)";
      db.query(insertPicSql, [avatarUrl], (err, result) => {
        if (err) {
          console.error("Picture insert hiba:", err);
          return db.rollback(() =>
            res.status(500).json({ error: "Picture insert hiba.", details: err.message })
          );
        }

        setUserPic(result.insertId);
      });
    });
  });
});



// user change password (encrypted with bcrypt, max once per 24 hours if LastPasswordChange column exists)

const PASSWORD_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// GET cooldown status (can the user change password now, and how many hours left if not)
app.get("/users/me/password-cooldown", authMiddleware, (req, res) => {
  const userId = req.userId;
  db.query("SELECT LastPasswordChange FROM users WHERE UserID = ?", [userId], (err, rows) => {
    if (err) {
      console.error("Password cooldown query error:", err);
      return res.status(500).json({ error: "Adatbázis hiba." });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Nincs ilyen felhasználó." });
    }
    const lastChange = rows[0].LastPasswordChange;
    if (!lastChange) {
      return res.json({ canChange: true });
    }
    const elapsed = Date.now() - new Date(lastChange).getTime();
    if (elapsed >= PASSWORD_CHANGE_COOLDOWN_MS) {
      return res.json({ canChange: true });
    }
    const hoursLeft = Math.ceil((PASSWORD_CHANGE_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
    return res.json({ canChange: false, hoursLeft });
  });
});

app.post("/users/me/change-password", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { current, next } = req.body;

  if (!current || !next) {
    return res.status(400).json({ error: "Hiányzó adatok.", message: "Current and new password are required." });
  }

  try {
    // 1. Get stored password hash only (works even without LastPasswordChange column)
    const rows = await new Promise((resolve, reject) => {
      db.query("SELECT Password FROM users WHERE UserID = ?", [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (rows.length === 0) {
      return res.status(404).json({ error: "Nincs ilyen felhasználó.", message: "User not found." });
    }

    const storedHash = rows[0].Password;

    const match = await bcrypt.compare(current, storedHash);
    if (!match) {
      return res.status(401).json({ error: "A jelenlegi jelszó nem helyes.", message: "Current password is incorrect." });
    }

    // 2. Optional: 24h cooldown (only if LastPasswordChange column exists)
    let lastChange = null;
    try {
      const cooldownRows = await new Promise((resolve, reject) => {
        db.query("SELECT LastPasswordChange FROM users WHERE UserID = ?", [userId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      if (cooldownRows.length > 0) lastChange = cooldownRows[0].LastPasswordChange;
    } catch (e) {
      // Column might not exist yet; ignore and allow password change
    }

    if (lastChange) {
      const elapsed = Date.now() - new Date(lastChange).getTime();
      if (elapsed < PASSWORD_CHANGE_COOLDOWN_MS) {
        const hoursLeft = Math.ceil((PASSWORD_CHANGE_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
        return res.status(429).json({
          error: "Csak 24 óránként változtathatod a jelszót.",
          message: `You can change your password again in ${hoursLeft} hour(s).`,
        });
      }
    }

    const hashed = await hashPassword(next);

    // 3. Update password; if LastPasswordChange column exists, set it too
    try {
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE users SET Password = ?, LastPasswordChange = NOW() WHERE UserID = ?",
          [hashed, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } catch (updateErr) {
      // If column doesn't exist (ER_BAD_FIELD_ERROR), update only Password
      if (updateErr.code === "ER_BAD_FIELD_ERROR" || (updateErr.message && updateErr.message.includes("LastPasswordChange"))) {
        await new Promise((resolve, reject) => {
          db.query("UPDATE users SET Password = ? WHERE UserID = ?", [hashed, userId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        throw updateErr;
      }
    }

    res.json({ message: "Password changed" });
  } catch (err) {
    console.error("Change password error:", err);
    const msg = err.message || "Failed to update password.";
    return res.status(500).json({
      error: "Jelszó frissítési hiba.",
      message: msg,
    });
  }
});


//get user by ID
app.get('/users/:id', (req, res) => {
    const sql = `
      SELECT u.UserID, u.Username, u.Email, p.URL AS avatarUrl, u.rankID
      FROM users u
      LEFT JOIN pictures p ON p.PicID = u.PfpID
      WHERE u.UserID = ?
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
app.post('/users/create', async (req, res) => {
    const sql = "INSERT INTO users (Username, Email, Password, rankID) VALUES (?, ?, ?, ?)";
    const hashed = await hashPassword(req.body.password)
    const values = [req.body.name, req.body.email, hashed, req.body.rank || 1];
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({ message: 'User created successfully', UserID: results.insertId });
    });
});
app.put('/users/change/:id', (req, res) => {
    const userId = req.params.id;
    const fields = req.body;
  
    // Build dynamic SQL query
    const updates = Object.keys(fields).map(field => `${field} = ?`).join(', ');
    const values = Object.values(fields);
    values.push(userId); // add userId to the end for WHERE clause
  
    const sql = `UPDATE users SET ${updates} WHERE UserID = ?`;
  
    db.query(sql, values, (err, results) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ message: 'User updated successfully' });
    });
  });
// Public profile (username, avatar, skills, reviews) – no auth
app.get("/users/:id/public-profile", (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!userId) return res.status(400).json({ error: "Invalid user ID" });

  const sqlUser = `
    SELECT u.UserID, u.Username, p.URL AS avatarUrl
    FROM users u
    LEFT JOIN pictures p ON p.PicID = u.PfpID
    WHERE u.UserID = ?
  `;
  const sqlSkills = `
    SELECT s.Skill FROM skills s
    JOIN uas ON uas.SkillID = s.SkillID
    WHERE uas.UserID = ?
    ORDER BY s.Skill
  `;
  const sqlReviews = `
    SELECT r.Rating, r.Content, r.Reviewer
    FROM reviews r
    WHERE r.Reviewee = ?
  `;

  db.query(sqlUser, [userId], (err, userRows) => {
    if (err) return res.status(500).json({ error: "Internal server error" });
    if (!userRows.length) return res.status(404).json({ error: "User not found" });

    const user = userRows[0];
    db.query(sqlSkills, [userId], (err, skillRows) => {
      if (err) return res.status(500).json({ error: "Internal server error" });
      db.query(sqlReviews, [userId], (err, reviewRows) => {
        if (err) return res.status(500).json({ error: "Internal server error" });
        const reviews = reviewRows || [];
        const avgRating = reviews.length
          ? reviews.reduce((s, r) => s + (r.Rating || 0), 0) / reviews.length
          : 0;
        res.json({
          userId: user.UserID,
          username: user.Username,
          avatarUrl: user.avatarUrl ? (user.avatarUrl.startsWith("/") ? user.avatarUrl : "/" + user.avatarUrl) : "/images/default.png",
          skills: (skillRows || []).map((r) => r.Skill),
          reviews,
          avgRating: Math.round(avgRating * 10) / 10,
        });
      });
    });
  });
});

// Ban user (admin only) - set rankID to 0
app.put('/users/:id/ban', authMiddleware, (req, res) => {
  const adminUserId = req.userId;
  const targetUserId = req.params.id;
  
  // Ellenőrizzük, hogy az admin valóban admin-e
  db.query("SELECT rankID FROM users WHERE UserID = ?", [adminUserId], (err, rows) => {
    if (err) {
      console.error('Error checking admin status:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!rows.length || rows[0].rankID < 2) {
      return res.status(403).json({ error: 'Only admins can ban users' });
    }
    
    // Ban a felhasználót (rankID = 0)
    db.query("UPDATE users SET rankID = 0 WHERE UserID = ?", [targetUserId], (err, result) => {
      if (err) {
        console.error('Error banning user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User banned successfully' });
    });
  });
});

// Unban user (admin or owner only) - set rankID to 1 (default user)
app.put('/users/:id/unban', authMiddleware, (req, res) => {
  const adminUserId = req.userId;
  const targetUserId = req.params.id;
  
  // Ellenőrizzük, hogy az admin/owner valóban admin vagy owner-e
  db.query("SELECT rankID FROM users WHERE UserID = ?", [adminUserId], (err, rows) => {
    if (err) {
      console.error('Error checking admin status:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    console.log("🔍 Unban check - User rankID:", rows[0]?.rankID);
    
    if (!rows.length || rows[0].rankID < 2) {
      return res.status(403).json({ error: 'Only admins can unban users' });
    }
    
    // Unban a felhasználót (rankID = 1, normál user)
    db.query("UPDATE users SET rankID = 1 WHERE UserID = ?", [targetUserId], (err, result) => {
      if (err) {
        console.error('Error unbanning user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log("✅ User unbanned successfully:", targetUserId);
      res.json({ message: 'User unbanned successfully' });
    });
  });
});

// Promote user to admin (owner only) - set rankID to 2
app.put('/users/:id/promote-admin', authMiddleware, (req, res) => {
  const ownerUserId = req.userId;
  const targetUserId = req.params.id;
  
  // Ellenőrizzük, hogy az owner valóban owner-e (rankID = 3)
  db.query("SELECT rankID FROM users WHERE UserID = ?", [ownerUserId], (err, rows) => {
    if (err) {
      console.error('Error checking owner status:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    console.log("🔍 Promote-admin check - User rankID:", rows[0]?.rankID);
    
    if (!rows.length || rows[0].rankID !== 3) {
      return res.status(403).json({ error: 'Only owners can promote users to admin' });
    }
    
    // Promoteolj az usert adminná (rankID = 2)
    db.query("UPDATE users SET rankID = 2 WHERE UserID = ?", [targetUserId], (err, result) => {
      if (err) {
        console.error('Error promoting user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log("✅ User promoted to admin successfully:", targetUserId);
      res.json({ message: 'User promoted to admin successfully' });
    });
  });
});

// Demote user from admin (owner only) - set rankID to 1
app.put('/users/:id/demote-admin', authMiddleware, (req, res) => {
  const ownerUserId = req.userId;
  const targetUserId = req.params.id;
  
  // Ellenőrizzük, hogy az owner valóban owner-e (rankID = 3)
  db.query("SELECT rankID FROM users WHERE UserID = ?", [ownerUserId], (err, rows) => {
    if (err) {
      console.error('Error checking owner status:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    console.log("🔍 Demote-admin check - User rankID:", rows[0]?.rankID);
    
    if (!rows.length || rows[0].rankID !== 3) {
      return res.status(403).json({ error: 'Only owners can demote admins' });
    }
    
    // Demote az admint normál user-é (rankID = 1)
    db.query("UPDATE users SET rankID = 1 WHERE UserID = ?", [targetUserId], (err, result) => {
      if (err) {
        console.error('Error demoting user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log("✅ User demoted successfully:", targetUserId);
      res.json({ message: 'User demoted successfully' });
    });
  });
});

//users end
//reviews
app.get('/reviews/:id', (req, res) => {
    const sql = "SELECT reviews.Reviewee, reviews.Reviewer, reviews.Rating, reviews.Tartalom FROM reviews INNER JOIN users on users.UserID = reviews.Reviewee where reviews.reviewee = ?;";
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching reviews:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
//write review (auth: Reviewer = current user)
app.post('/reviews/create', authMiddleware, (req, res) => {
    const reviewerId = req.userId;
    const revieweeId = parseInt(req.body.Reviewee || req.body.revieweeId, 10);
    const rating = parseInt(req.body.Rating || req.body.rating, 10);
    const content = (req.body.Tartalom || req.body.Content || req.body.content || "").trim().slice(0, 200);

    if (!revieweeId || revieweeId === reviewerId) {
        return res.status(400).json({ error: "Invalid user to review." });
    }
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be 1–5." });
    }

    const sql = "INSERT INTO reviews (Rating, Content, Reviewer, Reviewee) VALUES (?, ?, ?, ?)";
    db.query(sql, [rating, content || null, reviewerId, revieweeId], (err, results) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ error: "You have already reviewed this user. Edit your existing review." });
            }
            console.error("Error creating review:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.status(201).json({ message: "Review created successfully" });
    });
});
//edit review (auth: only your own review)
app.put('/reviews/edit', authMiddleware, (req, res) => {
    const reviewerId = req.userId;
    const revieweeId = parseInt(req.body.Reviewee || req.body.revieweeId, 10);
    const rating = parseInt(req.body.Rating || req.body.rating, 10);
    const content = (req.body.Content || req.body.Tartalom || req.body.content || "").trim().slice(0, 200);

    if (!revieweeId || revieweeId === reviewerId) {
        return res.status(400).json({ error: "Invalid user." });
    }
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be 1–5." });
    }

    const sql = "UPDATE reviews SET Rating = ?, Content = ? WHERE Reviewer = ? AND Reviewee = ?";
    db.query(sql, [rating, content || null, reviewerId, revieweeId], (err, results) => {
        if (err) {
            console.error("Error updating review:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "You have not reviewed this user yet." });
        }
        res.json({ message: "Review updated successfully" });
    });
});
//delete review
app.delete('/reviews/delete/', (req, res) => {
    const sql = "DELETE FROM reviews WHERE Reviewee = ? AND Reviewer = ?;";
    const values = [req.body.Reviewee, req.body.Reviewer];
    db.query(sql, values, (err, results) => {
        if(err){
            console.error('Error deleting review:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    res.json({ message: 'Review deleted successfully' });
});
//reviews end
//skills
app.get('/skills/:id', (req, res) => {
    const sql = "SELECT skills.SkillID, skills.Skill FROM skills JOIN uas ON uas.SkillID = skills.SkillID JOIN users ON users.UserID = uas.UserID WHERE users.UserID = ?;";
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching skills:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
app.get('/skills', (req, res) => {
    const sql = "SELECT * FROM skills";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching skills:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
//add skill to user
app.post('/users/addSkill', (req, res) => {
    const sql = "INSERT INTO uas (UserID, SkillID) VALUES (?, ?)";
    const values = [req.body.UserID, req.body.SkillID];
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error adding skill to user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({ message: 'Skill added to user successfully' });
    });
});
//skills end
//tickets
app.get('/tickets', (req, res) => {
    const sql = "SELECT * FROM Tickets";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching tickets:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
//tickets create
app.post('/tickets/create', (req, res) => {
    const sql = "INSERT INTO Tickets (Email, Text) VALUES (?, ?)";
    const values = [req.body.Email, req.body.Text];
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error creating ticket:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({ message: 'Ticket created successfully', TicketID: results.insertId });
    });
});
//tickets Resolve
app.put('/tickets/resolve/:id', (req, res) => {
    const sql = "UPDATE tickets SET IsResolved = 1 WHERE TicketID = ?";
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error resolving ticket:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'Ticket resolved successfully' });
    });
});

//rank update
app.put('/users/updateRank/:id', (req, res) => {
    const sql = "UPDATE users SET rankID = ? WHERE UserID = ?";
    const values = [req.body.userRank, req.params.id];
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'User updated successfully' });
    });
});
//tokens update
app.put('/users/updateTokens/:id', (req, res) => {
    const sql = "UPDATE users SET Tokens = Tokens + ? WHERE UserID = ?";
    const values = [req.body.Tokens, req.params.id];
    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'User updated successfully' });
    });
});
//new chat
app.post('/chats/create', async (req, res) => {
  const sql = "INSERT INTO chats (ChatName, ChatPic, PublicID) VALUES (?, ?, ?)";
  const valuesBase = [req.body.ChatName, req.body.ChatPic];

  let inserted = false;
  let attempt = 0;
  const maxAttempts = 10; // just in case to avoid infinite loop

  while (!inserted && attempt < maxAttempts) {
    const joinCode = generateJoinCode();
    const values = [...valuesBase, joinCode];

    try {
      const [results] = await db.promise().query(sql, values); 
      inserted = true;

      res.status(201).json({
        message: 'Chat created successfully',
        ChatID: results.insertId,
        PublicID: joinCode
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Collision on JoinCode → retry
        attempt++;
      } else {
        console.error('Error creating chat:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  if (!inserted) {
    res.status(500).json({ error: 'Could not generate unique join code, please try again.' });
  }
});
//get all chats
app.get('/chats/all', (req, res) => {
    const sql = "SELECT * FROM chats";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching chats:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }   
        res.json(results);
    });
});
//get chats userenkent (PublicID, MemberCount, group pic URL, private chat other user avatar)
app.get('/chats/users/:userId', (req, res) => {
    const myId = parseInt(req.params.userId, 10);
    const sql = `
      SELECT c.ChatID, c.ChatName, c.ChatPic, c.PublicID,
             (SELECT COUNT(*) FROM uac WHERE uac.ChatID = c.ChatID) AS MemberCount,
             (SELECT u.Username FROM uac uac2
              JOIN users u ON u.UserID = uac2.UserID
              WHERE uac2.ChatID = c.ChatID AND uac2.UserID != ?
              ORDER BY uac2.UserID LIMIT 1) AS OtherUserName,
             (SELECT p2.URL FROM uac uac2
              JOIN users u2 ON u2.UserID = uac2.UserID
              LEFT JOIN pictures p2 ON p2.PicID = u2.PfpID
              WHERE uac2.ChatID = c.ChatID AND uac2.UserID != ?
              LIMIT 1) AS OtherUserAvatarUrl,
             p.URL AS ChatPicUrl,
             0 AS UnreadCount
      FROM chats c
      JOIN uac ON uac.ChatID = c.ChatID
      LEFT JOIN pictures p ON p.PicID = c.ChatPic
      WHERE uac.UserID = ?
    `;
    db.query(sql, [myId, myId, myId], (err, results) => {
        if (err) {
            console.error('Error fetching chats:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        const rows = results.map((r) => {
            const isPrivateChat = r.MemberCount === 2 && r.ChatName === 'Private';
            return {
                ...r,
                IsPrivateChat: !!isPrivateChat,
                ChatName: isPrivateChat && r.OtherUserName ? r.OtherUserName : r.ChatName
            };
        });
        res.json(rows);
    });
});

// mark chat as read (placeholder - needs LastReadAt column in uac table)
app.post('/chats/:chatId/markRead', authMiddleware, (req, res) => {
    res.json({ message: 'Chat marked as read' });
});

// get chat by public join code (for GroupFinder)
app.get('/chats/byCode/:publicId', (req, res) => {
    const publicId = (req.params.publicId || '').trim().toUpperCase();
    if (!publicId) return res.status(400).json({ error: 'Code is required' });
    const sql = "SELECT ChatID, ChatName, ChatPic, PublicID FROM chats WHERE PublicID = ?";
    db.query(sql, [publicId], (err, results) => {
        if (err) {
            console.error('Error fetching chat by code:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0) return res.status(404).json({ error: 'No group found with this code' });
        res.json(results[0]);
    });
});

// join chat by public code (auth required)
app.post('/chats/joinByCode', authMiddleware, (req, res) => {
    const userId = req.userId;
    const publicId = (req.body.publicId || req.body.code || '').trim().toUpperCase();
    if (!publicId) return res.status(400).json({ error: 'Code is required' });

    const findSql = "SELECT ChatID FROM chats WHERE PublicID = ?";
    db.query(findSql, [publicId], (err, rows) => {
        if (err) {
            console.error('Error finding chat by code:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (rows.length === 0) return res.status(404).json({ error: 'No group found with this code' });

        const chatId = rows[0].ChatID;
        const insertSql = "INSERT INTO uac (UserID, ChatID) VALUES (?, ?)";
        db.query(insertSql, [userId, chatId], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'You are already in this group' });
                console.error('Error joining chat:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'Joined successfully', ChatID: chatId });
        });
    });
});

//chat by ID
app.get('/chats/:chatId', (req, res) => {
    const sql = "SELECT * FROM chats WHERE ChatID = ?";
    db.query(sql, [req.params.chatId], (err, results) => {
        if (err) {
            console.error('Error fetching chat by ID:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });  
});

//get x random chats
app.get('/chats/random/:nr', (req, res) => {
    const nr = parseInt(req.params.nr, 10);
    const sql = "SELECT * FROM chats WHERE ChatID >= (SELECT FLOOR(RAND() * (SELECT MAX(ChatID) FROM chats))) ORDER BY RAND() LIMIT ?;";
    db.query(sql,[nr], (err, results) => {
        if (err) {
            console.error('Error fetching random chats:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});
//join chat
app.post('/chats/join', authMiddleware, (req, res) => {
    const userId = req.userId;
    const chatId = req.body.ChatID;
    
    if (!chatId) {
        return res.status(400).json({ error: 'ChatID is required' });
    }
    
    const checkSql = "SELECT * FROM uac WHERE UserID = ? AND ChatID = ?";
    db.query(checkSql, [userId, chatId], (err, existing) => {
        if (err) {
            console.error('Error checking membership:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Already a member of this chat' });
        }
        
        const sql = "INSERT INTO uac (UserID, ChatID) VALUES (?, ?)";
        db.query(sql, [userId, chatId], (err, results) => {
            if (err) {
                console.error('Error joining chat:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }   
            res.status(201).json({ message: 'Joined chat successfully' });
        });
    });
});
//leave chat
app.delete("/chats/leave/:chatId", authMiddleware, (req, res) => {
  const userId = req.userId;           
  const chatId = req.params.chatId;    

  const sql = "DELETE FROM uac WHERE UserID = ? AND ChatID = ?";

  db.query(sql, [userId, chatId], (err, result) => {
    if (err) {
      console.error("Error leaving chat:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not in chat" });
    }

    res.json({ message: "Left chat successfully" });
  });
});
//make chat admin
app.put('/chats/makeAdmin', authMiddleware, (req, res) => {
    const requesterId = req.userId;
    const { UserID, ChatID } = req.body;
    
    const checkAdminSql = "SELECT IsChatAdmin FROM uac WHERE UserID = ? AND ChatID = ?";
    db.query(checkAdminSql, [requesterId, ChatID], (err, adminCheck) => {
        if (err) {
            console.error('Error checking admin status:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (adminCheck.length === 0 || !adminCheck[0].IsChatAdmin) {
            return res.status(403).json({ error: 'Only admins can promote users' });
        }
        
        const sql = "UPDATE uac SET IsChatAdmin = 1 WHERE UserID = ? AND ChatID = ?";
        db.query(sql, [UserID, ChatID], (err, results) => {
            if (err) {
                console.error('Error making chat admin:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }   
            res.status(201).json({ message: 'User made chat admin successfully' });
        });
    });
});

// kick user from chat (admin only)
app.delete('/chats/:chatId/kick/:userId', authMiddleware, (req, res) => {
    const requesterId = req.userId;
    const chatId = req.params.chatId;
    const targetUserId = req.params.userId;
    
    const checkAdminSql = "SELECT IsChatAdmin FROM uac WHERE UserID = ? AND ChatID = ?";
    db.query(checkAdminSql, [requesterId, chatId], (err, adminCheck) => {
        if (err) {
            console.error('Error checking admin status:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (adminCheck.length === 0 || !adminCheck[0].IsChatAdmin) {
            return res.status(403).json({ error: 'Only admins can kick users' });
        }
        
        if (Number(targetUserId) === Number(requesterId)) {
            return res.status(400).json({ error: 'Cannot kick yourself' });
        }
        
        const deleteSql = "DELETE FROM uac WHERE UserID = ? AND ChatID = ?";
        db.query(deleteSql, [targetUserId, chatId], (err, result) => {
            if (err) {
                console.error('Error kicking user:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not in chat' });
            }
            res.json({ message: 'User kicked successfully' });
        });
    });
});

// remove admin from user in chat (admin only; cannot remove yourself if you are the only admin)
app.put('/chats/:chatId/removeAdmin/:userId', authMiddleware, (req, res) => {
    const requesterId = req.userId;
    const chatId = req.params.chatId;
    const targetUserId = req.params.userId;

    const checkAdminSql = "SELECT IsChatAdmin FROM uac WHERE UserID = ? AND ChatID = ?";
    db.query(checkAdminSql, [requesterId, chatId], (err, adminCheck) => {
        if (err) {
            console.error('Error checking admin status:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (adminCheck.length === 0 || !adminCheck[0].IsChatAdmin) {
            return res.status(403).json({ error: 'Only admins can remove admin rights' });
        }
        if (Number(targetUserId) === Number(requesterId)) {
            return res.status(400).json({ error: 'Cannot remove your own admin rights' });
        }

        const updateSql = "UPDATE uac SET IsChatAdmin = 0 WHERE UserID = ? AND ChatID = ?";
        db.query(updateSql, [targetUserId, chatId], (err, result) => {
            if (err) {
                console.error('Error removing admin:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not in chat' });
            }
            res.json({ message: 'Admin rights removed' });
        });
    });
});

//users by chat (avatar URL for profile module)
app.get('/chats/chatUsers/:chatId', (req, res) => {
  const sql = `
    SELECT u.UserID, u.Username, uac.IsChatAdmin, p.URL AS Avatar
    FROM uac
    JOIN users u ON u.UserID = uac.UserID
    LEFT JOIN pictures p ON p.PicID = u.PfpID
    WHERE uac.ChatID = ?
  `;

  db.query(sql, [req.params.chatId], (err, results) => {
    if (err) {
      console.error('Error fetching users by chat:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json(results);
  });
});

// member skills in a chat (for Skills sidebar - needed + members' skills)
app.get('/chats/:chatId/skillsWithMembers', (req, res) => {
  const chatId = req.params.chatId;
  const neededSql = `
    SELECT s.SkillID, s.Skill, 'needed' AS source
    FROM neededskills ns
    JOIN skills s ON s.SkillID = ns.SkillID
    WHERE ns.ChatID = ?
  `;
  const memberSql = `
    SELECT u.UserID, u.Username, s.SkillID, s.Skill
    FROM uac
    JOIN users u ON u.UserID = uac.UserID
    LEFT JOIN uas ON uas.UserID = u.UserID
    LEFT JOIN skills s ON s.SkillID = uas.SkillID
    WHERE uac.ChatID = ? AND s.SkillID IS NOT NULL
  `;
  db.query(neededSql, [chatId], (err, needed) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    db.query(memberSql, [chatId], (err2, members) => {
      if (err2) return res.status(500).json({ error: 'Internal server error' });
      const memberSkillsMap = {};
      members.forEach((row) => {
        if (!memberSkillsMap[row.UserID]) memberSkillsMap[row.UserID] = { Username: row.Username, Skills: [] };
        if (row.Skill && !memberSkillsMap[row.UserID].Skills.includes(row.Skill))
          memberSkillsMap[row.UserID].Skills.push(row.Skill);
      });
      res.json({
        needed: needed.map((r) => ({ SkillID: r.SkillID, Skill: r.Skill })),
        memberSkills: Object.entries(memberSkillsMap).map(([uid, v]) => ({ UserID: +uid, Username: v.Username, Skills: v.Skills })),
      });
    });
  });
});

// find or create private chat (1-1) between current user and otherUserId
app.post('/chats/private', authMiddleware, (req, res) => { 
  const myId = req.userId;
  const otherId = parseInt(req.body.otherUserId || req.body.otherUserID, 10);
  if (!otherId || otherId === myId) return res.status(400).json({ error: 'Invalid other user' });

  const getOtherUsername = (cb) => {
    db.query('SELECT Username FROM users WHERE UserID = ?', [otherId], (e, u) => {
      if (e || !u.length) return cb(null);
      return cb(u[0].Username);
    });
  };

  const findExisting = `
    SELECT c.ChatID FROM chats c
    INNER JOIN uac u1 ON u1.ChatID = c.ChatID AND u1.UserID = ?
    INNER JOIN uac u2 ON u2.ChatID = c.ChatID AND u2.UserID = ?
    WHERE (SELECT COUNT(*) FROM uac WHERE ChatID = c.ChatID) = 2
    LIMIT 1
  `;
  db.query(findExisting, [myId, otherId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (rows.length > 0) {
      getOtherUsername((otherUsername) =>
        res.json({ ChatID: rows[0].ChatID, created: false, otherUsername: otherUsername || 'Private' })
      );   
      return;
    }

    const genCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };

    const tryInsertChat = (retriesLeft) => {
      const publicId = genCode();
      // chats table: PublicID, ChatName, ChatPic (PublicID first in schema)
      db.query('INSERT INTO chats (PublicID, ChatName, ChatPic, IsPrivate) VALUES (?, ?, NULL, 1)', [publicId, 'Private'], (err2, ins) => {
        if (err2) {
          const isDup = err2.code === 'ER_DUP_ENTRY';
          if (isDup && retriesLeft > 0) return tryInsertChat(retriesLeft - 1);
          console.error('Private chat INSERT error:', err2.code, err2.message);
          return res.status(500).json({ error: isDup ? 'Could not create chat (try again)' : 'Could not create chat' });
        }
        const chatId = ins.insertId;
        db.query('INSERT INTO uac (UserID, ChatID) VALUES (?, ?), (?, ?)', [myId, chatId, otherId, chatId], (err3) => {
          if (err3) {
            console.error('Private chat uac INSERT error:', err3.code, err3.message);
            return res.status(500).json({ error: 'Could not add members' });
          }
          getOtherUsername((otherUsername) =>
            res.status(201).json({ ChatID: chatId, created: true, otherUsername: otherUsername || 'Private' })
          );
        });
      });
    };
    tryInsertChat(5);
  });
});
//edit chat info (csak admin)
app.put('/chats/edit/:id', authMiddleware, (req, res) => {
    const userId = req.userId;
    const chatId = req.params.id;
    const fields = { ...req.body };

    const checkAdminSql = "SELECT IsChatAdmin FROM uac WHERE UserID = ? AND ChatID = ?";
    db.query(checkAdminSql, [userId, chatId], (err, rows) => {
      if (err) {
        console.error('Error checking admin:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!rows.length || !rows[0].IsChatAdmin) {
        return res.status(403).json({ error: 'Only group admins can edit the group' });
      }

      const updates = {};
      if (fields.ChatName !== undefined && String(fields.ChatName).trim()) {
        updates.ChatName = String(fields.ChatName).trim();
      }

      if (fields.ChatPic !== undefined) {
        const picVal = fields.ChatPic;
        if (typeof picVal === 'number' || /^\d+$/.test(String(picVal))) {
          updates.ChatPic = parseInt(picVal, 10);
        } else if (typeof picVal === 'string' && picVal.trim()) {
          const url = picVal.trim();
          db.query("INSERT INTO pictures (URL) VALUES (?)", [url], (errPic, ins) => {
            if (errPic) {
              console.error('Error inserting picture:', errPic);
              return res.status(500).json({ error: 'Internal server error' });
            }
            const picId = ins.insertId;
            const setName = updates.ChatName != null ? "ChatName = ?, " : "";
            const setVals = updates.ChatName != null ? [updates.ChatName, picId, chatId] : [picId, chatId];
            db.query(`UPDATE chats SET ${setName}ChatPic = ? WHERE ChatID = ?`, setVals, (errUp, result) => {
                if (errUp) {
                  console.error('Error updating chat:', errUp);
                  return res.status(500).json({ error: 'Internal server error' });
                }
                return res.json({ message: 'Chat updated successfully' });
              });
          });
          return;
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.json({ message: 'Nothing to update' });
      }
      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(updates), chatId];
      db.query(`UPDATE chats SET ${setClause} WHERE ChatID = ?`, values, (err, result) => {
        if (err) {
          console.error('Error updating chat:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'Chat updated successfully' });
      });
    });
  });
//delete chat
app.delete('/chats/delete/:id', (req, res) => {
    const sql = "DELETE FROM chats WHERE ChatID = ?";
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error deleting chat:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'Chat deleted successfully' });
    });
});
// write message
app.post('/messages/create', (req, res) => {
  const { ChatID, UserID, Content } = req.body;

  db.query("SELECT Username FROM users WHERE UserID = ?", [UserID], (err, userRows) => {
    if (err) {
      console.error('Error fetching username:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    const username = userRows.length > 0 ? userRows[0].Username : `User ${UserID}`;

    const sql = "INSERT INTO msgs (ChatID, UserID, Content) VALUES (?, ?, ?)";
    db.query(sql, [ChatID, UserID, Content], (err, results) => {
      if (err) {
        console.error('Error creating message:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const msgId = results.insertId;
      const message = {
        type: "NEW_MESSAGE",
        msg: {
          MsgID: msgId,
          ChatID,
          UserID,
          Username: username,
          Content,
          SentAt: new Date().toISOString()
        }
      };

      broadcastToChat(ChatID, message);

      res.status(201).json({ message: 'Message created successfully', MsgID: msgId });
    });
  });
});

//message edit
app.put('/messages/edit/:id', (req, res) => {
    const msgId = req.params.id;
    const newContent = req.body.Content;
    const sql = "UPDATE msgs SET Content = ? WHERE MsgID = ?";
    db.query(sql, [newContent, msgId], (err, results) => {
        if (err) {
            console.error('Error updating message:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        // Broadcast EDIT_MESSAGE a chat tagjainak
        db.query("SELECT ChatID FROM msgs WHERE MsgID = ?", [msgId], (err2, rows) => {
            if (!err2 && rows.length > 0) {
                broadcastToChat(rows[0].ChatID, {
                    type: "EDIT_MESSAGE",
                    msg: { MsgID: Number(msgId), Content: newContent, ChatID: rows[0].ChatID }
                });
            }
        });
        res.json({ message: 'Message updated successfully' });
    });
});
//message delete (admin can delete any message, user can only delete their own)
app.delete('/messages/delete/:id', authMiddleware, (req, res) => {
    const msgId = req.params.id;
    const userId = req.userId;
    
    // Előbb lekérjük az üzenetet és a chat-et
    db.query("SELECT ChatID, UserID FROM msgs WHERE MsgID = ?", [msgId], (err, rows) => {
        if (err) {
            console.error('Error fetching message:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        const chatId = rows[0].ChatID;
        const msgUserId = rows[0].UserID;
        
        // Ellenőrizzük, hogy az aktuális user admin-e ebben a chatben
        const checkAdminSql = "SELECT IsChatAdmin FROM uac WHERE UserID = ? AND ChatID = ?";
        db.query(checkAdminSql, [userId, chatId], (err, adminRows) => {
            if (err) {
                console.error('Error checking admin status:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            const isAdmin = adminRows.length > 0 && adminRows[0].IsChatAdmin === 1;
            const isOwnMessage = userId === msgUserId;
            
            // Admin vagy a saját üzenet szerzője törölhet
            if (!isAdmin && !isOwnMessage) {
                return res.status(403).json({ error: 'You can only delete your own messages' });
            }
            
            // Üzenet törlése
            const sql = "DELETE FROM msgs WHERE MsgID = ?";
            db.query(sql, [msgId], (err2, results) => {
                if (err2) {
                    console.error('Error deleting message:', err2);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                
                // Broadcast DELETE_MESSAGE a chat tagjainak
                broadcastToChat(chatId, {
                    type: "DELETE_MESSAGE",
                    msg: { MsgID: Number(msgId), ChatID: chatId }
                });
                
                res.json({ message: 'Message deleted successfully' });
            });
        });
    });
});
//get messages by chat
app.get('/messages/:chatId', (req, res) => {
    const sql = `
      SELECT msgs.MsgID, msgs.Content, msgs.SentAt, msgs.UserID, users.Username
      FROM msgs
      JOIN users ON msgs.UserID = users.UserID
      WHERE msgs.ChatID = ?
      ORDER BY msgs.SentAt ASC
    `;
    db.query(sql, [req.params.chatId], (err, results) => {
      if (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    });
  });
// Start server


// Eszti szuro

app.get('/cards', (req, res) => {
    const sql = `
        SELECT 
            s.SkillID,
            s.Skill,
            COUNT(uas.UserID) AS UserCount
        FROM skills s
        LEFT JOIN uas ON uas.SkillID = s.SkillID
        GROUP BY s.SkillID, s.Skill
        ORDER BY s.Skill;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching cards:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        
        const cards = results.map(row => ({
            id: row.SkillID,
            title: row.Skill,          
            items: [row.Skill],        
            users: row.UserCount || 0 
        }));

        res.json(cards);
    });
});

app.post("/groups", (req, res) => {
  const body = req.body || {};
  const chatName = body.chatName ?? body.name ?? body.ChatName;
  const chatPic = body.chatPic ?? body.ChatPic;
  let skillIds = body.skillIds ?? body.skills ?? body.skillIDs;
  let userId = body.userId ?? body.id ?? body.userID;

  if (!chatName || !Array.isArray(skillIds) || skillIds.length === 0) {
    return res.status(400).json({ error: "Hiányzó adatok (chatName, skillIds)." });
  }
  if (!userId || userId === 0) {
    return res.status(400).json({ error: "Bejelentkezés szükséges a csoport létrehozásához." });
  }

  if (!chatName || (typeof chatName === "string" && !chatName.trim())) {
    return res.status(400).json({ error: "Hiányzó adatok.", message: "Add meg a csoport nevét (chatName)." });
  }
  if (userId == null || userId === "" || Number(userId) < 1) {
    return res.status(401).json({ error: "Be kell jelentkezned.", message: "You must be logged in to create a group." });
  }
  if (!Array.isArray(skillIds) || skillIds.length === 0) {
    return res.status(400).json({ error: "Hiányzó adatok.", message: "Válassz legalább egy skillt (skillIds)." });
  }

  const uid = Number(userId);
  if (isNaN(uid) || uid < 1) {
    return res.status(401).json({ error: "Be kell jelentkezned.", message: "You must be logged in to create a group." });
  }
  userId = uid;

  db.beginTransaction((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Tranzakció indítási hiba." });
    }

    // chatPic a frontendről URL string (pl. /groupavatars/Ant.png); a chats.ChatPic pedig pictures.PicID (int)
    // chats.PublicID NOT NULL, egyedi 6 karakteres kód
    const doInsertChat = (picId, retriesLeft = 3) => {
      const publicId = generateJoinCode(6);
      const insertChatSql = "INSERT INTO chats (ChatName, ChatPic, PublicID) VALUES (?, ?, ?)";
      db.query(insertChatSql, [chatName, picId, publicId], (err, chatResult) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY" && retriesLeft > 0) {
            return doInsertChat(picId, retriesLeft - 1);
          }
          console.error("Chat insert hiba:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "Hiba a csoport létrehozásakor." });
          });
        }

        const newChatId = chatResult.insertId;

        // 2. neededskills insert (több sor egyszerre)
        const neededValues = skillIds.map((skillId) => [newChatId, skillId]);
        const insertNeededSql = "INSERT INTO neededskills (ChatID, SkillID) VALUES ?";

        db.query(insertNeededSql, [neededValues], (err) => {
          if (err) {
            console.error("neededskills insert hiba:", err);
            return db.rollback(() => {
              res.status(500).json({ error: "Hiba a skillek mentésekor." });
            });
          }

          // 3. uac – a létrehozó legyen admin
          const insertUacSql = `
            INSERT INTO uac (UserID, ChatID, IsChatAdmin)
            VALUES (?, ?, 1)
          `;

          db.query(insertUacSql, [userId, newChatId], (err) => {
            if (err) {
              console.error("uac insert hiba:", err);
              return db.rollback(() => {
                res.status(500).json({ error: "Hiba a tag mentésekor." });
              });
            }

            db.commit((err) => {
              if (err) {
                console.error("Commit hiba:", err);
                return db.rollback(() => {
                  res.status(500).json({ error: "Commit hiba." });
                });
              }

              res.status(201).json({
                message: "Csoport sikeresen létrehozva!",
                chatId: newChatId,
              });
            });
          });
        });
      });
    };

    if (chatPic && typeof chatPic === "string" && chatPic.trim() !== "") {
      // Először beszúrjuk a képet a pictures táblába, a kapott PicID-t használjuk
      db.query("INSERT INTO pictures (URL) VALUES (?)", [chatPic.trim()], (err, picResult) => {
        if (err) {
          console.error("Picture insert hiba:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "Hiba a csoport kép mentésekor." });
          });
        }
        doInsertChat(picResult.insertId);
      });
    } else {
      doInsertChat(null);
    }
  });
});

// Összes csoport lekérése a főoldalhoz
app.get("/groups", (req, res) => {
  // Backward compatible behavior:
  // - If no pagination params are provided, return the full array (old behavior).
  // - If `limit` (or `offset`) is provided, return a paged response:
  //   { items: [...], nextOffset: number, hasMore: boolean }

  const rawLimit = req.query.limit;
  const rawOffset = req.query.offset;
  const wantsPaging = rawLimit !== undefined || rawOffset !== undefined;

  const limit = Math.min(Math.max(parseInt(rawLimit ?? "0", 10) || 0, 0), 50);
  const offset = Math.max(parseInt(rawOffset ?? "0", 10) || 0, 0);

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const skillsParam = typeof req.query.skills === "string" ? req.query.skills.trim() : "";
  const skills = skillsParam
    ? skillsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const excludeUserId = parseInt(req.query.excludeUserId || req.query.userId || "0", 10);

  // Base select (ChatPic = PicID; a megjelenítéshez p.URL-t adjuk vissza ChatPicként)
  let sql = `
    SELECT 
      c.ChatID,
      c.ChatName,
      p.URL AS ChatPic,
      c.CreatedAt,
      GROUP_CONCAT(DISTINCT s.Skill ORDER BY s.Skill SEPARATOR ', ') AS Skills,
      COUNT(DISTINCT u.UserID) AS MemberCount
    FROM chats c
    LEFT JOIN pictures p ON p.PicID = c.ChatPic
    LEFT JOIN neededskills ns ON ns.ChatID = c.ChatID
    LEFT JOIN skills s ON ns.SkillID = s.SkillID
    LEFT JOIN uac u ON u.ChatID = c.ChatID
  `;

  const where = [];
  const params = [];

  if (search) {
    where.push("c.ChatName LIKE ?");
    params.push(`%${search}%`);
  }

  if (excludeUserId > 0) {
    where.push("c.ChatID NOT IN (SELECT ChatID FROM uac WHERE UserID = ?)");
    params.push(excludeUserId);
  }

  // Match ANY selected skill (same behavior as frontend chip filtering)
  if (skills.length > 0) {
    const skillPlaceholders = skills.map(() => "?").join(", ");
    where.push(`
      EXISTS (
        SELECT 1
        FROM neededskills ns2
        JOIN skills s2 ON s2.SkillID = ns2.SkillID
        WHERE ns2.ChatID = c.ChatID
          AND s2.Skill IN (${skillPlaceholders})
      )
    `);
    params.push(...skills);
  }

  if (where.length > 0) {
    sql += ` WHERE ${where.join(" AND ")} `;
  }

  sql += `
    GROUP BY c.ChatID, c.ChatName, c.ChatPic, c.CreatedAt, p.URL
    HAVING COUNT(DISTINCT ns.SkillID) > 0
    ORDER BY c.CreatedAt DESC
  `;

  // Old behavior: no paging requested -> return everything (but still allow filters if provided).
  if (!wantsPaging || limit === 0) {
    db.query(sql + ";", params, (err, rows) => {
      if (err) {
        console.error("Groups list hiba:", err);
        return res.status(500).json({ error: "Adatbázis hiba (groups list)." });
      }
      res.json(rows);
    });
    return;
  }

  // Paged behavior
  const pagedSql = sql + " LIMIT ? OFFSET ?;";
  const pagedParams = [...params, limit, offset];

  db.query(pagedSql, pagedParams, (err, rows) => {
    if (err) {
      console.error("Groups list hiba:", err);
      return res.status(500).json({ error: "Adatbázis hiba (groups list)." });
    }

    const nextOffset = offset + rows.length;
    const hasMore = rows.length === limit;

    res.json({ items: rows, nextOffset, hasMore });
  });
});


// PUT /users/:id/avatar – profilkép mentése
app.put('/users/:id/avatar', (req, res) => {
  const userId = req.params.id;
  const { avatar } = req.body; // pl. "/avatars/cat.png"

  if (!avatar) {
    return res.status(400).json({ error: "Hiányzik az avatar." });
  }

  const sql = "UPDATE users SET Avatar = ? WHERE UserID = ?";

  db.query(sql, [avatar, userId], (err, result) => {
    if (err) {
      console.error("Hiba az avatar frissítésekor:", err);
      return res.status(500).json({ error: "Adatbázis hiba." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Nincs ilyen felhasználó." });
    }

    return res.json({ message: "Avatar frissítve.", avatar });
  });
});

server.listen(3001, () => {
    console.log(`Server is running on port 3001`);
});

module.exports = app;
