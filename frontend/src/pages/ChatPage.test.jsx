import { describe, it, expect } from 'vitest';

// === UTILITY FUNCTIONS FOR TESTING ===

// Format time function (ugyanaz, mint a ChatPage.jsx-ben)
const formatTime = (dateStr) => {
  if (!dateStr) return "";
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

// Validate chat message
const validateChatMessage = (message) => {
  if (!message || typeof message !== 'string') return false;
  if (message.trim().length === 0) return false;
  if (message.length > 500) return false;
  return true;
};

// Avatar URL builder
const buildAvatarUrl = (avatar) => {
  if (!avatar) return "/images/default.png";
  return avatar.startsWith("/") ? avatar : `/${avatar}`;
};

// Filter chats by type
const filterChats = (chats, filter) => {
  if (filter === "all") return chats;
  if (filter === "private") return chats.filter(c => !!c.IsPrivateChat);
  if (filter === "group") return chats.filter(c => !c.IsPrivateChat);
  return chats;
};

// Ensure unique messages
const ensureUniqueMessages = (messages) => {
  const seen = new Set();
  return messages.filter((msg) => {
    if (seen.has(msg.MsgID)) return false;
    seen.add(msg.MsgID);
    return true;
  });
};

// Parse JWT token (mock)
const isValidToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
};

// --- TESTS ---

describe('Frontend Unit Tests', () => {

  // === TIME FORMATTING ===
  describe('Time Formatting', () => {
    it('should format time correctly for today', () => {
      const now = new Date();
      const result = formatTime(now.toISOString());
      expect(result).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
    });

    it('should format past dates with date and time', () => {
      const pastDate = new Date('2026-03-01T14:30:00Z');
      const result = formatTime(pastDate.toISOString());
      expect(result).toContain('03.01.');
     
      expect(result).toMatch(/\d{2}:\d{2}$/);
    });

    it('should return empty string for invalid date', () => {
      expect(formatTime('')).toBe('');
      expect(formatTime(null)).toBe('');
      expect(formatTime('invalid')).toBe('');
    });

    it('should handle MySQL datetime format', () => {
      const mysqlFormat = '2026-03-15 14:30:00';
      const result = formatTime(mysqlFormat);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // === MESSAGE VALIDATION ===
  describe('Message Validation', () => {
    it('should accept valid messages', () => {
      expect(validateChatMessage('Hello')).toBe(true);
      expect(validateChatMessage('This is a test message')).toBe(true);
    });

    it('should reject empty messages', () => {
      expect(validateChatMessage('')).toBe(false);
      expect(validateChatMessage('   ')).toBe(false);
    });

    it('should reject messages over 500 characters', () => {
      expect(validateChatMessage('a'.repeat(501))).toBe(false);
    });

    it('should reject null or non-string messages', () => {
      expect(validateChatMessage(null)).toBe(false);
      expect(validateChatMessage(123)).toBe(false);
    });
  });

  // === AVATAR URL BUILDING ===
  describe('Avatar URL Building', () => {
    it('should return default avatar for empty input', () => {
      expect(buildAvatarUrl('')).toBe('/images/default.png');
      expect(buildAvatarUrl(null)).toBe('/images/default.png');
    });

    it('should keep URLs starting with /', () => {
      expect(buildAvatarUrl('/avatars/user.png')).toBe('/avatars/user.png');
    });

    it('should add / prefix to URLs without it', () => {
      expect(buildAvatarUrl('avatars/user.png')).toBe('/avatars/user.png');
    });
  });

  // === CHAT FILTERING ===
  describe('Chat Filtering', () => {
    const mockChats = [
      { ChatID: 1, ChatName: 'Private', IsPrivateChat: true },
      { ChatID: 2, ChatName: 'Group Chat', IsPrivateChat: false },
      { ChatID: 3, ChatName: 'Another Private', IsPrivateChat: true }
    ];

    it('should return all chats with "all" filter', () => {
      const result = filterChats(mockChats, 'all');
      expect(result).toHaveLength(3);
    });

    it('should filter private chats', () => {
      const result = filterChats(mockChats, 'private');
      expect(result).toHaveLength(2);
      expect(result.every(c => c.IsPrivateChat)).toBe(true);
    });

    it('should filter group chats', () => {
      const result = filterChats(mockChats, 'group');
      expect(result).toHaveLength(1);
      expect(result.every(c => !c.IsPrivateChat)).toBe(true);
    });
  });

  // === MESSAGE UNIQUENESS ===
  describe('Message Uniqueness', () => {
    it('should remove duplicate messages', () => {
      const messages = [
        { MsgID: 1, text: 'Hello' },
        { MsgID: 2, text: 'World' },
        { MsgID: 1, text: 'Duplicate' }
      ];
      const result = ensureUniqueMessages(messages);
      expect(result).toHaveLength(2);
    });

    it('should keep unique messages', () => {
      const messages = [
        { MsgID: 1, text: 'Hello' },
        { MsgID: 2, text: 'World' }
      ];
      const result = ensureUniqueMessages(messages);
      expect(result).toHaveLength(2);
    });

    it('should handle empty message array', () => {
      const result = ensureUniqueMessages([]);
      expect(result).toHaveLength(0);
    });
  });

  // === TOKEN VALIDATION ===
  describe('JWT Token Validation', () => {
    it('should validate correct JWT format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(isValidToken(validToken)).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      expect(isValidToken('invalid.token')).toBe(false);
      expect(isValidToken('only-two-parts')).toBe(false);
    });

    it('should reject null or non-string tokens', () => {
      expect(isValidToken(null)).toBe(false);
      expect(isValidToken(123)).toBe(false);
      expect(isValidToken('')).toBe(false);
    });
  });

  // === INPUT SANITIZATION ===
  describe('Input Sanitization', () => {
    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return '';
      return input.trim();
    };

    it('should remove leading/trailing whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\n  test  \n')).toBe('test');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(123)).toBe('');
    });
  });

  // === CHAT NAME VALIDATION ===
  describe('Chat Name Validation', () => {
    const validateChatName = (name) => {
      if (!name || typeof name !== 'string') return false;
      if (name.trim().length === 0) return false;
      if (name.length > 100) return false;
      return true;
    };

    it('should accept valid chat names', () => {
      expect(validateChatName('My Chat')).toBe(true);
      expect(validateChatName('Project Group')).toBe(true);
    });

    it('should reject invalid chat names', () => {
      expect(validateChatName('')).toBe(false);
      expect(validateChatName('   ')).toBe(false);
      expect(validateChatName('a'.repeat(101))).toBe(false);
    });
  });

  // === MESSAGE TYPE DETECTION ===
  describe('Message Type Detection', () => {
    const detectMessageType = (msg, currentUserId) => {
      if (msg.UserID === currentUserId) return 'outgoing';
      return 'incoming';
    };

    it('should detect outgoing messages', () => {
      const msg = { UserID: 1, text: 'Hello' };
      expect(detectMessageType(msg, 1)).toBe('outgoing');
    });

    it('should detect incoming messages', () => {
      const msg = { UserID: 2, text: 'Hi' };
      expect(detectMessageType(msg, 1)).toBe('incoming');
    });
  });

});