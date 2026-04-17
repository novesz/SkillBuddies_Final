import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/ChatPage.css";
import Header from "../components/header/Header";
import axios from "axios";

const GROUP_AVATARS = [
  "/groupavatars/Ant.png",
  "/groupavatars/Szarvi.png",
  "/groupavatars/Bodi.png",
];

export default function ChatPage({ isLoggedIn, setIsLoggedIn, userId: propUserId = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(propUserId && Number(propUserId) ? Number(propUserId) : null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const [messageInput, setMessageInput] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [chatUsers, setChatUsers] = useState([]);
  const [chatSkills, setChatSkills] = useState([]);
  const [inviteCodeOpen, setInviteCodeOpen] = useState(false);
  const [chatFilter, setChatFilter] = useState("all"); // "all" | "private" | "group"
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [skillsWithMembers, setSkillsWithMembers] = useState({ needed: [], memberSkills: [] });
  const [privateChatLoading, setPrivateChatLoading] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupPic, setEditGroupPic] = useState("");
  const [editAvatarIndex, setEditAvatarIndex] = useState(null);
  const [pendingKick, setPendingKick] = useState(null); // { userId, username } | null
  const [listDrawerOpen, setListDrawerOpen] = useState(false); // mobile: chat list drawer
  
  const isCurrentUserAdmin = chatUsers.find((u) => Number(u.UserID) === Number(currentUserId))?.IsChatAdmin === 1;

  const ws = useRef(null);
  const chatEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastSendAt = useRef(0);
  const [inputVisible, setInputVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const chatUsersRef = useRef([]);
  const selectedChatRef = useRef(null); // ← mindig a legfrissebb selectedChat értéke
  // incomingChatId ref-ben tárolva, hogy a fetchChats closure mindig a legfrissebb értéket lássa
  const incomingChatIdRef = useRef(location.state?.openChatId ?? null);

  // selectedChatRef mindig naprakész
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // --- Logged-in user: use userId from App when available, else fetch auth status ---
  useEffect(() => {
    const uid = propUserId && Number(propUserId);
    if (uid) setCurrentUserId(uid);
    axios
      .get("http://localhost:3001/auth/status", { withCredentials: true })
      .then((res) => {
        if (res.data.loggedIn) {
          setCurrentUserId(res.data.userId ?? uid ?? null);
          setCurrentUsername(res.data.username || "You");
        }
      })
      .catch(console.error);
  }, [propUserId]);

  // Ha location.state változik (pl. új navigate("/chat", {state:{openChatId:X}})), frissítjük a ref-et
  useEffect(() => {
    if (location.state?.openChatId) {
      incomingChatIdRef.current = location.state.openChatId;
    }
  }, [location.state]);

  // --- Saját chatek (refetch pl. Join után) ---
  const fetchChats = (overrideSelectId) => {
    if (!currentUserId) return;
    axios
      .get(`http://localhost:3001/chats/users/${currentUserId}`)
      .then((res) => {
        setChats(res.data);
        // Melyik chatID-t kell megnyitni?
        const targetId = overrideSelectId ?? incomingChatIdRef.current ?? null;
        if (targetId && res.data.some((c) => c.ChatID === targetId)) {
          setSelectedChat(targetId);
          incomingChatIdRef.current = null; // egyszer használjuk csak
        } else if (!selectedChatRef.current && res.data.length > 0) {
          setSelectedChat(res.data[0].ChatID);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchChats();
  }, [currentUserId]);

  // Ha location.state-ből érkezik openChatId (pl. Profile Message gomb után)
  useEffect(() => {
    const openId = location.state?.openChatId;
    if (!openId) return;
    incomingChatIdRef.current = openId;
    // Ha a chatek már be vannak töltve, azonnal váltsunk rá
    if (chats.length > 0) {
      const exists = chats.some((c) => c.ChatID === openId);
      if (exists) {
        setSelectedChat(openId);
        incomingChatIdRef.current = null;
      } else {
        // Még nincs a listában (új privát chat) → töltsük újra
        fetchChats(openId);
      }
    }
  }, [location.state, chats.length]);

  useEffect(() => {
    const onChatsUpdated = () => { if (currentUserId) fetchChats(); };
    window.addEventListener("chats-updated", onChatsUpdated);
    return () => window.removeEventListener("chats-updated", onChatsUpdated);
  }, [currentUserId]);

  // --- WebSocket ---
  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;
    const socket = new WebSocket("ws://localhost:3001");
    ws.current = socket;

    socket.onopen = () => {
      if (isMounted) console.log("Connected to WS server");
    };

    socket.onmessage = (event) => {
      if (!isMounted) return;
      const data = JSON.parse(event.data);

      if (data.type === "NEW_MESSAGE") {
        const senderUserId = Number(data.msg.UserID);
        let senderName = data.msg.Username;
        if (!senderName && senderUserId !== currentUserId) {
          const found = chatUsersRef.current.find((u) => Number(u.UserID) === senderUserId);
          senderName = found?.Username || `User ${senderUserId}`;
        }
        if (senderUserId === currentUserId) {
          senderName = currentUsername;
        }

        const msg = {
          MsgID: data.msg.MsgID,
          text: data.msg.Content,
          username: senderName,
          type: senderUserId === currentUserId ? "outgoing" : "incoming",
          UserID: senderUserId,
          sentAt: data.msg.SentAt || new Date().toISOString(),
        };

        setMessagesMap((prev) => {
          const list = prev[data.msg.ChatID] || [];
          const isOwn = senderUserId === currentUserId;
          const alreadyExists = list.some((m) => m.MsgID === data.msg.MsgID);
          if (alreadyExists) return prev;
          const replaceTemp = isOwn && list.some((m) => m.MsgID < 0 && m.text === data.msg.Content);
          const next = replaceTemp
            ? list.map((m) => (m.MsgID < 0 && m.text === data.msg.Content ? msg : m))
            : [...list, msg];
          const updatedList = ensureUniqueMessages(next);
          return { ...prev, [data.msg.ChatID]: updatedList };
        });
      }

      if (data.type === "EDIT_MESSAGE") {
        const { MsgID, Content, ChatID } = data.msg;
        setMessagesMap((prev) => {
          const list = prev[ChatID];
          if (!list) return prev;
          return {
            ...prev,
            [ChatID]: list.map((m) =>
              m.MsgID === MsgID ? { ...m, text: Content } : m
            ),
          };
        });
      }

      if (data.type === "DELETE_MESSAGE") {
        const { MsgID, ChatID } = data.msg;
        setMessagesMap((prev) => {
          const list = prev[ChatID];
          if (!list) return prev;
          return {
            ...prev,
            [ChatID]: list.filter((m) => m.MsgID !== MsgID),
          };
        });
      }
    };

    ws.current.onclose = () => console.log("WS disconnected");
    ws.current.onerror = (err) => console.error("WS error:", err);

    return () => {
      isMounted = false;
      socket.close();
    };
  }, [currentUserId, currentUsername]);

  // Ensure unique keys for messages in the chat.
  const ensureUniqueMessages = (messages) => {
    const seen = new Set();
    return messages.filter((msg) => {
      if (seen.has(msg.MsgID)) {
        console.warn(`Duplicate MsgID detected: ${msg.MsgID}`);
        return false;
      }
      seen.add(msg.MsgID);
      return true;
    });
  };

  // --- Üzenetek betöltése ---
  useEffect(() => {
    if (!selectedChat) return;

    axios
      .get(`http://localhost:3001/messages/${selectedChat}`)
      .then((res) => {
        const seen = new Set();
        const msgs = res.data
          .filter((msg) => {
            if (seen.has(msg.MsgID)) return false;
            seen.add(msg.MsgID);
            return true;
          })
          .map((msg) => ({
            MsgID: msg.MsgID,
            text: msg.Content,
            type: msg.UserID === Number(currentUserId) ? "outgoing" : "incoming",
            username:
              msg.UserID === Number(currentUserId)
                ? currentUsername
                : msg.Username || `User ${msg.UserID}`,
            UserID: msg.UserID,
            sentAt: msg.SentAt || null,
          }));
        setMessagesMap((prev) => ({ ...prev, [selectedChat]: msgs }));
      })
      .catch(console.error);
  }, [selectedChat, currentUserId, currentUsername]);

  // --- Chat users ---
  const loadChatUsers = (chatId) => {
    if (!chatId) return;

    axios
      .get(`http://localhost:3001/chats/chatUsers/${chatId}`)
      .then((res) => {
        console.log("CHAT USERS:", res.data);
        setChatUsers(res.data);
        chatUsersRef.current = res.data;
      })
      .catch((err) => {
        console.error("loadChatUsers error:", err);
      });
  };

  // --- Chat skills (needed + member skills) ---
  const loadChatSkills = (chatId) => {
    if (!chatId) return;
    axios
      .get(`http://localhost:3001/chats/${chatId}/skillsWithMembers`)
      .then((res) => {
        setSkillsWithMembers(res.data);
        setChatSkills(
          (res.data.needed || []).map((s) => ({ SkillID: s.SkillID, SkillName: s.Skill }))
        );
      })
      .catch(() => {
        setChatSkills([]);
        setSkillsWithMembers({ needed: [], memberSkills: [] });
      });
  };

  useEffect(() => {
    if (selectedChat) {
      loadChatUsers(selectedChat);
      if (skillsOpen) loadChatSkills(selectedChat);
    }
  }, [selectedChat]);

  useEffect(() => {
    setInputVisible(true);
  }, [selectedChat]);

  // --- Scroll ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, selectedChat]);

  // --- Send message (optimistic update so it appears immediately) ---
  const handleSend = () => {
    if (!messageInput.trim() || selectedChat == null || currentUserId == null) return;
    // Prevent double send on Enter (form submit can fire twice in some browsers)
    const now = Date.now();
    if (now - lastSendAt.current < 400) return;
    lastSendAt.current = now;
    const text = messageInput.trim();

    if (!editingMessage) {
      const tempId = -Date.now();
      setMessagesMap((prev) => ({
        ...prev,
        [selectedChat]: [
          ...(prev[selectedChat] || []),
          { MsgID: tempId, text, username: currentUsername, type: "outgoing", UserID: currentUserId, sentAt: new Date().toISOString() },
        ],
      }));
      setMessageInput("");

      axios
        .post(
          "http://localhost:3001/messages/create",
          { ChatID: selectedChat, UserID: currentUserId, Content: text },
          { withCredentials: true }
        )
        .then((res) => {
          const realId = res.data?.MsgID;
          if (realId) {
            setMessagesMap((prev) => ({
              ...prev,
              [selectedChat]: (prev[selectedChat] || []).map((m) =>
                m.MsgID === tempId ? { ...m, MsgID: realId } : m
              ),
            }));
          }
        })
        .catch((err) => {
          setMessagesMap((prev) => ({
            ...prev,
            [selectedChat]: (prev[selectedChat] || []).filter((m) => m.MsgID !== tempId),
          }));
          alert(err.response?.data?.error || "Failed to send message.");
        });
    } else {
      // edit üzenet
      axios
        .put(
          `http://localhost:3001/messages/edit/${editingMessage.MsgID}`,
          { Content: messageInput },
          { withCredentials: true }
        )
        .then(() => {
          setMessagesMap((prev) => ({
            ...prev,
            [selectedChat]: prev[selectedChat].map((m) =>
              m.MsgID === editingMessage.MsgID
                ? { ...m, text: messageInput }
                : m
            ),
          }));
          setEditingMessage(null);
          setMessageInput("");
        })
        .catch(console.error);
    }
  };

  const handleDelete = (msg) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    axios
      .delete(`http://localhost:3001/messages/delete/${msg.MsgID}`, {
        withCredentials: true,
      })
      .then(() => {
        setMessagesMap((prev) => ({
          ...prev,
          [selectedChat]: prev[selectedChat].filter((m) => m.MsgID !== msg.MsgID),
        }));
      })
      .catch(console.error);
  };

  const handleEdit = (msg) => {
    setEditingMessage(msg);
    setMessageInput(msg.text);
  };

  // --- Csoport kód másolása ---
  const selectedChatData = chats.find((c) => c.ChatID === selectedChat);
  const inviteCode = selectedChatData?.PublicID || "";

  const handleCopyInviteCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(
      () => alert("Code copied to clipboard: " + inviteCode),
      () => alert("Copy failed")
    );
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    if (atBottom) setInputVisible(true);
    else {
      const delta = scrollTop - lastScrollTop.current;
      if (delta > 20) setInputVisible(true);
      else if (delta < -20) setInputVisible(false);
    }
    lastScrollTop.current = scrollTop;
  };

  const avatarUrl = (user) => {
    if (!user?.Avatar) return "/images/default.png";
    const u = user.Avatar;
    return u.startsWith("/") ? u : `/${u}`;
  };

  const chatListAvatarUrl = (chat) => {
    const url = (chat.IsPrivateChat && chat.OtherUserAvatarUrl)
      ? chat.OtherUserAvatarUrl
      : (chat.ChatPicUrl || null);
    if (!url) return "/images/default.png";
    return url.startsWith("/") ? url : `/${url}`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    // MySQL "2026-03-11 12:30:00" -> "2026-03-11T12:30:00" hogy minden böngészőben működjön
    const normalized = typeof dateStr === "string" ? dateStr.replace(" ", "T") : dateStr;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    if (isToday) {
      return `${hours}:${minutes}`;
    }
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${month}.${day}. ${hours}:${minutes}`;
  };

  // --- Filtered chat list ---
  // Uses IsPrivateChat from backend, so 2‑person groups stay groups
  const filteredChats = chats.filter((chat) => {
    const isPrivate = !!chat.IsPrivateChat;
    if (chatFilter === "private") return isPrivate;
    if (chatFilter === "group") return !isPrivate;
    return true;
  });

  // --- Select chat and mark as read ---
  const handleSelectChat = (chatId) => {
    if (chatId === selectedChat) return;
    // Menük bezárása + editingMessage törlése chat váltáskor
    closeAllMenus();
    setEditingMessage(null);
    setMessageInput("");
    setSelectedChat(chatId);
    axios.post(`http://localhost:3001/chats/${chatId}/markRead`, {}, { withCredentials: true })
      .then(() => {
        setChats((prev) => prev.map((c) =>
          c.ChatID === chatId ? { ...c, UnreadCount: 0 } : c
        ));
      })
      .catch(console.error);
  };

  // --- Open private chat (Message button): create/find 1-1 chat, show it in list, switch to it ---
  const handleOpenPrivateChat = (e, otherUserId, otherUsername) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const uid = Number(otherUserId);
    if (!uid || uid === Number(currentUserId)) return;
    if (!currentUserId) {
      alert("Please log in to send a message.");
      return;
    }
    setPrivateChatLoading(true);

    axios
      .post(
        "http://localhost:3001/chats/private",
        { otherUserId: uid },
        { withCredentials: true }
      )
      .then((res) => {
        const chatId = res.data.ChatID;
        const name = res.data.otherUsername || otherUsername || "Private";
        setChats((prev) => {
          if (prev.some((c) => c.ChatID === chatId)) return prev;
          return [...prev, { ChatID: chatId, ChatName: name, MemberCount: 2 }];
        });
        setSelectedChat(chatId);
        setSelectedUserProfile(null);
        setPeopleOpen(false);
        setInviteCodeOpen(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message || "Could not open chat.";
        alert(msg);
      })
      .finally(() => setPrivateChatLoading(false));
  };

  // --- Kick: megnyitja a megerősítő modalt ---
  const handleKickClick = (e, userId, username) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPendingKick({ userId, username });
  };

  // --- Kick végrehajtása (modal "Igen" gombjáról) ---
  const confirmKickUser = async () => {
    if (!pendingKick || !selectedChat) return;
    const { userId, username } = pendingKick;
    setPendingKick(null);
    try {
      await axios.delete(
        `http://localhost:3001/chats/${selectedChat}/kick/${userId}`,
        { withCredentials: true }
      );
      setChatUsers((prev) => prev.filter((u) => Number(u.UserID) !== Number(userId)));
      chatUsersRef.current = chatUsersRef.current.filter((u) => Number(u.UserID) !== Number(userId));
      fetchChats();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to kick user.");
    }
  };

  // --- Make user admin ---
  const handleMakeAdmin = async (userId, username) => {
    if (!window.confirm(`Make ${username} an admin?`)) return;
    try {
      await axios.put(
        "http://localhost:3001/chats/makeAdmin",
        { UserID: userId, ChatID: selectedChat },
        { withCredentials: true }
      );
      setChatUsers((prev) =>
        prev.map((u) =>
          Number(u.UserID) === Number(userId) ? { ...u, IsChatAdmin: 1 } : u
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || "Failed to make admin.");
    }
  };

  // --- Remove admin ---
  const handleRemoveAdmin = async (userId, username) => {
    if (!window.confirm(`Remove admin rights from ${username}?`)) return;
    try {
      await axios.put(
        `http://localhost:3001/chats/${selectedChat}/removeAdmin/${userId}`,
        {},
        { withCredentials: true }
      );
      setChatUsers((prev) =>
        prev.map((u) =>
          Number(u.UserID) === Number(userId) ? { ...u, IsChatAdmin: 0 } : u
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove admin.");
    }
  };

  // --- Open edit group modal (csak admin) ---
  const openEditGroup = () => {
    const currentChat = chats.find((c) => c.ChatID === selectedChat);
    if (currentChat) {
      setEditGroupName(currentChat.ChatName || "");
      const currentPic = currentChat.ChatPicUrl || "";
      setEditGroupPic(currentPic);
      const idx = GROUP_AVATARS.findIndex((src) => src === currentPic);
      setEditAvatarIndex(idx >= 0 ? idx : null);
    }
    setEditGroupOpen(true);
    setMenuOpen(false);
  };

  // --- Save group edits (group picture: URL or filename, e.g. /images/group.png) ---
  const handleSaveGroupEdit = async () => {
    if (!selectedChat) return;
    try {
      const updates = {};
      if (editGroupName.trim()) updates.ChatName = editGroupName.trim();
      if (editGroupPic.trim()) {
        const pic = editGroupPic.trim();
        updates.ChatPic = pic.startsWith("/") ? pic : `/images/${pic}`;
      }
      
      await axios.put(
        `http://localhost:3001/chats/edit/${selectedChat}`,
        updates,
        { withCredentials: true }
      );
      
      setChats((prev) =>
        prev.map((c) =>
          c.ChatID === selectedChat
            ? { ...c, ChatName: editGroupName.trim() || c.ChatName, ChatPicUrl: updates.ChatPic || c.ChatPicUrl }
            : c
        )
      );
      setEditGroupOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update group.");
    }
  };

  // --- Leave chat ---
  const handleLeaveChat = async () => {
    if (!selectedChat) return;

    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      await axios.delete(
        `http://localhost:3001/chats/leave/${selectedChat}`,
        { withCredentials: true }
      );

      // chat eltávolítása a listából
      setChats((prev) => prev.filter((c) => c.ChatID !== selectedChat));

      // kiválasztott chat nullázása
      setMessagesMap((prev) => {
        const copy = { ...prev };
        delete copy[selectedChat];
        return copy;
      });
      setSelectedChat(null);
      setMenuOpen(false);
      setPeopleOpen(false);
      setSkillsOpen(false);
    } catch (err) {
      console.error("Leave chat error:", err);
      alert("Could not leave the group");
    }
  };

  const closeAllMenus = () => {
    setMenuOpen(false);
    setPeopleOpen(false);
    setSkillsOpen(false);
    setInviteCodeOpen(false);
    setSelectedUserProfile(null);
    setListDrawerOpen(false);
  };

  useEffect(() => {
    const onEscape = (e) => {
      if (e.key === "Escape") closeAllMenus();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  // --- JSX ---
  return (
    <div className="chat-page">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <div className={`content ${listDrawerOpen ? "list-drawer-open" : ""}`}>
        {/* Backdrop: click outside menus closes them, does not select another chat */}
        {(menuOpen || peopleOpen || skillsOpen || inviteCodeOpen || selectedUserProfile || editGroupOpen || pendingKick || listDrawerOpen) && (
          <div
            className="chat-menu-backdrop"
            onClick={closeAllMenus}
            aria-hidden="true"
          />
        )}

        {/* --- CHAT LIST (on mobile: drawer, open via .list-drawer-open) --- */}
        <div className={`user-list ${listDrawerOpen ? "drawer-open" : ""}`}>
          <div className="chat-list-filters">
            <button
              type="button"
              className={chatFilter === "all" ? "filter-btn active" : "filter-btn"}
              onClick={() => setChatFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={chatFilter === "private" ? "filter-btn active" : "filter-btn"}
              onClick={() => setChatFilter("private")}
            >
              Private
            </button>
            <button
              type="button"
              className={chatFilter === "group" ? "filter-btn active" : "filter-btn"}
              onClick={() => setChatFilter("group")}
            >
              Group
            </button>
          </div>
          {filteredChats.map((chat) => (
            <div
              key={chat.ChatID}
              className={`user-row ${chat.ChatID === selectedChat ? "active" : ""}`}
              onClick={() => handleSelectChat(chat.ChatID)}
            >
              <img
                src={chatListAvatarUrl(chat)}
                alt={chat.ChatName}
                className="chat-pic"
              />
              <span className="chat-row-name">{chat.ChatName}</span>
              {chat.UnreadCount > 0 && (
                <span className="unread-badge">{chat.UnreadCount}</span>
              )}
              <span className="chat-row-count" title="Member count">
                {chat.MemberCount != null ? ` (${chat.MemberCount})` : ""}
              </span>
            </div>
          ))}
        </div>

        {/* --- CHAT BOX (messages scrollable, input fixed at bottom, hides on scroll up) --- */}
        <div className="chat-container">
          <button
            type="button"
            className="open-list-btn"
            onClick={() => setListDrawerOpen(true)}
            aria-label="Chat list"
          >
            Chats
          </button>
          <div className="chat-box">
            <div
              ref={messagesContainerRef}
              className="chat-messages"
              onScroll={handleMessagesScroll}
            >
              {messagesMap[selectedChat]?.map((msg) => (
                <div key={msg.MsgID} className={`message ${msg.type}`}>
                  <span>{msg.text}</span>
                  <small style={{ display: "block", fontSize: "10px", color: "#555" }}>
                    {msg.username}
                    {msg.sentAt && <span style={{ marginLeft: "8px", opacity: 0.7 }}>{formatTime(msg.sentAt)}</span>}
                  </small>

                  {/* Admin lehet mások üzenetét törölni, user csak a sajátját */}
                  {(msg.type === "outgoing" || isCurrentUserAdmin) && (
                    <div className="message-actions">
                      {msg.type === "outgoing" && (
                        <button onClick={() => handleEdit(msg)}>✏️</button>
                      )}
                      <button onClick={() => handleDelete(msg)}>🗑️</button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form
              className={`chat-input-bar ${!inputVisible ? "input-hidden" : ""}`}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <div className="input-row">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                />
                <button type="submit" className="send-btn">
                  {editingMessage ? "↑" : "→"}
                </button>
              </div>
            </form>
          </div>

          {/* --- RIGHT PANEL (3 csík menü) --- */}
          <div className="right-panel">
            <button
              className="profile-btn menu-hamburger"
              onClick={() => setMenuOpen((prev) => !prev)}
              title="Menu"
              aria-label="Menu"
            >
              ☰
            </button>

            {menuOpen && (
              <div className="settings-dropdown">
                <button
                  onClick={() => {
                    setInviteCodeOpen((prev) => !prev);
                    setPeopleOpen(false);
                    setSkillsOpen(false);
                  }}
                >
                  Invite code
                </button>

                <button
                  onClick={() => {
                    setPeopleOpen((prev) => !prev);
                    setSkillsOpen(false);
                    setInviteCodeOpen(false);
                    if (!peopleOpen) loadChatUsers(selectedChat);
                  }}
                >
                  People
                </button>

                <button
                  onClick={() => {
                    setSkillsOpen((prev) => !prev);
                    setPeopleOpen(false);
                    setInviteCodeOpen(false);
                    if (!skillsOpen) loadChatSkills(selectedChat);
                  }}
                >
                  Skills
                </button>

                {isCurrentUserAdmin && (
                  <button onClick={openEditGroup}>Edit Group</button>
                )}

                <button onClick={handleLeaveChat}>Leave</button>
              </div>
            )}
          </div>

          {/* --- INVITE CODE (csoport kód) --- */}
          {inviteCodeOpen && (
            <div className="invite-code-panel">
              <button className="close-invite-code" onClick={() => setInviteCodeOpen(false)}>
                ✖
              </button>
              <h3>Group code</h3>
              <p className="invite-code-desc">Share this code so others can join via Join by ID in the menu.</p>
              <div className="invite-code-value">{inviteCode || "—"}</div>
              <button
                type="button"
                className="invite-code-copy"
                onClick={handleCopyInviteCode}
                disabled={!inviteCode}
              >
                Copy
              </button>
            </div>
          )}

          {/* --- KICK CONFIRM MODAL --- */}
          {pendingKick && (
            <div className="edit-group-modal kick-confirm-modal" onClick={() => setPendingKick(null)}>
              <div className="edit-group-content kick-confirm-content" onClick={(e) => e.stopPropagation()}>
                <h3>Confirm kick</h3>
                <p className="kick-confirm-text">
                  Are you sure you want to kick <strong>{pendingKick.username}</strong> from this group?
                </p>
                <div className="edit-group-buttons">
                  <button onClick={() => setPendingKick(null)}>Cancel</button>
                  <button className="save-btn kick-confirm-btn" onClick={confirmKickUser}>
                    Yes, kick
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- EDIT GROUP MODAL --- */}
          {editGroupOpen && (
            <div className="edit-group-modal" onClick={() => setEditGroupOpen(false)}>
              <div className="edit-group-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-edit-group" onClick={() => setEditGroupOpen(false)}>
                  ✖
                </button>
                <h3>Edit Group</h3>
                <label>
                  Group Name:
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </label>
                <div className="edit-group-avatars">
                  {GROUP_AVATARS.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      className={
                        "edit-avatar-circle" +
                        (i === editAvatarIndex ? " edit-avatar-circle--active" : "")
                      }
                      onClick={() => {
                        setEditAvatarIndex(i);
                        setEditGroupPic(src);
                      }}
                    >
                      <img src={src} alt={`Group avatar ${i + 1}`} />
                    </button>
                  ))}
                </div>
                <div className="edit-group-buttons">
                  <button onClick={() => setEditGroupOpen(false)}>Cancel</button>
                  <button onClick={handleSaveGroupEdit} className="save-btn">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* --- PEOPLE SIDEBAR --- */}
          {peopleOpen && (
            <div className={`people-sidebar ${peopleOpen ? "open" : ""}`}>
              <button
                className="close-people"
                onClick={() => setPeopleOpen(false)}
              >
                ✖
              </button>
              <h3>Users in this chat:</h3>
              <ul>
                {chatUsers.length === 0 && <li>No users in this chat</li>}
                {chatUsers.map((user) => (
                  <li
                    key={user.UserID}
                    className="person-row"
                    onClick={() => {
                      if (Number(user.UserID) !== Number(currentUserId)) {
                        setSelectedUserProfile(user);
                      }
                    }}
                  >
                    <img
                      src={avatarUrl(user)}
                      alt={user.Username}
                      className="person-avatar"
                    />
                    <span className="person-name">
                      {Number(user.UserID) === Number(currentUserId)
                        ? `${currentUsername} (You)`
                        : user.Username}
                      {user.IsChatAdmin === 1 && <span className="admin-badge">Admin</span>}
                    </span>
                    {isCurrentUserAdmin && Number(user.UserID) !== Number(currentUserId) && (
                      <div className="admin-actions" onClick={(e) => e.stopPropagation()}>
                        {user.IsChatAdmin !== 1 ? (
                          <button
                            type="button"
                            className="make-admin-btn"
                            title="Make Admin"
                            onClick={() => handleMakeAdmin(user.UserID, user.Username)}
                          >
                            ⭐
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="remove-admin-btn"
                            title="Remove Admin"
                            onClick={() => handleRemoveAdmin(user.UserID, user.Username)}
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          className="kick-btn"
                          title="Kick User"
                          onClick={(e) => handleKickClick(e, user.UserID, user.Username)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* --- USER PROFILE MODULE (Message = open private chat) --- */}
          {selectedUserProfile && (
            <div className="user-profile-module" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="close-profile-module"
                onClick={() => setSelectedUserProfile(null)}
              >
                ✖
              </button>
              <img
                src={avatarUrl(selectedUserProfile)}
                alt={selectedUserProfile.Username}
                className="profile-module-avatar"
              />
              <h4>{selectedUserProfile.Username}</h4>
              <div className="profile-module-actions">
                <button
                  type="button"
                  className="profile-module-message-btn"
                  disabled={privateChatLoading}
                  onClick={(e) => handleOpenPrivateChat(e, selectedUserProfile.UserID, selectedUserProfile.Username)}
                >
                  {privateChatLoading ? "Opening…" : "Message"}
                </button>
                <button
                  type="button"
                  className="profile-module-view-btn"
                  onClick={() => {
                    const uid = selectedUserProfile.UserID;
                    setSelectedUserProfile(null);
                    navigate(`/profile/${uid}`);
                  }}
                >
                  View profile
                </button>
              </div>
            </div>
          )}

          {/* --- SKILLS SIDEBAR (csoport keresett + tagok skillei) --- */}
          {skillsOpen && (
            <div className={`skills-sidebar ${skillsOpen ? "open" : ""}`}>
              <button className="close-skills" onClick={() => setSkillsOpen(false)}>
                ✖
              </button>
              <h3>Skills needed in this group:</h3>
              <ul>
                {(skillsWithMembers.needed || []).map((s) => (
                  <li key={"n-" + s.SkillID} className="skill-row skill-needed">
                    {s.Skill}
                  </li>
                ))}
              </ul>
              <h3 className="skills-members-title">Members&apos; skills:</h3>
              <ul>
                {(skillsWithMembers.memberSkills || []).map((m) => (
                  <li key={"u-" + m.UserID} className="skill-member-block">
                    <strong>{m.Username}</strong>: {m.Skills && m.Skills.length ? m.Skills.join(", ") : "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
