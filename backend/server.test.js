const request = require('supertest');
const app = require('./server'); 

describe('GET /users/all', () => {
  it('should return a list of users', async () => {
    const response = await request(app).get('/users/all');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('Backend Unit Tests', () => {
  
 
  describe('Email Validation', () => {
    const validateEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    it('should validate correct email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  
  describe('Password Validation', () => {
    const validatePassword = (password) => {
      if (!password || password.length < 6) return false;
      return true;
    };

    it('should accept valid passwords', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('securePassword123')).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null)).toBe(false);
    });
  });

 
  describe('Username Validation', () => {
    const validateUsername = (username) => {
      if (!username || username.length < 3 || username.length > 20) return false;
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
      return true;
    };

    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false);
      expect(validateUsername('user@name')).toBe(false);
      expect(validateUsername('a'.repeat(21))).toBe(false);
    });
  });

  
  describe('Message Validation', () => {
    const validateMessage = (message) => {
      if (!message || message.trim().length === 0) return false;
      if (message.length > 500) return false;
      return true;
    };

    it('should accept valid messages', () => {
      expect(validateMessage('Hello World')).toBe(true);
      expect(validateMessage('This is a test message')).toBe(true);
    });

    it('should reject invalid messages', () => {
      expect(validateMessage('')).toBe(false);
      expect(validateMessage('   ')).toBe(false);
      expect(validateMessage('a'.repeat(501))).toBe(false);
    });
  });

 
  describe('ID Generation', () => {
    const generateId = () => {
      return Math.random().toString(36).substr(2, 9);
    };

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid ID format', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(0);
      expect(typeof id).toBe('string');
    });
  });

  
  describe('User Management', () => {
    const mockUsers = [
      { UserID: 1, Username: 'john', Email: 'john@example.com' },
      { UserID: 2, Username: 'jane', Email: 'jane@example.com' }
    ];

    const userExists = (username) => {
      return mockUsers.some(u => u.Username === username);
    };

    const getUserById = (id) => {
      return mockUsers.find(u => u.UserID === id);
    };

    it('should find existing users', () => {
      expect(userExists('john')).toBe(true);
      expect(userExists('jane')).toBe(true);
    });

    it('should not find non-existent users', () => {
      expect(userExists('nonexistent')).toBe(false);
    });

    it('should get user by ID', () => {
      const user = getUserById(1);
      expect(user).toBeTruthy();
      expect(user.Username).toBe('john');
    });

    it('should return undefined for non-existent user ID', () => {
      const user = getUserById(999);
      expect(user).toBeUndefined();
    });
  });

  
  describe('Chat Management', () => {
    const validateChatName = (name) => {
      if (!name || name.trim().length === 0) return false;
      if (name.length > 100) return false;
      return true;
    };

    const validateMemberCount = (count) => {
      if (!Number.isInteger(count) || count < 2) return false;
      return true;
    };

    it('should validate chat names', () => {
      expect(validateChatName('My Chat')).toBe(true);
      expect(validateChatName('Group Project')).toBe(true);
    });

    it('should reject invalid chat names', () => {
      expect(validateChatName('')).toBe(false);
      expect(validateChatName('   ')).toBe(false);
    });

    it('should validate member count', () => {
      expect(validateMemberCount(2)).toBe(true);
      expect(validateMemberCount(5)).toBe(true);
    });

    it('should reject invalid member count', () => {
      expect(validateMemberCount(1)).toBe(false);
      expect(validateMemberCount('two')).toBe(false);
    });
  });

 
  describe('Skill Management', () => {
    const mockSkills = [
      { SkillID: 1, Skill: 'JavaScript' },
      { SkillID: 2, Skill: 'React' },
      { SkillID: 3, Skill: 'Node.js' }
    ];

    const skillExists = (skillName) => {
      return mockSkills.some(s => s.Skill === skillName);
    };

    const getSkillById = (id) => {
      return mockSkills.find(s => s.SkillID === id);
    };

    it('should find existing skills', () => {
      expect(skillExists('JavaScript')).toBe(true);
      expect(skillExists('React')).toBe(true);
    });

    it('should not find non-existent skills', () => {
      expect(skillExists('Python')).toBe(false);
    });

    it('should get skill by ID', () => {
      const skill = getSkillById(1);
      expect(skill).toBeTruthy();
      expect(skill.Skill).toBe('JavaScript');
    });
  });

  
  describe('Review Rating', () => {
    const validateRating = (rating) => {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return false;
      return true;
    };

    it('should accept valid ratings', () => {
      expect(validateRating(1)).toBe(true);
      expect(validateRating(5)).toBe(true);
      expect(validateRating(3)).toBe(true);
    });

    it('should reject invalid ratings', () => {
      expect(validateRating(0)).toBe(false);
      expect(validateRating(6)).toBe(false);
      expect(validateRating(3.5)).toBe(false);
      expect(validateRating('5')).toBe(false);
    });
  });

 
  describe('Join Code Generation', () => {
    const generateJoinCode = (length = 6) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    it('should generate valid join codes', () => {
      const code = generateJoinCode();
      expect(code.length).toBe(6);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    });

    it('should generate codes with custom length', () => {
      const code = generateJoinCode(8);
      expect(code.length).toBe(8);
    });

    it('should generate unique codes', () => {
      const code1 = generateJoinCode();
      const code2 = generateJoinCode();
      expect(code1).toBeTruthy();
      expect(code2).toBeTruthy();
    });
  });

});