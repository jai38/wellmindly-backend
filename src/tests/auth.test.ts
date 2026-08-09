import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';

// Mock the mailer sendEmail utility to avoid actual email operations
vi.mock('../utils/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getOtpTemplate: vi.fn().mockReturnValue('<html>MOCK OTP</html>'),
}));

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe('Auth API Routes', () => {
  describe('POST /api/auth/send-otp', () => {
    it('should fail if email is not provided', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email is required');
    });

    it('should successfully request an OTP', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test-student@wellmindly.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Verification code sent to your email.');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should fail registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test-student@wellmindly.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail login with empty credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
