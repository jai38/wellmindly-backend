import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Quizzes and Health API Routes', () => {
  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/admin/quizzes', () => {
    it('should block unauthorized admin requests', async () => {
      const res = await request(app).get('/api/admin/quizzes');
      expect(res.status).toBe(401); // Unauthorized without JWT
    });
  });

  describe('POST /api/quizzes/submit', () => {
    it('should block unauthorized quiz submissions', async () => {
      const res = await request(app)
        .post('/api/quizzes/submit')
        .send({ answers: {} });
      expect(res.status).toBe(401); // Requires JWT authentication header
    });
  });
});
