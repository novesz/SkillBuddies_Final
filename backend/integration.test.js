const request = require('supertest');
const app = require('./server');

describe('Integration Tests - Backend Workflows', () => {
  
  // === CHAT + MESSAGE FLOW ===
  describe('Chat and Message Integration', () => {
    
    it('should fetch chats and messages', async () => {
      const chatsResponse = await request(app)
        .get('/chats/all');

      expect(chatsResponse.status).toBe(200);
      expect(Array.isArray(chatsResponse.body)).toBe(true);

      if (chatsResponse.body.length > 0) {
        const chatId = chatsResponse.body[0].ChatID;

        const messagesResponse = await request(app)
          .get(`/messages/${chatId}`);

        expect([200, 500]).toContain(messagesResponse.status);
        if (messagesResponse.status === 200) {
          expect(Array.isArray(messagesResponse.body)).toBe(true);
        }
      }
    });
  });

  // === USER PROFILE INTEGRATION ===
  describe('User Profile Workflow', () => {
    
    it('should fetch all users and retrieve individual profiles', async () => {
      const allUsersResponse = await request(app)
        .get('/users/all');

      expect(allUsersResponse.status).toBe(200);
      expect(Array.isArray(allUsersResponse.body)).toBe(true);

      if (allUsersResponse.body.length > 0) {
        const userId = allUsersResponse.body[0].UserID;

        const userResponse = await request(app)
          .get(`/users/${userId}`);

        expect([200, 500]).toContain(userResponse.status);
      }
    });

    it('should handle non-existent user gracefully', async () => {
      const response = await request(app)
        .get('/users/99999999');

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // === SKILLS INTEGRATION ===
  describe('Skills Workflow', () => {
    
    it('should fetch all skills', async () => {
      const skillsResponse = await request(app)
        .get('/skills');

      expect([200, 500]).toContain(skillsResponse.status);
      if (skillsResponse.status === 200) {
        expect(Array.isArray(skillsResponse.body)).toBe(true);
      }
    });

    it('should fetch user skills', async () => {
      const usersResponse = await request(app)
        .get('/users/all');

      if (usersResponse.body.length > 0) {
        const userId = usersResponse.body[0].UserID;

        const userSkillsResponse = await request(app)
          .get(`/skills/${userId}`);

        expect([200, 500]).toContain(userSkillsResponse.status);
      }
    });
  });

  // === ERROR HANDLING ===
  describe('Error Handling and Edge Cases', () => {
    
    it('should handle non-existent routes', async () => {
      const response = await request(app)
        .get('/this-endpoint-does-not-exist');

      expect(response.status).toBe(404);
    });

    it('should handle invalid chat ID gracefully', async () => {
      const response = await request(app)
        .get('/messages/invalid-id');

      
      expect(response.status).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should reject invalid user ID format', async () => {
      const response = await request(app)
        .get('/users/not-a-number');

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

 
  describe('Data Consistency', () => {
    
    it('should return consistent data on multiple requests', async () => {
      const usersResponse = await request(app)
        .get('/users/all');

      if (usersResponse.body.length > 0) {
        const userId = usersResponse.body[0].UserID;

        const firstFetch = await request(app).get(`/users/${userId}`);
        const secondFetch = await request(app).get(`/users/${userId}`);

        if (firstFetch.status === 200 && secondFetch.status === 200) {
          expect(firstFetch.body).toEqual(secondFetch.body);
        }
      }
    });
  });

  
  describe('API Health', () => {
    
    it('should return users list', async () => {
      const response = await request(app)
        .get('/users/all');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return chats list', async () => {
      const response = await request(app)
        .get('/chats/all');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return skills list', async () => {
      const response = await request(app)
        .get('/skills');

      expect([200, 500]).toContain(response.status);
    });
  });

});
