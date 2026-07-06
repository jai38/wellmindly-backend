import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('TalkMindly API Routes', () => {
  describe('GET /api/talk/rooms', () => {
    it('should block unauthorized room lists retrieval', async () => {
      const res = await request(app).get('/api/talk/rooms');
      expect(res.status).toBe(401); // Requires JWT authentication header
    });
  });

  describe('POST /api/talk/rooms', () => {
    it('should block unauthorized room creations', async () => {
      const res = await request(app)
        .post('/api/talk/rooms')
        .send({ name: 'Exam Stress Room', description: 'Discuss exams' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/talk/rooms/:roomId/notes', () => {
    it('should block unauthorized note dropping', async () => {
      const res = await request(app)
        .post('/api/talk/rooms/some-room-uuid/notes')
        .send({ content: 'Feeling anxious about tests', nickname: 'Calm Fox', avatar: 'fox' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/talk/notes/:noteId/replies', () => {
    it('should block unauthorized replies posting', async () => {
      const res = await request(app)
        .post('/api/talk/notes/some-note-uuid/replies')
        .send({ content: 'I feel that too', nickname: 'Soft Panda', avatar: 'panda' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/talk/notes/:noteId/react', () => {
    it('should block unauthorized reactions toggling', async () => {
      const res = await request(app)
        .post('/api/talk/notes/some-note-uuid/react')
        .send({ type: 'METOO' });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/talk/notes/:noteId', () => {
    it('should block unauthorized note deletions', async () => {
      const res = await request(app).delete('/api/talk/notes/some-note-uuid');
      expect(res.status).toBe(401);
    });
  });
});
