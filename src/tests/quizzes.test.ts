import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { signToken } from '../lib/jwt';

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

  describe('POST /api/quizzes/submit (Authenticated Sanity Test)', () => {
    it('should successfully submit a quiz and return non-null AI feedback descriptive report', async () => {
      const student = await prisma.user.findFirst({
        where: { role: 'STUDENT' }
      });
      expect(student).not.toBeNull();
      if (!student) return;

      const token = signToken({
        sub: student.id,
        email: student.email,
        role: student.role,
        universityId: student.universityId,
      });

      const res = await request(app)
        .post('/api/quizzes/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          quizTitle: 'PHQ-9',
          quizCategory: 'Clinical',
          overallScore: 8,
          maxScore: 27,
          answers: { 1: 3, 2: 2, 3: 3 }
        });

      expect(res.status).toBe(201);
      expect(res.body.aiFeedback).not.toBeNull();
      expect(res.body.aiFeedback.headline).toBeDefined();
      expect(res.body.aiFeedback.narrative).toBeDefined();
      expect(res.body.aiFeedback.tip).toBeDefined();
      expect(res.body.aiFeedback.insights).toBeInstanceOf(Array);
      expect(res.body.aiFeedback.insights.length).toBeGreaterThan(0);
    }, 15000);
  });
});
